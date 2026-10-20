import os
import joblib
import pandas as pd
from services.bmi_service import calculate_bmi

_pipeline = None

def get_model():
    """
    Lazy loads the trained joblib model pipeline from backend/ml/model.pkl.
    """
    global _pipeline
    if _pipeline is not None:
        return _pipeline

    current_dir = os.path.dirname(os.path.abspath(__file__))
    model_path = os.path.normpath(os.path.join(current_dir, "..", "ml", "model.pkl"))

    if os.path.exists(model_path):
        try:
            _pipeline = joblib.load(model_path)
            return _pipeline
        except Exception as e:
            print(f"Error loading ML model from {model_path}: {e}")
            return None
    else:
        print(f"Model file not found at {model_path}. Trying auto-train...")
        try:
            from ml.train_model import train
            train()
            if os.path.exists(model_path):
                _pipeline = joblib.load(model_path)
                return _pipeline
        except Exception as err:
            print(f"Auto-train failed: {err}")
            return None
    return None

def predict_health_risk(input_data):
    """
    Accepts health features dict and returns ML prediction.

    Input dict expected keys:
        - age (int)
        - gender (str)
        - height (float)
        - weight (float)
        - bmi (float, optional - calculated if missing)
        - smoking_status (str)
        - physical_activity (str)
        - health_conditions (str)
    """
    age = float(input_data.get("age", 30))
    gender = str(input_data.get("gender", "male")).strip().lower()
    height = float(input_data.get("height", 170))
    weight = float(input_data.get("weight", 70))
    
    # Calculate BMI if missing
    if "bmi" in input_data and input_data["bmi"]:
        bmi_val = float(input_data["bmi"])
    else:
        bmi_res = calculate_bmi(height, weight)
        bmi_val = bmi_res["bmi"]

    smoking_status = str(input_data.get("smoking_status", "non-smoker")).strip().lower()
    physical_activity = str(input_data.get("physical_activity", "moderate")).strip().lower()
    health_conditions = str(input_data.get("health_conditions", "none")).strip().lower()

    formatted_sample = {
        "age": age,
        "gender": gender,
        "height": height,
        "weight": weight,
        "bmi": bmi_val,
        "smoking_status": smoking_status,
        "physical_activity": physical_activity,
        "health_conditions": health_conditions
    }

    pipeline = get_model()

    if pipeline is not None:
        try:
            df = pd.DataFrame([formatted_sample])
            prediction = str(pipeline.predict(df)[0])
            probabilities = pipeline.predict_proba(df)[0]
            classes = list(pipeline.classes_)

            prob_dict = {str(cls): round(float(prob), 4) for cls, prob in zip(classes, probabilities)}
            
            # Risk score calculation (confidence associated with Moderate or High risk)
            mod_prob = prob_dict.get("Moderate", 0.0)
            high_prob = prob_dict.get("High", 0.0)
            risk_score = round(mod_prob * 0.5 + high_prob * 1.0, 2)

            return {
                "success": True,
                "prediction": prediction,
                "risk_score": risk_score,
                "model_probabilities": prob_dict,
                "input_processed": formatted_sample,
                "message": "AI-based health risk estimation generated successfully.",
                "disclaimer": "AI-based health risk estimation generated for project demonstration purposes only. Not a medical diagnosis."
            }
        except Exception as e:
            print(f"Error during ML inference: {e}")

    # Graceful fallback rule-based risk calculation if ML pipeline unavailable
    fallback_risk = "Low"
    score = 0.2
    if bmi_val >= 30 or "smoker" in smoking_status or health_conditions != "none":
        fallback_risk = "High"
        score = 0.85
    elif bmi_val >= 25 or physical_activity == "low":
        fallback_risk = "Moderate"
        score = 0.5

    return {
        "success": True,
        "prediction": fallback_risk,
        "risk_score": score,
        "model_probabilities": {fallback_risk: 1.0},
        "input_processed": formatted_sample,
        "message": "Health risk estimation generated via fallback rule system.",
        "disclaimer": "AI-based health risk estimation generated for project demonstration purposes only. Not a medical diagnosis."
    }
