import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import HealthCard from "../components/HealthCard";
import RecommendationCard from "../components/RecommendationCard";
import LoadingSpinner from "../components/LoadingSpinner";
import { getBMIRiskLevel, getBMICategory } from "../utils/bmi";
import authService from "../services/authService";
import healthService from "../services/healthService";
import { generatePDFReport } from "../utils/reportGenerator";
import geminiService from "../services/geminiService";
import "./Result.css";

function Result() {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [healthData, setHealthData] = useState(null);
    const [prediction, setPrediction] = useState(null);
    const [recommendations, setRecommendations] = useState(null);
    const [geminiRecommendations, setGeminiRecommendations] = useState(null);
    const [geminiLoading, setGeminiLoading] = useState(false);
    const [geminiError, setGeminiError] = useState(null);

    const loadGeminiData = async (latestRecord, predictRes, recRes, currentUserName) => {
        setGeminiLoading(true);
        setGeminiError(null);
        try {
            const goal = localStorage.getItem("healthwise_current_goal") || latestRecord?.goal || "Not available";
            const dietType = localStorage.getItem("healthwise_current_dietType") || "Not available";
            
            let allergies = "None";
            const storedAllergies = localStorage.getItem("healthwise_current_allergies");
            if (storedAllergies) {
                try {
                    const parsed = JSON.parse(storedAllergies);
                    if (parsed && parsed.length > 0) {
                        allergies = parsed.join(", ");
                    }
                } catch (e) {
                    console.error("Failed to parse stored allergies", e);
                }
            }

            const systolic = latestRecord?.systolic_bp || localStorage.getItem("healthwise_current_systolic") || "";
            const diastolic = latestRecord?.diastolic_bp || localStorage.getItem("healthwise_current_diastolic") || "";

            const bmiVal = parseFloat(latestRecord?.bmi || 0);
            const bmiCategory = getBMICategory(bmiVal);

            const payload = {
                name: currentUserName || authService.getCurrentUserName() || "User",
                age: latestRecord?.age,
                gender: latestRecord?.gender,
                goal,
                height: latestRecord?.height,
                weight: latestRecord?.weight,
                bmi: latestRecord?.bmi,
                bmiCategory,
                systolic,
                diastolic,
                smoking: latestRecord?.smoking_status,
                activity: latestRecord?.physical_activity,
                conditions: latestRecord?.health_conditions,
                allergies,
                dietType,
                prediction: predictRes?.prediction || "Not available",
                backendRecommendations: recRes?.recommendations || {}
            };

            const response = await geminiService.generateRecommendations(payload);
            setGeminiRecommendations(response);
            localStorage.setItem("healthwise_current_gemini_recommendations", JSON.stringify(response));
        } catch (err) {
            console.error("Gemini recommendation error:", err);
            setGeminiError(err.message || "Personalized AI recommendations are temporarily unavailable.");
        } finally {
            setGeminiLoading(false);
        }
    };

    const handleRetryGemini = () => {
        if (healthData) {
            loadGeminiData(healthData, prediction, { recommendations });
        }
    };

    // Authentication & Data loading
    useEffect(() => {
        const storedAuth = localStorage.getItem("healthwise_auth");
        if (!authService.isAuthenticated() && storedAuth !== "true") {
            navigate("/login");
            return;
        }

        const name = authService.getCurrentUserName();
        const email = localStorage.getItem("healthwise_user_email") || "";
        setUser({ name, email });

        const loadAnalysisData = async () => {
            const userId = authService.getCurrentUserId() || 1;
            setLoading(true);
            setError(null);

            try {
                // 1. Fetch user health records history
                const historyRes = await healthService.getHealthHistory(userId);
                let latestRecord = null;
                let predictRes = null;
                let recRes = null;

                if (historyRes && historyRes.success && historyRes.data && historyRes.data.length > 0) {
                    latestRecord = historyRes.data[0];
                    setHealthData(latestRecord);

                    // 2. Perform ML Prediction request
                    predictRes = await healthService.getMLPrediction({
                        user_id: latestRecord.user_id,
                        age: latestRecord.age,
                        gender: latestRecord.gender,
                        height: latestRecord.height,
                        weight: latestRecord.weight,
                        smoking_status: latestRecord.smoking_status,
                        physical_activity: latestRecord.physical_activity,
                        health_conditions: latestRecord.health_conditions
                    });

                    if (predictRes && predictRes.success) {
                        setPrediction(predictRes);
                    }

                    // 3. Fetch tailored Recommendations
                    recRes = await healthService.getRecommendations(userId);
                    if (recRes && recRes.success && recRes.recommendations) {
                        setRecommendations(recRes.recommendations);
                    }
                } else {
                    // Local Storage Fallback if server history empty
                    const storedAssessment = localStorage.getItem("healthwise_assessment");
                    if (storedAssessment) {
                        try {
                            const parsed = JSON.parse(storedAssessment);
                            latestRecord = {
                                user_id: userId,
                                age: parsed.age || 30,
                                gender: (parsed.gender || "male").toLowerCase(),
                                height: parsed.height || 170,
                                weight: parsed.weight || 70,
                                bmi: parsed.bmi || 22.49,
                                bmi_category: parsed.bmiCategory || "Normal weight",
                                systolic_bp: parsed.systolic_bp ? parseInt(parsed.systolic_bp, 10) : null,
                                diastolic_bp: parsed.diastolic_bp ? parseInt(parsed.diastolic_bp, 10) : null,
                                smoking_status: parsed.smoking === "Current" ? "smoker" : parsed.smoking === "Former" ? "former" : "non-smoker",
                                physical_activity: (parsed.activity || "moderate").toLowerCase(),
                                health_conditions: parsed.conditions ? parsed.conditions.join(", ") : "none",
                                created_at: parsed.date || new Date().toISOString(),
                                goal: parsed.goal || localStorage.getItem("healthwise_current_goal") || "General Health Improvement"
                            };
                            setHealthData(latestRecord);

                            if (parsed.mlPrediction) {
                                predictRes = parsed.mlPrediction;
                                setPrediction(predictRes);
                            }
                            if (parsed.backendRecommendations?.recommendations) {
                                recRes = parsed.backendRecommendations;
                                setRecommendations(parsed.backendRecommendations.recommendations);
                            }
                        } catch (err) {}
                    }
                }

                // 4. Fetch Gemini Recommendations (non-blocking)
                if (latestRecord) {
                    loadGeminiData(latestRecord, predictRes, recRes, name);
                }
            } catch (err) {
                console.error("Error loading analysis output:", err);
                // Fallback check
                const userId = authService.getCurrentUserId() || 1;
                const storedAssessment = localStorage.getItem("healthwise_assessment");
                if (storedAssessment) {
                    try {
                        const parsed = JSON.parse(storedAssessment);
                        const fallbackRecord = {
                            user_id: userId,
                            age: parsed.age || 30,
                            gender: (parsed.gender || "male").toLowerCase(),
                            height: parsed.height || 170,
                            weight: parsed.weight || 70,
                            bmi: parsed.bmi || 22.49,
                            bmi_category: parsed.bmiCategory || "Normal weight",
                            systolic_bp: parsed.systolic_bp ? parseInt(parsed.systolic_bp, 10) : null,
                            diastolic_bp: parsed.diastolic_bp ? parseInt(parsed.diastolic_bp, 10) : null,
                            smoking_status: parsed.smoking === "Current" ? "smoker" : parsed.smoking === "Former" ? "former" : "non-smoker",
                            physical_activity: (parsed.activity || "moderate").toLowerCase(),
                            health_conditions: parsed.conditions ? parsed.conditions.join(", ") : "none",
                            created_at: parsed.date || new Date().toISOString(),
                            goal: parsed.goal || localStorage.getItem("healthwise_current_goal") || "General Health Improvement"
                        };
                        setHealthData(fallbackRecord);
                        if (parsed.mlPrediction) setPrediction(parsed.mlPrediction);
                        if (parsed.backendRecommendations?.recommendations) setRecommendations(parsed.backendRecommendations.recommendations);
                        loadGeminiData(fallbackRecord, parsed.mlPrediction, parsed.backendRecommendations, name);
                    } catch (e) {
                        setError(err.message || "Unable to load health insights.");
                    }
                } else {
                    setError(err.message || "Unable to load health insights.");
                }
            } finally {
                setLoading(false);
            }
        };

        loadAnalysisData();
    }, [navigate]);

    // Render loading view
    if (loading) {
        return (
            <div className="app-container">
                <Navbar />
                <main className="main-content result-empty-page">
                    <LoadingSpinner message="Analyzing your health profile..." />
                </main>
                <Footer />
            </div>
        );
    }

    // Render connection error view if no local data either
    if (error && !healthData) {
        return (
            <div className="app-container">
                <Navbar />
                <main className="main-content result-empty-page">
                    <div className="empty-card">
                        <span className="empty-icon" style={{ color: "var(--danger)" }}>⚠</span>
                        <h2>Analysis Error</h2>
                        <p>{error}</p>
                        <button onClick={() => window.location.reload()} className="btn-primary empty-btn">
                            Retry Connection
                        </button>
                    </div>
                </main>
                <Footer />
            </div>
        );
    }

    // Render empty state if no record is found
    if (!healthData) {
        return (
            <div className="app-container">
                <Navbar />
                <main className="main-content result-empty-page">
                    <div className="empty-card">
                        <span className="empty-icon">📋</span>
                        <h2>No Assessment Found</h2>
                        <p>Complete a quick health questionnaire to see custom health insights.</p>
                        <Link to="/assessment" className="btn-primary empty-btn">
                            Start Assessment
                        </Link>
                    </div>
                </main>
                <Footer />
            </div>
        );
    }

    // --- PARSE ANALYSIS VALUES ---

    const bmiVal = parseFloat(healthData.bmi);
    const bmiCategory = getBMICategory(bmiVal);

    let bmiAdvice = "";
    if (bmiVal >= 30) {
        bmiAdvice = "Your calculated BMI falls in the Obese range. Higher BMI ranges are associated with metabolic stresses, high blood pressure, and cardiac workload. Consider speaking with a doctor about weight management support.";
    } else if (bmiVal >= 25) {
        bmiAdvice = "Your calculated BMI falls in the Overweight range. Modest BMI increases can elevate risks of future joint stresses and blood lipid values. Adopting portion moderation and regular aerobic exercise is advised.";
    } else if (bmiVal < 18.5) {
        bmiAdvice = "Your calculated BMI falls in the Underweight range. Lower weight ranges can sometimes be linked to nutritional gaps or lower bone density. Focus on nutrient-dense meals and muscle building.";
    } else {
        bmiAdvice = "Your calculated BMI is within the Normal healthy weight range. Excellent job maintaining a balanced profile! Focus on staying consistently active and eating nutrient-dense foods.";
    }

    // Condition warnings parser
    const conditionWarnings = [];
    if (healthData.health_conditions && healthData.health_conditions !== "none") {
        const condList = healthData.health_conditions.split(",").map(c => c.trim().toLowerCase());
        condList.forEach(c => {
            if (c === "diabetes") {
                conditionWarnings.push("Diabetes notice: Balance carbohydrates with fibers, and measure capillary glucose levels as advised by your physician.");
            } else if (c === "hypertension") {
                conditionWarnings.push("Hypertension notice: Restrict dietary sodium below 1500mg/day and regularly screen blood pressures.");
            } else if (c === "heart disease") {
                conditionWarnings.push("Cardiovascular notice: Consult your cardiologist before starting high-intensity routines and watch for warning symptoms.");
            } else if (c === "asthma") {
                conditionWarnings.push("Asthma warning: Monitor indoor dust triggers and carry your rescue inhalers during changes in environment.");
            } else if (c === "high cholesterol") {
                conditionWarnings.push("Lipid notice: Reduce saturated fatty acids and include soluble oat fibers to help naturally lower LDL cholesterol.");
            } else if (c !== "") {
                conditionWarnings.push(`Reported condition (${c}): Adjust diets and activities in consultation with your primary physician.`);
            }
        });
    }

    // Format date submitted
    const formattedDate = healthData.created_at 
        ? new Date(healthData.created_at).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit"
          })
        : "N/A";

    const handleDownloadReport = () => {
        if (!healthData) return;
        generatePDFReport(
            user?.name,
            user?.email,
            healthData,
            prediction,
            recommendations
        );
    };

    return (
        <div className="app-container" style={{ backgroundColor: '#F8FAFC', minHeight: '100vh' }}>
            <Navbar />

            <main className="main-content result-page">
                <div className="result-container" style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', border: '1px solid #E2E8F0', boxShadow: '0 10px 30px -10px rgba(15, 23, 42, 0.05)', maxWidth: '1200px', margin: '0 auto', padding: '32px' }}>
                    
                    {/* RESULT PAGE HERO (Navy Gradient Overhaul) */}
                    <div className="result-hero-banner" style={{ 
                        background: 'linear-gradient(135deg, #1E3A8A 0%, #0F172A 100%)', 
                        borderRadius: '16px', 
                        padding: '32px 40px', 
                        color: '#FFFFFF', 
                        marginBottom: '30px', 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        flexWrap: 'wrap',
                        gap: '24px',
                        position: 'relative',
                        overflow: 'hidden',
                        boxShadow: '0 4px 20px rgba(15, 23, 42, 0.15)'
                    }}>
                        <div style={{ zIndex: 2, flex: 1, minWidth: '280px' }}>
                            <span className="result-tag" style={{ color: '#38BDF8', fontWeight: '800', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: '8px' }}>ASSESSMENT RESULTS</span>
                            <h1 className="result-title" style={{ fontSize: '28px', fontWeight: '800', margin: '0 0 8px 0', color: '#FFFFFF', lineHeight: '1.2' }}>Your Health Analysis Report</h1>
                            <p style={{ margin: 0, fontSize: '14px', color: '#94A3B8', lineHeight: '1.5' }}>AI-powered insights & personalized recommendations for a healthier you.</p>
                            
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '16px', backgroundColor: 'rgba(56, 189, 248, 0.1)', padding: '6px 12px', borderRadius: '20px', width: 'fit-content', border: '1px solid rgba(56, 189, 248, 0.2)' }}>
                                <span style={{ width: '8px', height: '8px', backgroundColor: '#10B981', borderRadius: '50%', display: 'inline-block', boxShadow: '0 0 8px #10B981' }}></span>
                                <span style={{ fontSize: '11.5px', color: '#38BDF8', fontWeight: '700' }}>System Connected • RandomForest predictions live</span>
                            </div>
                        </div>
                        <div className="result-meta" style={{ textAlign: 'right', zIndex: 2, minWidth: '150px' }}>
                            <span className="meta-label" style={{ fontSize: '11px', color: '#94A3B8', display: 'block', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Submitted on</span>
                            <span className="meta-value" style={{ fontSize: '16px', fontWeight: '800', color: '#FFFFFF', display: 'block', marginTop: '4px' }}>{formattedDate}</span>
                        </div>
                    </div>

                    {prediction ? (
                        <div className="result-alert-info alert-success" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 18px', backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '8px', marginBottom: '24px' }}>
                            <span className="alert-icon-info" style={{ fontSize: '16px', color: '#2563EB', fontWeight: 'bold' }}>🤖</span>
                            <p className="alert-text-info" style={{ margin: 0, fontSize: '13px', color: '#1E40AF', lineHeight: '1.4' }}>
                                <strong>Flask ML Backend Active:</strong> Risk Prediction: <strong>{prediction.prediction} Risk</strong> (Risk Score: {prediction.risk_score}). {prediction.disclaimer || ""}
                            </p>
                        </div>
                    ) : (
                        <div className="result-alert-info" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 18px', backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '8px', marginBottom: '24px' }}>
                            <span className="alert-icon-info" style={{ fontSize: '16px', color: '#2563EB', fontWeight: 'bold' }}>ℹ</span>
                            <p className="alert-text-info" style={{ margin: 0, fontSize: '13px', color: '#1E40AF', lineHeight: '1.4' }}>
                                <strong>System Connected:</strong> Recommendations and predictions are loaded in real-time from the Scikit-learn random forest backend.
                            </p>
                        </div>
                    )}

                    {/* SECTION 1: Patient Assessment Report */}
                    <div className="dashboard-panel" style={{ padding: '24px', backgroundColor: '#FFF', border: '1px solid #E2E8F0', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.01)', marginBottom: '24px' }}>
                        <h3 className="panel-title" style={{ fontSize: '16px', fontWeight: '700', color: '#2563EB', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span>📋</span> Patient Assessment Report
                        </h3>
                        <div className="patient-report-grid">
                            <div>
                                <strong style={{ color: '#64748B', display: 'block', fontSize: '11px', textTransform: 'uppercase', marginBottom: '4px', letterSpacing: '0.05em' }}>Name / Email</strong>
                                <span style={{ fontWeight: '700', color: '#1E293B', display: 'block', fontSize: '13.5px' }}>{user?.name || "User"}</span>
                                <span style={{ fontSize: '12px', color: '#64748B', display: 'block' }}>{user?.email || "N/A"}</span>
                            </div>
                            <div>
                                <strong style={{ color: '#64748B', display: 'block', fontSize: '11px', textTransform: 'uppercase', marginBottom: '4px', letterSpacing: '0.05em' }}>Age / Gender</strong>
                                <span style={{ fontWeight: '700', color: '#1E293B', display: 'block', fontSize: '13.5px', textTransform: 'capitalize' }}>
                                    {healthData.age} years / {healthData.gender || "N/A"}
                                </span>
                            </div>
                            <div>
                                <strong style={{ color: '#64748B', display: 'block', fontSize: '11px', textTransform: 'uppercase', marginBottom: '4px', letterSpacing: '0.05em' }}>Height / Weight</strong>
                                <span style={{ fontWeight: '700', color: '#1E293B', display: 'block', fontSize: '13.5px' }}>
                                    {healthData.height} cm / {healthData.weight} kg
                                </span>
                            </div>
                            <div>
                                <strong style={{ color: '#64748B', display: 'block', fontSize: '11px', textTransform: 'uppercase', marginBottom: '4px', letterSpacing: '0.05em' }}>Assessment Date</strong>
                                <span style={{ fontWeight: '700', color: '#1E293B', display: 'block', fontSize: '13.5px' }}>{formattedDate}</span>
                            </div>
                            <div>
                                <strong style={{ color: '#64748B', display: 'block', fontSize: '11px', textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.05em' }}>Reported Conditions</strong>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                    {healthData.health_conditions && healthData.health_conditions !== "none" ? (
                                        healthData.health_conditions.split(",").map((c, idx) => (
                                            <span key={idx} style={{ display: 'inline-block', padding: '3px 8px', backgroundColor: '#FEE2E2', border: '1px solid #FCA5A5', borderRadius: '4px', fontSize: '11px', fontWeight: '700', color: '#B91C1C', textTransform: 'capitalize' }}>
                                                {c.trim()}
                                            </span>
                                        ))
                                    ) : (
                                        <span style={{ display: 'inline-block', padding: '3px 8px', backgroundColor: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: '4px', fontSize: '11px', fontWeight: '700', color: '#047857' }}>
                                            None reported
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* SECTION 2: Health Metric Cards */}
                    <div className="metrics-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '24px' }}>
                        {/* BMI CARD */}
                        <HealthCard
                            title="Body Mass Index (BMI)"
                            value={bmiVal.toFixed(2)}
                            status={bmiCategory}
                            description={`Height: ${healthData.height}cm | Weight: ${healthData.weight}kg`}
                        >
                            <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <div style={{ position: 'relative', height: '8px', backgroundColor: '#E2E8F0', borderRadius: '4px', display: 'flex', overflow: 'hidden' }}>
                                    <div style={{ width: '40%', backgroundColor: '#3B82F6' }}></div>
                                    <div style={{ width: '15%', backgroundColor: '#10B981' }}></div>
                                    <div style={{ width: '15%', backgroundColor: '#F59E0B' }}></div>
                                    <div style={{ width: '30%', backgroundColor: '#EF4444' }}></div>
                                </div>
                                <div style={{ position: 'relative', height: '10px' }}>
                                    {(() => {
                                        let positionPct = 0;
                                        const val = parseFloat(bmiVal);
                                        if (isNaN(val)) return null;
                                        if (val < 18.5) {
                                            positionPct = (val / 18.5) * 40;
                                        } else if (val < 25) {
                                            positionPct = 40 + ((val - 18.5) / 6.5) * 15;
                                        } else if (val < 30) {
                                            positionPct = 55 + ((val - 25) / 5) * 15;
                                        } else {
                                            positionPct = 70 + Math.min(((val - 30) / 10) * 30, 30);
                                        }
                                        return (
                                            <div style={{
                                                position: 'absolute',
                                                top: '-2px',
                                                left: `${positionPct}%`,
                                                transform: 'translateX(-50%)',
                                                width: '0',
                                                height: '0',
                                                borderLeft: '4px solid transparent',
                                                borderRight: '4px solid transparent',
                                                borderBottom: '6px solid #1E293B'
                                            }}></div>
                                        );
                                    })()}
                                </div>
                            </div>
                        </HealthCard>

                        {/* BLOOD PRESSURE CARD */}
                        {(() => {
                            const sysVal = healthData.systolic_bp || localStorage.getItem("healthwise_current_systolic");
                            const diaVal = healthData.diastolic_bp || localStorage.getItem("healthwise_current_diastolic");
                            
                            let bpText = "Not measured";
                            let bpBadge = "N/A";
                            if (sysVal && diaVal) {
                                bpText = `${sysVal} / ${diaVal} mmHg`;
                                const sys = parseInt(sysVal, 10);
                                const dia = parseInt(diaVal, 10);
                                if (sys < 120 && dia < 80) bpBadge = "Normal";
                                else if (sys >= 120 && sys < 130 && dia < 80) bpBadge = "Elevated";
                                else if ((sys >= 130 && sys < 140) || (dia >= 80 && dia < 90)) bpBadge = "Stage 1";
                                else bpBadge = "Stage 2";
                            }
                            
                            return (
                                <HealthCard
                                    title="Blood Pressure"
                                    value={bpText}
                                    status={bpBadge}
                                    description="Systolic / Diastolic (mmHg)"
                                />
                            );
                        })()}

                        {/* PHYSICAL ACTIVITY CARD */}
                        <HealthCard
                            title="Physical Activity"
                            value={healthData.physical_activity ? healthData.physical_activity.charAt(0).toUpperCase() + healthData.physical_activity.slice(1) : "N/A"}
                            status="Normal"
                            description={`Smoking: ${healthData.smoking_status ? healthData.smoking_status.charAt(0).toUpperCase() + healthData.smoking_status.slice(1) : "N/A"}`}
                        />

                        {/* AGE & GENDER CARD */}
                        <HealthCard
                            title="Age & Gender"
                            value={`${healthData.age} yrs`}
                            status="Normal"
                            description={`Gender: ${healthData.gender ? healthData.gender.charAt(0).toUpperCase() + healthData.gender.slice(1) : "N/A"}`}
                        />
                    </div>

                    {/* SECTION 3: Primary Health Goal */}
                    <div className="dashboard-panel" style={{ padding: '20px', marginBottom: '24px', borderLeft: '6px solid #2563EB', borderRadius: '12px', background: 'linear-gradient(90deg, #F0F5FF 0%, #FFFFFF 100%)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style={{ fontSize: '24px' }}>🎯</span>
                            <div>
                                <h4 style={{ margin: 0, fontSize: '11px', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Primary Health Goal</h4>
                                <h3 style={{ margin: '2px 0 0 0', fontSize: '20px', fontWeight: '800', color: '#2563EB' }}>
                                    {healthData.goal || localStorage.getItem("healthwise_current_goal") || "General Health Improvement"}
                                </h3>
                            </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                            <span style={{ fontSize: '11px', fontWeight: '700', color: '#2563EB', backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE', padding: '4px 12px', borderRadius: '20px' }}>
                                Goal personalization active
                            </span>
                            <span style={{ fontSize: '11px', color: '#64748B' }}>Recommendations tailored to your goal and lifestyle.</span>
                        </div>
                    </div>

                    {/* SECTION 4: Health Risk Profile Circular Donut */}
                    {prediction && (
                        <div className="dashboard-panel" style={{ padding: '24px', marginBottom: '24px', backgroundColor: '#FFF', border: '1px solid #E2E8F0', borderRadius: '12px' }}>
                            <h3 className="panel-title" style={{ fontSize: '16px', fontWeight: '700', color: '#EF4444', margin: '0 0 20px 0', borderBottom: '1px solid #F1F5F9', paddingBottom: '8px' }}>
                                🩺 Health Risk Profile
                            </h3>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '32px', flexWrap: 'wrap' }}>
                                {(() => {
                                    const pct = Math.round((prediction.risk_score || 0) * 100);
                                    const strokeColor = prediction.prediction === "High" ? "#EF4444" : prediction.prediction === "Moderate" ? "#F59E0B" : "#10B981";
                                    return (
                                        <div style={{ position: 'relative', width: '120px', height: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <svg width="120" height="120" viewBox="0 0 36 36">
                                                <circle cx="18" cy="18" r="15.915" fill="none" stroke="#F1F5F9" strokeWidth="3" />
                                                <circle cx="18" cy="18" r="15.915" fill="none" stroke={strokeColor} strokeWidth="3.2" strokeDasharray={`${pct} ${100 - pct}`} strokeDashoffset="25" />
                                            </svg>
                                            <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                                                <span style={{ fontSize: '20px', fontWeight: '800', color: '#1E293B' }}>{pct}%</span>
                                                <span style={{ fontSize: '9px', color: '#64748B', fontWeight: 'bold' }}>Confidence Score</span>
                                            </div>
                                        </div>
                                    );
                                })()}
                                <div style={{ flex: '1', minWidth: '280px' }}>
                                    <h4 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: '800', color: prediction.prediction === "High" ? "#EF4444" : prediction.prediction === "Moderate" ? "#F59E0B" : "#10B981" }}>
                                        {prediction.prediction || "Moderate"} Risk Profile Detected
                                    </h4>
                                    <p style={{ margin: '0 0 12px 0', fontSize: '13.5px', lineHeight: '1.6', color: '#475569' }}>
                                        The machine learning RandomForest model predicts a <strong>{prediction.prediction || "Moderate"}</strong> health risk level based on your biological and lifestyle metrics.
                                    </p>
                                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#F59E0B', fontSize: '12px', fontWeight: '600' }}>
                                        <span>⚠️</span>
                                        <span>Not a medical diagnosis. Educational health risk estimation for demonstration purposes.</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* SECTION 5: Educational Health Insights */}
                    <div className="dashboard-panel" style={{ padding: '24px', marginBottom: '24px', backgroundColor: '#FFF', border: '1px solid #E2E8F0', borderRadius: '12px' }}>
                        <h3 className="panel-title" style={{ fontSize: '16px', fontWeight: '700', color: '#1E293B', margin: '0 0 20px 0', borderBottom: '1px solid #F1F5F9', paddingBottom: '8px' }}>
                            💡 Educational Health Insights
                        </h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                            <div style={{ padding: '16px', backgroundColor: '#ECFDF5', borderLeft: '4px solid #10B981', borderRadius: '8px' }}>
                                <h4 style={{ margin: '0 0 6px 0', fontSize: '14px', fontWeight: '700', color: '#064E3B' }}>BMI Assessment: {bmiCategory}</h4>
                                <p style={{ margin: 0, fontSize: '12.5px', color: '#1F2937', lineHeight: '1.5' }}>{bmiAdvice}</p>
                            </div>

                            <div style={{ padding: '16px', backgroundColor: '#FFFBEB', borderLeft: '4px solid #F59E0B', borderRadius: '8px' }}>
                                <h4 style={{ margin: '0 0 6px 0', fontSize: '14px', fontWeight: '700', color: '#78350F' }}>Blood Pressure Classification</h4>
                                {(() => {
                                    const sysVal = healthData.systolic_bp || localStorage.getItem("healthwise_current_systolic");
                                    const diaVal = healthData.diastolic_bp || localStorage.getItem("healthwise_current_diastolic");
                                    if (sysVal && diaVal) {
                                        return (
                                            <p style={{ margin: 0, fontSize: '13px', color: '#1E293B' }}>
                                                Your recorded blood pressure is <strong>{sysVal} / {diaVal} mmHg</strong>.
                                            </p>
                                        );
                                    }
                                    return (
                                        <p style={{ margin: 0, fontSize: '12.5px', color: '#78350F', fontStyle: 'italic' }}>
                                            No blood pressure measurements submitted for this assessment.
                                        </p>
                                    );
                                })()}
                            </div>

                            <div style={{ padding: '16px', backgroundColor: '#FEF2F2', borderLeft: '4px solid #EF4444', borderRadius: '8px' }}>
                                <h4 style={{ margin: '0 0 6px 0', fontSize: '14px', fontWeight: '700', color: '#7F1D1D' }}>Existing Health Notes</h4>
                                {conditionWarnings.length > 0 ? (
                                    <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '12px', color: '#7F1D1D', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        {conditionWarnings.map((warn, i) => (
                                            <li key={i}>{warn}</li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p style={{ margin: 0, fontSize: '12.5px', color: '#7F1D1D', fontStyle: 'italic' }}>
                                        No diagnosed conditions reported. Continue maintaining a proactive health lifestyle.
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* SECTION 6: Personalized Recommendations */}
                    <div className="dashboard-panel" style={{ padding: '24px', marginBottom: '24px', backgroundColor: '#FFF', border: '1px solid #E2E8F0', borderRadius: '12px' }}>
                        <h3 className="panel-title" style={{ fontSize: '16px', fontWeight: '700', color: '#2563EB', margin: '0 0 20px 0', borderBottom: '1px solid #F1F5F9', paddingBottom: '8px' }}>
                            ✨ Personalized Recommendations
                        </h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '24px' }}>
                            <RecommendationCard
                                title="Dietary & Nutritional Guidance"
                                recommendations={recommendations?.dietary || [
                                    "Include a balanced intake of vegetables, fibers, and lean proteins.",
                                    "Limit consumption of processed sugars and sodium."
                                ]}
                                type="prefer"
                            />
                            <RecommendationCard
                                title="Physical Activity & Exercise Plans"
                                recommendations={recommendations?.exercise || [
                                    "Integrate at least 150 minutes of moderate activity weekly.",
                                    "Try walking 20-30 minutes daily to raise cardiorespiratory stamina."
                                ]}
                                type="lifestyle"
                            />
                            <RecommendationCard
                                title="Lifestyle & General Habits"
                                recommendations={recommendations?.lifestyle || [
                                    "Maintain a consistent sleep duration of 7-8 hours daily.",
                                    "Aim for adequate water hydration levels throughout the day."
                                ]}
                                type="hydration"
                            />
                        </div>

                        {/* AI Support section */}
                        <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: '20px' }}>
                            <h4 style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: '700', color: '#2563EB' }}>AI-Generated Educational Health Support</h4>
                            <p style={{ fontSize: '12px', color: '#64748B', margin: '0 0 16px 0' }}>
                                Custom AI-driven insights personalized for goal: <strong>{healthData.goal || localStorage.getItem("healthwise_current_goal") || "General Health Improvement"}</strong>
                            </p>

                            {geminiLoading && (
                                <div style={{ padding: '24px', textAlign: 'center', backgroundColor: '#F8FAFC', borderRadius: '8px' }}>
                                    <div className="pulse-spinner" style={{ margin: '0 auto 12px auto' }}></div>
                                    <p style={{ margin: 0, fontSize: '13.5px', color: '#64748B' }}>Generating AI personalized recommendations...</p>
                                </div>
                            )}

                            {geminiError && (
                                <div style={{ padding: '16px', borderLeft: '4px solid #EF4444', backgroundColor: '#FEF2F2', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                                    <span style={{ fontSize: '13px', color: '#B91C1C', fontWeight: '600' }}>
                                        ⚠️ AI Recommendations Unavailable: {geminiError}
                                    </span>
                                    <button onClick={handleRetryGemini} className="btn-primary" style={{ padding: '6px 14px', fontSize: '12px' }}>
                                        🔄 Try Again
                                    </button>
                                </div>
                            )}

                            {(!geminiLoading && !geminiError && geminiRecommendations) && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    <div style={{ padding: '16px', backgroundColor: '#F8FAFC', borderRadius: '8px', borderLeft: '4px solid #2563EB' }}>
                                        <h5 style={{ fontSize: '13.5px', fontWeight: '700', color: '#1E293B', margin: '0 0 6px 0' }}>AI Health Summary</h5>
                                        <p style={{ fontSize: '12.5px', color: '#475569', lineHeight: '1.5', margin: 0 }}>{geminiRecommendations.summary}</p>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
                                        <div style={{ padding: '16px', backgroundColor: '#EFF6FF', borderRadius: '8px', borderLeft: '4px solid #3B82F6' }}>
                                            <h5 style={{ fontSize: '13px', fontWeight: '700', color: '#1E3A8A', margin: '0 0 6px 0' }}>Goal-Based Advice</h5>
                                            <p style={{ fontSize: '12px', color: '#1E293B', lineHeight: '1.5', margin: 0 }}>{geminiRecommendations.goal_advice}</p>
                                        </div>
                                        <div style={{ padding: '16px', backgroundColor: '#ECFDF5', borderRadius: '8px', borderLeft: '4px solid #10B981' }}>
                                            <h5 style={{ fontSize: '13px', fontWeight: '700', color: '#064E3B', margin: '0 0 6px 0' }}>Lifestyle & Habits</h5>
                                            <p style={{ fontSize: '12px', color: '#1F2937', lineHeight: '1.5', margin: 0 }}>
                                                <strong>Suggestions:</strong> {geminiRecommendations.physical_activity_suggestions}<br />
                                                <strong>Practical Tips:</strong> {geminiRecommendations.practical_habits}
                                            </p>
                                        </div>
                                    </div>
                                    <div style={{ padding: '16px', backgroundColor: '#FFFBEB', borderRadius: '8px', borderLeft: '4px solid #F59E0B' }}>
                                        <h5 style={{ fontSize: '13px', fontWeight: '700', color: '#78350F', margin: '0 0 6px 0' }}>Safety & Precautions</h5>
                                        <p style={{ fontSize: '12px', color: '#78350F', lineHeight: '1.5', margin: 0 }}>{geminiRecommendations.safety_considerations}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* SECTION 7: Nutrition & Habits Visualization */}
                    <div className="dashboard-panel" style={{ padding: '24px', marginBottom: '24px', backgroundColor: '#FFF', border: '1px solid #E2E8F0', borderRadius: '12px' }}>
                        <h3 className="panel-title" style={{ fontSize: '16px', fontWeight: '700', color: '#10B981', margin: '0 0 20px 0', borderBottom: '1px solid #F1F5F9', paddingBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span>🥗</span> Nutrition & Habits Visualization
                        </h3>
                        
                        <div className="nutrition-visualization-grid">
                            {/* Water Intake Widget */}
                            {(() => {
                                const waterVal = localStorage.getItem("healthwise_current_water") || "1-2L";
                                let targetVal = "2.5 L";
                                let pct = 55;
                                if (waterVal.includes("Less than 1L")) { targetVal = "0.8 L"; pct = 25; }
                                else if (waterVal.includes("1-2L")) { targetVal = "1.5 L"; pct = 55; }
                                else if (waterVal.includes("2-3L")) { targetVal = "2.5 L"; pct = 100; }
                                else if (waterVal.includes("More than 3L")) { targetVal = "3.2 L"; pct = 100; }

                                return (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '16px', backgroundColor: '#F8FAFC', borderRadius: '12px', border: '1px solid #E2E8F0', position: 'relative' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <div style={{ width: '32px', height: '32px', backgroundColor: '#EFF6FF', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3B82F6', fontSize: '16px' }}>💧</div>
                                            <div>
                                                <span style={{ fontSize: '10px', color: '#64748B', display: 'block' }}>Daily Water Goal</span>
                                                <strong style={{ fontSize: '16px', color: '#1E293B' }}>{targetVal}</strong>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: '2px', justifyContent: 'space-between', margin: '8px 0' }}>
                                            {[...Array(8)].map((_, i) => (
                                                <span key={i} style={{ fontSize: '14px', opacity: i < Math.round(pct / 12) ? 1 : 0.2 }}>🥛</span>
                                            ))}
                                        </div>
                                        <div style={{ height: '6px', backgroundColor: '#E2E8F0', borderRadius: '3px', overflow: 'hidden' }}>
                                            <div style={{ height: '100%', width: `${pct}%`, backgroundColor: '#3B82F6' }}></div>
                                        </div>
                                        <span style={{ fontSize: '10px', color: '#64748B', textAlign: 'center' }}>8-10 glasses</span>
                                    </div>
                                );
                            })()}

                            {/* Sleep Duration Circular Widget */}
                            {(() => {
                                const sleepVal = localStorage.getItem("healthwise_current_sleep") || "7-8 hours";
                                let pct = 100;
                                let displayVal = "7.5 hrs";
                                if (sleepVal.includes("Less than 5")) { pct = 40; displayVal = "4.5 hrs"; }
                                else if (sleepVal.includes("5-6")) { pct = 70; displayVal = "5.8 hrs"; }
                                else if (sleepVal.includes("7-8")) { pct = 100; displayVal = "7.5 hrs"; }
                                else if (sleepVal.includes("More than 8")) { pct = 90; displayVal = "8.5 hrs"; }

                                return (
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '16px', backgroundColor: '#F8FAFC', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
                                            <div style={{ width: '32px', height: '32px', backgroundColor: '#FAF5FF', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8B5CF6', fontSize: '16px' }}>🌙</div>
                                            <div style={{ textAlign: 'left' }}>
                                                <span style={{ fontSize: '10px', color: '#64748B', display: 'block' }}>Sleep Duration</span>
                                                <strong style={{ fontSize: '15px', color: '#1E293B' }}>7-8 hrs</strong>
                                            </div>
                                        </div>
                                        <div style={{ position: 'relative', width: '70px', height: '70px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '4px 0' }}>
                                            <svg width="70" height="70" viewBox="0 0 36 36">
                                                <circle cx="18" cy="18" r="15.915" fill="none" stroke="#E2E8F0" strokeWidth="3" />
                                                <circle cx="18" cy="18" r="15.915" fill="none" stroke="#8B5CF6" strokeWidth="3.2" strokeDasharray={`${pct} ${100 - pct}`} strokeDashoffset="25" />
                                            </svg>
                                            <span style={{ position: 'absolute', fontSize: '11px', fontWeight: '800', color: '#1E293B' }}>{displayVal}</span>
                                        </div>
                                        <span style={{ fontSize: '10px', color: '#64748B' }}>Recommended</span>
                                    </div>
                                );
                            })()}

                            {/* Activity Level Circular Widget */}
                            {(() => {
                                const actVal = healthData.physical_activity || "moderate";
                                let pct = 60;
                                if (actVal === "sedentary") pct = 30;
                                else if (actVal === "low") pct = 45;
                                else if (actVal === "moderate") pct = 60;
                                else if (actVal === "active") pct = 90;

                                return (
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '16px', backgroundColor: '#F8FAFC', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
                                            <div style={{ width: '32px', height: '32px', backgroundColor: '#ECFDF5', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10B981', fontSize: '16px' }}>🏃</div>
                                            <div style={{ textAlign: 'left' }}>
                                                <span style={{ fontSize: '10px', color: '#64748B', display: 'block' }}>Activity Level</span>
                                                <strong style={{ fontSize: '15px', color: '#1E293B', textTransform: 'capitalize' }}>{actVal}</strong>
                                            </div>
                                        </div>
                                        <div style={{ position: 'relative', width: '70px', height: '70px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '4px 0' }}>
                                            <svg width="70" height="70" viewBox="0 0 36 36">
                                                <circle cx="18" cy="18" r="15.915" fill="none" stroke="#E2E8F0" strokeWidth="3" />
                                                <circle cx="18" cy="18" r="15.915" fill="none" stroke="#10B981" strokeWidth="3.2" strokeDasharray={`${pct} ${100 - pct}`} strokeDashoffset="25" />
                                            </svg>
                                            <span style={{ position: 'absolute', fontSize: '11px', fontWeight: '800', color: '#1E293B' }}>{pct}%</span>
                                        </div>
                                        <span style={{ fontSize: '10px', color: '#64748B' }}>Stay Active!</span>
                                    </div>
                                );
                            })()}

                            {/* Daily Calories Circular Widget */}
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '16px', backgroundColor: '#F8FAFC', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
                                    <div style={{ width: '32px', height: '32px', backgroundColor: '#FFF5F5', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#EF4444', fontSize: '16px' }}>🔥</div>
                                    <div style={{ textAlign: 'left' }}>
                                        <span style={{ fontSize: '10px', color: '#64748B', display: 'block' }}>Daily Calories</span>
                                        <strong style={{ fontSize: '14px', color: '#1E293B' }}>1800–2000</strong>
                                    </div>
                                </div>
                                <div style={{ position: 'relative', width: '70px', height: '70px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '4px 0' }}>
                                    <svg width="70" height="70" viewBox="0 0 36 36">
                                        <circle cx="18" cy="18" r="15.915" fill="none" stroke="#E2E8F0" strokeWidth="3" />
                                        <circle cx="18" cy="18" r="15.915" fill="none" stroke="#EF4444" strokeWidth="3.2" strokeDasharray="80 20" strokeDashoffset="25" />
                                    </svg>
                                    <span style={{ position: 'absolute', fontSize: '11px', fontWeight: '800', color: '#1E293B' }}>80%</span>
                                </div>
                                <span style={{ fontSize: '10px', color: '#64748B' }}>Recommended</span>
                            </div>

                            {/* Nutritional Balance Vertical Bar Chart */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '16px', backgroundColor: '#F8FAFC', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
                                    <div style={{ width: '32px', height: '32px', backgroundColor: '#ECFDF5', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10B981', fontSize: '16px' }}>⚖️</div>
                                    <div style={{ textAlign: 'left' }}>
                                        <span style={{ fontSize: '10px', color: '#64748B', display: 'block' }}>Nutritional Balance</span>
                                        <strong style={{ fontSize: '15px', color: '#1E293B' }}>Good</strong>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'flex-end', height: '54px', padding: '6px 0' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                                        <div style={{ height: '35px', width: '10px', backgroundColor: '#3B82F6', borderRadius: '2px' }}></div>
                                        <span style={{ fontSize: '8px', color: '#64748B' }}>Carb</span>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                                        <div style={{ height: '42px', width: '10px', backgroundColor: '#10B981', borderRadius: '2px' }}></div>
                                        <span style={{ fontSize: '8px', color: '#64748B' }}>Prot</span>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                                        <div style={{ height: '28px', width: '10px', backgroundColor: '#F59E0B', borderRadius: '2px' }}></div>
                                        <span style={{ fontSize: '8px', color: '#64748B' }}>Fat</span>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                                        <div style={{ height: '45px', width: '10px', backgroundColor: '#10B981', borderRadius: '2px' }}></div>
                                        <span style={{ fontSize: '8px', color: '#64748B' }}>Fib</span>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                                        <div style={{ height: '30px', width: '10px', backgroundColor: '#8B5CF6', borderRadius: '2px' }}></div>
                                        <span style={{ fontSize: '8px', color: '#64748B' }}>Vit</span>
                                    </div>
                                </div>
                                <span style={{ fontSize: '10px', color: '#64748B', textAlign: 'center' }}>Keep it up!</span>
                            </div>
                        </div>

                        {/* Separation Layout: Recommended Foods vs Avoid Foods */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginTop: '20px' }}>
                            <div style={{ padding: '16px', backgroundColor: '#F0FDF4', borderRadius: '12px', borderLeft: '4px solid #10B981', border: '1px solid #DCFCE7' }}>
                                <h4 style={{ fontSize: '14.5px', fontWeight: '700', color: '#15803D', marginBottom: '12px', marginTop: 0 }}>Recommended Foods</h4>
                                <ul style={{ paddingLeft: '20px', fontSize: '13px', color: '#1E293B', margin: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <li>🥬 <strong>Leafy Greens:</strong> Spinach, kale, and lettuce for essential vitamins.</li>
                                    <li>🍎 <strong>Fruits:</strong> Berries, apples, and oranges loaded with fiber and antioxidants.</li>
                                    <li>🌾 <strong>Whole Grains:</strong> Oats, brown rice, and quinoa for stable energy.</li>
                                    <li>🥚 <strong>Lean Proteins:</strong> Chicken breast, fish, tofu, and legumes.</li>
                                    <li>🥑 <strong>Healthy Fats:</strong> Avocados, nuts, seeds, and extra virgin olive oil.</li>
                                    {geminiRecommendations?.recommended_foods?.map((item, idx) => (
                                        <li key={idx} style={{ color: '#15803D' }}>✨ {item}</li>
                                    ))}
                                </ul>
                            </div>

                            <div style={{ padding: '16px', backgroundColor: '#FFF5F5', borderRadius: '12px', borderLeft: '4px solid #EF4444', border: '1px solid #FEE2E2' }}>
                                <h4 style={{ fontSize: '14.5px', fontWeight: '700', color: '#B91C1C', marginBottom: '12px', marginTop: 0 }}>Foods to Limit / Avoid</h4>
                                <ul style={{ paddingLeft: '20px', fontSize: '13px', color: '#1E293B', margin: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <li>🧂 <strong>Excessive Sodium:</strong> Canned foods, chips, and table salt to protect BP.</li>
                                    <li>🍔 <strong>Processed Foods:</strong> Fast foods, deli meats, and refined flour.</li>
                                    <li>🥤 <strong>Sugary Beverages:</strong> Sodas, packaged fruit juices, and energy drinks.</li>
                                    <li>🍟 <strong>Fried Foods:</strong> Deep-fried items causing elevated trans-fats.</li>
                                    {geminiRecommendations?.foods_to_limit?.map((item, idx) => (
                                        <li key={idx} style={{ color: '#B91C1C' }}>⚠️ {item}</li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>

                    {/* SECTION 8: Daily Diet Plan Dashboard Table */}
                    {(!geminiLoading && !geminiError && geminiRecommendations) && (
                        <div className="dashboard-panel" style={{ padding: '24px', marginBottom: '24px', backgroundColor: '#FFF', border: '1px solid #E2E8F0', borderRadius: '12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #F1F5F9', paddingBottom: '10px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <span style={{ fontSize: '24px' }}>🗓️</span>
                                    <div>
                                        <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#1E293B', margin: 0 }}>Suggested Daily Menu Structure</h3>
                                        <span style={{ fontSize: '11px', color: '#64748B' }}>Personalized daily meal plan curated for your health goals and lifestyle.</span>
                                    </div>
                                </div>
                                <span style={{ fontSize: '10px', fontWeight: '700', color: '#8B5CF6', backgroundColor: '#F3E8FF', padding: '4px 10px', borderRadius: '20px' }}>
                                    EDUCATIONAL REFERENCE
                                </span>
                            </div>

                            {/* Desktop Table */}
                            <div className="diet-table-wrapper" style={{ border: '1px solid #E2E8F0', borderRadius: '12px', overflow: 'hidden' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13.5px' }}>
                                    <thead>
                                        <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', textAlign: 'left', color: '#475569' }}>
                                            <th style={{ padding: '14px 16px', width: '140px' }}>Meal Session</th>
                                            <th style={{ padding: '14px 16px', width: '400px' }}>Suggested Meal Plan</th>
                                            <th style={{ padding: '14px 16px', width: '160px' }}>Key Nutrients</th>
                                            <th style={{ padding: '14px 16px', width: '140px' }}>Example Food</th>
                                            <th style={{ padding: '14px 16px' }}>Benefits</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {/* Breakfast */}
                                        <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
                                            <td style={{ padding: '14px 16px', fontWeight: '700', color: '#1E293B' }}>🥣 Breakfast</td>
                                            <td style={{ padding: '14px 16px', color: '#1E293B', lineHeight: '1.4' }}>{geminiRecommendations.diet_chart?.breakfast}</td>
                                            <td style={{ padding: '14px 16px' }}>
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                                    <span style={{ padding: '2px 6px', backgroundColor: '#EFF6FF', color: '#1E40AF', borderRadius: '4px', fontSize: '10px' }}>Carbs</span>
                                                    <span style={{ padding: '2px 6px', backgroundColor: '#ECFDF5', color: '#064E3B', borderRadius: '4px', fontSize: '10px' }}>Fiber</span>
                                                    <span style={{ padding: '2px 6px', backgroundColor: '#EFF6FF', color: '#1E40AF', borderRadius: '4px', fontSize: '10px' }}>Protein</span>
                                                </div>
                                            </td>
                                            <td style={{ padding: '14px 16px', fontSize: '16px' }}>🥣 🍎 🥜 <span style={{ fontSize: '10px', color: '#64748B' }}>+2</span></td>
                                            <td style={{ padding: '14px 16px', color: '#475569', lineHeight: '1.4' }}>⚡ Provides sustained energy and essential nutrients.</td>
                                        </tr>

                                        {/* Mid-Morning */}
                                        <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
                                            <td style={{ padding: '14px 16px', fontWeight: '700', color: '#1E293B' }}>🍎 Mid-Morning</td>
                                            <td style={{ padding: '14px 16px', color: '#1E293B', lineHeight: '1.4' }}>{geminiRecommendations.diet_chart?.mid_morning}</td>
                                            <td style={{ padding: '14px 16px' }}>
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                                    <span style={{ padding: '2px 6px', backgroundColor: '#ECFDF5', color: '#064E3B', borderRadius: '4px', fontSize: '10px' }}>Vitamins</span>
                                                    <span style={{ padding: '2px 6px', backgroundColor: '#ECFDF5', color: '#064E3B', borderRadius: '4px', fontSize: '10px' }}>Fiber</span>
                                                </div>
                                            </td>
                                            <td style={{ padding: '14px 16px', fontSize: '16px' }}>🍎 🍌 <span style={{ fontSize: '10px', color: '#64748B' }}>+1</span></td>
                                            <td style={{ padding: '14px 16px', color: '#475569', lineHeight: '1.4' }}>😊 Keeps you full and maintains blood sugar balance.</td>
                                        </tr>

                                        {/* Lunch */}
                                        <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
                                            <td style={{ padding: '14px 16px', fontWeight: '700', color: '#1E293B' }}>🥗 Lunch</td>
                                            <td style={{ padding: '14px 16px', color: '#1E293B', lineHeight: '1.4' }}>{geminiRecommendations.diet_chart?.lunch}</td>
                                            <td style={{ padding: '14px 16px' }}>
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                                    <span style={{ padding: '2px 6px', backgroundColor: '#EFF6FF', color: '#1E40AF', borderRadius: '4px', fontSize: '10px' }}>Carbs</span>
                                                    <span style={{ padding: '2px 6px', backgroundColor: '#EFF6FF', color: '#1E40AF', borderRadius: '4px', fontSize: '10px' }}>Protein</span>
                                                    <span style={{ padding: '2px 6px', backgroundColor: '#ECFDF5', color: '#064E3B', borderRadius: '4px', fontSize: '10px' }}>Fiber</span>
                                                </div>
                                            </td>
                                            <td style={{ padding: '14px 16px', fontSize: '16px' }}>🍚 🍲 🥗 <span style={{ fontSize: '10px', color: '#64748B' }}>+2</span></td>
                                            <td style={{ padding: '14px 16px', color: '#475569', lineHeight: '1.4' }}>❤️ Balanced meal for macros and micronutrients.</td>
                                        </tr>

                                        {/* Evening Snack */}
                                        <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
                                            <td style={{ padding: '14px 16px', fontWeight: '700', color: '#1E293B' }}>🥛 Evening Snack</td>
                                            <td style={{ padding: '14px 16px', color: '#1E293B', lineHeight: '1.4' }}>{geminiRecommendations.diet_chart?.evening_snack}</td>
                                            <td style={{ padding: '14px 16px' }}>
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                                    <span style={{ padding: '2px 6px', backgroundColor: '#EFF6FF', color: '#1E40AF', borderRadius: '4px', fontSize: '10px' }}>Protein</span>
                                                    <span style={{ padding: '2px 6px', backgroundColor: '#ECFDF5', color: '#064E3B', borderRadius: '4px', fontSize: '10px' }}>Fiber</span>
                                                </div>
                                            </td>
                                            <td style={{ padding: '14px 16px', fontSize: '16px' }}>🥛 🥜 <span style={{ fontSize: '10px', color: '#64748B' }}>+1</span></td>
                                            <td style={{ padding: '14px 16px', color: '#475569', lineHeight: '1.4' }}>🛡️ Prevents overeating at dinner, aids digestion.</td>
                                        </tr>

                                        {/* Dinner */}
                                        <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
                                            <td style={{ padding: '14px 16px', fontWeight: '700', color: '#1E293B' }}>🍤 Dinner</td>
                                            <td style={{ padding: '14px 16px', color: '#1E293B', lineHeight: '1.4' }}>{geminiRecommendations.diet_chart?.dinner}</td>
                                            <td style={{ padding: '14px 16px' }}>
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                                    <span style={{ padding: '2px 6px', backgroundColor: '#EFF6FF', color: '#1E40AF', borderRadius: '4px', fontSize: '10px' }}>Protein</span>
                                                    <span style={{ padding: '2px 6px', backgroundColor: '#ECFDF5', color: '#064E3B', borderRadius: '4px', fontSize: '10px' }}>Vitamins</span>
                                                </div>
                                            </td>
                                            <td style={{ padding: '14px 16px', fontSize: '16px' }}>🍤 🥗 🍲 <span style={{ fontSize: '10px', color: '#64748B' }}>+2</span></td>
                                            <td style={{ padding: '14px 16px', color: '#475569', lineHeight: '1.4' }}>💪 Supports muscle repair and keeps your meal light.</td>
                                        </tr>

                                        {/* Hydration */}
                                        <tr>
                                            <td style={{ padding: '14px 16px', fontWeight: '700', color: '#1E293B' }}>💧 Hydration Plan</td>
                                            <td style={{ padding: '14px 16px', color: '#1E293B', lineHeight: '1.4' }}>{geminiRecommendations.diet_chart?.hydration}</td>
                                            <td style={{ padding: '14px 16px' }}>
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                                    <span style={{ padding: '2px 6px', backgroundColor: '#EFF6FF', color: '#1E40AF', borderRadius: '4px', fontSize: '10px' }}>Hydration</span>
                                                    <span style={{ padding: '2px 6px', backgroundColor: '#ECFDF5', color: '#064E3B', borderRadius: '4px', fontSize: '10px' }}>Detox</span>
                                                </div>
                                            </td>
                                            <td style={{ padding: '14px 16px', fontSize: '16px' }}>🫗 🍹 <span style={{ fontSize: '10px', color: '#64748B' }}>+1</span></td>
                                            <td style={{ padding: '14px 16px', color: '#475569', lineHeight: '1.4' }}>💧 Essential for cellular volume and waste flush.</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* SECTION 9: Medical Disclaimer */}
                    <div className="disclaimer-alert-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', backgroundColor: '#FFF5F5', border: '1px solid #FEE2E2', borderLeft: '6px solid #EF4444', borderRadius: '12px', padding: '24px', marginBottom: '32px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                            <span style={{ fontSize: '20px', color: '#EF4444' }}>🛑</span>
                            <span className="disclaimer-badge" style={{ backgroundColor: '#FEE2E2', color: '#B91C1C', padding: '4px 12px', borderRadius: '4px', fontSize: '11px', fontWeight: '800', letterSpacing: '0.05em', margin: 0 }}>
                                MEDICAL DISCLAIMER
                            </span>
                        </div>
                        <p className="disclaimer-text-card" style={{ margin: 0, fontSize: '13px', color: '#991B1B', lineHeight: '1.6', maxWidth: '800px' }}>
                            HealthWise AI provides educational and informational insights only. It is not a medical diagnosis or a substitute for professional healthcare advice, treatment, or clinical intervention. Never ignore professional medical advice because of something you read on this application.
                        </p>
                    </div>

                    {/* SECTION 10: Upgrade Action Cards & Buttons */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '32px' }} className="nutrition-visualization-grid">
                        <div style={{ padding: '24px', backgroundColor: '#FFF', border: '1px solid #E2E8F0', borderRadius: '12px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '160px' }}>
                            <div>
                                <span style={{ fontSize: '28px', display: 'block', marginBottom: '8px' }}>🔄</span>
                                <h4 style={{ margin: '0 0 4px 0', fontSize: '15px', color: '#1E293B', fontWeight: '700' }}>Retake Assessment</h4>
                                <p style={{ margin: 0, fontSize: '12px', color: '#64748B', lineHeight: '1.4' }}>Start a new assessment to update your health data and get fresh insights.</p>
                            </div>
                            <Link to="/assessment" className="btn-secondary" style={{ textDecoration: 'none', padding: '10px', fontSize: '13px', textAlign: 'center', display: 'block', borderRadius: '8px', marginTop: '12px' }}>
                                Retake Assessment →
                            </Link>
                        </div>

                        <div style={{ padding: '24px', background: 'linear-gradient(135deg, #2563EB 0%, #8B5CF6 100%)', borderRadius: '12px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', color: '#FFF', minHeight: '160px', boxShadow: '0 10px 20px rgba(37, 99, 235, 0.15)' }}>
                            <div>
                                <span style={{ fontSize: '28px', display: 'block', marginBottom: '8px' }}>📄</span>
                                <h4 style={{ margin: '0 0 4px 0', fontSize: '15px', fontWeight: '700' }}>Download PDF Report</h4>
                                <p style={{ margin: 0, fontSize: '12px', opacity: 0.9, lineHeight: '1.4' }}>Get a comprehensive PDF report of your analysis with details.</p>
                            </div>
                            <button onClick={handleDownloadReport} className="btn-primary" style={{ padding: '10px', fontSize: '13px', backgroundColor: '#FFF', color: '#2563EB', border: 'none', borderRadius: '8px', width: '100%', fontWeight: '700', marginTop: '12px', transition: 'all 0.2s' }}>
                                💾 Download PDF Report
                            </button>
                        </div>

                        <div style={{ padding: '24px', backgroundColor: '#FFF', border: '1px solid #E2E8F0', borderRadius: '12px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '160px' }}>
                            <div>
                                <span style={{ fontSize: '28px', display: 'block', marginBottom: '8px' }}>📊</span>
                                <h4 style={{ margin: '0 0 4px 0', fontSize: '15px', color: '#1E293B', fontWeight: '700' }}>Go to Dashboard</h4>
                                <p style={{ margin: 0, fontSize: '12px', color: '#64748B', lineHeight: '1.4' }}>View your health history, track trends, and monitor progress.</p>
                            </div>
                            <Link to="/dashboard" className="btn-secondary" style={{ textDecoration: 'none', padding: '10px', fontSize: '13px', textAlign: 'center', display: 'block', borderRadius: '8px', marginTop: '12px' }}>
                                Go to Dashboard →
                            </Link>
                        </div>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}

export default Result;
