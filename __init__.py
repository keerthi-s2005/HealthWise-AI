# Routes package initialization
from routes.auth_routes import auth_bp
from routes.health_routes import health_bp
from routes.prediction_routes import prediction_bp
from routes.recommendation_routes import recommendation_bp

__all__ = ["auth_bp", "health_bp", "prediction_bp", "recommendation_bp"]
