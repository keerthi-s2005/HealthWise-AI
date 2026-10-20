import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import HealthCard from "../components/HealthCard";
import LoadingSpinner from "../components/LoadingSpinner";
import { getBMICategory } from "../utils/bmi";
import authService from "../services/authService";
import healthService from "../services/healthService";
import { generatePDFReport } from "../utils/reportGenerator";
import "./Dashboard.css";

function Dashboard() {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [assessment, setAssessment] = useState(null);
    const [historyList, setHistoryList] = useState([]);
    const [prediction, setPrediction] = useState(null);
    const [recommendations, setRecommendations] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const storedAuth = localStorage.getItem("healthwise_auth");
        if (!authService.isAuthenticated() && storedAuth !== "true") {
            navigate("/login");
            return;
        }

        const fetchDashboardData = async () => {
            setLoading(true);
            setError(null);

            // Get current user profile and user ID from auth service
            const currentUser = authService.getCurrentUser();
            setUser(currentUser);

            const userId = authService.getCurrentUserId() || 1;

            try {
                // 1. Fetch user health records history from backend
                const response = await healthService.getHealthHistory(userId);
                if (response && response.success) {
                    const data = response.data || [];
                    setHistoryList(data);

                    if (data.length > 0) {
                        const latest = data[0];
                        setAssessment(latest);

                        // 2. Fetch ML prediction from backend
                        try {
                            const predResponse = await healthService.getMLPrediction({
                                user_id: latest.user_id,
                                age: latest.age,
                                gender: latest.gender,
                                height: latest.height,
                                weight: latest.weight,
                                smoking_status: latest.smoking_status,
                                physical_activity: latest.physical_activity,
                                health_conditions: latest.health_conditions
                            });
                            if (predResponse && predResponse.success) {
                                setPrediction(predResponse);
                            }
                        } catch (predErr) {
                            console.error("Failed to fetch ML prediction:", predErr);
                        }

                        // 3. Fetch tailored recommendations from backend
                        try {
                            const recResponse = await healthService.getRecommendations(userId);
                            if (recResponse && recResponse.success && recResponse.recommendations) {
                                setRecommendations(recResponse.recommendations);
                            }
                        } catch (recErr) {
                            console.error("Failed to fetch recommendations:", recErr);
                        }
                    } else {
                        // Fallback check in local storage if database history is empty
                        const storedAssessment = localStorage.getItem("healthwise_assessment");
                        if (storedAssessment) {
                            try {
                                const parsed = JSON.parse(storedAssessment);
                                setAssessment({
                                    age: parsed.age || currentUser?.age || 30,
                                    gender: parsed.gender || currentUser?.gender || "Male",
                                    height: parsed.height || 170,
                                    weight: parsed.weight || 70,
                                    bmi: parsed.bmi || 24.2,
                                    physical_activity: parsed.activity || "Moderate",
                                    smoking_status: parsed.smoking || "Never",
                                    health_conditions: parsed.conditions ? parsed.conditions.join(", ") : "None",
                                    created_at: parsed.date || new Date().toISOString(),
                                    mlPrediction: parsed.mlPrediction || null
                                });
                                if (parsed.mlPrediction) {
                                    setPrediction(parsed.mlPrediction);
                                }
                            } catch (e) {
                                console.error("Failed to parse local assessment", e);
                            }
                        }
                    }
                } else {
                    // Fallback check in local storage if backend call returned success: false
                    const storedAssessment = localStorage.getItem("healthwise_assessment");
                    if (storedAssessment) {
                        try {
                            const parsed = JSON.parse(storedAssessment);
                            setAssessment({
                                age: parsed.age || currentUser?.age || 30,
                                gender: parsed.gender || currentUser?.gender || "Male",
                                height: parsed.height || 170,
                                weight: parsed.weight || 70,
                                bmi: parsed.bmi || 24.2,
                                physical_activity: parsed.activity || "Moderate",
                                smoking_status: parsed.smoking || "Never",
                                health_conditions: parsed.conditions ? parsed.conditions.join(", ") : "None",
                                created_at: parsed.date || new Date().toISOString(),
                                mlPrediction: parsed.mlPrediction || null
                            });
                            if (parsed.mlPrediction) {
                                setPrediction(parsed.mlPrediction);
                            }
                        } catch (e) {}
                    }
                }
            } catch (err) {
                console.error("Dashboard fetch error:", err);
                setError("Unable to load latest assessment from server.");
                // Fallback check in local storage
                const storedAssessment = localStorage.getItem("healthwise_assessment");
                if (storedAssessment) {
                    try {
                        const parsed = JSON.parse(storedAssessment);
                        setAssessment({
                            age: parsed.age || currentUser?.age || 30,
                            gender: parsed.gender || currentUser?.gender || "Male",
                            height: parsed.height || 170,
                            weight: parsed.weight || 70,
                            bmi: parsed.bmi || 24.2,
                            physical_activity: parsed.activity || "Moderate",
                            smoking_status: parsed.smoking || "Never",
                            health_conditions: parsed.conditions ? parsed.conditions.join(", ") : "None",
                            created_at: parsed.date || new Date().toISOString(),
                            mlPrediction: parsed.mlPrediction || null
                        });
                        if (parsed.mlPrediction) {
                            setPrediction(parsed.mlPrediction);
                        }
                    } catch (e) {}
                }
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, [navigate]);

    // Handle logout action
    const handleLogout = () => {
        authService.logout();
        navigate("/login");
    };

    // Calculate Lifestyle Risk level dynamically for display
    const getLifestyleRisk = () => {
        if (prediction && prediction.prediction) {
            return prediction.prediction;
        }
        if (!assessment) return "Low";
        let riskPoints = 0;

        const smoking = String(assessment.smoking_status).toLowerCase();
        if (smoking === "smoker" || smoking === "current") riskPoints += 2;
        if (smoking === "former") riskPoints += 1;

        const activity = String(assessment.physical_activity).toLowerCase();
        if (activity === "sedentary") riskPoints += 2;
        if (activity === "light") riskPoints += 1;

        const bmi = parseFloat(assessment.bmi);
        if (bmi >= 30) riskPoints += 2;
        else if (bmi >= 25) riskPoints += 1;

        if (riskPoints >= 4) return "High";
        if (riskPoints >= 2) return "Moderate";
        return "Low";
    };

    // Trigger PDF download
    const handleDownloadReport = () => {
        if (!assessment) return;
        generatePDFReport(
            user?.name,
            user?.email,
            assessment,
            prediction,
            recommendations
        );
    };

    // Render loading indicator
    if (loading) {
        return (
            <div className="app-container">
                <Navbar />
                <main className="main-content dashboard-page">
                    <LoadingSpinner message="Loading your dashboard profile..." />
                </main>
                <Footer />
            </div>
        );
    }

    // Parse date submitted
    const formattedDate = assessment && assessment.created_at
        ? new Date(assessment.created_at).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric"
          })
        : "N/A";

    const bmiCategory = assessment ? getBMICategory(assessment.bmi) : "Pending";

    // Format fields for display
    const capitalize = (str) => {
        if (!str) return "Not available";
        return str.charAt(0).toUpperCase() + str.slice(1);
    };

    return (
        <div className="app-container">
            <Navbar />
            <main className="main-content dashboard-page">
                <div className="dashboard-container">
                    {/* Welcome banner */}
                    <div className="dashboard-welcome-banner">
                        <div className="welcome-text">
                            <span className="welcome-tag">Overview Dashboard</span>
                            <h1 className="welcome-title">
                                Welcome, {user ? user.name : "User"}
                            </h1>
                            <p className="welcome-desc">
                                Track your vitals, monitor risk levels, and read educational health recommendations.
                            </p>
                        </div>
                        <div className="welcome-action">
                            {assessment ? (
                                <button onClick={handleDownloadReport} className="welcome-btn">
                                    Download PDF Report
                                </button>
                            ) : (
                                <Link to="/assessment" className="welcome-btn">
                                    Start Assessment
                                </Link>
                            )}
                        </div>
                    </div>

                    {error && (
                        <div className="status-alert alert-error">
                            {error}
                        </div>
                    )}

                    {/* OVERALL HEALTH STATS ROW */}
                    <div className="dashboard-metrics-grid">
                        <HealthCard
                            title="Latest BMI Value"
                            value={assessment ? parseFloat(assessment.bmi).toFixed(1) : "N/A"}
                            status={bmiCategory}
                            description={assessment ? `Weight: ${assessment.weight}kg | Height: ${assessment.height}cm` : "No stats entered"}
                        />

                        <HealthCard
                            title="ML Risk Estimation"
                            value={assessment ? `${prediction ? prediction.prediction : (assessment.mlPrediction ? assessment.mlPrediction.prediction : getLifestyleRisk())} Risk` : "N/A"}
                            status={assessment ? (prediction ? prediction.prediction : (assessment.mlPrediction ? assessment.mlPrediction.prediction : getLifestyleRisk())) : "Low"}
                            description={assessment ? (prediction ? `Risk Score: ${prediction.risk_score} (Flask ML)` : (assessment.mlPrediction ? `Risk Score: ${assessment.mlPrediction.risk_score} (Flask ML)` : "Determined by habits and conditions")) : "Habits not analyzed"}
                        />

                        <HealthCard
                            title="Assessment Status"
                            value={assessment ? "Completed" : "Pending"}
                            status={assessment ? "Normal" : "Moderate"}
                            description={assessment ? `Submitted on ${formattedDate}` : "Requires submission"}
                        />
                    </div>

                    {/* MAIN CONTENT LAYOUT */}
                    {assessment ? (
                        <div className="dashboard-content-layout">
                            {/* LEFT COLUMN */}
                            <div className="dashboard-left-column" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                {/* Profile overview panel */}
                                <div className="dashboard-panel panel-summary">
                                    <h3 className="panel-title">Latest Health Profile</h3>
                                    <div className="summary-data-table">
                                        <div className="summary-row">
                                            <span className="summary-label">Name / Email:</span>
                                            <span className="summary-value">{user?.name} / {user?.email || "N/A"}</span>
                                        </div>
                                        <div className="summary-row">
                                            <span className="summary-label">Reported Age / Gender:</span>
                                            <span className="summary-value">{assessment.age} yrs / {capitalize(assessment.gender)}</span>
                                        </div>
                                        <div className="summary-row">
                                            <span className="summary-label font-highlight">Height / Weight:</span>
                                            <span className="summary-value font-highlight">{assessment.height} cm / {assessment.weight} kg</span>
                                        </div>
                                        <div className="summary-row">
                                            <span className="summary-label">Blood Pressure:</span>
                                            <span className="summary-value">
                                                {assessment.systolic_bp && assessment.diastolic_bp ? `${assessment.systolic_bp}/${assessment.diastolic_bp} mmHg` : "N/A"}
                                            </span>
                                        </div>
                                        <div className="summary-row">
                                            <span className="summary-label">Physical Activity:</span>
                                            <span className="summary-value capitalize">{assessment.physical_activity}</span>
                                        </div>
                                        <div className="summary-row">
                                            <span className="summary-label">Smoking Status:</span>
                                            <span className="summary-value capitalize">{assessment.smoking_status}</span>
                                        </div>
                                        <div className="summary-row">
                                            <span className="summary-label">Diagnosed Conditions:</span>
                                            <span className="summary-value capitalize">
                                                {assessment.health_conditions && assessment.health_conditions !== "none" ? assessment.health_conditions.split(",").join(", ") : "None"}
                                            </span>
                                        </div>
                                        <div className="summary-row">
                                            <span className="summary-label">Primary Health Goal:</span>
                                            <span className="summary-value capitalize">{assessment.goal || "General Health Improvement"}</span>
                                        </div>
                                        <div className="summary-row">
                                            <span className="summary-label font-highlight">Blood Pressure:</span>
                                            <span className="summary-value font-highlight">
                                                {assessment.systolic && assessment.diastolic ? (
                                                    `${assessment.systolic} / ${assessment.diastolic} mmHg`
                                                ) : localStorage.getItem("healthwise_current_systolic") && localStorage.getItem("healthwise_current_diastolic") ? (
                                                    `${localStorage.getItem("healthwise_current_systolic")} / ${localStorage.getItem("healthwise_current_diastolic")} mmHg`
                                                ) : (
                                                    "N/A"
                                                )}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Professional Health Summary Visualization */}
                                <div className="dashboard-panel" style={{ padding: '20px' }}>
                                    <h3 className="panel-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '0 0 16px 0' }}>
                                        <span>📊 Lifestyle & Health Summary</span>
                                        <span style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 'bold' }}>EDUCATIONAL SCALE</span>
                                    </h3>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
                                        {/* BMI Indicator Gauge */}
                                        <div style={{ padding: '12px', backgroundColor: '#F8FAFC', borderRadius: '8px', borderLeft: '3px solid var(--primary)' }}>
                                            <span style={{ fontSize: '12px', color: 'var(--muted)', display: 'block', marginBottom: '6px' }}>Body Mass Index</span>
                                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                                                <strong style={{ fontSize: '20px', color: 'var(--text)' }}>{parseFloat(assessment.bmi).toFixed(1)}</strong>
                                                <span style={{ fontSize: '11px', color: 'var(--muted)' }}>kg/m²</span>
                                            </div>
                                            <div style={{ height: '6px', backgroundColor: '#E2E8F0', borderRadius: '3px', marginTop: '8px', overflow: 'hidden' }}>
                                                <div style={{ height: '100%', width: `${Math.min(Math.max((assessment.bmi / 40) * 100, 10), 100)}%`, backgroundColor: assessment.bmi >= 18.5 && assessment.bmi < 25 ? 'var(--success)' : 'var(--warning)' }}></div>
                                            </div>
                                        </div>

                                        {/* Blood Pressure Gauge */}
                                        <div style={{ padding: '12px', backgroundColor: '#F8FAFC', borderRadius: '8px', borderLeft: '3px solid var(--success)' }}>
                                            <span style={{ fontSize: '12px', color: 'var(--muted)', display: 'block', marginBottom: '6px' }}>Blood Pressure</span>
                                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                                                <strong style={{ fontSize: '18px', color: 'var(--text)' }}>
                                                    {assessment.systolic && assessment.diastolic ? `${assessment.systolic}/${assessment.diastolic}` : "N/A"}
                                                </strong>
                                                <span style={{ fontSize: '11px', color: 'var(--muted)' }}>mmHg</span>
                                            </div>
                                            {assessment.systolic ? (
                                                <div style={{ height: '6px', backgroundColor: '#E2E8F0', borderRadius: '3px', marginTop: '8px', overflow: 'hidden' }}>
                                                    <div style={{ height: '100%', width: `${Math.min(Math.max((assessment.systolic / 180) * 100, 10), 100)}%`, backgroundColor: assessment.systolic < 130 ? 'var(--success)' : 'var(--danger)' }}></div>
                                                </div>
                                            ) : (
                                                <span style={{ display: 'block', fontSize: '11px', color: 'var(--muted)', marginTop: '8px' }}>Not measured</span>
                                            )}
                                        </div>

                                        {/* Physical Activity Consistency */}
                                        <div style={{ padding: '12px', backgroundColor: '#F8FAFC', borderRadius: '8px', borderLeft: '3px solid var(--warning)' }}>
                                            <span style={{ fontSize: '12px', color: 'var(--muted)', display: 'block', marginBottom: '6px' }}>Physical Activity</span>
                                            <strong style={{ fontSize: '16px', color: 'var(--text)', textTransform: 'capitalize' }}>{assessment.physical_activity}</strong>
                                            <div style={{ height: '6px', backgroundColor: '#E2E8F0', borderRadius: '3px', marginTop: '8px', overflow: 'hidden' }}>
                                                <div style={{
                                                    height: '100%',
                                                    width: assessment.physical_activity === 'active' || assessment.physical_activity === 'high' ? '100%' : assessment.physical_activity === 'moderate' ? '65%' : '30%',
                                                    backgroundColor: 'var(--warning)'
                                                }}></div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="summary-actions" style={{ marginTop: '16px' }}>
                                        <Link to="/result" className="btn-secondary view-report-btn">
                                            View Full Analysis Report →
                                        </Link>
                                    </div>
                                </div>

                                {/* Tailored recommendations panel */}
                                <div className="dashboard-panel panel-recommendations">
                                    <h3 className="panel-title">Tailored Recommendations</h3>
                                    {recommendations ? (
                                        <div className="dashboard-recommendations-lists" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                            <div>
                                                <h4 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--success)', marginBottom: '8px' }}>Dietary Suggestions</h4>
                                                <ul style={{ paddingLeft: '20px', fontSize: '13.5px', color: 'var(--text)', lineHeight: '1.5' }}>
                                                    {recommendations.dietary?.map((item, idx) => (
                                                        <li key={idx} style={{ marginBottom: '4px' }}>{item}</li>
                                                    )) || <li>Balanced daily intake.</li>}
                                                </ul>
                                            </div>
                                            <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: '12px' }}>
                                                <h4 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--primary)', marginBottom: '8px' }}>Exercise Guidance</h4>
                                                <ul style={{ paddingLeft: '20px', fontSize: '13.5px', color: 'var(--text)', lineHeight: '1.5' }}>
                                                    {recommendations.exercise?.map((item, idx) => (
                                                        <li key={idx} style={{ marginBottom: '4px' }}>{item}</li>
                                                    )) || <li>Regular low-impact cardio.</li>}
                                                </ul>
                                            </div>
                                            <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: '12px' }}>
                                                <h4 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--warning)', marginBottom: '8px' }}>Lifestyle Adjustments</h4>
                                                <ul style={{ paddingLeft: '20px', fontSize: '13.5px', color: 'var(--text)', lineHeight: '1.5' }}>
                                                    {recommendations.lifestyle?.map((item, idx) => (
                                                        <li key={idx} style={{ marginBottom: '4px' }}>{item}</li>
                                                    )) || <li>Maintain consistent sleep schedules.</li>}
                                                </ul>
                                            </div>
                                        </div>
                                    ) : (
                                        <p style={{ fontSize: '13.5px', color: 'var(--muted)' }}>No recommendation guidelines returned from the backend.</p>
                                    )}
                                </div>
                                {/* Assessment History */}
                                {historyList.length > 0 && (
                                    <div className="dashboard-panel panel-history">
                                        <h3 className="panel-title">
                                            {historyList.length === 1 ? "Latest Health Record" : "Health History"}
                                        </h3>
                                        
                                        {/* Desktop Table View */}
                                        <div className="desktop-history-view" style={{ overflowX: 'auto' }}>
                                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13.5px', minWidth: '600px' }}>
                                                <thead>
                                                    <tr style={{ borderBottom: '2px solid #E2E8F0', textAlign: 'left', color: 'var(--muted)' }}>
                                                        <th style={{ padding: '12px 10px' }}>Date</th>
                                                        <th style={{ padding: '12px 10px' }}>Height</th>
                                                        <th style={{ padding: '12px 10px' }}>Weight</th>
                                                        <th style={{ padding: '12px 10px' }}>BMI</th>
                                                        <th style={{ padding: '12px 10px' }}>Blood Pressure</th>
                                                        <th style={{ padding: '12px 10px' }}>Smoking</th>
                                                        <th style={{ padding: '12px 10px' }}>Activity</th>
                                                        <th style={{ padding: '12px 10px' }}>Conditions</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {historyList.map((item, index) => {
                                                        const isLatest = index === 0;
                                                        const sysVal = item.systolic_bp || item.systolic;
                                                        const diaVal = item.diastolic_bp || item.diastolic;
                                                        const bpText = (sysVal && diaVal)
                                                            ? `${sysVal} / ${diaVal} mmHg`
                                                            : (isLatest && localStorage.getItem("healthwise_current_systolic") && localStorage.getItem("healthwise_current_diastolic"))
                                                                ? `${localStorage.getItem("healthwise_current_systolic")} / ${localStorage.getItem("healthwise_current_diastolic")} mmHg`
                                                                : "N/A";
                                                        
                                                        return (
                                                            <tr key={item.id || index} style={{ 
                                                                borderBottom: '1px solid #F1F5F9', 
                                                                backgroundColor: isLatest ? '#EFF6FF' : 'transparent',
                                                                fontWeight: isLatest ? '600' : 'normal'
                                                            }}>
                                                                <td style={{ padding: '12px 10px', color: isLatest ? 'var(--primary)' : 'var(--text)' }}>
                                                                    {item.created_at ? new Date(item.created_at).toLocaleDateString("en-US", { year: 'numeric', month: 'short', day: 'numeric' }) : "N/A"}
                                                                </td>
                                                                <td style={{ padding: '12px 10px' }}>{item.height} cm</td>
                                                                <td style={{ padding: '12px 10px' }}>{item.weight} kg</td>
                                                                <td style={{ padding: '12px 10px' }}>
                                                                    {parseFloat(item.bmi).toFixed(1)} 
                                                                    <span style={{ 
                                                                        fontSize: '11px', 
                                                                        marginLeft: '6px', 
                                                                        padding: '2px 6px', 
                                                                        borderRadius: '4px',
                                                                        backgroundColor: isLatest ? '#DBEAFE' : '#F1F5F9',
                                                                        color: isLatest ? '#1E40AF' : '#475569'
                                                                    }}>
                                                                        {getBMICategory(item.bmi)}
                                                                    </span>
                                                                </td>
                                                                <td style={{ padding: '12px 10px', fontSize: '12px', color: isLatest ? 'var(--text)' : 'var(--muted)' }}>
                                                                    {bpText}
                                                                </td>
                                                                <td style={{ padding: '12px 10px', textTransform: 'capitalize' }}>{item.smoking_status}</td>
                                                                <td style={{ padding: '12px 10px', textTransform: 'capitalize' }}>{item.physical_activity}</td>
                                                                <td style={{ padding: '12px 10px', textTransform: 'capitalize' }}>
                                                                    {item.health_conditions && item.health_conditions !== "none" ? item.health_conditions.split(",").join(", ") : "None"}
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>

                                        {/* Mobile Stacked Card View */}
                                        <div className="mobile-history-view" style={{ display: 'none', flexDirection: 'column', gap: '16px', marginTop: '10px' }}>
                                            {historyList.map((item, index) => {
                                                const isLatest = index === 0;
                                                const sysVal = item.systolic_bp || item.systolic;
                                                const diaVal = item.diastolic_bp || item.diastolic;
                                                const bpText = (sysVal && diaVal)
                                                    ? `${sysVal} / ${diaVal} mmHg`
                                                    : (isLatest && localStorage.getItem("healthwise_current_systolic") && localStorage.getItem("healthwise_current_diastolic")) 
                                                        ? `${localStorage.getItem("healthwise_current_systolic")} / ${localStorage.getItem("healthwise_current_diastolic")} mmHg` 
                                                        : "N/A";
                                                
                                                return (
                                                    <div key={item.id} className="history-mobile-card" style={{
                                                        padding: '16px',
                                                        border: `1px solid ${isLatest ? 'var(--primary)' : '#E2E8F0'}`,
                                                        borderRadius: '12px',
                                                        backgroundColor: isLatest ? '#EFF6FF' : '#FFFFFF',
                                                        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                                                    }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', borderBottom: '1px solid #E2E8F0', paddingBottom: '6px' }}>
                                                            <span style={{ fontWeight: '700', color: isLatest ? 'var(--primary)' : 'var(--text)' }}>
                                                                {item.created_at ? new Date(item.created_at).toLocaleDateString("en-US", { year: 'numeric', month: 'short', day: 'numeric' }) : "N/A"}
                                                            </span>
                                                            {isLatest && (
                                                                <span style={{ fontSize: '11px', fontWeight: '700', backgroundColor: 'var(--primary)', color: '#FFFFFF', padding: '2px 8px', borderRadius: '12px' }}>
                                                                    LATEST
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '13px' }}>
                                                            <div><strong>Height:</strong> {item.height} cm</div>
                                                            <div><strong>Weight:</strong> {item.weight} kg</div>
                                                            <div><strong>BMI:</strong> {parseFloat(item.bmi).toFixed(1)} ({getBMICategory(item.bmi)})</div>
                                                            <div><strong>Activity:</strong> <span style={{ textTransform: 'capitalize' }}>{item.physical_activity}</span></div>
                                                            <div style={{ gridColumn: 'span 2' }}><strong>Blood Pressure:</strong> {bpText}</div>
                                                            <div style={{ gridColumn: 'span 2' }}><strong>Smoking:</strong> <span style={{ textTransform: 'capitalize' }}>{item.smoking_status}</span></div>
                                                            <div style={{ gridColumn: 'span 2' }}><strong>Conditions:</strong> <span style={{ textTransform: 'capitalize' }}>{item.health_conditions && item.health_conditions !== "none" ? item.health_conditions.split(",").join(", ") : "None"}</span></div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}


                            </div>

                            {/* RIGHT COLUMN */}
                            <div className="dashboard-right-column" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                {/* AI Health Risk Prediction */}
                                <div className="dashboard-panel panel-risk" style={{ borderLeft: `6px solid var(--${getLifestyleRisk() === 'High' ? 'danger' : getLifestyleRisk() === 'Moderate' ? 'warning' : 'success'})` }}>
                                    <h3 className="panel-title">AI Health Risk</h3>
                                    {prediction ? (
                                        <div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                                                <span style={{ fontSize: '15px', fontWeight: '600', color: 'var(--muted)' }}>Prediction Result:</span>
                                                <span className={`status-badge status-${getLifestyleRisk() === 'High' ? 'danger' : getLifestyleRisk() === 'Moderate' ? 'warning' : 'success'}`} style={{ marginLeft: 'auto', fontSize: '13px' }}>
                                                    {prediction.prediction} Risk
                                                </span>
                                            </div>
                                            
                                            {prediction.risk_score !== undefined && (
                                                <div style={{ marginTop: '16px' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
                                                        <span>Model Probability Score:</span>
                                                        <span>{Math.round(prediction.risk_score * 100)}%</span>
                                                    </div>
                                                    <div style={{ height: '8px', backgroundColor: '#E2E8F0', borderRadius: '4px', overflow: 'hidden' }}>
                                                        <div style={{
                                                            height: '100%',
                                                            width: `${prediction.risk_score * 100}%`,
                                                            backgroundColor: `var(--${getLifestyleRisk() === 'High' ? 'danger' : getLifestyleRisk() === 'Moderate' ? 'warning' : 'success'})`,
                                                            borderRadius: '4px'
                                                        }}></div>
                                                    </div>
                                                </div>
                                            )}
                                            
                                            {prediction.disclaimer && (
                                                <p style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '16px', lineHeight: '1.4', fontStyle: 'italic' }}>
                                                    {prediction.disclaimer}
                                                </p>
                                            )}
                                        </div>
                                    ) : (
                                        <p style={{ fontSize: '13px', color: 'var(--muted)' }}>ML Classifier predictions currently unavailable.</p>
                                    )}
                                </div>

                                {/* Gemini Compact Summary Card */}
                                {assessment && (
                                    <div className="dashboard-panel" style={{ borderLeft: '6px solid var(--success)' }}>
                                        <h3 className="panel-title" style={{ color: 'var(--success)', borderBottom: '1px solid #F1F5F9', paddingBottom: '8px', marginBottom: '14px' }}>
                                            ✨ Your AI Recommendations
                                        </h3>
                                        
                                        {(() => {
                                            const goal = localStorage.getItem("healthwise_current_goal") || "Not available";
                                            let topNutrition = "Please view the full report to generate recommendations.";
                                            let topLifestyle = "Please view the full report to generate recommendations.";
                                            
                                            const storedRecs = localStorage.getItem("healthwise_current_gemini_recommendations");
                                            let hasRecs = false;
                                            if (storedRecs) {
                                                try {
                                                    const parsed = JSON.parse(storedRecs);
                                                    if (parsed) {
                                                        hasRecs = true;
                                                        topNutrition = parsed.recommended_foods && parsed.recommended_foods.length > 0 
                                                            ? parsed.recommended_foods[0] 
                                                            : parsed.nutrition_recommendations || "Balanced nutrition focus.";
                                                        topLifestyle = parsed.practical_habits || parsed.lifestyle_recommendations || "Daily healthy lifestyle steps.";
                                                    }
                                                } catch (e) {
                                                    console.error("Failed to parse stored gemini recommendations", e);
                                                }
                                            }
                                            
                                            return (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13.5px' }}>
                                                    <div>
                                                        <strong>Health Goal:</strong> 
                                                        <span style={{ marginLeft: '6px', padding: '2px 8px', borderRadius: '4px', backgroundColor: '#EFF6FF', color: 'var(--primary)', fontWeight: '600' }}>
                                                            {goal}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <strong>Top Nutrition Focus:</strong>
                                                        <p style={{ margin: '4px 0 0 0', color: 'var(--muted)', lineHeight: '1.4' }}>{topNutrition}</p>
                                                    </div>
                                                    <div>
                                                        <strong>Top Lifestyle Focus:</strong>
                                                        <p style={{ margin: '4px 0 0 0', color: 'var(--muted)', lineHeight: '1.4' }}>{topLifestyle}</p>
                                                    </div>
                                                    <button 
                                                        type="button"
                                                        onClick={() => navigate("/result")} 
                                                        className="btn-primary" 
                                                        style={{ width: '100%', marginTop: '8px', padding: '10px 16px' }}
                                                    >
                                                        {hasRecs ? "🔍 View Full Recommendations" : "✨ Generate AI Recommendations"}
                                                    </button>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                )}

                                {/* Quick Actions Panel */}
                                <div className="dashboard-panel panel-actions">
                                    <h3 className="panel-title">Quick Actions</h3>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        <button onClick={() => navigate("/assessment")} className="btn-primary" style={{ width: '100%', padding: '12px' }}>
                                            📋 Take Assessment Again
                                        </button>
                                        <button onClick={() => navigate("/result")} className="btn-secondary" style={{ width: '100%', padding: '12px' }}>
                                            🔍 View Full Report
                                        </button>
                                        <button onClick={handleDownloadReport} className="btn-secondary" style={{ width: '100%', padding: '12px' }}>
                                            💾 Download Report PDF
                                        </button>
                                        <button onClick={handleLogout} className="btn-secondary" style={{ width: '100%', padding: '12px', borderColor: 'var(--danger)', color: 'var(--danger)' }}>
                                            🚪 Logout
                                        </button>
                                    </div>
                                </div>

                                {/* Educational tips */}
                                <div className="dashboard-panel panel-guides">
                                    <h3 className="panel-title">Educational Tips</h3>
                                    <ul className="educational-tips-list">
                                        <li className="tip-item">
                                            <span className="tip-bullet">💡</span>
                                            <span className="tip-text">
                                                <strong>Stay Hydrated:</strong> Drinking 2 to 3 liters of water daily supports cellular metabolic clearance rates.
                                            </span>
                                        </li>
                                        <li className="tip-item">
                                            <span className="tip-bullet">💡</span>
                                            <span className="tip-text">
                                                <strong>Active Movement:</strong> Combine low-intensity movement with strength training for cardiovascular resilience.
                                            </span>
                                        </li>
                                        <li className="tip-item">
                                            <span className="tip-bullet">💡</span>
                                            <span className="tip-text">
                                                <strong>Sleep Health:</strong> Establish a restful 7-8 hour sleep schedule to assist muscle recovery and balance hormones.
                                            </span>
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="dashboard-panel" style={{ padding: '50px 20px', textAlign: 'center' }}>
                            <div className="assessment-empty-state">
                                <span className="empty-state-icon">📋</span>
                                <h4>No health history available yet.</h4>
                                <p>You have not completed a health risk assessment. Start one now to receive your customized recommendations and AI evaluations.</p>
                                <button onClick={() => navigate("/assessment")} className="btn-primary" style={{ padding: '14px 28px' }}>
                                    Start Your First Assessment
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </main>
            <Footer />
        </div>
    );
}

export default Dashboard;
