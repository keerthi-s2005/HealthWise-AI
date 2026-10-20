import os
import sys
import json
from unittest.mock import patch, MagicMock

# Ensure backend directory is in sys.path
backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app import app
from db import init_db

def run_integration_tests():
    print("==========================================================")
    print("   HEALTHWISE-AI BACKEND REACT INTEGRATION TEST SUITE     ")
    print("==========================================================")

    client = app.test_client()

    # 1. CORS Preflight Test
    print("\n1. Testing CORS Preflight (OPTIONS /api/predict for http://localhost:5173)...")
    res_cors = client.options(
        "/api/predict",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "Content-Type"
        }
    )
    print(f"   Status Code: {res_cors.status_code}")
    print(f"   Access-Control-Allow-Origin: {res_cors.headers.get('Access-Control-Allow-Origin')}")
    assert res_cors.status_code in (200, 204)
    assert res_cors.headers.get("Access-Control-Allow-Origin") in ("http://localhost:5173", "*")

    # 2. System Health Endpoint
    print("\n2. Testing System Health API GET /api/system/health & /api/health...")
    res_health = client.get("/api/system/health")
    print(f"   Status Code: {res_health.status_code}")
    print(f"   Response: {res_health.get_json()}")
    assert res_health.status_code == 200
    assert res_health.get_json()["success"] is True

    # 3. Standalone BMI Calculation
    print("\n3. Testing BMI API POST /api/bmi...")
    res_bmi = client.post("/api/bmi", json={"height": 175, "weight": 70})
    print(f"   Status Code: {res_bmi.status_code}")
    print(f"   Response: {res_bmi.get_json()}")
    assert res_bmi.status_code == 200
    assert res_bmi.get_json()["data"]["bmi"] == 22.86
    assert res_bmi.get_json()["data"]["category"] == "Normal weight"

    # 4. User Registration (Mocked DB)
    print("\n4. Testing User Registration POST /api/auth/register...")
    with patch("routes.auth_routes.get_db_connection") as mock_db:
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_conn.cursor.return_value = mock_cursor
        mock_cursor.fetchone.return_value = None
        mock_cursor.lastrowid = 42
        mock_db.return_value = mock_conn

        res_reg = client.post(
            "/api/auth/register",
            json={"name": "Alex Smith", "email": "alex@healthwise.ai", "password": "Password123!"}
        )
        print(f"   Status Code: {res_reg.status_code}")
        print(f"   Response: {res_reg.get_json()}")
        assert res_reg.status_code == 201
        assert res_reg.get_json()["data"]["id"] == 42

    # 5. User Login (Mocked DB)
    print("\n5. Testing User Login POST /api/auth/login...")
    with patch("routes.auth_routes.get_db_connection") as mock_db:
        from werkzeug.security import generate_password_hash
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_conn.cursor.return_value = mock_cursor
        mock_cursor.fetchone.return_value = {
            "id": 42,
            "name": "Alex Smith",
            "email": "alex@healthwise.ai",
            "password_hash": generate_password_hash("Password123!")
        }
        mock_db.return_value = mock_conn

        res_login = client.post(
            "/api/auth/login",
            json={"email": "alex@healthwise.ai", "password": "Password123!"}
        )
        print(f"   Status Code: {res_login.status_code}")
        print(f"   Response: {res_login.get_json()}")
        assert res_login.status_code == 200
        assert res_login.get_json()["data"]["id"] == 42

    # 6. Store Health Record POST /api/health
    print("\n6. Testing Create Health Record POST /api/health...")
    with patch("routes.health_routes.get_db_connection") as mock_db:
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_conn.cursor.return_value = mock_cursor
        mock_cursor.lastrowid = 100
        mock_db.return_value = mock_conn

        res_hr = client.post(
            "/api/health",
            json={
                "user_id": 42,
                "age": 35,
                "gender": "male",
                "height": 175,
                "weight": 90,
                "systolic_bp": 120,
                "diastolic_bp": 80,
                "smoking_status": "smoker",
                "physical_activity": "low",
                "health_conditions": "none"
            }
        )
        print(f"   Status Code: {res_hr.status_code}")
        print(f"   Response: {res_hr.get_json()}")
        assert res_hr.status_code == 201
        assert res_hr.get_json()["data"]["bmi_category"] == "Overweight"
        assert res_hr.get_json()["data"]["systolic_bp"] == 120
        assert res_hr.get_json()["data"]["diastolic_bp"] == 80

    # 7. Retrieve Health Records GET /api/health/<user_id>
    print("\n7. Testing Get User Health Records GET /api/health/42...")
    with patch("routes.health_routes.get_db_connection") as mock_db:
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_conn.cursor.return_value = mock_cursor
        mock_cursor.fetchall.return_value = [{
            "id": 100,
            "user_id": 42,
            "age": 35,
            "gender": "male",
            "height": 175.0,
            "weight": 90.0,
            "bmi": 29.39,
            "systolic_bp": 120,
            "diastolic_bp": 80,
            "smoking_status": "smoker",
            "physical_activity": "low",
            "health_conditions": "none",
            "created_at": None
        }]
        mock_db.return_value = mock_conn

        res_gh = client.get("/api/health/42")
        print(f"   Status Code: {res_gh.status_code}")
        print(f"   Response: {res_gh.get_json()}")
        assert res_gh.status_code == 200
        assert res_gh.get_json()["count"] == 1
        assert res_gh.get_json()["data"][0]["systolic_bp"] == 120
        assert res_gh.get_json()["data"][0]["diastolic_bp"] == 80

    # 8. Update Health Record PUT /api/health/<user_id>
    print("\n8. Testing Update Health Record PUT /api/health/42...")
    with patch("routes.health_routes.get_db_connection") as mock_db:
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_conn.cursor.return_value = mock_cursor
        mock_cursor.fetchone.return_value = {
            "id": 100, "user_id": 42, "age": 35, "gender": "male",
            "height": 175.0, "weight": 90.0, "bmi": 29.39,
            "systolic_bp": 120, "diastolic_bp": 80,
            "smoking_status": "smoker", "physical_activity": "low", "health_conditions": "none"
        }
        mock_db.return_value = mock_conn

        res_put = client.put("/api/health/42", json={"weight": 80.0, "systolic_bp": 125, "diastolic_bp": 82, "physical_activity": "moderate"})
        print(f"   Status Code: {res_put.status_code}")
        print(f"   Response: {res_put.get_json()}")
        assert res_put.status_code == 200
        assert res_put.get_json()["data"]["weight"] == 80.0
        assert res_put.get_json()["data"]["systolic_bp"] == 125
        assert res_put.get_json()["data"]["diastolic_bp"] == 82

    # 9. ML Prediction POST /api/predict
    print("\n9. Testing ML Health Risk Prediction POST /api/predict...")
    res_pred = client.post(
        "/api/predict",
        json={
            "user_id": 42,
            "age": 35,
            "gender": "male",
            "height": 175,
            "weight": 90,
            "smoking_status": "smoker",
            "physical_activity": "low",
            "health_conditions": "none"
        }
    )
    print(f"   Status Code: {res_pred.status_code}")
    print(f"   Response: {res_pred.get_json()}")
    assert res_pred.status_code == 200
    assert res_pred.get_json()["success"] is True
    assert "prediction" in res_pred.get_json()

    # 10. Recommendations GET /api/recommendations/<user_id>
    print("\n10. Testing Recommendations GET /api/recommendations/42...")
    with patch("routes.recommendation_routes.get_db_connection") as mock_db:
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_conn.cursor.return_value = mock_cursor
        mock_cursor.fetchone.return_value = {
            "age": 35, "gender": "male", "height": 175.0, "weight": 90.0,
            "bmi": 29.39, "systolic_bp": 135, "diastolic_bp": 85,
            "smoking_status": "smoker", "physical_activity": "low", "health_conditions": "none"
        }
        mock_db.return_value = mock_conn

        res_rec = client.get("/api/recommendations/42")
        print(f"   Status Code: {res_rec.status_code}")
        print(f"   Response: {res_rec.get_json()}")
        assert res_rec.status_code == 200
        assert res_rec.get_json()["success"] is True

    # 11. Error Handlers & Invalid Payload Tests
    print("\n11. Testing Bad Request Handling & Invalid JSON...")
    res_bad = client.post("/api/bmi", data="invalid non-json text", content_type="text/plain")
    print(f"   Status Code: {res_bad.status_code}")
    print(f"   Response: {res_bad.get_json()}")
    assert res_bad.status_code == 400
    assert res_bad.get_json()["success"] is False

    # 12. AI Recommendations Proxy Test (Mocked Gemini Response)
    print("\n12. Testing AI Recommendations Proxy POST /api/ai/recommendations...")
    with patch("routes.recommendation_routes.Config.GEMINI_API_KEY", "mock_key_for_testing"), patch("urllib.request.urlopen") as mock_urlopen:
        mock_response = MagicMock()
        mock_response.read.return_value = json.dumps({
            "candidates": [{
                "content": {
                    "parts": [{
                        "text": json.dumps({
                            "summary": "AI summary text.",
                            "goal_advice": "Goal advice text.",
                            "nutrition_recommendations": "Nutrition text.",
                            "diet_chart": {
                                "breakfast": "Breakfast menu",
                                "mid_morning": "Snack",
                                "lunch": "Lunch menu",
                                "evening_snack": "Snack",
                                "dinner": "Dinner menu",
                                "hydration": "Water"
                            },
                            "recommended_foods": ["food1"],
                            "foods_to_limit": ["food2"],
                            "daily_meal_suggestions": "Meal plan",
                            "hydration_guidance": "Hydration tips",
                            "lifestyle_recommendations": "Lifestyle tips",
                            "physical_activity_suggestions": "Exercise tips",
                            "practical_habits": "Habits",
                            "safety_considerations": "Safety tips"
                        })
                    }]
                }
            }]
        }).encode("utf-8")
        mock_response.getcode.return_value = 200
        mock_urlopen.return_value.__enter__.return_value = mock_response

        res_ai = client.post(
            "/api/ai/recommendations",
            json={
                "name": "Alex Smith",
                "age": 35,
                "gender": "male",
                "height": 175,
                "weight": 90,
                "bmi": 29.39,
                "bmiCategory": "Overweight",
                "smoking": "smoker",
                "activity": "low",
                "conditions": "none"
            }
        )
        print(f"   Status Code: {res_ai.status_code}")
        print(f"   Response: {res_ai.get_json()}")
        assert res_ai.status_code == 200
        assert "summary" in res_ai.get_json()
        assert res_ai.get_json()["summary"] == "AI summary text."

    print("\n==========================================================")
    print("   ALL INTEGRATION TESTS PASSED - BACKEND READY FOR REACT!")
    print("==========================================================")

if __name__ == "__main__":
    run_integration_tests()
