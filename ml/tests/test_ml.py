from app.model import infer, synthetic_consistency_issues, synthetic_training_data
from app.retrieval import retrieve


def base():
    return dict.fromkeys([
        "treatments_30d", "treatments_90d", "administrations_30d", "administrations_90d",
        "distinct_drugs_90d", "distinct_classes_90d", "treatment_days_90d",
        "average_duration_days_90d", "same_drug_repeat_90d", "same_class_repeat_90d",
        "repeat_episode_ratio_90d", "days_since_previous_treatment",
    ], 0)


def test_training_is_reproducible():
    assert (synthetic_training_data() == synthetic_training_data()).all()


def test_synthetic_training_rows_are_logically_consistent():
    data = synthetic_training_data()
    assert data.shape == (800, 12)
    assert synthetic_consistency_issues(data) == {}
    no_treatment = data[:, 1] == 0
    assert (data[no_treatment, :11] == 0).all()
    assert (data[no_treatment, 11] == 365).all()


def test_controlled_anomaly_scores_higher_than_normal():
    normal = base() | {"treatments_90d": 1, "administrations_90d": 2, "distinct_drugs_90d": 1, "distinct_classes_90d": 1, "days_since_previous_treatment": 60}
    anomaly = base() | {"treatments_30d": 14, "treatments_90d": 22, "administrations_30d": 35, "administrations_90d": 70, "distinct_drugs_90d": 6, "distinct_classes_90d": 5, "treatment_days_90d": 45, "same_drug_repeat_90d": 16, "same_class_repeat_90d": 18, "repeat_episode_ratio_90d": .8, "days_since_previous_treatment": 1}
    assert infer(anomaly)["displayRiskScore"] > infer(normal)["displayRiskScore"]
    assert infer(anomaly)["category"] == "HIGH"


def test_missing_values_are_safe_and_deterministic():
    first = infer({})
    second = infer({})
    assert first["displayRiskScore"] == second["displayRiskScore"]


def test_retrieval_preserves_provenance_and_relevance():
    chunks = retrieve("milk withdrawal period eligibility", 3)
    assert chunks and all(x["sourceReference"] for x in chunks)
    assert any("withdrawal" in x["content"].lower() for x in chunks)


def test_unsupported_retrieval_returns_no_fabricated_source():
    assert retrieve("quantum spaceship warp reactor zyxwv", 3) == []
