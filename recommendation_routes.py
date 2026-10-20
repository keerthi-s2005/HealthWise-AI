import json
import urllib.request
import urllib.error
import time
from flask import Blueprint, request, jsonify
from services.recommendation_service import generate_recommendations
from services.bmi_service import calculate_bmi
from db import get_db_connection
from config import Config

recommendation_bp = Blueprint("recommendation", __name__, url_prefix="/api")

@recommendation_bp.route("/recommendations/<int:user_id>", methods=["GET"])
def get_recommendations(user_id):
    conn = get_db_connection()
    health_data = {}

    if conn:
        try:
            cursor = conn.cursor(dictionary=True)
            cursor.execute(
                """
                SELECT age, gender, height, weight, bmi, systolic_bp, diastolic_bp, smoking_status, physical_activity, health_conditions
                FROM health_records
                WHERE user_id = %s
                ORDER BY created_at DESC
                LIMIT 1
                """,
                (user_id,)
            )
            record = cursor.fetchone()
            if record:
                health_data = record
                # Calculate category if not directly stored
                bmi_res = calculate_bmi(record["height"], record["weight"])
                health_data["bmi_category"] = bmi_res["category"]
            cursor.close()
            conn.close()
        except Exception as err:
            print(f"Error reading health record for recommendation: {err}")

    # Fallback to query parameters if no database record found
    if not health_data:
        bmi_cat = request.args.get("bmi_category", "Normal weight")
        smoking = request.args.get("smoking_status", "non-smoker")
        activity = request.args.get("physical_activity", "moderate")
        conditions = request.args.get("health_conditions", "none")
        sys_bp = request.args.get("systolic_bp")
        dia_bp = request.args.get("diastolic_bp")
        health_data = {
            "bmi_category": bmi_cat,
            "smoking_status": smoking,
            "physical_activity": activity,
            "health_conditions": conditions,
            "systolic_bp": sys_bp,
            "diastolic_bp": dia_bp
        }

    rec_result = generate_recommendations(health_data)

    # Save to recommendations table if DB connected
    conn_write = get_db_connection()
    if conn_write:
        try:
            cursor_w = conn_write.cursor()
            cursor_w.execute(
                """
                INSERT INTO recommendations (user_id, recommendation_type, recommendation_text)
                VALUES (%s, %s, %s)
                """,
                (
                    user_id,
                    "Lifestyle & Nutrition",
                    json.dumps(rec_result.get("recommendations", {}))
                )
            )
            conn_write.commit()
            cursor_w.close()
            conn_write.close()
        except Exception as e:
            print(f"Error saving recommendation to DB: {e}")

    return jsonify({
        "success": True,
        "user_id": user_id,
        "summary": rec_result.get("summary"),
        "recommendations": rec_result.get("recommendations"),
        "disclaimer": rec_result.get("disclaimer")
    }), 200

def generate_fallback_recommendations(data):
    # Retrieve input assessment variables
    name = data.get("name", "User")
    age = data.get("age", "Not available")
    gender = data.get("gender", "Not available")
    goal = data.get("goal", "General Health Improvement")
    height = data.get("height", "Not available")
    weight = data.get("weight", "Not available")
    bmi = data.get("bmi", "Not available")
    bmi_category = data.get("bmiCategory", "Normal weight")
    
    systolic = data.get("systolic")
    diastolic = data.get("diastolic")
    bp = f"{systolic}/{diastolic} mmHg" if systolic and diastolic else "Not available"
    
    smoking = str(data.get("smoking", "non-smoker")).strip().lower()
    activity = str(data.get("activity", "moderate")).strip().lower()
    conditions = str(data.get("conditions", "none")).strip().lower()
    allergies = str(data.get("allergies", "none")).strip().lower()
    diet_type = str(data.get("dietType", "none")).strip().lower()
    
    # 1. Summary
    summary = f"Educational health recommendations for {name} (Age: {age}, BMI: {bmi} ({bmi_category}), BP: {bp}). Note: Personalized AI recommendations are temporarily offline; showing standard educational guidelines."

    # 2. Goal-Based Advice
    goal_advice = f"Focus on your target of '{goal}'. "
    if "lose" in goal.lower() or "weight loss" in goal.lower():
        goal_advice += "Maintain a moderate calorie deficit by choosing high-volume, low-calorie foods and doing regular physical activity."
    elif "gain" in goal.lower() or "muscle" in goal.lower():
        goal_advice += "Support muscle growth with a clean calorie surplus, rich in lean proteins, complex carbs, and strength training."
    else:
        goal_advice += "Prioritize balanced meals, quality sleep, and consistent physical activity to sustain overall fitness and health."

    # 3. Nutrition Recommendations
    nutrition_recs = "Incorporate whole foods like leafy greens, vegetables, whole grains, and clean proteins. "
    if "diabetes" in conditions:
        nutrition_recs += "For diabetes management, monitor intake of simple sugars and select low-glycemic index carbohydrates. "
    if "hypertension" in conditions or "high blood pressure" in conditions:
        nutrition_recs += "For hypertension (high blood pressure) management, minimize dietary sodium (salt) intake and prioritize potassium-rich foods (e.g. bananas, spinach). "
    if allergies and allergies != "none":
        nutrition_recs += f"Ensure complete avoidance of identified allergens: {allergies}. "
    if "vegetarian" in diet_type:
        nutrition_recs += "Focus on plant-based proteins such as legumes, lentils, tofu, and tempeh."
    elif "vegan" in diet_type:
        nutrition_recs += "Ensure source of Vitamin B12 and prioritize plant protein sources."
    elif "keto" in diet_type:
        nutrition_recs += "Prioritize healthy fats and limit daily carbohydrate intake."
    else:
        nutrition_recs += "Adopt a balanced plate model (half vegetables/fruits, quarter lean protein, quarter whole grains)."

    # 4. Diet Chart
    breakfast = "Oatmeal with fruit and nuts, or tofu scramble with vegetables."
    mid_morning = "A piece of fresh fruit or a handful of almonds/walnuts."
    lunch = "Large mixed green salad with grilled protein (or chickpeas), quinoa, and light dressing."
    evening_snack = "Carrot sticks with hummus, or plain Greek yogurt."
    dinner = "Steamed or roasted vegetables with baked protein (or lentils) and a small serving of sweet potato."
    hydration = "Drink at least 2.5 to 3 liters of plain water daily."

    if "keto" in diet_type:
        breakfast = "Scrambled eggs in avocado oil with spinach."
        mid_morning = "Handful of macadamia nuts."
        lunch = "Avocado and chicken salad with olive oil dressing."
        evening_snack = "Celery sticks with almond butter."
        dinner = "Baked salmon with asparagus and butter."
        hydration = "Adequate water with added electrolytes."

    # 5. Recommended Foods
    recommended_foods = ["Leafy greens (spinach, kale)", "Lean proteins (poultry, fish, legumes)", "Whole grains (quinoa, oats, brown rice)", "Berries and citrus fruits"]
    if "keto" in diet_type:
        recommended_foods = ["Avocado", "Wild-caught fish", "Olive oil & grass-fed butter", "Cruciferous vegetables"]

    # 6. Foods to Limit
    foods_to_limit = ["Processed snack foods & trans fats", "Refined sugars and sodas", "Excessive sodium (highly processed meals)", "Refined wheat products"]

    # 7. Daily Meal Suggestions
    daily_meal_suggestions = f"Maintain regular meal timings. Ensure portion sizes align with your goal of: {goal}."

    # 8. Hydration Guidance
    hydration_guidance = "Consume about 30-35 ml of water per kg of body weight daily. Increase intake during or after physical exercise."

    # 9. Lifestyle Recommendations
    lifestyle_recs = "Prioritize 7-8 hours of uninterrupted sleep. Practice stress management technique like meditation or deep breathing."
    if "smoker" in smoking:
        lifestyle_recs += " Consider smoking cessation programs to greatly improve lung function and cardiovascular health."

    # 10. Physical Activity Suggestions
    activity_suggestions = "Incorporate at least 150 minutes of moderate aerobic exercise weekly. "
    if "sedentary" in activity or "low" in activity:
        activity_suggestions += "Start with short daily walks (20-30 minutes) and gradually build up intensity."
    else:
        activity_suggestions += "Combine aerobic workouts (running, cycling) with 2-3 sessions of full-body resistance training."

    # 11. Practical Habits
    practical_habits = "Pack healthy lunches to prevent impulse dining. Take standing/walking breaks every 60-90 minutes."

    # 12. Safety Considerations
    safety_considerations = f"These educational suggestions do not replace professional medical advice. Please consult your physician before making major lifestyle changes. Avoid any allergen groups ({allergies})."

    return {
        "summary": summary,
        "goal_advice": goal_advice,
        "nutrition_recommendations": nutrition_recs,
        "diet_chart": {
            "breakfast": breakfast,
            "mid_morning": mid_morning,
            "lunch": lunch,
            "evening_snack": evening_snack,
            "dinner": dinner,
            "hydration": hydration
        },
        "recommended_foods": recommended_foods,
        "foods_to_limit": foods_to_limit,
        "daily_meal_suggestions": daily_meal_suggestions,
        "hydration_guidance": hydration_guidance,
        "lifestyle_recommendations": lifestyle_recs,
        "physical_activity_suggestions": activity_suggestions,
        "practical_habits": practical_habits,
        "safety_considerations": safety_considerations,
        "is_fallback": True
    }

@recommendation_bp.route("/ai/recommendations", methods=["POST"])
def get_ai_recommendations():
    api_key = Config.GEMINI_API_KEY
    model = Config.GEMINI_MODEL

    if not api_key:
        return jsonify({
            "success": False,
            "message": "Gemini API key is not configured on the server."
        }), 500

    data = request.get_json(silent=True) or {}
    
    # Prompt construction
    prompt = f"""
You are an educational health and nutrition assistant. Based on the supplied user details, generate personalized health recommendations and a diet chart.

User profile details:
- Name: {data.get('name', 'Not available')}
- Age: {data.get('age', 'Not available')}
- Gender: {data.get('gender', 'Not available')}
- Goal: {data.get('goal', 'Not available')}
- Height: {data.get('height', 'Not available')} cm
- Weight: {data.get('weight', 'Not available')} kg
- BMI: {data.get('bmi', 'Not available')}
- BMI Category: {data.get('bmiCategory', 'Not available')}
- Blood Pressure: {f"{data.get('systolic')}/{data.get('diastolic')} mmHg" if data.get('systolic') and data.get('diastolic') else 'Not available'}
- Smoking Status: {data.get('smoking', 'Not available')}
- Physical Activity: {data.get('activity', 'Not available')}
- Health Conditions: {data.get('conditions', 'None')}
- Allergies: {data.get('allergies', 'None')}
- Dietary Preferences: {data.get('dietType', 'Not available')}
- ML Prediction: {data.get('prediction', 'Not available')}
- Backend Recommendations: {json.dumps(data.get('backendRecommendations', {}))}

IMPORTANT MEDICAL SAFETY GUIDELINES:
1. Do NOT diagnose any diseases.
2. Do NOT prescribe any medications or suggest specific drug dosages.
3. Clearly state that the recommendations are for educational and informational purposes only.

You must return your output ONLY as a valid JSON object matching the following structure:
{{
  "summary": "Concise summary of the health profile and goals.",
  "goal_advice": "Advice tailored to their goal: {data.get('goal')}.",
  "nutrition_recommendations": "Detailed nutrition recommendations based on preferences, conditions, and goals.",
  "diet_chart": {{
    "breakfast": "Meal suggestions and portion guidance for breakfast.",
    "mid_morning": "Snack suggestion for mid-morning.",
    "lunch": "Meal suggestions and portion guidance for lunch.",
    "evening_snack": "Snack suggestion for evening.",
    "dinner": "Meal suggestions and portion guidance for dinner.",
    "hydration": "Daily fluid intake guidance."
  }},
  "recommended_foods": ["Food item 1", "Food item 2", "Food item 3", "Food item 4"],
  "foods_to_limit": ["Food item 1", "Food item 2", "Food item 3", "Food item 4"],
  "daily_meal_suggestions": "General meal plan advice.",
  "hydration_guidance": "Fluid intake guidelines based on weight and activity.",
  "lifestyle_recommendations": "Sleep, screen time, mental health or habit recommendations.",
  "physical_activity_suggestions": "Exercise guidance based on activity level.",
  "practical_habits": "Small, practical daily steps.",
  "safety_considerations": "Safety notes (e.g. consult physician, avoid allergens: {data.get('allergies', 'None')})."
}}

Do NOT include any markdown code blocks, backticks, or any text other than the JSON itself. Make sure all values are properly escaped strings.
"""

    request_body = {
        "contents": [{
            "parts": [{
                "text": prompt
            }]
        }],
        "generationConfig": {
            "responseMimeType": "application/json"
        }
    }

    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
    payload = json.dumps(request_body).encode("utf-8")

    retries = 0
    max_retries = 2
    delay = 1.0

    last_error_details = None

    while True:
        req = urllib.request.Request(
            url,
            data=payload,
            headers={"Content-Type": "application/json"},
            method="POST"
        )
        try:
            # Add timeout parameter (30 seconds)
            with urllib.request.urlopen(req, timeout=30) as response:
                res_body = response.read().decode("utf-8")
                res_json = json.loads(res_body)
                
                # Extract text response from candidates
                candidates = res_json.get("candidates", [])
                if not candidates:
                    return jsonify({
                        "success": False,
                        "message": "Empty response returned from the Gemini API."
                    }), 502

                part_text = candidates[0].get("content", {}).get("parts", [])[0].get("text", "")
                if not part_text:
                    return jsonify({
                        "success": False,
                        "message": "Empty content returned from the Gemini API."
                    }), 502
                
                # Parse candidate text as JSON and return it directly (preserving response shape)
                try:
                    parsed_recommendations = json.loads(part_text)
                    return jsonify(parsed_recommendations), 200
                except json.JSONDecodeError as err:
                    # In case Gemini didn't return valid JSON
                    return jsonify({
                        "success": False,
                        "message": "Failed to parse recommendations JSON from Gemini.",
                        "raw_text": part_text
                    }), 502

        except urllib.error.HTTPError as e:
            status_code = e.code
            try:
                err_body = e.read().decode("utf-8")
                err_json = json.loads(err_body)
            except Exception:
                err_body = ""
                err_json = {}

            # Save error details for reporting
            error_msg = err_json.get("error", {}).get("message", str(e))
            error_status = err_json.get("error", {}).get("status", "UNKNOWN")
            
            # Print warning but censor the API key if present (avoid logging key)
            print(f"Gemini API error status {status_code}: {error_msg}")

            last_error_details = {
                "status_code": status_code,
                "status": error_status,
                "message": error_msg,
                "model": model,
                "details": err_json.get("error", {}).get("details", [])
            }

            # If rate limit error (429) or internal server error (5xx)
            if status_code == 429 or status_code >= 500:
                if retries < max_retries:
                    retries += 1
                    print(f"Gemini API rate limited/server error ({status_code}). Retrying in {delay}s... (Attempt {retries}/{max_retries})")
                    time.sleep(delay)
                    delay *= 2
                    continue
                else:
                    print(f"Gemini API rate limit/server error limit reached ({status_code}). Returning graceful fallback recommendations.")
                    fallback_res = generate_fallback_recommendations(data)
                    return jsonify(fallback_res), 200

            # For unauthorized (401/403), not found (404), etc. (non-retryable)
            return jsonify({
                "success": False,
                "message": f"Gemini API request failed: {error_msg}",
                "error_details": last_error_details
            }), status_code

        except urllib.error.URLError as e:
            # Handle connection timeouts / DNS errors (timeout is 30s)
            error_msg = str(e.reason)
            print(f"Gemini URL connection error: {error_msg}")
            
            last_error_details = {
                "status_code": 408,
                "status": "TIMEOUT_OR_CONNECTION_ERROR",
                "message": error_msg,
                "model": model
            }

            if retries < max_retries:
                retries += 1
                print(f"Gemini API connection error. Retrying in {delay}s... (Attempt {retries}/{max_retries})")
                time.sleep(delay)
                delay *= 2
                continue
            else:
                print("Gemini API connection error/timeout limit reached. Returning graceful fallback recommendations.")
                fallback_res = generate_fallback_recommendations(data)
                return jsonify(fallback_res), 200

        except Exception as e:
            # Catch-all
            print(f"Unexpected error in Gemini API proxy: {str(e)}. Returning graceful fallback recommendations.")
            fallback_res = generate_fallback_recommendations(data)
            return jsonify(fallback_res), 200

