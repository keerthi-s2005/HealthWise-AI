import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import FormInput from "../components/FormInput";
import FormSelect from "../components/FormSelect";
import { isValidName, isValidEmail, isValidPassword, isValidAge } from "../utils/validation";
import { registerUser } from "../services/api";
import "./Auth.css";

function Register() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        password: "",
        confirmPassword: "",
        age: "",
        gender: ""
    });
    const [errors, setErrors] = useState({});
    const [showPassword, setShowPassword] = useState(false);
    const [statusMessage, setStatusMessage] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
        if (errors[name]) {
            setErrors({ ...errors, [name]: "" });
        }
    };

    const validateForm = () => {
        const newErrors = {};

        if (!isValidName(formData.name)) {
            newErrors.name = "Full name must be at least 2 characters.";
        }
        if (!isValidEmail(formData.email)) {
            newErrors.email = "Please enter a valid email address.";
        }
        if (!isValidPassword(formData.password)) {
            newErrors.password = "Password must be at least 8 characters.";
        }
        if (formData.password !== formData.confirmPassword) {
            newErrors.confirmPassword = "Passwords do not match.";
        }
        if (!isValidAge(formData.age)) {
            newErrors.age = "Please enter a valid age between 1 and 120.";
        }
        if (!formData.gender) {
            newErrors.gender = "Please select your gender.";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (loading) return;

        if (validateForm()) {
            setLoading(true);
            setStatusMessage({ type: "info", text: "Creating your account..." });

            try {
                // Call Flask backend registration API
                const response = await registerUser({
                    name: formData.name,
                    email: formData.email.trim().toLowerCase(),
                    password: formData.password
                });

                if (response.success) {
                    const userObj = {
                        id: response.data?.id || Date.now(),
                        name: response.data?.name || formData.name,
                        email: response.data?.email || formData.email.trim().toLowerCase(),
                        age: parseInt(formData.age, 10),
                        gender: formData.gender,
                        isRegistered: true
                    };

                    localStorage.setItem("healthwise_user", JSON.stringify(userObj));
                    localStorage.setItem("healthwise_user_id", String(userObj.id));
                    localStorage.setItem("healthwise_user_name", userObj.name);
                    localStorage.setItem("healthwise_user_email", userObj.email);
                    setStatusMessage({ type: "success", text: "Registration successful! Redirecting to login..." });

                    setTimeout(() => {
                        navigate("/login");
                    }, 1500);
                } else {
                    if (response.status === 409) {
                        setStatusMessage({ type: "error", text: response.message || "An account with this email already exists." });
                    } else {
                        // Local storage fallback for offline support
                        const mockUser = {
                            id: Date.now(),
                            name: formData.name,
                            email: formData.email.trim().toLowerCase(),
                            age: parseInt(formData.age, 10),
                            gender: formData.gender,
                            isRegistered: true
                        };
                        localStorage.setItem("healthwise_user", JSON.stringify(mockUser));
                        setStatusMessage({ type: "success", text: "Registration saved locally. Redirecting to login..." });

                        setTimeout(() => {
                            navigate("/login");
                        }, 1500);
                    }
                }
            } catch (error) {
                setStatusMessage({
                    type: "error",
                    text: error.message || "Registration failed. Please check your details."
                });
            } finally {
                setLoading(false);
            }
        } else {
            setStatusMessage({ type: "error", text: "Please fix the validation errors below." });
        }
    };

    return (
        <div className="app-container">
            <Navbar />
            <main className="main-content auth-page">
                <div className="auth-card">
                    <h2 className="auth-title">Create Account</h2>
                    <p className="auth-subtitle">Join HealthWise AI to track and manage your health</p>

                    {statusMessage && (
                        <div className={`status-alert alert-${statusMessage.type}`}>
                            {statusMessage.text}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} noValidate>
                        <FormInput
                            label="Full Name"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            error={errors.name}
                            placeholder="Enter your full name"
                            required
                        />

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
                                placeholder="Min. 8 characters"
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

                        <FormInput
                            label="Confirm Password"
                            name="confirmPassword"
                            type={showPassword ? "text" : "password"}
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            error={errors.confirmPassword}
                            placeholder="Re-enter password"
                            required
                        />

                        <div className="auth-row">
                            <FormInput
                                label="Age"
                                name="age"
                                type="number"
                                value={formData.age}
                                onChange={handleChange}
                                error={errors.age}
                                placeholder="Age"
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

                        <button 
                            type="submit" 
                            className="btn-primary auth-submit-btn"
                            disabled={loading}
                        >
                            {loading ? "Registering..." : "Create Account"}
                        </button>
                    </form>

                    <div className="auth-footer">
                        Already have an account? <Link to="/login" className="auth-link">Login</Link>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
}

export default Register;