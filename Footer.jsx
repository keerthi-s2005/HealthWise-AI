import React from "react";
import { Link } from "react-router-dom";
import "./Components.css";

function Footer() {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="footer">
            <div className="footer-container">
                <div className="footer-grid">
                    <div className="footer-brand-section">
                        <Link to="/" className="footer-logo">
                            <span className="logo-heart">♥</span> HealthWise AI
                        </Link>
                        <p className="footer-tagline">
                            AI-Based Personalized Health Risk & Nutrition Recommendation System
                        </p>
                    </div>

                    <div className="footer-links-section">
                        <h4 className="footer-header">Quick Links</h4>
                        <ul className="footer-links-list">
                            <li>
                                <Link to="/" className="footer-link">Home</Link>
                            </li>
                            <li>
                                <Link to="/assessment" className="footer-link">Health Assessment</Link>
                            </li>
                            <li>
                                <Link to="/dashboard" className="footer-link">Dashboard</Link>
                            </li>
                        </ul>
                    </div>

                    <div className="footer-links-section">
                        <h4 className="footer-header">Support & Resources</h4>
                        <ul className="footer-links-list">
                            <li>
                                <a href="#" className="footer-link">FAQs</a>
                            </li>
                            <li>
                                <a href="#" className="footer-link">Health Tips</a>
                            </li>
                            <li>
                                <a href="#" className="footer-link">Diet Guide</a>
                            </li>
                            <li>
                                <a href="#" className="footer-link">Privacy Policy</a>
                            </li>
                            <li>
                                <a href="#" className="footer-link">Terms of Service</a>
                            </li>
                        </ul>
                    </div>
                </div>

                <div className="footer-divider"></div>

                <div className="footer-disclaimer-section">
                    <h5 className="disclaimer-title">Disclaimer</h5>
                    <p className="disclaimer-text">
                        HealthWise AI is intended for educational and informational purposes only. It does not provide medical diagnosis, treatment, or replace advice from qualified healthcare professionals. Always consult with a physician or other qualified healthcare provider for any questions regarding a medical condition.
                    </p>
                </div>

                <div className="footer-bottom">
                    <p>&copy; {currentYear} HealthWise AI. Academic Demo Project.</p>
                </div>
            </div>
        </footer>
    );
}

export default Footer;
