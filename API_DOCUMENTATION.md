# HealthWise-AI Backend REST API Documentation

This documentation details all available REST API endpoints for the **HealthWise-AI** backend server running on `http://localhost:5000`.

---

## Base URL
```
http://localhost:5000/api
```

---

## 1. System Health Check

### `GET /api/system/health` or `GET /api/health`
Checks if the backend server is online and running.

#### Response `200 OK`
```json
{
  "success": true,
  "message": "HealthWise-AI backend is running"
}
```

---

## 2. Authentication APIs

### `POST /api/auth/register`
Registers a new user account. Passwords are securely hashed before storage.

#### Request Body
```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "password": "SecurePassword123!"
}
```

#### Response `201 Created`
```json
{
  "success": true,
  "message": "User registered successfully.",
  "data": {
    "id": 1,
    "name": "Jane Doe",
    "email": "jane@example.com"
  }
}
```

#### Error Response `409 Conflict` (Email Already Exists)
```json
{
  "success": false,
  "message": "An account with this email already exists."
}
```

---

### `POST /api/auth/login`
Authenticates user credentials against stored password hashes.

#### Request Body
```json
{
  "email": "jane@example.com",
  "password": "SecurePassword123!"
}
```

#### Response `200 OK`
```json
{
  "success": true,
  "message": "Login successful.",
  "data": {
    "id": 1,
    "name": "Jane Doe",
    "email": "jane@example.com"
  }
}
```

#### Error Response `401 Unauthorized`
```json
{
  "success": false,
  "message": "Invalid email or password."
}
```

---

## 3. BMI Calculation API

### `POST /api/bmi`
Calculates Body Mass Index (BMI) and returns category. Accepts height in cm or meters.

#### Request Body
```json
{
  "height": 170,
  "weight": 65
}
```

#### Response `200 OK`
```json
{
  "success": true,
  "message": "BMI calculated successfully.",
  "data": {
    "bmi": 22.49,
    "category": "Normal weight"
  }
}
```

---

## 4. User Health Records APIs

### `POST /api/health`
Creates and stores a user health record. Calculates BMI automatically on the backend.

#### Request Body
```json
{
  "user_id": 1,
  "age": 45,
  "gender": "female",
  "height": 160,
  "weight": 85,
  "systolic_bp": 120,
  "diastolic_bp": 80,
  "smoking_status": "smoker",
  "physical_activity": "low",
  "health_conditions": "hypertension"
}
```

#### Response `201 Created`
```json
{
  "success": true,
  "message": "Health record saved successfully.",
  "data": {
    "id": 10,
    "user_id": 1,
    "age": 45,
    "gender": "female",
    "height": 160.0,
    "weight": 85.0,
    "bmi": 33.2,
    "bmi_category": "Obese",
    "systolic_bp": 120,
    "diastolic_bp": 80,
    "smoking_status": "smoker",
    "physical_activity": "low",
    "health_conditions": "hypertension"
  }
}
```

---

### `GET /api/health/<user_id>`
Retrieves all recorded health entries for a specific user ID.

#### Response `200 OK`
```json
{
  "success": true,
  "user_id": 1,
  "count": 1,
  "data": [
    {
      "id": 10,
      "user_id": 1,
      "age": 45,
      "gender": "female",
      "height": 160.0,
      "weight": 85.0,
      "bmi": 33.2,
      "systolic_bp": 120,
      "diastolic_bp": 80,
      "smoking_status": "smoker",
      "physical_activity": "low",
      "health_conditions": "hypertension",
      "created_at": "2026-08-29T03:25:00"
    }
  ]
}
```

---

### `PUT /api/health/<user_id>`
Updates the latest health record for the specified user ID.

#### Request Body
```json
{
  "weight": 82,
  "systolic_bp": 125,
  "diastolic_bp": 82,
  "physical_activity": "moderate"
}
```

#### Response `200 OK`
```json
{
  "success": true,
  "message": "Health record updated successfully.",
  "data": {
    "id": 10,
    "user_id": 1,
    "age": 45,
    "gender": "female",
    "height": 160.0,
    "weight": 82.0,
    "bmi": 32.03,
    "bmi_category": "Obese",
    "systolic_bp": 125,
    "diastolic_bp": 82,
    "smoking_status": "smoker",
    "physical_activity": "moderate",
    "health_conditions": "hypertension"
  }
}
```

---

## 5. Machine Learning Prediction API

### `POST /api/predict`
Generates an AI-based health risk estimation using the trained `RandomForestClassifier` pipeline.

> **Disclaimer**: This prediction is for educational/demonstration purposes only and does not constitute medical diagnosis.

#### Request Body
```json
{
  "user_id": 1,
  "age": 45,
  "gender": "female",
  "height": 160,
  "weight": 85,
  "smoking_status": "smoker",
  "physical_activity": "low",
  "health_conditions": "hypertension"
}
```

#### Response `200 OK`
```json
{
  "success": true,
  "prediction": "High",
  "risk_score": 0.99,
  "model_probabilities": {
    "Low": 0.0,
    "Moderate": 0.01,
    "High": 0.99
  },
  "input_processed": {
    "age": 45.0,
    "gender": "female",
    "height": 160.0,
    "weight": 85.0,
    "bmi": 33.2,
    "smoking_status": "smoker",
    "physical_activity": "low",
    "health_conditions": "hypertension"
  },
  "message": "AI-based health risk estimation generated successfully.",
  "disclaimer": "AI-based health risk estimation generated for project demonstration purposes only. Not a medical diagnosis."
}
```

---

## 6. Recommendations API

### `GET /api/recommendations/<user_id>`
Fetches rule-based dietary, fitness, and lifestyle recommendations derived from user health profile.

#### Response `200 OK`
```json
{
  "success": true,
  "user_id": 1,
  "summary": "Tailored recommendations for Obese profile.",
  "recommendations": {
    "dietary": [
      "Adopt a calorie-conscious diet rich in vegetables, legumes, and lean protein while limiting saturated fats.",
      "Reduce dietary sodium intake and consume potassium-rich foods like leafy greens and bananas."
    ],
    "exercise": [
      "Start with low-impact exercises like swimming, water aerobics, or stationary cycling to protect joints.",
      "Increase daily steps by taking short walking breaks every 1-2 hours."
    ],
    "lifestyle": [
      "Consider a smoking cessation program. Quitting smoking significantly improves cardiovascular and pulmonary health."
    ]
  },
  "disclaimer": "These recommendations are generated for educational and general health awareness purposes only. They do not replace advice from a qualified healthcare professional."
}
```

---

## React Frontend Integration Example

```javascript
// Example API helper for React
const API_BASE = 'http://localhost:5000/api';

export async function loginUser(email, password) {
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  return response.json();
}

export async function getMLPrediction(healthData) {
  const response = await fetch(`${API_BASE}/predict`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(healthData)
  });
  return response.json();
}
```
