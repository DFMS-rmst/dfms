import json
import hashlib
from datetime import datetime, timezone
from pathlib import Path

import joblib
import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler

ROOT = Path(__file__).resolve().parents[1]
MODEL_DIR = ROOT / "models"
FEATURES = [
    "treatments_30d", "treatments_90d", "administrations_30d",
    "administrations_90d", "distinct_drugs_90d", "distinct_classes_90d",
    "treatment_days_90d", "average_duration_days_90d",
    "same_drug_repeat_90d", "same_class_repeat_90d", "repeat_episode_ratio_90d",
    "days_since_previous_treatment",
]
VERSION = "SIH-AMU-IFOREST-1.1"
DISCLAIMER = (
    "This is a decision-support indicator based on recorded antimicrobial-use patterns. "
    "It is not a veterinary diagnosis or proof of antimicrobial misuse."
)


def synthetic_training_data(seed=25007, count=800):
    """SYNTHETIC DEMONSTRATION DATA; no regulatory or clinical values are generated."""
    rng = np.random.default_rng(seed)
    treatments_90 = rng.poisson(1.5, count)
    treatments_30 = rng.binomial(treatments_90, 0.36)
    admin_90 = np.where(
        treatments_90 > 0,
        treatments_90 + rng.poisson(1.2 * treatments_90, count),
        0,
    )
    admin_30 = np.where(
        treatments_30 > 0,
        treatments_30 + rng.binomial(admin_90 - treatments_90, 0.35),
        0,
    )
    drugs = np.where(
        treatments_90 > 0,
        np.minimum(treatments_90, 1 + rng.binomial(2, 0.18, count)),
        0,
    )
    classes = np.where(
        treatments_90 > 0,
        np.minimum(drugs, 1 + rng.binomial(1, 0.15, count)),
        0,
    )
    days = np.where(
        admin_90 > 0,
        np.minimum(90, 1 + rng.binomial(np.maximum(admin_90 - 1, 0), 0.65)),
        0,
    )
    duration = np.where(treatments_90 > 0, np.minimum(90, rng.gamma(2, 1.2, count)), 0)
    same_drug = np.maximum(0, treatments_90 - drugs)
    same_class = np.maximum(0, treatments_90 - classes)
    repeat_episodes = rng.binomial(np.maximum(treatments_90 - 1, 0), 0.25)
    repeat_ratio = np.divide(
        repeat_episodes, treatments_90, out=np.zeros(count), where=treatments_90 > 0
    )
    since = np.where(
        treatments_30 > 0,
        rng.integers(1, 31, count),
        np.where(treatments_90 > 0, rng.integers(31, 91, count), 365),
    )
    data = np.column_stack([
        treatments_30, treatments_90, admin_30, admin_90, drugs, classes, days,
        duration, same_drug, same_class, repeat_ratio, since,
    ]).astype(float)
    issues = synthetic_consistency_issues(data)
    if issues:
        raise ValueError(f"Synthetic AMU generator produced inconsistent data: {issues}")
    return data


def synthetic_consistency_issues(data):
    """Return row indices violating the 12-feature synthetic-data contract."""
    t30, t90, a30, a90, drugs, classes, days, duration, same_drug, same_class, ratio, since = data.T
    no_treatment = t90 == 0
    checks = {
        "non_negative": np.any(data[:, :-1] < 0, axis=1),
        "non_integral_counts": np.any(data[:, [0, 1, 2, 3, 4, 5, 6, 8, 9]] % 1 != 0, axis=1),
        "treatment_window": t30 > t90,
        "administration_window": a30 > a90,
        "administrations_without_treatment": ((a90 > 0) & no_treatment) | ((a30 > 0) & (t30 == 0)),
        "too_few_administrations": (a90 < t90) | (a30 < t30),
        "drug_count": (drugs > t90) | ((drugs == 0) != no_treatment),
        "class_count": (classes > drugs) | ((classes == 0) != no_treatment),
        "treatment_days": (days > a90) | ((days == 0) != (a90 == 0)),
        "duration": ((duration == 0) != no_treatment) | (duration > 90),
        "same_drug_repeat": same_drug != (t90 - drugs),
        "same_class_repeat": same_class != (t90 - classes),
        "repeat_ratio": (ratio < 0) | (ratio >= 1) | (no_treatment & (ratio != 0)),
        "days_since_treatment": (
            (no_treatment & (since != 365))
            | ((t30 > 0) & ((since < 1) | (since > 30)))
            | ((t90 > 0) & (t30 == 0) & ((since < 31) | (since > 90)))
        ),
    }
    return {name: np.flatnonzero(mask).tolist() for name, mask in checks.items() if np.any(mask)}


def train():
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    data = synthetic_training_data()
    scaler = StandardScaler().fit(data)
    model = IsolationForest(n_estimators=200, contamination=0.05, random_state=25007).fit(
        scaler.transform(data)
    )
    joblib.dump({"model": model, "scaler": scaler}, MODEL_DIR / "amu_iforest.joblib")
    metadata = {
        "modelVersion": VERSION,
        "algorithm": "IsolationForest",
        "featureSchema": FEATURES,
        "trainingDataType": "SYNTHETIC_DEMO",
        "trainingDataLabel": "SYNTHETIC DEMONSTRATION DATA",
        "sampleCount": len(data),
        "randomSeed": 25007,
        "generatorRevision": "SYNTHETIC-AMU-1.1",
        "consistencyValidation": True,
        "trainingMatrixSha256": hashlib.sha256(data.astype("<f8").tobytes()).hexdigest(),
        "contamination": 0.05,
        "trainedAt": datetime.now(timezone.utc).isoformat(),
        "featureMeans": dict(zip(FEATURES, data.mean(axis=0).round(4).tolist())),
        "featureStdDev": dict(zip(FEATURES, data.std(axis=0).round(4).tolist())),
    }
    (MODEL_DIR / "metadata.json").write_text(json.dumps(metadata, indent=2), encoding="utf-8")
    return metadata


def load():
    if not (MODEL_DIR / "amu_iforest.joblib").exists():
        train()
    return joblib.load(MODEL_DIR / "amu_iforest.joblib"), json.loads(
        (MODEL_DIR / "metadata.json").read_text(encoding="utf-8")
    )


def infer(features):
    artifact, metadata = load()
    values = np.array([[float(features.get(name, 0) or 0) for name in FEATURES]])
    raw = float(artifact["model"].decision_function(artifact["scaler"].transform(values))[0])
    risk = float(np.clip(50 - raw * 250, 0, 100))
    category = "HIGH" if risk >= 70 else "MEDIUM" if risk >= 40 else "LOW"
    means = metadata["featureMeans"]
    indicators = []
    for name, value in zip(FEATURES, values[0]):
        mean = float(means[name])
        if name == "days_since_previous_treatment":
            if value < max(1, mean * 0.35):
                indicators.append({"feature": name, "value": value, "direction": "LOWER_THAN_BASELINE"})
        elif value > mean + max(1, float(metadata["featureStdDev"][name])):
            indicators.append({"feature": name, "value": value, "direction": "HIGHER_THAN_BASELINE"})
    return {
        "anomalyScore": raw,
        "displayRiskScore": round(risk, 2),
        "category": category,
        "modelVersion": metadata["modelVersion"],
        "evaluatedAt": datetime.now(timezone.utc).isoformat(),
        "contributingIndicators": indicators[:5],
        "disclaimer": DISCLAIMER,
    }
