import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import authService from "../services/authService";
import "./Components.css";

function Navbar() {
    const navigate = useNavigate();
    const location = useLocation();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isLoggedIn, setIsLoggedIn] = useState(false);

    // Check login state from localStorage
    useEffect(() => {
        setIsLoggedIn(authService.isAuthenticated());
    }, [location]);

    const handleLogout = () => {
        authService.logout();
        setIsLoggedIn(false);
        setIsMenuOpen(false);
        navigate("/login");
    };

    const toggleMenu = () => {
        setIsMenuOpen(!isMenuOpen);
    };

    const closeMenu = () => {
        setIsMenuOpen(false);
    };

    return (
        <header className="navbar-header">
            <div className="navbar-container">
                <Link to="/" className="navbar-logo" onClick={closeMenu}>
                    <svg className="logo-svg" width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="url(#logo-grad)" />
                        <path d="M6 10h2.5l1.5-3 2 7 1.5-5 1.5 2.5H18" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        <defs>
                            <linearGradient id="logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#2563EB" />
                                <stop offset="100%" stopColor="#8B5CF6" />
                            </linearGradient>
                        </defs>
                    </svg>
                    <span className="logo-text">HealthWise AI</span>
                </Link>

                {/* Hamburger menu button for mobile */}
                <button
                    className={`navbar-toggle ${isMenuOpen ? "is-active" : ""}`}
                    onClick={toggleMenu}
                    aria-label="Toggle menu"
                    aria-expanded={isMenuOpen}
                >
                    <span className="hamburger-bar"></span>
                    <span className="hamburger-bar"></span>
                    <span className="hamburger-bar"></span>
                </button>

                <nav className={`navbar-menu ${isMenuOpen ? "is-open" : ""}`}>
                    <div className="navbar-links">
                        <Link
                            to="/"
                            className={`navbar-item ${location.pathname === "/" ? "active" : ""}`}
                            onClick={closeMenu}
                        >
                            Home
                        </Link>
                        <Link
                            to="/assessment"
                            className={`navbar-item ${location.pathname === "/assessment" ? "active" : ""}`}
                            onClick={closeMenu}
                        >
                            Assessment
                        </Link>
                        <Link
                            to="/ai-tools"
                            className={`navbar-item ${location.pathname === "/ai-tools" ? "active" : ""}`}
                            onClick={closeMenu}
                        >
                            AI Tools
                        </Link>
                        {isLoggedIn && (
                            <Link
                                to="/dashboard"
                                className={`navbar-item ${location.pathname === "/dashboard" ? "active" : ""}`}
                                onClick={closeMenu}
                            >
                                Dashboard
                            </Link>
                        )}
                    </div>

                    <div className="navbar-auth-buttons">
                        {isLoggedIn ? (
                            <>
                                <button
                                    onClick={() => {
                                        closeMenu();
                                        navigate("/dashboard");
                                    }}
                                    className="btn-secondary nav-dashboard-btn"
                                >
                                    Dashboard
                                </button>
                                <button onClick={handleLogout} className="btn-primary nav-logout-btn">
                                    Logout
                                </button>
                            </>
                        ) : (
                            <>
                                <Link
                                    to="/login"
                                    className="navbar-item-auth-link"
                                    onClick={closeMenu}
                                >
                                    Login
                                </Link>
                                <button
                                    onClick={() => {
                                        closeMenu();
                                        navigate("/register");
                                    }}
                                    className="btn-primary nav-register-btn"
                                >
                                    <svg className="register-icon-svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                                        <circle cx="9" cy="7" r="4" />
                                        <line x1="19" y1="8" x2="19" y2="14" />
                                        <line x1="16" y1="11" x2="22" y2="11" />
                                    </svg>
                                    Register
                                </button>
                            </>
                        )}
                    </div>
                </nav>
            </div>
        </header>
    );
}

export default Navbar;
