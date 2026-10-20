def calculate_bmi(height, weight):
    """
    Calculates Body Mass Index (BMI) and categorizes it.
    
    Parameters:
        height (float): Height in cm (e.g. 170) or meters (e.g. 1.70). Must be > 0.
        weight (float): Weight in kg (e.g. 65). Must be > 0.

    Returns:
        dict: {
            "bmi": float (rounded to 2 decimals),
            "category": str ("Underweight", "Normal weight", "Overweight", "Obese")
        }
    """
    if height is None or weight is None:
        raise ValueError("Height and weight must be provided.")
    
    height = float(height)
    weight = float(weight)

    if height <= 0:
        raise ValueError("Height must be greater than zero.")
    if weight <= 0:
        raise ValueError("Weight must be greater than zero.")

    # Convert height from cm to meters if needed
    if height > 3.0:
        height_m = height / 100.0
    else:
        height_m = height

    bmi_value = round(weight / (height_m ** 2), 2)

    if bmi_value < 18.5:
        category = "Underweight"
    elif 18.5 <= bmi_value < 25.0:
        category = "Normal weight"
    elif 25.0 <= bmi_value < 30.0:
        category = "Overweight"
    else:
        category = "Obese"

    return {
        "bmi": bmi_value,
        "category": category
    }
