import os
import pandas as pd
import numpy as np

from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, accuracy_score
import joblib

def train():
    """
    Trains a RandomForestClassifier pipeline on dataset.csv and saves the model bundle to model.pkl.
    """
    current_dir = os.path.dirname(os.path.abspath(__file__))
    dataset_path = os.path.join(current_dir, "dataset.csv")
    model_output_path = os.path.join(current_dir, "model.pkl")

    if not os.path.exists(dataset_path):
        raise FileNotFoundError(f"Dataset file not found at {dataset_path}")

    print(f"Loading dataset from {dataset_path}...")
    df = pd.read_csv(dataset_path)

    # Required features and target
    num_features = ["age", "height", "weight", "bmi"]
    cat_features = ["gender", "smoking_status", "physical_activity", "health_conditions"]
    target = "risk_level"

    X = df[num_features + cat_features]
    y = df[target]

    # Split train/test
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

    # Preprocessing Pipeline
    preprocessor = ColumnTransformer(
        transformers=[
            ("num", StandardScaler(), num_features),
            ("cat", OneHotEncoder(handle_unknown="ignore", sparse_output=False), cat_features)
        ]
    )

    # Full Model Pipeline
    pipeline = Pipeline(
        steps=[
            ("preprocessor", preprocessor),
            ("classifier", RandomForestClassifier(n_estimators=100, random_state=42))
        ]
    )

    # Train Model
    print("Training RandomForestClassifier pipeline...")
    pipeline.fit(X_train, y_train)

    # Evaluate
    y_pred = pipeline.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred)
    print(f"Model Accuracy on Test Set: {accuracy * 100:.2f}%")
    print("Classification Report:")
    print(classification_report(y_test, y_pred))

    # Save Pipeline using joblib
    joblib.dump(pipeline, model_output_path)
    print(f"Model successfully trained and saved to {model_output_path}")

if __name__ == "__main__":
    train()
