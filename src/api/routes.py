
"""
This module takes care of starting the API Server, Loading the DB and Adding the endpoints
"""
from flask import Flask, request, jsonify, url_for, Blueprint
import flask
import jwt
from api.models import Event, db, User
from api.utils import generate_sitemap, APIException
from flask_cors import CORS
import jwt
from datetime import datetime, timedelta
from flask import current_app
from flask import request, jsonify
import requests



api = Blueprint('api', __name__)

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

    username = data.get("username") 
    email = data.get("email")
    password = data.get("password")

    if not username or not email or not password:
        return jsonify({"message": "Username, email and password are required"}), 400

    if User.query.filter(
        (User.email==email) & (User.username == username)
        ).first():
        return jsonify({"message": "User already exists"}), 409
    
    user = User(username=username, email=email, is_active=True)
    user.set_password(password)

    db.session.add(user)
    db.session.commit()

    return jsonify(user.serialize()), 201

@api.route("/login", methods=["POST"])
def login():
    data = request.get_json() or {}
    email = data.get("email")
    password = data.get("password")

    if not email or not password:
        return jsonify({"message": "Email and password are required"}), 400

    user = User.query.filter_by(email=email).first()

    if not user or not user.check_password(password):
        return jsonify({"message": "Invalid credentials"}), 401

    token = create_token(user.id)

    return jsonify({"token": token}), 200


@api.route('/users', methods=['GET'])
def get_users():
    users = User.query.all()
    return jsonify([u.serialize() for u in users]), 200


# Quiero poder crear eventos apuntarme a ellos, modificarlos y borrarlos
@api.route('/event',methods=["GET","POST","UPDATE","DELETE"])
def handle_event():
    return jsonify({"message":"Event endpoint - to be implemented"}),200

@api.route("/books/search", methods=["GET"])
def books_search():
    title = request.args.get("title", "").strip()
    if not title:
        return jsonify({"message": "Missing 'title' query param"}), 400

    url = "https://www.googleapis.com/books/v1/volumes"
    params = {
        "q": f"intitle:{title}",
        "maxResults": 10,
        "langRestrict": "es",
        "printType": "books",
    }

    try:
        r = requests.get(
            url,
            params=params,
            timeout=10,
            headers={"User-Agent": "Mozilla/5.0"}
        )
    except requests.RequestException as e:
        # Error de red/DNS/SSL/etc
        return jsonify({
            "message": "Error connecting to Google Books",
            "error": str(e)
        }), 502

    # Si Google responde pero no 200
    if r.status_code != 200:
        return jsonify({
            "message": "Google Books returned non-200",
            "status_code": r.status_code,
            "body": r.text[:300]
        }), 502

    data = r.json()
    items = data.get("items", []) or []

    normalized = []
    for it in items:
        vi = it.get("volumeInfo", {}) or {}
        img = (vi.get("imageLinks", {}) or {})
        normalized.append({
            "id": it.get("id"),
            "title": vi.get("title"),
            "authors": vi.get("authors", []),
            "publishedDate": vi.get("publishedDate"),
            "thumbnail": img.get("thumbnail") or img.get("smallThumbnail"),
        })

    return jsonify({"totalItems": data.get("totalItems", 0), "items": normalized}), 200

#routes for user events

@api.route("/users/<int:user_id>/events", methods=["GET"])
def get_user_events(user_id):
    user = User.query.get(user_id)

    if not user:
        return jsonify({"msg": "User not found"}), 404

    events = user.events

    return jsonify([event.serialize() for event in events]), 200

@api.route("/events", methods=["POST"])
def create_event():
    data = request.get_json() or {}

    title = data.get("title")
    date_str = data.get("date")      
    time_str = data.get("time")      
    category = data.get("category")  
    location = data.get("location")  

    if not all([title, date_str, time_str, category, location]):
        return jsonify({"msg": "Missing fields"}), 400

    try:
        date_obj = datetime.strptime(date_str, "%Y-%m-%d").date()
        time_obj = datetime.strptime(time_str, "%H:%M").time()
    except ValueError:
        return jsonify({"msg": "Invalid date/time format"}), 400

    event = Event(
        title=title,
        date=date_obj,
        time=time_obj,
        category=category,
        location=location
    )

    db.session.add(event)
    db.session.commit()

    return jsonify(event.serialize()), 201

@api.route("/events/<int:event_id>/signup", methods=["POST"])
def singup_to_event(event_id):
    data = request.get_json() or {}
    user_id = data.get("user_id")

    if not user_id:
        return jsonify({"msg": "Missing user_id"}), 400

    user = User.query.get(user_id)
    event = Event.query.get(event_id)

    if not user or not event:
        return jsonify({"msg": "User or Event not found"}), 404
    
    if event in user.events:
        return jsonify({"msg": "User already signed up to this event"}), 409

    user.events.append(event)
    db.session.commit()

    return jsonify({"msg": "User signed up to event"}), 200

@api.route("/events/<int:event_id>/signup", methods=["DELETE"])
def unsingup_from_event(event_id):
    data = request.get_json() or {}
    user_id = data.get("user_id")

    if not user_id:
        return jsonify({"msg": "Missing user_id"}), 400

    user = User.query.get(user_id)
    event = Event.query.get(event_id)

    if not user or not event:
        return jsonify({"msg": "User or Event not found"}), 404
    
    if event not in user.events:
        return jsonify({"msg": "User not signed up to this event"}), 409

    user.events.remove(event)
    db.session.commit()

    return jsonify({"msg": "User unsigned from event"}), 200

@api.route("/events/<int:event_id>/users", methods=["GET"])
def get_event_users(event_id):
    event = Event.query.get(event_id)

    if not event:
        return jsonify({"msg": "Event not found"}), 404

    users = event.users

    return jsonify([user.serialize() for user in users]), 200
