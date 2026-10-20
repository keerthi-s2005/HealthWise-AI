import React from "react";
import "./Components.css";

/**
 * HealthCard display component for dashboard metrics.
 */
function HealthCard({ title, value, description, status, children }) {
    // Map status to badge classes
    const getStatusClass = (statusStr) => {
        if (!statusStr) return "";
        const s = statusStr.toLowerCase();
        if (s === "normal" || s === "low" || s === "sedentary" === false) return "status-success";
        if (s === "overweight" || s === "moderate" || s === "former") return "status-warning";
        if (s === "obese" || s === "high" || s === "current" || s === "very high") return "status-danger";
        return "status-info";
    };

    return (
        <div className="health-card">
            <div className="health-card-header">
                <span className="health-card-title">{title}</span>
                {status && (
                    <span className={`status-badge ${getStatusClass(status)}`}>
                        {status}
                    </span>
                )}
            </div>
            <div className="health-card-body">
                <h3 className="health-card-value">{value}</h3>
                {description && <p className="health-card-desc">{description}</p>}
                {children}
            </div>
        </div>
    );
}

export default HealthCard;
