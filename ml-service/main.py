import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, model_validator
import pandas as pd
import joblib

app = FastAPI(title="Animal Risk Prediction ML Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MODEL_PATH = os.path.join(os.path.dirname(__file__), "animal_risk_random_forest.pkl")
model = joblib.load(MODEL_PATH)

# Biological limits based on species maximum lifespan & physiology
SPECIES_LIMITS = {
    "Cow": {"max_age": 25.0, "min_weight": 20.0, "max_weight": 1400.0},
    "Buffalo": {"max_age": 25.0, "min_weight": 20.0, "max_weight": 1400.0},
    "Goat": {"max_age": 18.0, "min_weight": 2.0, "max_weight": 160.0},
    "Sheep": {"max_age": 15.0, "min_weight": 2.0, "max_weight": 180.0},
    "Chicken": {"max_age": 10.0, "min_weight": 0.1, "max_weight": 10.0},
}


class AnimalData(BaseModel):
    species: str
    age_years: float = Field(..., gt=0)
    weight_kg: float = Field(..., gt=0)
    treatments_last_30d: int = Field(..., ge=0)
    treatments_last_90d: int = Field(..., ge=0)
    days_since_last_treatment: int = Field(..., ge=0)
    unique_antimicrobial_classes_90d: int = Field(..., ge=0)
    max_repeated_class_count_90d: int = Field(..., ge=0)
    mean_treatment_interval_days: float = Field(..., ge=0)
    total_antimicrobial_days_90d: int = Field(..., ge=0, le=90)
    recurrent_condition_events_90d: int = Field(..., ge=0)
    no_response_events_90d: int = Field(..., ge=0)
    partial_response_events_90d: int = Field(..., ge=0)

    @model_validator(mode="after")
    def validate_biological_and_logical_constraints(self):
        errors = []

        # 1. Species existence check
        limits = SPECIES_LIMITS.get(self.species)
        if not limits:
            errors.append(f"Unsupported species '{self.species}'. Allowed: {', '.join(SPECIES_LIMITS.keys())}")
            raise ValueError("; ".join(errors))

        # 2. Maximum lifespan constraint
        if self.age_years > limits["max_age"]:
            errors.append(
                f"Age {self.age_years} yrs exceeds maximum lifespan for {self.species} (max: {limits['max_age']} yrs)."
            )

        # 3. Weight bounds
        if self.weight_kg < limits["min_weight"] or self.weight_kg > limits["max_weight"]:
            errors.append(
                f"Weight {self.weight_kg} kg is outside realistic range for {self.species} ({limits['min_weight']}-{limits['max_weight']} kg)."
            )

        # 4. Days since last treatment cannot exceed total days alive
        max_possible_days_alive = int(self.age_years * 365.25)
        if self.days_since_last_treatment > max_possible_days_alive:
            errors.append(
                f"Days since last treatment ({self.days_since_last_treatment} days) cannot exceed total days the animal has been alive ({max_possible_days_alive} days for {self.age_years} years)."
            )

        # 5. Treatments in 30d cannot exceed treatments in 90d
        if self.treatments_last_30d > self.treatments_last_90d:
            errors.append(
                f"Treatments in last 30 days ({self.treatments_last_30d}) cannot exceed treatments in last 90 days ({self.treatments_last_90d})."
            )

        # 6. Recency vs Treatment count consistency
        if self.treatments_last_30d > 0 and self.days_since_last_treatment > 30:
            errors.append(
                f"If animal had {self.treatments_last_30d} treatments in last 30 days, days since last treatment must be <= 30 (got {self.days_since_last_treatment})."
            )

        if self.days_since_last_treatment > 90 and (self.treatments_last_90d > 0 or self.total_antimicrobial_days_90d > 0):
            errors.append(
                f"If last treatment was {self.days_since_last_treatment} days ago (>90d), treatments in last 90 days and total antimicrobial days in 90 days must be 0."
            )

        # 7. Sub-events count checks
        if self.treatments_last_90d > 0:
            if self.unique_antimicrobial_classes_90d > self.treatments_last_90d:
                errors.append("Unique antimicrobial classes cannot exceed total treatment count in 90 days.")
            if self.max_repeated_class_count_90d > self.treatments_last_90d:
                errors.append("Maximum repeated class count cannot exceed total treatment count in 90 days.")
            if (self.no_response_events_90d + self.partial_response_events_90d) > self.treatments_last_90d:
                errors.append("Sum of (no response + partial response) events cannot exceed treatments in last 90 days.")
            if self.recurrent_condition_events_90d > self.treatments_last_90d:
                errors.append("Recurrent condition events cannot exceed treatments in last 90 days.")
        else:
            if self.unique_antimicrobial_classes_90d > 0:
                errors.append("Unique antimicrobial classes in 90 days must be 0 if treatments in last 90 days is 0.")
            if self.max_repeated_class_count_90d > 0:
                errors.append("Max repeated class count must be 0 if treatments in last 90 days is 0.")
            if self.no_response_events_90d > 0 or self.partial_response_events_90d > 0:
                errors.append("Treatment failure events must be 0 if treatments in last 90 days is 0.")

        if errors:
            raise ValueError(" | ".join(errors))

        return self


@app.get("/")
def home():
    return {
        "message": "Animal Risk ML Service Running",
        "supported_species": list(SPECIES_LIMITS.keys()),
        "limits": SPECIES_LIMITS
    }


@app.post("/predict")
def predict(data: AnimalData):
    try:
        input_data = pd.DataFrame([{
            "species": data.species,
            "age_years": data.age_years,
            "weight_kg": data.weight_kg,
            "treatments_last_30d": data.treatments_last_30d,
            "treatments_last_90d": data.treatments_last_90d,
            "days_since_last_treatment": data.days_since_last_treatment,
            "unique_antimicrobial_classes_90d": data.unique_antimicrobial_classes_90d,
            "max_repeated_class_count_90d": data.max_repeated_class_count_90d,
            "mean_treatment_interval_days": data.mean_treatment_interval_days,
            "total_antimicrobial_days_90d": data.total_antimicrobial_days_90d,
            "recurrent_condition_events_90d": data.recurrent_condition_events_90d,
            "no_response_events_90d": data.no_response_events_90d,
            "partial_response_events_90d": data.partial_response_events_90d
        }])

        prediction = model.predict(input_data)
        probabilities = model.predict_proba(input_data)[0]
        classes = model.classes_

        probability_result = {
            class_name: float(probability)
            for class_name, probability in zip(classes, probabilities)
        }

        return {
            "prediction": prediction[0],
            "probabilities": probability_result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))