import os
import sys

# Ensure backend directory is in Python path for clean imports
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

from flask import Flask, jsonify
from flask_cors import CORS
from config import Config
from db import init_db

# Import Blueprints
from routes.auth_routes import auth_bp
from routes.health_routes import health_bp
from routes.prediction_routes import prediction_bp
from routes.recommendation_routes import recommendation_bp

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # Enable CORS explicitly for React frontend integration (localhost:5173)
    CORS(
        app,
        resources={r"/api/*": {"origins": ["http://localhost:5173", "http://127.0.0.1:5173", "*"]}},
        supports_credentials=True,
        methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["Content-Type", "Authorization"]
    )

    # Register Blueprints
    app.register_blueprint(auth_bp)
    app.register_blueprint(health_bp)
    app.register_blueprint(prediction_bp)
    app.register_blueprint(recommendation_bp)

    # Error Handlers
    @app.errorhandler(400)
    def bad_request(error):
        return jsonify({
            "success": False,
            "message": "Bad Request: Invalid payload or parameters."
        }), 400

    @app.errorhandler(404)
    def not_found(error):
        return jsonify({
            "success": False,
            "message": "Endpoint not found."
        }), 404

    @app.errorhandler(500)
    def internal_error(error):
        return jsonify({
            "success": False,
            "message": "Internal Server Error."
        }), 500

    return app

app = create_app()

if __name__ == "__main__":
    print("Initializing Database schema if MySQL is available...")
    init_db()
    
    port = Config.PORT
    print(f"Starting HealthWise-AI Backend on http://0.0.0.0:{port}...")
    app.run(host="0.0.0.0", port=port, debug=Config.DEBUG)
