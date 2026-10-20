import React from "react";
import "./Components.css";

/**
 * RecommendationCard renders diet or activity guidelines with semantic lists.
 */
function RecommendationCard({ title, recommendations = [], type = "prefer" }) {
    const cardClassMap = {
        prefer: "recommendation-prefer",
        limit: "recommendation-limit",
        lifestyle: "recommendation-lifestyle",
        hydration: "recommendation-hydration"
    };

    const cardClass = cardClassMap[type] || "recommendation-prefer";

    // Select marker icons based on type
    const getBulletMarker = () => {
        if (type === "prefer") return "✔";
        if (type === "limit") return "✖";
        if (type === "hydration") return "💧";
        return "✦";
    };

    return (
        <div className={`recommendation-card ${cardClass}`}>
            <h4 className="recommendation-card-title">{title}</h4>
            {recommendations.length === 0 ? (
                <p className="no-recommendation-text">No recommendations at this time.</p>
            ) : (
                <ul className="recommendation-list">
                    {recommendations.map((item, index) => (
                        <li key={index} className="recommendation-item">
                            <span className="recommendation-marker">{getBulletMarker()}</span>
                            <span className="recommendation-text">{item}</span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

export default RecommendationCard;
