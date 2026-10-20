def generate_recommendations(health_data):
    """
    Generates rule-based lifestyle and nutrition recommendations based on user health parameters.

    Parameters:
        health_data (dict): Contains bmi, category, smoking_status, physical_activity, health_conditions.

    Returns:
        dict: Categorized recommendations and a medical disclaimer.
    """
    bmi_category = health_data.get("bmi_category", health_data.get("category", "Normal weight"))
    smoking_status = str(health_data.get("smoking_status", "non-smoker")).strip().lower()
    physical_activity = str(health_data.get("physical_activity", "moderate")).strip().lower()
    health_conditions = str(health_data.get("health_conditions", "none")).strip().lower()

    recommendations = {
        "dietary": [],
        "exercise": [],
        "lifestyle": []
    }

    # BMI-based recommendations
    if bmi_category == "Underweight":
        recommendations["dietary"].append("Focus on nutrient-dense meals rich in complex carbs, healthy fats (avocados, nuts), and lean proteins.")
        recommendations["exercise"].append("Engage in strength training to build muscle mass rather than high-intensity cardio.")
    elif bmi_category == "Normal weight":
        recommendations["dietary"].append("Maintain a balanced diet rich in vegetables, whole grains, fruits, and lean protein sources.")
        recommendations["exercise"].append("Aim for at least 150 minutes of moderate aerobic activity weekly.")
    elif bmi_category == "Overweight":
        recommendations["dietary"].append("Reduce intake of processed sugars and refined carbohydrates. Incorporate high-fiber foods.")
        recommendations["exercise"].append("Combine brisk walking or cycling (30 mins/day) with moderate resistance training.")
    elif bmi_category == "Obese":
        recommendations["dietary"].append("Adopt a calorie-conscious diet rich in vegetables, legumes, and lean protein while limiting saturated fats.")
        recommendations["exercise"].append("Start with low-impact exercises like swimming, water aerobics, or stationary cycling to protect joints.")

    # Smoking recommendations
    if "smoker" in smoking_status and "non" not in smoking_status:
        recommendations["lifestyle"].append("Consider a smoking cessation program. Quitting smoking significantly improves cardiovascular and pulmonary health.")

    # Activity level recommendations
    if "low" in physical_activity or "sedentary" in physical_activity:
        recommendations["exercise"].append("Increase daily steps by taking short walking breaks every 1-2 hours.")

    # Health conditions recommendations
    if "diabetes" in health_conditions:
        recommendations["dietary"].append("Monitor carbohydrate intake and choose low glycemic index foods to support steady blood sugar levels.")
    if "hypertension" in health_conditions or "high blood pressure" in health_conditions:
        recommendations["dietary"].append("Reduce dietary sodium intake and consume potassium-rich foods like leafy greens and bananas.")

    # Blood pressure value based recommendations
    sys_bp = health_data.get("systolic_bp")
    dia_bp = health_data.get("diastolic_bp")
    if sys_bp is not None and dia_bp is not None:
        try:
            s_val = int(sys_bp)
            d_val = int(dia_bp)
            if s_val >= 130 or d_val >= 80:
                bp_msg = "Reduce dietary sodium intake and consume potassium-rich foods like leafy greens and bananas to support blood pressure management."
                if bp_msg not in recommendations["dietary"]:
                    recommendations["dietary"].append(bp_msg)
                bp_life = "Monitor blood pressure regularly and consult a health professional if readings remain consistently elevated."
                if bp_life not in recommendations["lifestyle"]:
                    recommendations["lifestyle"].append(bp_life)
        except (ValueError, TypeError):
            pass

    # Ensure baseline recommendations exist
    if not recommendations["lifestyle"]:
        recommendations["lifestyle"].append("Ensure 7-8 hours of quality sleep nightly and maintain adequate daily hydration.")

    return {
        "summary": f"Tailored recommendations for {bmi_category} profile.",
        "recommendations": recommendations,
        "disclaimer": "These recommendations are generated for educational and general health awareness purposes only. They do not replace advice from a qualified healthcare professional."
    }
