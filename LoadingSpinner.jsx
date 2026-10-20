import React from "react";
import "./Components.css";

/**
 * Premium loading spinner component to display during analysis transitions.
 */
function LoadingSpinner({ message = "Analyzing your health profile..." }) {
    return (
        <div className="spinner-overlay" aria-live="polite">
            <div className="spinner-container">
                <div className="pulse-spinner"></div>
                <p className="spinner-message">{message}</p>
            </div>
        </div>
    );
}

export default LoadingSpinner;
