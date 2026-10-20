import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import FormInput from "../components/FormInput";
import { isValidEmail } from "../utils/validation";
import { loginUser } from "../services/api";
import "./Auth.css";

function Login() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        email: "",
        password: "",
        rememberMe: false
    });
    const [errors, setErrors] = useState({});
    const [showPassword, setShowPassword] = useState(false);
    const [statusMessage, setStatusMessage] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData({
            ...formData,
            [name]: type === "checkbox" ? checked : value
        });
        if (errors[name]) {
            setErrors({ ...errors, [name]: "" });
        }
    };

    const validateForm = () => {
        const newErrors = {};
        if (!isValidEmail(formData.email)) {
            newErrors.email = "Please enter a valid email address.";
        }
        if (!formData.password) {
            newErrors.password = "Password is required.";
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (loading) return;

        if (validateForm()) {
            setLoading(true);
            setStatusMessage({ type: "info", text: "Signing in..." });

            try {
                // Call Flask backend login API
                const response = await loginUser({
                    email: formData.email.trim().toLowerCase(),
                    password: formData.password
                });

                if (response.success && response.data) {
                    let existingDetails = {};
                    const storedUserStr = localStorage.getItem("healthwise_user");
                    if (storedUserStr) {
                        try { existingDetails = JSON.parse(storedUserStr); } catch (err) {}
                    }

                    const userObj = {
                        ...existingDetails,
                        id: response.data.id,
                        name: response.data.name,
                        email: response.data.email,
                        isRegistered: true
                    };

                    localStorage.setItem("healthwise_user", JSON.stringify(userObj));
                    localStorage.setItem("healthwise_user_id", String(response.data.id));
                    localStorage.setItem("healthwise_user_name", response.data.name);
                    localStorage.setItem("healthwise_user_email", response.data.email);
                    localStorage.setItem("healthwise_auth", "true");
                    setStatusMessage({ type: "success", text: "Login successful! Redirecting..." });
                    setTimeout(() => {
                        navigate("/dashboard");
                    }, 1000);
                } else if (response.status === 401) {
                    setStatusMessage({
                        type: "error",
                        text: response.message || "Invalid email or password."
                    });
                } else {
                    // Offline / Local storage fallback
                    const storedUserStr = localStorage.getItem("healthwise_user");
                    let registeredUser = null;
                    if (storedUserStr) {
                        try { registeredUser = JSON.parse(storedUserStr); } catch (e) {}
                    }
                    const inputEmail = formData.email.trim().toLowerCase();

                    if (registeredUser && registeredUser.email === inputEmail) {
                        localStorage.setItem("healthwise_auth", "true");
                        setStatusMessage({ type: "success", text: "Login successful (Local Mode)! Redirecting..." });
                        setTimeout(() => { navigate("/dashboard"); }, 1000);
                    } else if (inputEmail === "demo@healthwise.com" || inputEmail === "demo@example.com") {
                        const demoUser = {
                            id: 1,
                            name: "Demo User",
                            email: inputEmail,
                            age: 30,
                            gender: "Male",
                            isRegistered: true
                        };
                        localStorage.setItem("healthwise_user", JSON.stringify(demoUser));
                        localStorage.setItem("healthwise_auth", "true");
                        setStatusMessage({ type: "success", text: "Login successful (Demo Mode)! Redirecting..." });
                        setTimeout(() => { navigate("/dashboard"); }, 1000);
                    } else {
                        setStatusMessage({
                            type: "error",
                            text: response.message || "Account not found with this email. Please Register first."
                        });
                    }
                }
            } catch (error) {
                setStatusMessage({
                    type: "error",
                    text: error.message || "Login failed. Please check your details."
                });
            } finally {
                setLoading(false);
            }
        } else {
            setStatusMessage({ type: "error", text: "Please correct the form errors." });
        }
    };

    return (
        <div className="app-container">
            <Navbar />
            <main className="main-content auth-page">
                <div className="auth-card">
                    <h2 className="auth-title">Welcome Back</h2>
                    <p className="auth-subtitle">Sign in to access your dashboard and records</p>

                    {statusMessage && (
                        <div className={`status-alert alert-${statusMessage.type}`}>
                            {statusMessage.text}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} noValidate>
                        <FormInput
                            label="Email Address"
                            name="email"
                            type="email"
                            value={formData.email}
                            onChange={handleChange}
                            error={errors.email}
                            placeholder="name@example.com"
                            required
                        />

                        <div className="auth-password-group">
                            <FormInput
                                label="Password"
                                name="password"
                                type={showPassword ? "text" : "password"}
                                value={formData.password}
                                onChange={handleChange}
                                error={errors.password}
                                placeholder="Enter password"
                                required
                            />
                            <button
                                type="button"
                                className="password-toggle-btn"
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? "Hide" : "Show"}
                            </button>
                        </div>

                        <div className="auth-actions">
                            <FormInput
                                type="checkbox"
                                label="Remember me"
                                name="rememberMe"
                                checked={formData.rememberMe}
                                onChange={handleChange}
                            />
                            <a href="#forgot" className="forgot-password-link" onClick={(e) => {
                                e.preventDefault();
                                alert("Forgot password reset UI only. Please register a new user.");
                            }}>
                                Forgot Password?
                            </a>
                        </div>

                        <button 
                            type="submit" 
                            className="btn-primary auth-submit-btn"
                            disabled={loading}
                        >
                            {loading ? "Logging in..." : "Login"}
                        </button>
                    </form>

                    <div className="auth-footer">
                        Don't have an account? <Link to="/register" className="auth-link">Register</Link>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
}

export default Login;