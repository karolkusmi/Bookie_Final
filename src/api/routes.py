
"""
This module takes care of starting the API Server, Loading the DB and Adding the endpoints
"""
from flask import Flask, request, jsonify, url_for, Blueprint
import jwt
from api.models import db, User
from api.utils import generate_sitemap, APIException
from flask_cors import CORS
import jwt
from datetime import datetime, timedelta
from flask import current_app 

api = Blueprint('api', __name__)

# Allow CORS requests to this API
CORS(api)

def create_token(user_id: int):
    payload = {
        "sub": user_id,
        "iat": datetime.utcnow(),
        "exp": datetime.utcnow() + timedelta(hours=5)
    }
    return jwt.encode(payload, current_app.config["SECRET_KEY"], algorithm="HS256")

@api.route('/hello', methods=['POST', 'GET'])
def handle_hello():
    response_body = {
        "message": "Hello! I'm a message that came from the backend, check the network tab on the google inspector and you will see the GET request"
    }

    return jsonify(response_body), 200


@api.route("/signup", methods=["POST"])
def signup():
    data = request.get_json()
    email = data.get("email")
    password = data.get("password")

    if not email or not password:
        return jsonify({"message": "Email and password are required"}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({"message": "User already exists"}), 409

    new_user = User(email=email)
    new_user.set_password(password)

    db.session.add(new_user)
    db.session.commit()

    return jsonify(new_user.serialize()), 201

@api.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    email = data.get("email")
    password = data.get("password")

    if not email or not password:
        return jsonify({"message": "Email and password are required"}), 400

    user = User.query.filter_by(email=email).first()

    if not user or not user.check_password(password):
        return jsonify({"message": "Invalid credentials"}), 401

    token = create_token(user.id)

    return jsonify({"token": token}), 200