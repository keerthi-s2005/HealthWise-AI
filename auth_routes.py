from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from db import get_db_connection

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")

@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json(silent=True) or {}
    name = data.get("name", "").strip()
    email = data.get("email", "").strip().lower()
    password = data.get("password", "").strip()

    if not name or not email or not password:
        return jsonify({
            "success": False,
            "message": "Name, email, and password are required."
        }), 400

    conn = get_db_connection()
    if not conn:
        return jsonify({
            "success": False,
            "message": "Database connection error. Please try again later."
        }), 500

    try:
        cursor = conn.cursor(dictionary=True)
        # Check if email already exists
        cursor.execute("SELECT id FROM users WHERE email = %s", (email,))
        existing_user = cursor.fetchone()
        if existing_user:
            return jsonify({
                "success": False,
                "message": "An account with this email already exists."
            }), 409

        # Hash password and insert
        hashed_pw = generate_password_hash(password)
        cursor.execute(
            "INSERT INTO users (name, email, password_hash) VALUES (%s, %s, %s)",
            (name, email, hashed_pw)
        )
        conn.commit()
        user_id = cursor.lastrowid

        return jsonify({
            "success": True,
            "message": "User registered successfully.",
            "data": {
                "id": user_id,
                "name": name,
                "email": email
            }
        }), 201
    except Exception as e:
        print(f"Registration Error: {e}")
        return jsonify({
            "success": False,
            "message": "An error occurred during registration."
        }), 500
    finally:
        if conn and conn.is_connected():
            cursor.close()
            conn.close()

@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}
    email = data.get("email", "").strip().lower()
    password = data.get("password", "").strip()

    if not email or not password:
        return jsonify({
            "success": False,
            "message": "Email and password are required."
        }), 400

    conn = get_db_connection()
    if not conn:
        return jsonify({
            "success": False,
            "message": "Database connection error. Please try again later."
        }), 500

    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT id, name, email, password_hash FROM users WHERE email = %s", (email,))
        user = cursor.fetchone()

        if not user or not check_password_hash(user["password_hash"], password):
            return jsonify({
                "success": False,
                "message": "Invalid email or password."
            }), 401

        return jsonify({
            "success": True,
            "message": "Login successful.",
            "data": {
                "id": user["id"],
                "name": user["name"],
                "email": user["email"]
            }
        }), 200
    except Exception as e:
        print(f"Login Error: {e}")
        return jsonify({
            "success": False,
            "message": "An error occurred during login."
        }), 500
    finally:
        if conn and conn.is_connected():
            cursor.close()
            conn.close()
