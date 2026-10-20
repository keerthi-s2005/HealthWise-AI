import os
import joblib
import pandas as pd

def predict_single(data):
    """
    Helper function to test prediction on a single sample dictionary.
    """
    current_dir = os.path.dirname(os.path.abspath(__file__))
    model_path = os.path.join(current_dir, "model.pkl")

    if not os.path.exists(model_path):
        print(f"Model file not found at {model_path}. Please run train_model.py first.")
        return None

    pipeline = joblib.load(model_path)
    df = pd.DataFrame([data])
    
    prediction = pipeline.predict(df)[0]
    probabilities = pipeline.predict_proba(df)[0]
    classes = pipeline.classes_

    prob_dict = {cls: float(prob) for cls, prob in zip(classes, probabilities)}

    return {
        "prediction": prediction,
        "probabilities": prob_dict
    }

if __name__ == "__main__":
    sample_input = {
        "age": 45,
        "gender": "female",
        "height": 160,
        "weight": 85,
        "bmi": 33.2,
        "smoking_status": "smoker",
        "physical_activity": "low",
        "health_conditions": "hypertension"
    }
    result = predict_single(sample_input)
    print("Test Sample Prediction Output:")
    print(result)
