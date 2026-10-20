import json
from flask import Blueprint, request, jsonify
from services.ml_service import predict_health_risk
from db import get_db_connection

prediction_bp = Blueprint("prediction", __name__, url_prefix="/api")

@prediction_bp.route("/predict", methods=["POST"])
def predict():
    data = request.get_json(silent=True) or {}
    user_id = data.get("user_id")

    # Perform ML risk estimation
    result = predict_health_risk(data)

    # Save to database if user_id is provided
    if user_id and result.get("success"):
        conn = get_db_connection()
        if conn:
            try:
                cursor = conn.cursor()
                cursor.execute(
                    """
                    INSERT INTO predictions (user_id, prediction_result, risk_score, details)
                    VALUES (%s, %s, %s, %s)
                    """,
                    (
                        user_id,
                        result.get("prediction", "Unknown"),
                        result.get("risk_score", 0.0),
                        json.dumps(result.get("model_probabilities", {}))
                    )
                )
                conn.commit()
                cursor.close()
                conn.close()
            except Exception as err:
                print(f"Error saving prediction to DB: {err}")

    return jsonify(result), 200
