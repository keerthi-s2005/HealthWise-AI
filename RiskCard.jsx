import React from "react";
import "./Components.css";

/**
 * RiskCard displays calculated lifestyle/physical risk factor warnings.
 */
function RiskCard({ title, level = "Low", description }) {
    const getRiskClass = (lvl) => {
        const l = lvl.toLowerCase();
        if (l === "high") return "risk-high";
        if (l === "moderate") return "risk-moderate";
        return "risk-low";
    };

    return (
        <div className={`risk-card ${getRiskClass(level)}`}>
            <div className="risk-card-header">
                <h4 className="risk-card-title">{title}</h4>
                <span className="risk-badge">{level} Risk</span>
            </div>
            <p className="risk-card-desc">{description}</p>
        </div>
    );
}

export default RiskCard;
