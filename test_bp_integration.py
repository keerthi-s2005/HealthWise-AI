import os
import sys

# Ensure backend directory is in sys.path
backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app import app
from db import get_db_connection

def run_bp_tests():
    print("==========================================================")
    print("      HEALTHWISE-AI BLOOD PRESSURE INTEGRATION SUITE      ")
    print("==========================================================")

    client = app.test_client()

    # 1. Database Schema Column Inspection
    print("\n1. Verifying MySQL health_records Table Schema...")
    conn = get_db_connection()
    assert conn is not None, "Failed to connect to MySQL database!"
    cursor = conn.cursor(dictionary=True)
    cursor.execute("DESCRIBE health_records;")
    columns_info = {row["Field"]: row["Type"] for row in cursor.fetchall()}
    cursor.close()
    conn.close()

    print(f"   Columns found: {list(columns_info.keys())}")
    assert "systolic_bp" in columns_info, "systolic_bp column missing!"
    assert "diastolic_bp" in columns_info, "diastolic_bp column missing!"
    print(f"   systolic_bp type: {columns_info['systolic_bp']}")
    print(f"   diastolic_bp type: {columns_info['diastolic_bp']}")
    print("   [PASS] Database schema columns verified!")

    # 2. Invalid Blood Pressure Validation Tests (HTTP 400)
    print("\n2. Testing Invalid Blood Pressure Input Validations (HTTP 400)...")
    
    # 2a. Negative values
    res_neg = client.post("/api/health", json={
        "user_id": 999, "age": 30, "gender": "male", "height": 170, "weight": 70,
        "systolic_bp": -120, "diastolic_bp": 80
    })
    print(f"   Negative BP Status Code: {res_neg.status_code} - {res_neg.get_json()['message']}")
    assert res_neg.status_code == 400

    # 2b. Non-numeric text
    res_text = client.post("/api/health", json={
        "user_id": 999, "age": 30, "gender": "male", "height": 170, "weight": 70,
        "systolic_bp": "invalid_bp", "diastolic_bp": 80
    })
    print(f"   Non-numeric BP Status Code: {res_text.status_code} - {res_text.get_json()['message']}")
    assert res_text.status_code == 400

    # 2c. Systolic <= Diastolic
    res_inv_order = client.post("/api/health", json={
        "user_id": 999, "age": 30, "gender": "male", "height": 170, "weight": 70,
        "systolic_bp": 80, "diastolic_bp": 120
    })
    print(f"   Systolic <= Diastolic Status Code: {res_inv_order.status_code} - {res_inv_order.get_json()['message']}")
    assert res_inv_order.status_code == 400

    # 2d. Only one value supplied
    res_one = client.post("/api/health", json={
        "user_id": 999, "age": 30, "gender": "male", "height": 170, "weight": 70,
        "systolic_bp": 120
    })
    print(f"   Partial BP Status Code: {res_one.status_code} - {res_one.get_json()['message']}")
    assert res_one.status_code == 400
    print("   [PASS] All invalid blood pressure payload validations passed!")

    # 3. Create Health Record with BP (POST /api/health)
    print("\n3. Testing POST /api/health with Valid Blood Pressure (120/80)...")
    test_user_id = 9999

    # Create test user in users table to satisfy Foreign Key constraint
    conn_usr = get_db_connection()
    if conn_usr:
        cursor_usr = conn_usr.cursor()
        cursor_usr.execute("INSERT IGNORE INTO users (id, name, email, password_hash) VALUES (%s, %s, %s, %s);", (test_user_id, "BP Test User", "bptest@healthwise.ai", "hashed_pwd"))
        conn_usr.commit()
        cursor_usr.close()
        conn_usr.close()

    res_post = client.post("/api/health", json={
        "user_id": test_user_id,
        "age": 30,
        "gender": "male",
        "height": 175,
        "weight": 72,
        "systolic_bp": 120,
        "diastolic_bp": 80,
        "smoking_status": "non-smoker",
        "physical_activity": "moderate",
        "health_conditions": "none"
    })
    print(f"   Status Code: {res_post.status_code}")
    print(f"   Response Payload: {res_post.get_json()}")
    assert res_post.status_code == 201
    post_data = res_post.get_json()["data"]
    assert post_data["systolic_bp"] == 120
    assert post_data["diastolic_bp"] == 80
    record_id = post_data["id"]
    print("   [PASS] POST /api/health returned created record with systolic_bp=120, diastolic_bp=80!")

    # 4. Direct MySQL Database Query Verification
    print("\n4. Directly Querying MySQL health_records Table for Stored Row...")
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT id, user_id, age, height, weight, bmi, systolic_bp, diastolic_bp FROM health_records WHERE user_id = %s ORDER BY created_at DESC LIMIT 1;", (test_user_id,))
    db_row = cursor.fetchone()
    cursor.close()
    conn.close()

    print(f"   Stored MySQL Row: {db_row}")
    assert db_row is not None, "No row found in MySQL database!"
    assert db_row["systolic_bp"] == 120, f"Expected 120, got {db_row['systolic_bp']}"
    assert db_row["diastolic_bp"] == 80, f"Expected 80, got {db_row['diastolic_bp']}"
    print("   [PASS] Confirmed exact values in MySQL: systolic_bp=120, diastolic_bp=80!")

    # 5. Retrieve Health Record (GET /api/health/<user_id>)
    print(f"\n5. Testing GET /api/health/{test_user_id}...")
    res_get = client.get(f"/api/health/{test_user_id}")
    print(f"   Status Code: {res_get.status_code}")
    print(f"   Response Payload: {res_get.get_json()}")
    assert res_get.status_code == 200
    get_records = res_get.get_json()["data"]
    assert len(get_records) > 0
    latest_get = get_records[0]
    assert latest_get["systolic_bp"] == 120
    assert latest_get["diastolic_bp"] == 80
    print("   [PASS] GET /api/health returned systolic_bp=120, diastolic_bp=80!")

    # 6. Update Health Record (PUT /api/health/<user_id>)
    print(f"\n6. Testing PUT /api/health/{test_user_id} (Updating to 125/82)...")
    res_put = client.put(f"/api/health/{test_user_id}", json={
        "systolic_bp": 125,
        "diastolic_bp": 82
    })
    print(f"   Status Code: {res_put.status_code}")
    print(f"   Response Payload: {res_put.get_json()}")
    assert res_put.status_code == 200
    put_data = res_put.get_json()["data"]
    assert put_data["systolic_bp"] == 125
    assert put_data["diastolic_bp"] == 82
    print("   [PASS] PUT /api/health updated BP to 125/82 successfully!")

    # 7. Test Recommendation Generation with BP
    print(f"\n7. Testing Recommendations GET /api/recommendations/{test_user_id}...")
    # Update to high BP to test recommendation trigger
    client.put(f"/api/health/{test_user_id}", json={"systolic_bp": 140, "diastolic_bp": 90})
    res_rec = client.get(f"/api/recommendations/{test_user_id}")
    print(f"   Status Code: {res_rec.status_code}")
    print(f"   Recommendations: {res_rec.get_json()['recommendations']}")
    assert res_rec.status_code == 200
    recs = res_rec.get_json()["recommendations"]
    assert any("sodium" in item.lower() or "blood pressure" in item.lower() for item in recs.get("dietary", []))
    print("   [PASS] Tailored blood pressure recommendations generated!")

    # Cleanup test record and user
    conn = get_db_connection()
    if conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM health_records WHERE user_id = %s;", (test_user_id,))
        cursor.execute("DELETE FROM users WHERE id = %s;", (test_user_id,))
        conn.commit()
        cursor.close()
        conn.close()

    print("\n==========================================================")
    print("      ALL BLOOD PRESSURE INTEGRATION TESTS PASSED!       ")
    print("==========================================================")

if __name__ == "__main__":
    run_bp_tests()
