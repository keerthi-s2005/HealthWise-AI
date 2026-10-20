import React from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

function NotFound() {
    return (
        <div className="app-container">
            <Navbar />
            <main className="main-content notfound-page">
                <div className="notfound-card">
                    <span className="notfound-icon">⚠</span>
                    <h1 className="notfound-title">404 - Page Not Found</h1>
                    <p className="notfound-desc">
                        The page you are looking for does not exist or has been moved.
                    </p>
                    <Link to="/" className="btn-primary notfound-btn">
                        Go Back Home
                    </Link>
                </div>
            </main>
            <Footer />
        </div>
    );
}

export default NotFound;
