import React from "react";
import "./Components.css";

/**
 * Progress indicator for multi-step forms.
 */
function ProgressBar({ step = 1, totalSteps = 7 }) {
    const percentage = Math.round((step / totalSteps) * 100);

    return (
        <div className="progress-bar-container">
            <div className="progress-bar-header">
                <span className="progress-step-text">
                    Step {step} of {totalSteps}
                </span>
                <span className="progress-percentage-text">{percentage}%</span>
            </div>
            <div className="progress-track" aria-valuemin="1" aria-valuemax={totalSteps} aria-valuenow={step} role="progressbar">
                <div
                    className="progress-fill"
                    style={{ width: `${percentage}%` }}
                ></div>
            </div>
        </div>
    );
}

export default ProgressBar;
