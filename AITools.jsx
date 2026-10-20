import React, { useState } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import "./AITools.css";

// 11 AI Tools definition
const TOOLS_DATA = [
    {
        id: "myfitnesspal",
        name: "MyFitnessPal",
        category: "AI Nutrition & Food Tracking",
        description: "AI-assisted nutrition coaching, food logging, meal scanning, calorie tracking, and macro tracking.",
        url: "https://www.myfitnesspal.com/",
        filters: ["Nutrition Tracking"]
    },
    {
        id: "cronometer",
        name: "Cronometer",
        category: "Nutrient Analysis",
        description: "Detailed macro and micronutrient tracking, food logging, nutrition analysis, and dietary monitoring.",
        url: "https://cronometer.com/",
        filters: ["Nutrition Tracking"]
    },
    {
        id: "foodvisor",
        name: "Foodvisor",
        category: "Food Analysis",
        description: "AI-based food and meal analysis with nutrition tracking.",
        url: "https://www.foodvisor.io/",
        filters: ["Food Analysis", "Nutrition Tracking"]
    },
    {
        id: "zoe",
        name: "ZOE",
        category: "Personalized Nutrition",
        description: "Personalized nutrition and gut-health insights supported by nutrition research.",
        url: "https://zoe.com/",
        filters: ["Personalized Nutrition", "Nutrition Tracking"]
    },
    {
        id: "nutriscan",
        name: "NutriScan",
        category: "AI Meal Planning",
        description: "Meal logging, nutrition goals, and personalized meal-planning assistance.",
        url: "https://nutriscan.app",
        filters: ["Meal Planning"]
    },
    {
        id: "nutritio",
        name: "Nutritio",
        category: "Dietitian AI",
        description: "AI-assisted nutrition planning and nutrition analysis for dietary workflows.",
        url: "https://nutritioapp.com/",
        filters: ["Meal Planning"]
    },
    {
        id: "nutrinexa",
        name: "Nutrinexa",
        category: "Indian Dietetics AI",
        description: "Indian-focused nutrition planning and dietary workflow assistance.",
        url: "https://nutrinexa.in/",
        filters: ["Indian Nutrition", "Meal Planning"]
    },
    {
        id: "mealstack",
        name: "MealStack",
        category: "Indian Dietitian AI",
        description: "Indian-food meal planning and nutrition tracking.",
        url: "https://www.mealstack.io",
        filters: ["Indian Nutrition", "Meal Planning"]
    },
    {
        id: "fittrackai",
        name: "FitTrack AI",
        category: "Indian Nutrition AI",
        description: "Indian-food meal recognition and nutrition planning.",
        url: "https://fittrackai.in",
        filters: ["Indian Nutrition", "Nutrition Tracking"]
    },
    {
        id: "svas",
        name: "Svas",
        category: "Indian / Regional Nutrition",
        description: "Regional food logging and nutrition assistance.",
        url: null, // Official link unavailable
        filters: ["Indian Nutrition", "Nutrition Tracking"]
    },
    {
        id: "vitesnap",
        name: "ViteSnap",
        category: "AI Meal Scanner",
        description: "AI meal-photo analysis with calorie, macro, micronutrient, and portion estimation.",
        url: "https://www.vitesnap.com/",
        filters: ["Food Analysis", "Nutrition Tracking"]
    }
];

// Helper to return a custom medical SVG icon based on category
const getCategoryIcon = (category) => {
    if (category.includes("Tracking") || category.includes("Analysis")) {
        return (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
        );
    }
    if (category.includes("Planning") || category.includes("Dietitian") || category.includes("Dietics")) {
        return (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                <rect x="8" y="2" width="8" height="4" rx="1" ry="1" fill="currentColor" opacity="0.1" />
            </svg>
        );
    }
    if (category.includes("Scanner") || category.includes("Food Analysis")) {
        return (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="12" cy="12" r="3" />
                <path d="M12 2v2M12 20v2M2 12h2M20 12h2" />
            </svg>
        );
    }
    // Default Stethoscope/Shield
    return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
    );
};

function AITools() {
    const [searchQuery, setSearchQuery] = useState("");
    const [activeFilter, setActiveFilter] = useState("All");

    const categories = [
        "All",
        "Nutrition Tracking",
        "Food Analysis",
        "Meal Planning",
        "Personalized Nutrition",
        "Indian Nutrition"
    ];

    // Filter and search logic
    const filteredTools = TOOLS_DATA.filter((tool) => {
        const matchesFilter = activeFilter === "All" || tool.filters.includes(activeFilter);
        const matchesSearch =
            tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            tool.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
            tool.description.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesFilter && matchesSearch;
    });

    return (
        <div className="ai-tools-page">
            <Navbar />

            {/* HERO HEADER */}
            <header className="ai-tools-hero">
                <div className="hero-glow-circle hero-glow-1"></div>
                <div className="hero-glow-circle hero-glow-2"></div>
                <div className="hero-container">
                    <span className="ai-tools-badge">
                        <span style={{ color: "#8B5CF6", marginRight: "4px" }}>✦</span> AI HEALTHCARE TOOLS
                    </span>
                    <h1 className="ai-tools-title">AI Nutrition & Dietetics Tools</h1>
                    <p className="ai-tools-subtitle">
                        Explore AI-powered tools for nutrition tracking, meal analysis, personalized nutrition, and dietary planning.
                    </p>
                    <div className="ai-tools-disclaimer">
                        <strong>Disclaimer:</strong> External tools are independently operated third-party services. HealthWise AI does not control or endorse their recommendations.
                    </div>
                </div>
            </header>

            {/* SEARCH AND FILTERS */}
            <section className="search-filter-section">
                <div className="search-container">
                    <div className="search-input-wrapper">
                        <svg className="search-icon-svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="11" cy="11" r="8" />
                            <line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                        <input
                            type="text"
                            placeholder="Search AI tools..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="search-field"
                            aria-label="Search AI tools"
                        />
                    </div>
                </div>

                <div className="filters-wrapper">
                    <div className="filters-container">
                        {categories.map((cat) => (
                            <button
                                key={cat}
                                onClick={() => setActiveFilter(cat)}
                                className={`filter-btn ${activeFilter === cat ? "active" : ""}`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>
            </section>

            {/* CARD GRID */}
            <main className="cards-grid-container">
                <div className="cards-grid">
                    {filteredTools.length > 0 ? (
                        filteredTools.map((tool) => (
                            <article key={tool.id} className={`tool-card ${!tool.url ? "disabled-card" : ""}`}>
                                <div className="tool-card-header">
                                    <div className="tool-icon-container">
                                        {getCategoryIcon(tool.category)}
                                    </div>
                                    <div className="tool-title-wrapper">
                                        <h3 className="tool-name-heading">{tool.name}</h3>
                                        <span className={`tool-category-label ${tool.filters.includes("Indian Nutrition") ? "indian-cat" : ""}`}>
                                            {tool.category}
                                        </span>
                                    </div>
                                </div>

                                <p className="tool-description-text">{tool.description}</p>

                                <hr className="tool-divider-line" />

                                <div className="tool-card-footer">
                                    {tool.url ? (
                                        <a
                                            href={tool.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="btn-primary tool-button-link"
                                        >
                                            Open Tool &rarr;
                                        </a>
                                    ) : (
                                        <button
                                            disabled
                                            className="btn-primary tool-button-link disabled-btn"
                                        >
                                            Official link unavailable
                                        </button>
                                    )}

                                    <span className="tool-badge-external">
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3" />
                                        </svg>
                                        External Tool
                                    </span>
                                </div>
                            </article>
                        ))
                    ) : (
                        <div className="no-results-card">
                            <span className="no-results-icon">🔍</span>
                            <h3>No tools found matching your criteria</h3>
                            <p>Try adjusting your search query or switching filters.</p>
                        </div>
                    )}
                </div>
            </main>

            {/* SAFETY NOTICE CARD */}
            <section className="safety-disclaimer-wrapper">
                <div className="safety-disclaimer-card">
                    <div className="safety-icon-container">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01" />
                        </svg>
                    </div>
                    <div className="safety-text-container">
                        <h4 className="safety-title">Important Notice</h4>
                        <p className="safety-desc">
                            These tools are third-party services and are provided for informational and educational purposes. HealthWise AI does not control their content, availability, pricing, privacy policies, or recommendations. Users should review each service's terms and privacy policy before using it.
                        </p>
                    </div>
                </div>
            </section>

            <Footer />
        </div>
    );
}

export default AITools;
