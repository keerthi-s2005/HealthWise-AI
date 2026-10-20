import React from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import meditationMan from "../assets/meditation_man.jpg";
import "./Home.css";

function Home() {
    const navigate = useNavigate();

    return (
        <div className="app-container">
            <Navbar />

            <main className="main-content home-page">
                {/* HERO SECTION */}
                <section className="hero-section">
                    {/* Background glow effects */}
                    <div className="hero-bg-glow glow-1"></div>
                    <div className="hero-bg-glow glow-2"></div>
                    <div className="hero-bg-glow glow-3"></div>

                    <div className="hero-grid-container">
                        <div className="hero-text-content">
                            <span className="hero-badge">
                                <span className="badge-spark">✦</span> AI-POWERED HEALTH INSIGHTS
                            </span>
                            
                            <h1 className="hero-title">
                                Understand Your Health.<br />
                                <span className="hero-highlight">Make Better Choices.</span>
                                <div className="headline-underline"></div>
                            </h1>
                            
                            <p className="hero-subtitle">
                                Get personalized health risk insights, BMI analysis, and smart recommendations based on your lifestyle, habits, and medical history.
                            </p>
                            
                            <div className="hero-actions">
                                <button
                                    onClick={() => navigate("/assessment")}
                                    className="btn-primary start-assessment-btn"
                                >
                                    <svg className="btn-icon-svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: "8px" }}>
                                        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                                    </svg>
                                    Start Health Assessment
                                </button>
                                <a href="#features-strip" className="btn-secondary learn-more-btn">
                                    <svg className="btn-icon-svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}>
                                        <polygon points="5 3 19 12 5 21 5 3" />
                                    </svg>
                                    Learn More
                                </a>
                            </div>
                        </div>

                        <div className="hero-graphic-container">
                            {/* Glow circle behind image */}
                            <div className="graphic-glow-circle"></div>

                            {/* Main hero image */}
                            <img src={meditationMan} alt="Man Meditating" className="hero-image" />

                            {/* FLOATING CARDS */}
                            {/* Card 1: Pulse Check */}
                            <div className="floating-card card-pulse">
                                <div className="card-icon-wrapper pulse-bg">
                                    <span className="card-emoji">❤️</span>
                                </div>
                                <div className="card-details">
                                    <span className="card-label">Pulse Check</span>
                                    <span className="card-value-text text-pulse">Active Analysis</span>
                                </div>
                            </div>

                            {/* Card 2: Health Score */}
                            <div className="floating-card card-score">
                                <div className="card-icon-wrapper score-bg">
                                    <span className="card-emoji">🛡️</span>
                                </div>
                                <div className="card-details">
                                    <span className="card-label">Health Score</span>
                                    <span className="card-value-number">85%</span>
                                    <span className="card-value-sub text-score">Good</span>
                                </div>
                            </div>

                            {/* Card 3: Risk Level */}
                            <div className="floating-card card-risk">
                                <div className="card-icon-wrapper risk-bg">
                                    <span className="card-emoji">📊</span>
                                </div>
                                <div className="card-details">
                                    <span className="card-label">Risk Level</span>
                                    <span className="card-value-text text-risk">Low Risk</span>
                                    <span className="card-value-sub">Keep it up!</span>
                                </div>
                            </div>

                            {/* Card 4: Nutrition Insights */}
                            <div className="floating-card card-nutrition">
                                <div className="card-icon-wrapper nutrition-bg">
                                    <span className="card-emoji">🍃</span>
                                </div>
                                <div className="card-details">
                                    <span className="card-label">Nutrition Insights</span>
                                    <span className="card-value-text text-nutrition">Personalized</span>
                                    <span className="card-value-sub text-nutrition-sub">For You</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Curved wave transition at bottom of hero */}
                    <div className="hero-wave-bottom">
                        <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M0 60C120 20 360 0 720 0C1080 0 1320 20 1440 60V120H0V60Z" fill="#F8FAFC" />
                        </svg>
                    </div>
                </section>

                {/* FEATURE STRIP SECTION */}
                <section id="features-strip" className="features-strip-section">
                    <div className="strip-container">
                        <div className="feature-strip-card">
                            <div className="strip-column">
                                <div className="column-icon-bg col-blue">
                                    <svg className="col-icon" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.44 2.5 2.5 0 0 1 0-3.12 3 3 0 0 1 0-4.88 2.5 2.5 0 0 1 0-3.12A2.5 2.5 0 0 1 9.5 2zM14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.44 2.5 2.5 0 0 0 0-3.12 3 3 0 0 0 0-4.88 2.5 2.5 0 0 0 0-3.12A2.5 2.5 0 0 0 14.5 2z" />
                                    </svg>
                                </div>
                                <div className="column-text">
                                    <h4>AI-Powered Analysis</h4>
                                    <p>Advanced AI predicts health risks accurately.</p>
                                </div>
                            </div>

                            <div className="strip-divider"></div>

                            <div className="strip-column">
                                <div className="column-icon-bg col-purple">
                                    <svg className="col-icon" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                                        <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
                                        <path d="M9 14h6" />
                                        <path d="M9 18h6" />
                                        <path d="M9 10h6" />
                                    </svg>
                                </div>
                                <div className="column-text">
                                    <h4>Personalized Insights</h4>
                                    <p>Custom insights based on your unique health profile.</p>
                                </div>
                            </div>

                            <div className="strip-divider"></div>

                            <div className="strip-column">
                                <div className="column-icon-bg col-pink">
                                    <svg className="col-icon" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M4 3v7a4 4 0 0 0 4 4v8M7 3v4M10 3v4M17 3v19M20 8a3 3 0 0 0-3-3v3" />
                                    </svg>
                                </div>
                                <div className="column-text">
                                    <h4>Smart Recommendations</h4>
                                    <p>Get diet and lifestyle advice that works for you.</p>
                                </div>
                            </div>

                            <div className="strip-divider"></div>

                            <div className="strip-column">
                                <div className="column-icon-bg col-green">
                                    <svg className="col-icon" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                    </svg>
                                </div>
                                <div className="column-text">
                                    <h4>Secure & Private</h4>
                                    <p>Your data is encrypted and 100% confidential.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* BOTTOM DECORATION */}
                <div className="bottom-ecg-decoration">
                    <div className="dec-line"></div>
                    <svg className="dec-svg" width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="url(#dec-grad)" />
                        <path d="M6 10h2.5l1.5-3 2 7 1.5-5 1.5 2.5H18" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        <defs>
                            <linearGradient id="dec-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#2563EB" />
                                <stop offset="100%" stopColor="#8B5CF6" />
                            </linearGradient>
                        </defs>
                    </svg>
                    <div className="dec-line"></div>
                </div>

                {/* HOW IT WORKS SECTION */}
                <section className="how-it-works-section">
                    <div className="section-container">
                        <h2 className="section-title">How HealthWise AI Works</h2>
                        <p className="section-subtitle">Follow three basic steps to receive your educational summary</p>

                        <div className="steps-grid">
                            <div className="step-card">
                                <div className="step-number">1</div>
                                <h3 className="step-title">Enter Health Information</h3>
                                <p className="step-desc">
                                    Fill out the assessment covering metrics, daily habits, diet, and conditions.
                                </p>
                            </div>

                            <div className="step-card">
                                <div className="step-number">2</div>
                                <h3 className="step-title">Analyze Your Profile</h3>
                                <p className="step-desc">
                                    Our system runs rules-based parameters and ML classifiers on your stats.
                                </p>
                            </div>

                            <div className="step-card">
                                <div className="step-number">3</div>
                                <h3 className="step-title">Get Recommendations</h3>
                                <p className="step-desc">
                                    Review custom-tailored educational guides on diet lists and lifestyle adjustments.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* HOME DISCLAIMER PANEL */}
                <section className="home-disclaimer-panel">
                    <div className="disclaimer-panel-card">
                        <span className="warning-badge-icon">⚠</span>
                        <div className="disclaimer-panel-text">
                            <h4>Educational Disclaimer</h4>
                            <p>
                                HealthWise AI is an academic demonstration project. It is intended for educational and informational purposes only. The recommendations and insights provided are not medical diagnoses, treatments, or prescriptions. Always consult with a qualified medical professional for serious medical issues.
                            </p>
                        </div>
                    </div>
                </section>
            </main>

            <Footer />
        </div>
    );
}

export default Home;