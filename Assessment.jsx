import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import FormInput from "../components/FormInput";
import FormSelect from "../components/FormSelect";
import LoadingSpinner from "../components/LoadingSpinner";
import { calculateBMI, getBMICategory } from "../utils/bmi";
import { isValidName, isValidAge, isValidHeight, isValidWeight } from "../utils/validation";
import { saveHealthRecord, predictHealthRisk, getRecommendations } from "../services/api";
import authService from "../services/authService";
import "./Assessment.css";

function Assessment() {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [loadingMsg, setLoadingMsg] = useState("Analyzing your health profile...");
    const [errors, setErrors] = useState({});

    // Redirect if not logged in
    useEffect(() => {
        if (!authService.isAuthenticated()) {
            navigate("/login");
        }
    }, [navigate]);

    // Form inputs state
    const [formData, setFormData] = useState({
        // Step 1: Personal Information
        name: "",
        age: "",
        gender: "",
        occupation: "",
        goal: "",

        // Step 2: Body Measurements & Vitals
        height: "",
        weight: "",
        systolic_bp: "",
        diastolic_bp: "",

        // Step 3: Lifestyle
        smoking: "",
        alcohol: "",
        activity: "",
        sleep: "",
        water: "",

        // Step 4: Existing Health Conditions
        conditions: [], // checkbox array
        otherConditions: "",
        medicationUsage: "", // Yes / No
        medicationDetails: "",

        // Step 5: Nutrition
        dietType: "",
        allergies: [], // checkbox array
        mealFrequency: "",
        foodPreference: "",
        frequentFoods: "",

        // Step 6: Mental Health & Family History
        stressLevel: "",
        familyHistory: [], // checkbox array
        exerciseFrequency: "",
        additionalNotes: ""
    });

    // Populate user's name, age, gender if registered in localStorage
    useEffect(() => {
        const storedUser = localStorage.getItem("healthwise_user");
        if (storedUser) {
            try {
                const user = JSON.parse(storedUser);
                setFormData(prev => ({
                    ...prev,
                    name: prev.name || user.name || "",
                    age: prev.age || user.age || "",
                    gender: prev.gender || user.gender || ""
                }));
            } catch (e) {
                console.error("Failed to parse stored user details", e);
            }
        }
    }, []);

    // Calculate dynamic BMI value and category on-the-fly
    const bmiVal = calculateBMI(formData.height, formData.weight);
    const bmiCategory = getBMICategory(bmiVal);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: "" }));
        }
    };

    // Checkbox togglers
    const handleCheckboxChange = (field, itemValue) => {
        const currentList = [...formData[field]];
        const index = currentList.indexOf(itemValue);

        if (index > -1) {
            currentList.splice(index, 1);
        } else {
            currentList.push(itemValue);
        }

        // None logic override
        if (itemValue === "None" && index === -1) {
            setFormData(prev => ({ ...prev, [field]: ["None"] }));
        } else if (itemValue !== "None" && index === -1) {
            const listWithoutNone = currentList.filter(item => item !== "None");
            setFormData(prev => ({ ...prev, [field]: listWithoutNone }));
        } else {
            setFormData(prev => ({ ...prev, [field]: currentList }));
        }
    };

    const validateStep = () => {
        const stepErrors = {};

        if (step === 1) {
            if (!isValidName(formData.name)) {
                stepErrors.name = "Full name must be at least 2 characters.";
            }
            if (!isValidAge(formData.age)) {
                stepErrors.age = "Age must be a number between 1 and 120.";
            }
            if (!formData.gender) {
                stepErrors.gender = "Please select your gender.";
            }
            if (!formData.goal) {
                stepErrors.goal = "Please select your primary health goal.";
            }
        } else if (step === 2) {
            if (!isValidHeight(formData.height)) {
                stepErrors.height = "Height must be between 50 and 250 cm.";
            }
            if (!isValidWeight(formData.weight)) {
                stepErrors.weight = "Weight must be between 10 and 300 kg.";
            }

            const sysRaw = formData.systolic_bp;
            const diaRaw = formData.diastolic_bp;

            const sys = sysRaw !== "" && sysRaw !== null && sysRaw !== undefined ? parseInt(sysRaw, 10) : null;
            const dia = diaRaw !== "" && diaRaw !== null && diaRaw !== undefined ? parseInt(diaRaw, 10) : null;

            if (sysRaw !== "" || diaRaw !== "") {
                if (sysRaw === "" || diaRaw === "") {
                    stepErrors.systolic_bp = "Both Systolic and Diastolic values are required if providing Blood Pressure.";
                    stepErrors.diastolic_bp = "Both Systolic and Diastolic values are required if providing Blood Pressure.";
                } else if (isNaN(sys) || sys < 50 || sys > 250) {
                    stepErrors.systolic_bp = "Systolic BP must be between 50 and 250 mmHg.";
                } else if (isNaN(dia) || dia < 30 || dia > 150) {
                    stepErrors.diastolic_bp = "Diastolic BP must be between 30 and 150 mmHg.";
                } else if (sys <= dia) {
                    stepErrors.systolic_bp = "Systolic BP must be greater than Diastolic BP.";
                }
            }
        } else if (step === 3) {
            if (!formData.smoking) stepErrors.smoking = "Please select smoking status.";
            if (!formData.alcohol) stepErrors.alcohol = "Please select alcohol usage.";
            if (!formData.activity) stepErrors.activity = "Please select physical activity level.";
            if (!formData.sleep) stepErrors.sleep = "Please select daily sleep duration.";
            if (!formData.water) stepErrors.water = "Please select daily water intake.";
        } else if (step === 4) {
            if (formData.conditions.length === 0) {
                stepErrors.conditions = "Please select at least one condition or 'None'.";
            }
            if (!formData.medicationUsage) {
                stepErrors.medicationUsage = "Please specify medication usage.";
            }
            if (formData.medicationUsage === "Yes" && !formData.medicationDetails.trim()) {
                stepErrors.medicationDetails = "Please specify medication details.";
            }
        } else if (step === 5) {
            if (!formData.dietType) stepErrors.dietType = "Please select diet type.";
            if (formData.allergies.length === 0) {
                stepErrors.allergies = "Please select allergies or 'None'.";
            }
            if (!formData.mealFrequency) stepErrors.mealFrequency = "Please select meal frequency.";
            if (!formData.foodPreference) stepErrors.foodPreference = "Please select food preference.";
        } else if (step === 6) {
            if (!formData.stressLevel) stepErrors.stressLevel = "Please select stress level.";
            if (formData.familyHistory.length === 0) {
                stepErrors.familyHistory = "Please select family history factors or 'None'.";
            }
            if (!formData.exerciseFrequency) {
                stepErrors.exerciseFrequency = "Please select exercise frequency.";
            }
        }

        setErrors(stepErrors);
        return Object.keys(stepErrors).length === 0;
    };

    const handleNext = () => {
        if (validateStep()) {
            setStep(prev => prev + 1);
            window.scrollTo(0, 0);
        }
    };

    const handleBack = () => {
        setStep(prev => prev - 1);
        window.scrollTo(0, 0);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (loading) return;

        let userId = authService.getCurrentUserId() || 1;
        const storedUser = localStorage.getItem("healthwise_user");
        if (storedUser) {
            try {
                const u = JSON.parse(storedUser);
                if (u.id) userId = u.id;
            } catch (err) {}
        }

        setLoading(true);
        setLoadingMsg("Saving health record and generating ML analysis...");

        // Format parameters for Flask backend APIs
        const ageNum = parseInt(formData.age || "30", 10);
        const heightNum = parseFloat(formData.height || "170");
        const weightNum = parseFloat(formData.weight || "70");

        let smokingStatus = "non-smoker";
        if (formData.smoking === "Current") smokingStatus = "smoker";
        else if (formData.smoking === "Former") smokingStatus = "former";

        const physicalActivity = (formData.activity || "moderate").toLowerCase();
        const healthConditionsStr = formData.conditions && formData.conditions.length > 0
            ? formData.conditions.filter(c => c !== "None").join(", ").toLowerCase() || "none"
            : "none";

        const sysBpNum = formData.systolic_bp ? parseInt(formData.systolic_bp, 10) : null;
        const diaBpNum = formData.diastolic_bp ? parseInt(formData.diastolic_bp, 10) : null;

        const backendPayload = {
            user_id: userId,
            age: ageNum,
            gender: (formData.gender || "male").toLowerCase(),
            height: heightNum,
            weight: weightNum,
            systolic_bp: sysBpNum,
            diastolic_bp: diaBpNum,
            smoking_status: smokingStatus,
            physical_activity: physicalActivity,
            health_conditions: healthConditionsStr
        };

        // Call backend APIs asynchronously
        try {
            const [saveRes, predictRes, recRes] = await Promise.all([
                saveHealthRecord(backendPayload),
                predictHealthRisk(backendPayload),
                getRecommendations(userId)
            ]);

            const assessmentObj = {
                ...formData,
                user_id: userId,
                bmi: bmiVal,
                bmiCategory: bmiCategory,
                date: new Date().toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric"
                }),
                // Live ML prediction response from Flask backend
                mlPrediction: predictRes.success ? predictRes : null,
                // Live recommendations response from Flask backend
                backendRecommendations: recRes.success ? recRes : null,
                saveRecordStatus: saveRes.success ? saveRes : null
            };

            localStorage.setItem("healthwise_assessment", JSON.stringify(assessmentObj));

            if (formData.goal) {
                localStorage.setItem("healthwise_current_goal", formData.goal);
            }
            if (sysBpNum && diaBpNum) {
                localStorage.setItem("healthwise_current_systolic", sysBpNum.toString());
                localStorage.setItem("healthwise_current_diastolic", diaBpNum.toString());
            }
            if (formData.dietType) {
                localStorage.setItem("healthwise_current_dietType", formData.dietType);
            }
            if (formData.allergies) {
                localStorage.setItem("healthwise_current_allergies", JSON.stringify(formData.allergies));
            }
            if (formData.water) {
                localStorage.setItem("healthwise_current_water", formData.water);
            }
            if (formData.sleep) {
                localStorage.setItem("healthwise_current_sleep", formData.sleep);
            }
        } catch (apiErr) {
            console.error("API Call Exception during assessment submit:", apiErr);
            // Fallback storage so user flow is never broken
            const assessmentObj = {
                ...formData,
                user_id: userId,
                bmi: bmiVal,
                bmiCategory: bmiCategory,
                date: new Date().toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric"
                })
            };
            localStorage.setItem("healthwise_assessment", JSON.stringify(assessmentObj));
        } finally {
            setLoading(false);
            setLoadingMsg("Analyzing your health profile...");
            navigate("/result");
        }
    };

    const stepsList = [
        { title: "Personal Info", desc: "Basic details & goals" },
        { title: "Body Stats", desc: "Height, weight & vitals" },
        { title: "Lifestyle", desc: "Daily routines & activity" },
        { title: "Health History", desc: "Clinical conditions" },
        { title: "Nutrition", desc: "Dietary preferences" },
        { title: "Mental Health", desc: "Stress & family factors" },
        { title: "Review", desc: "Confirm your details" }
    ];

    return (
        <div className="app-container">
            <Navbar />

            {loading && <LoadingSpinner message={loadingMsg} />}

            <main className="main-content assessment-page">
                {/* Hero Banner Area */}
                <div className="assessment-hero">
                    <div className="assessment-hero-content">
                        <span className="assessment-hero-tag">HEALTH QUESTIONNAIRE</span>
                        <h1 className="assessment-hero-title">Health Assessment</h1>
                        <p className="assessment-hero-subtitle">
                            Please fill in your metrics and lifestyle parameters. Our AI and ML model will generate a personalized analysis, predictive health risks, and daily menu.
                        </p>
                    </div>
                    <div className="assessment-hero-illustration">
                        <svg viewBox="0 0 300 100" className="ecg-illustration">
                            <path d="M 0 50 L 50 50 L 60 20 L 70 80 L 80 50 L 130 50 L 140 10 L 150 90 L 160 50 L 210 50 L 220 30 L 230 70 L 240 50 L 300 50" fill="none" stroke="url(#ecg-gradient)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                            <defs>
                                <linearGradient id="ecg-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                    <stop offset="0%" stopColor="#2563EB" stopOpacity="0.8" />
                                    <stop offset="50%" stopColor="#8B5CF6" stopOpacity="0.9" />
                                    <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.8" />
                                </linearGradient>
                            </defs>
                        </svg>
                    </div>
                </div>

                {/* Two-Column Panel Containers */}
                <div className="assessment-two-column-layout">
                    {/* Left Sidebar Timeline */}
                    <aside className="assessment-sidebar">
                        <div className="step-timeline">
                            {stepsList.map((s, idx) => {
                                const isCompleted = idx + 1 < step;
                                const isActive = idx + 1 === step;
                                return (
                                    <div key={idx} className={`timeline-item ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}>
                                        <div className="timeline-node">
                                            {isCompleted ? "✓" : idx + 1}
                                        </div>
                                        <div className="timeline-content">
                                            <span className="timeline-step-num">STEP {idx + 1}</span>
                                            <span className="timeline-step-title">{s.title}</span>
                                            <span className="timeline-step-desc">{s.desc}</span>
                                        </div>
                                        {idx < stepsList.length - 1 && <div className="timeline-connector"></div>}
                                    </div>
                                );
                            })}
                        </div>
                    </aside>

                    {/* Right Active Form Container */}
                    <div className="assessment-form-card">
                        <form onSubmit={handleSubmit} noValidate>
                            {/* STEP 1: PERSONAL INFORMATION */}
                            {step === 1 && (
                                <div className="wizard-step">
                                    <h2 className="step-heading">Step 1: Personal Information</h2>
                                    <FormInput
                                        label="Full Name"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleChange}
                                        error={errors.name}
                                        placeholder="Enter your full name"
                                        required
                                    />

                                    <div className="form-row-2">
                                        <FormInput
                                            label="Age"
                                            name="age"
                                            type="number"
                                            value={formData.age}
                                            onChange={handleChange}
                                            error={errors.age}
                                            placeholder="Example: 25"
                                            min="1"
                                            max="120"
                                            required
                                        />

                                        <FormSelect
                                            label="Gender"
                                            name="gender"
                                            value={formData.gender}
                                            onChange={handleChange}
                                            error={errors.gender}
                                            options={["Male", "Female", "Other", "Prefer not to say"]}
                                            required
                                        />
                                    </div>

                                    <FormInput
                                        label="Occupation (Optional)"
                                        name="occupation"
                                        value={formData.occupation}
                                        onChange={handleChange}
                                        placeholder="e.g. Software Engineer, Teacher"
                                    />

                                    <FormSelect
                                        label="Primary Health Goal"
                                        name="goal"
                                        value={formData.goal}
                                        onChange={handleChange}
                                        error={errors.goal}
                                        options={[
                                            "Weight Management",
                                            "Improve Fitness",
                                            "Healthy Lifestyle",
                                            "Blood Pressure Management",
                                            "General Health Improvement"
                                        ]}
                                        required
                                    />

                                    <div className="security-notice-bar">
                                        <span className="notice-icon">🔒</span>
                                        <span>Your health information is secure and protected under strict privacy protocols.</span>
                                    </div>
                                </div>
                            )}

                            {/* STEP 2: BODY MEASUREMENTS & VITALS */}
                            {step === 2 && (
                                <div className="wizard-step">
                                    <h2 className="step-heading">Step 2: Body Measurements & Vitals</h2>
                                    <p className="step-instruction">
                                        Enter your body statistics and blood pressure metrics.
                                    </p>

                                    <div className="form-row-2">
                                        <FormInput
                                            label="Height (cm)"
                                            name="height"
                                            type="number"
                                            value={formData.height}
                                            onChange={handleChange}
                                            error={errors.height}
                                            placeholder="e.g. 170"
                                            min="50"
                                            max="250"
                                            required
                                        />

                                        <FormInput
                                            label="Weight (kg)"
                                            name="weight"
                                            type="number"
                                            value={formData.weight}
                                            onChange={handleChange}
                                            error={errors.weight}
                                            placeholder="e.g. 65"
                                            min="10"
                                            max="300"
                                            required
                                        />
                                    </div>

                                    <div className="form-row-2" style={{ marginTop: '20px' }}>
                                        <FormInput
                                            label="Systolic Blood Pressure (mmHg)"
                                            name="systolic_bp"
                                            type="number"
                                            value={formData.systolic_bp}
                                            onChange={handleChange}
                                            error={errors.systolic_bp}
                                            placeholder="e.g. 120"
                                            min="50"
                                            max="250"
                                        />

                                        <FormInput
                                            label="Diastolic Blood Pressure (mmHg)"
                                            name="diastolic_bp"
                                            type="number"
                                            value={formData.diastolic_bp}
                                            onChange={handleChange}
                                            error={errors.diastolic_bp}
                                            placeholder="e.g. 80"
                                            min="30"
                                            max="150"
                                        />
                                    </div>

                                    {bmiVal > 0 && (
                                        <div className="bmi-display-panel" style={{ marginTop: '20px' }}>
                                            <div className="bmi-info">
                                                <span className="bmi-label">Calculated BMI</span>
                                                <h3 className="bmi-value">{bmiVal}</h3>
                                            </div>
                                            <div className="bmi-classification">
                                                <span className="bmi-label">Category</span>
                                                <span className={`bmi-badge category-${bmiCategory.toLowerCase().replace(/\s+/g, '-')}`}>
                                                    {bmiCategory}
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* STEP 3: LIFESTYLE */}
                            {step === 3 && (
                                <div className="wizard-step">
                                    <h2 className="step-heading">Step 3: Lifestyle Habits</h2>

                                    <FormSelect
                                        label="Smoking Status"
                                        name="smoking"
                                        value={formData.smoking}
                                        onChange={handleChange}
                                        error={errors.smoking}
                                        options={["Never", "Former", "Current"]}
                                        required
                                    />

                                    <FormSelect
                                        label="Alcohol Consumption"
                                        name="alcohol"
                                        value={formData.alcohol}
                                        onChange={handleChange}
                                        error={errors.alcohol}
                                        options={["Never", "Occasionally", "Regularly"]}
                                        required
                                    />

                                    <FormSelect
                                        label="Physical Activity Level"
                                        name="activity"
                                        value={formData.activity}
                                        onChange={handleChange}
                                        error={errors.activity}
                                        options={["Sedentary", "Light", "Moderate", "Active"]}
                                        required
                                    />

                                    <div className="form-row-2">
                                        <FormSelect
                                            label="Daily Sleep Duration"
                                            name="sleep"
                                            value={formData.sleep}
                                            onChange={handleChange}
                                            error={errors.sleep}
                                            options={["Less than 5 hours", "5-6 hours", "7-8 hours", "More than 8 hours"]}
                                            required
                                        />

                                        <FormSelect
                                            label="Daily Water Intake"
                                            name="water"
                                            value={formData.water}
                                            onChange={handleChange}
                                            error={errors.water}
                                            options={["Less than 1L", "1-2L", "2-3L", "More than 3L"]}
                                            required
                                        />
                                    </div>
                                </div>
                            )}

                            {/* STEP 4: HEALTH CONDITIONS */}
                            {step === 4 && (
                                <div className="wizard-step">
                                    <h2 className="step-heading">Step 4: Existing Health Conditions</h2>
                                    <p className="step-instruction">
                                        Select any clinical conditions you have been diagnosed with. (Select "None" if applicable)
                                    </p>

                                    <div className="checkbox-grid">
                                        {[
                                            "Diabetes",
                                            "Hypertension",
                                            "Heart Disease",
                                            "Asthma",
                                            "High Cholesterol",
                                            "Thyroid Condition",
                                            "Kidney Disease",
                                            "Liver Disease",
                                            "None"
                                        ].map((cond) => (
                                            <div key={cond} className="checkbox-item-wrapper">
                                                <input
                                                    type="checkbox"
                                                    id={`cond-${cond}`}
                                                    checked={formData.conditions.includes(cond)}
                                                    onChange={() => handleCheckboxChange("conditions", cond)}
                                                    className="checkbox-control"
                                                />
                                                <label htmlFor={`cond-${cond}`} className="checkbox-label-text">
                                                    {cond}
                                                </label>
                                            </div>
                                        ))}
                                    </div>
                                    {errors.conditions && (
                                        <span className="field-error display-block" role="alert">
                                            {errors.conditions}
                                        </span>
                                    )}

                                    <FormInput
                                        label="Other Medical Conditions (Specify)"
                                        name="otherConditions"
                                        value={formData.otherConditions}
                                        onChange={handleChange}
                                        placeholder="Enter other diagnosed conditions, if any"
                                    />

                                    <FormSelect
                                        label="Are you taking regular medication?"
                                        name="medicationUsage"
                                        value={formData.medicationUsage}
                                        onChange={handleChange}
                                        error={errors.medicationUsage}
                                        options={["No", "Yes"]}
                                        required
                                    />

                                    {formData.medicationUsage === "Yes" && (
                                        <FormInput
                                            label="Medication Details"
                                            name="medicationDetails"
                                            value={formData.medicationDetails}
                                            onChange={handleChange}
                                            error={errors.medicationDetails}
                                            placeholder="List main medications"
                                            required
                                        />
                                    )}
                                </div>
                            )}

                            {/* STEP 5: NUTRITION */}
                            {step === 5 && (
                                <div className="wizard-step">
                                    <h2 className="step-heading">Step 5: Nutrition & Diet Profile</h2>

                                    <FormSelect
                                        label="Diet Type"
                                        name="dietType"
                                        value={formData.dietType}
                                        onChange={handleChange}
                                        error={errors.dietType}
                                        options={["Vegetarian", "Non-Vegetarian", "Vegan", "Keto", "Eggetarian"]}
                                        required
                                    />

                                    <div className="form-group">
                                        <label className="form-label">Food Allergies / Intolerances</label>
                                        <div className="checkbox-grid">
                                            {[
                                                "None",
                                                "Milk/Dairy",
                                                "Peanuts",
                                                "Tree Nuts",
                                                "Egg",
                                                "Seafood",
                                                "Gluten",
                                                "Soy"
                                            ].map((allergy) => (
                                                <div key={allergy} className="checkbox-item-wrapper">
                                                    <input
                                                        type="checkbox"
                                                        id={`allergy-${allergy}`}
                                                        checked={formData.allergies.includes(allergy)}
                                                        onChange={() => handleCheckboxChange("allergies", allergy)}
                                                        className="checkbox-control"
                                                    />
                                                    <label htmlFor={`allergy-${allergy}`} className="checkbox-label-text">
                                                        {allergy}
                                                    </label>
                                                </div>
                                            ))}
                                        </div>
                                        {errors.allergies && (
                                            <span className="field-error" role="alert">{errors.allergies}</span>
                                        )}
                                    </div>

                                    <div className="form-row-2">
                                        <FormSelect
                                            label="Meal Frequency"
                                            name="mealFrequency"
                                            value={formData.mealFrequency}
                                            onChange={handleChange}
                                            error={errors.mealFrequency}
                                            options={["1-2 meals/day", "3 meals/day", "4+ meals/day", "Irregular"]}
                                            required
                                        />

                                        <FormSelect
                                            label="Primary Food Preference"
                                            name="foodPreference"
                                            value={formData.foodPreference}
                                            onChange={handleChange}
                                            error={errors.foodPreference}
                                            options={["Home cooked", "Fast Food / Takeout", "Mixed", "Processed / Ready-to-eat"]}
                                            required
                                        />
                                    </div>

                                    <FormInput
                                        label="Frequently Consumed Foods (Optional)"
                                        name="frequentFoods"
                                        value={formData.frequentFoods}
                                        onChange={handleChange}
                                        placeholder="e.g. Rice, Salads, Chicken breast"
                                    />
                                </div>
                            )}

                            {/* STEP 6: MENTAL HEALTH & FAMILY HISTORY */}
                            {step === 6 && (
                                <div className="wizard-step">
                                    <h2 className="step-heading">Step 6: Stress & Family History</h2>

                                    <div className="form-row-2">
                                        <FormSelect
                                            label="Perceived Stress Level"
                                            name="stressLevel"
                                            value={formData.stressLevel}
                                            onChange={handleChange}
                                            error={errors.stressLevel}
                                            options={["Low", "Moderate", "High", "Extremely High"]}
                                            required
                                        />

                                        <FormSelect
                                            label="Weekly Exercise Frequency"
                                            name="exerciseFrequency"
                                            value={formData.exerciseFrequency}
                                            onChange={handleChange}
                                            error={errors.exerciseFrequency}
                                            options={["Never", "1-2 days/week", "3-4 days/week", "5+ days/week"]}
                                            required
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">Family Medical History</label>
                                        <div className="checkbox-grid">
                                            {["Diabetes", "Hypertension", "Heart Disease", "Cancer", "Obesity", "None"].map((fh) => (
                                                <div key={fh} className="checkbox-item-wrapper">
                                                    <input
                                                        type="checkbox"
                                                        id={`fh-${fh}`}
                                                        checked={formData.familyHistory.includes(fh)}
                                                        onChange={() => handleCheckboxChange("familyHistory", fh)}
                                                        className="checkbox-control"
                                                    />
                                                    <label htmlFor={`fh-${fh}`} className="checkbox-label-text">
                                                        {fh}
                                                    </label>
                                                </div>
                                            ))}
                                        </div>
                                        {errors.familyHistory && (
                                            <span className="field-error" role="alert">{errors.familyHistory}</span>
                                        )}
                                    </div>

                                    <FormInput
                                        label="Additional Notes / Concerns (Optional)"
                                        name="additionalNotes"
                                        value={formData.additionalNotes}
                                        onChange={handleChange}
                                        placeholder="Any specific goals or concerns..."
                                    />
                                </div>
                            )}

                            {/* STEP 7: REVIEW & SUBMIT */}
                            {step === 7 && (
                                <div className="wizard-step">
                                    <h2 className="step-heading">Step 7: Review Information</h2>
                                    <p className="step-instruction">
                                        Please confirm your health information before submitting for analysis.
                                    </p>

                                    <div className="review-cards-list">
                                        <div className="review-card">
                                            <h3 className="review-card-title">Personal Information</h3>
                                            <div className="review-grid">
                                                <div className="review-item"><span className="review-label">Name:</span> {formData.name}</div>
                                                <div className="review-item"><span className="review-label">Age:</span> {formData.age} yrs</div>
                                                <div className="review-item"><span className="review-label">Gender:</span> {formData.gender}</div>
                                                <div className="review-item"><span className="review-label">Occupation:</span> {formData.occupation || "N/A"}</div>
                                                <div className="review-item"><span className="review-label">Primary Goal:</span> {formData.goal}</div>
                                            </div>
                                        </div>

                                        <div className="review-card">
                                            <h3 className="review-card-title">Body Stats & BMI</h3>
                                            <div className="review-grid">
                                                <div className="review-item"><span className="review-label">Height:</span> {formData.height} cm</div>
                                                <div className="review-item"><span className="review-label">Weight:</span> {formData.weight} kg</div>
                                                <div className="review-item"><span className="review-label">Calculated BMI:</span> {bmiVal}</div>
                                                <div className="review-item">
                                                    <span className="review-label">Category:</span>{" "}
                                                    <span className={`bmi-badge category-${bmiCategory.toLowerCase().replace(/\s+/g, '-')}`}>{bmiCategory}</span>
                                                </div>
                                                <div className="review-item">
                                                    <span className="review-label">Blood Pressure:</span>{" "}
                                                    {(formData.systolic_bp && formData.diastolic_bp)
                                                        ? `${formData.systolic_bp} / ${formData.diastolic_bp} mmHg`
                                                        : "Not provided"}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="review-card">
                                            <h3 className="review-card-title">Lifestyle Information</h3>
                                            <div className="review-grid">
                                                <div className="review-item"><span className="review-label">Smoking:</span> {formData.smoking}</div>
                                                <div className="review-item"><span className="review-label">Alcohol:</span> {formData.alcohol}</div>
                                                <div className="review-item"><span className="review-label">Activity level:</span> {formData.activity}</div>
                                                <div className="review-item"><span className="review-label">Sleep duration:</span> {formData.sleep}</div>
                                                <div className="review-item"><span className="review-label">Water intake:</span> {formData.water}</div>
                                            </div>
                                        </div>

                                        <div className="review-card">
                                            <h3 className="review-card-title">Existing Conditions & Diet</h3>
                                            <div className="review-grid">
                                                <div className="review-item"><span className="review-label">Conditions:</span> {formData.conditions.join(", ") || "None"}</div>
                                                {formData.otherConditions && <div className="review-item"><span className="review-label">Other:</span> {formData.otherConditions}</div>}
                                                <div className="review-item"><span className="review-label">Medications:</span> {formData.medicationUsage === "Yes" ? formData.medicationDetails : "None"}</div>
                                                <div className="review-item"><span className="review-label">Diet type:</span> {formData.dietType}</div>
                                                <div className="review-item"><span className="review-label">Allergies:</span> {formData.allergies.join(", ")}</div>
                                            </div>
                                        </div>

                                        <div className="review-card">
                                            <h3 className="review-card-title">Stress & Family History</h3>
                                            <div className="review-grid">
                                                <div className="review-item"><span className="review-label">Stress level:</span> {formData.stressLevel}</div>
                                                <div className="review-item"><span className="review-label">Exercise frequency:</span> {formData.exerciseFrequency}</div>
                                                <div className="review-item"><span className="review-label">Family conditions:</span> {formData.familyHistory.join(", ")}</div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="safety-warning-banner" style={{ marginTop: '20px' }}>
                                        <span className="banner-icon">ℹ</span>
                                        <p className="banner-text">
                                            By submitting this assessment, you acknowledge that the findings are for informational demonstration purposes only. This system does not replace professional medical evaluations.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* WIZARD CONTROLS */}
                            <div className="wizard-controls" style={{ marginTop: '24px', display: 'flex', justifyContent: 'space-between' }}>
                                {step > 1 && (
                                    <button
                                        type="button"
                                        onClick={handleBack}
                                        className="btn-secondary control-back-btn"
                                    >
                                        ← Back
                                    </button>
                                )}

                                {step < 7 ? (
                                    <button
                                        type="button"
                                        onClick={handleNext}
                                        className="btn-primary control-next-btn ml-auto"
                                    >
                                        Continue →
                                    </button>
                                ) : (
                                    <button
                                        type="submit"
                                        className="btn-primary control-submit-btn ml-auto"
                                    >
                                        Submit Assessment & Generate AI Analysis
                                    </button>
                                )}
                            </div>
                        </form>
                    </div>
                </div>

                {/* Features highlight grid below the main card */}
                <div className="assessment-features-grid">
                    <div className="feature-card-item">
                        <span className="feature-card-icon">🧠</span>
                        <div className="feature-card-info">
                            <h4>AI-Powered Insights</h4>
                            <p>Deep RandomForest machine learning analysis maps dynamic health risk categories.</p>
                        </div>
                    </div>
                    <div className="feature-card-item">
                        <span className="feature-card-icon">🥗</span>
                        <div className="feature-card-icon-title">
                            <h4>Personalized Recommendations</h4>
                            <p>Tailored dietary plans, caloric ranges, and lifestyle goals curated by Gemini AI.</p>
                        </div>
                    </div>
                    <div className="feature-card-item">
                        <span className="feature-card-icon">🛡️</span>
                        <div className="feature-card-info">
                            <h4>Secure & Private</h4>
                            <p>State session caching ensures your diagnostic logs are protected and confidential.</p>
                        </div>
                    </div>
                    <div className="feature-card-item">
                        <span className="feature-card-icon">📈</span>
                        <div className="feature-card-info">
                            <h4>Better Health Outcomes</h4>
                            <p>Preventative wellness guides designed to assist clinical discussions and goals.</p>
                        </div>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}

export default Assessment;