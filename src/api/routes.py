"""
This module takes care of starting the API Server, Loading the DB and Adding the endpoints
"""
from flask import make_response, request, jsonify, Blueprint, Response, stream_with_context
import os
from api.models import Event, db, User, Book, UserTop3
from stream_chat import StreamChat
import jwt
from datetime import datetime, timedelta
from flask import current_app
from flask import request, jsonify
from api.utils_scripts.auth_utils import create_refresh_token, verify_token, create_token, verify_refresh_token
import requests
import json
import random


api = Blueprint('api', __name__)

def normalize_isbn(isbn: str) -> str:
    return (isbn or "").replace("-", "").replace(" ", "").upper()


def generate_stream_token(user):
    try:
        client = get_stream_client()
        if not client:
            return None

        user_id = str(user.id)
        avatar_url = user.image_avatar if user.image_avatar else User.DEFAULT_AVATAR_URL

        try:
            client.restore_users([user_id])
        except Exception:
            pass

        client.upsert_user({
            "id": user_id,
            "name": user.username,
            "email": user.email,
            "image": avatar_url,
        })

        return client.create_token(user_id)
    except Exception as e:
        print(f"Error generating Stream token: {e}")
        return None

#----RUTAS DE REGISTRO----#

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

#----RUTAS DE AUTENTICACION----#

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

    access_token = create_token(user.id)
    refresh_token = create_refresh_token(user.id)

    stream_token = generate_stream_token(user)

    response_data = {
        "message": "Login successful",
        "access_token": access_token,
        "refresh_token": refresh_token,
        "user": user.serialize(),
    }

    if stream_token:
        response_data["stream_token"] = stream_token

    response = make_response(jsonify(response_data), 200)

    return response


@api.route("/auth/refresh", methods=["POST"])
def refresh_token():
    """Refresh access token using refresh token"""
    data = request.get_json() or {}
    refresh = data.get("refresh_token") or request.headers.get("Authorization", "").replace("Bearer ", "")

    if not refresh:
        return jsonify({"message": "Refresh token required"}), 401

    user_id = verify_refresh_token(refresh)
    if not user_id:
        return jsonify({"message": "Invalid or expired refresh token"}), 401

    access_token = create_token(user_id)
    return jsonify({"access_token": access_token}), 200


#----RUTAS DE USUARIOS----#

@api.route("/me", methods=["GET"])
def get_current_user():
    """Devuelve el usuario actual a partir del token. Para no depender de localStorage con datos de usuario."""
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return jsonify({"message": "Missing or invalid Authorization header"}), 401
    token = auth_header.split(" ")[1]
    user_id = verify_token(token)
    if not user_id:
        return jsonify({"message": "Invalid or expired token"}), 401
    user = User.query.get(user_id)
    if not user:
        return jsonify({"message": "User not found"}), 404
    return jsonify(user.serialize()), 200


@api.route('/users', methods=['GET'])
def get_users():
    users = User.query.all()
    return jsonify([u.serialize() for u in users]), 200

@api.route('/users/<int:user_id>', methods=['GET'])
def get_user(user_id):
    user = User.query.get(user_id)
    if not user:
        return jsonify({"message": "User not found"}), 404
    return jsonify(user.serialize()), 200

@api.route('/users/<int:user_id>', methods=['PUT'])
def update_user(user_id):
    data = request.get_json() or {}
    user = User.query.get(user_id)
    if not user:
        return jsonify({"message": "User not found"}), 404
    if 'username' in data and data['username']:
        user.username = data['username'].strip()
    img = data.get('image_avatar')
    if img is not None and isinstance(img, str):
        img = img.strip()
        if img and (img.startswith('http://') or img.startswith('https://')):
            user.image_avatar = img
    db.session.commit()
    return jsonify(user.serialize()), 200

@api.route('/users/<int:user_id>', methods=['DELETE'])
def delete_user(user_id):
    user = User.query.get(user_id)
    if not user:
        return jsonify({"message": "User not found"}), 404
    db.session.delete(user)
    db.session.commit()
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
    
    google_books_api_key = os.getenv("GOOGLE_BOOKS_API_KEY")
    if google_books_api_key:
        params["key"] = google_books_api_key

    try:
        r = requests.get(
            url,
            params=params,
            timeout=10,
            headers={"User-Agent": "Mozilla/5.0"}
        )
    except requests.RequestException as e:
        return jsonify({
            "message": "Error connecting to Google Books",
            "error": str(e)
        }), 502

    if r.status_code == 429:
        return jsonify({
            "message": "Se ha excedido el límite de búsquedas. Intenta de nuevo en unos minutos.",
            "error": "rate_limit"
        }), 429

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

        isbn = None
        identifiers = vi.get("industryIdentifiers", []) or []
        for ident in identifiers:
            if ident.get("type") in ["ISBN_13", "ISBN_10"]:
                isbn = ident.get("identifier")
                break
            if not isbn:
                for ident in identifiers:
                    if "ISBN" in (ident.get("type", "") or ""):
                        isbn = ident.get("identifier")
                        break

        normalized.append({
            "id": it.get("id"),
            "title": vi.get("title"),
            "authors": vi.get("authors", []),
            "publishedDate": vi.get("publishedDate"),
            "thumbnail": img.get("thumbnail") or img.get("smallThumbnail"),
            "isbn" : isbn
        })

    return jsonify({"totalItems": data.get("totalItems", 0), "items": normalized}), 200


@api.route("/books/by-isbn", methods=["GET"])
def books_by_isbn():
    """Obtiene descripción, portada y título de un libro por ISBN. Primero BD, luego Google Books."""
    isbn_raw = request.args.get("isbn", "").strip()
    isbn = normalize_isbn(isbn_raw)
    if not isbn:
        return jsonify({"message": "isbn required"}), 400

    # Si está en nuestra BD (p. ej. de library/current-reading), devolver thumbnail y title
    book = Book.query.get(isbn)
    if book:
        out = {
            "description": None,
            "thumbnail": book.thumbnail,
            "title": book.title,
        }
        return jsonify(out), 200

    url = "https://www.googleapis.com/books/v1/volumes"
    params = {"q": f"isbn:{isbn}", "maxResults": 1}
    google_books_api_key = os.getenv("GOOGLE_BOOKS_API_KEY")
    if google_books_api_key:
        params["key"] = google_books_api_key

    try:
        r = requests.get(url, params=params, timeout=10, headers={"User-Agent": "Mozilla/5.0"})
    except requests.RequestException as e:
        return jsonify({"message": "Error connecting to Google Books", "error": str(e)}), 502

    if r.status_code == 429:
        return jsonify({"message": "Se ha excedido el límite de búsquedas. Intenta de nuevo en unos minutos.", "error": "rate_limit"}), 429
    if r.status_code != 200:
        return jsonify({"message": "Google Books error", "status_code": r.status_code}), 502

    data = r.json()
    items = data.get("items", []) or []
    if not items:
        return jsonify({"description": None, "thumbnail": None, "title": None}), 200

    item = items[0]
    vi = item.get("volumeInfo", {}) or {}
    description = vi.get("description") or None
    img = (vi.get("imageLinks", {}) or {})
    thumbnail = img.get("thumbnail") or img.get("smallThumbnail")
    title = vi.get("title")
    return jsonify({"description": description, "thumbnail": thumbnail, "title": title}), 200


#----RUTAS DE EVENTOS----#

@api.route("/users/<int:user_id>/events", methods=["GET"])
def get_user_events(user_id):
    user = User.query.get(user_id)

    if not user:
        return jsonify({"msg": "User not found"}), 404

    events = user.events

    return jsonify([event.serialize() for event in events]), 200


@api.route("/events", methods=["GET"])
def get_all_events():
    events = Event.query.order_by(Event.date.asc(), Event.time.asc()).all()
    return jsonify([e.serialize() for e in events]), 200


@api.route("/events", methods=["POST"])
def create_event():
    try:
        data = request.get_json() or {}

        title = data.get("title")
        date_str = data.get("date")
        time_str = data.get("time")
        category = data.get("category")
        location = data.get("location")
        lat = data.get("lat")
        lng = data.get("lng")

        if not all([title, date_str, time_str, category, location]):
            return jsonify({"msg": "Missing required fields", "received": data}), 400

        try:
            date_obj = datetime.strptime(date_str, "%Y-%m-%d").date()
            time_obj = datetime.strptime(time_str, "%H:%M").time()
        except ValueError as e:
            return jsonify({"msg": f"Invalid date/time format: {str(e)}"}), 400

        # Convertir lat/lng a float si vienen como string o número
        lat_float = None
        lng_float = None
        if lat is not None:
            try:
                lat_float = float(lat) if lat != "" else None
            except (ValueError, TypeError):
                lat_float = None
        if lng is not None:
            try:
                lng_float = float(lng) if lng != "" else None
            except (ValueError, TypeError):
                lng_float = None

        event = Event(
            title=title,
            date=date_obj,
            time=time_obj,
            category=category,
            location=location,
            lat=lat_float,
            lng=lng_float
        )

        db.session.add(event)
        db.session.commit()

        return jsonify(event.serialize()), 201
    except Exception as e:
        db.session.rollback()
        import traceback
        error_trace = traceback.format_exc()
        print(f"Error creating event: {str(e)}")
        print(error_trace)
        return jsonify({"msg": f"Error creating event: {str(e)}", "error": error_trace}), 500


@api.route("/events/<int:event_id>", methods=["DELETE"])
def delete_event(event_id):
    
    auth_header = request.headers.get("Authorization") or ""
    user_id = None
    if auth_header.startswith("Bearer "):
        token = auth_header.split(" ", 1)[1].strip()
        user_id = verify_token(token)

    if not user_id:
        return jsonify({"msg": "Missing or invalid auth token"}), 401

    event = Event.query.get(event_id)
    if not event:
        return jsonify({"msg": "Event not found"}), 404

    
    db.session.delete(event)
    db.session.commit()

    return jsonify({"msg": "Event deleted"}), 200

@api.route("/events/<int:event_id>/signup", methods=["POST"])
def singup_to_event(event_id):
    data = request.get_json(silent=True) or {}
    user_id = data.get("user_id")

    if not user_id:
        auth_header = request.headers.get("Authorization") or ""
        if auth_header.startswith("Bearer "):
            token = auth_header.split(" ", 1)[1].strip()
            user_id = verify_token(token)

    if not user_id:
        return jsonify({"msg": "Missing user_id"}), 400

    user = User.query.get(int(user_id))
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
    data = request.get_json(silent=True) or {}
    user_id = data.get("user_id")

    if not user_id:
        auth_header = request.headers.get("Authorization") or ""
        if auth_header.startswith("Bearer "):
            token = auth_header.split(" ", 1)[1].strip()
            user_id = verify_token(token)

    if not user_id:
        return jsonify({"msg": "Missing user_id"}), 400

    user = User.query.get(int(user_id))
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


#----RUTAS DE STREAM CHAT----#

def get_stream_client():
    api_key = os.getenv("STREAM_API_KEY")
    api_secret = os.getenv("STREAM_API_SECRET")

    if not api_key or not api_secret:
        raise ValueError("STREAM_API_KEY and STREAM_API_SECRET must be set in environment variables")

    return StreamChat(api_key=api_key, api_secret=api_secret)


@api.route("/stream-token", methods=["GET"])
def get_stream_token():
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return jsonify({"message": "Missing or invalid Authorization header"}), 401

    token = auth_header.split(" ")[1]
    user_id = verify_token(token)

    if not user_id:
        return jsonify({"message": "Invalid or expired token"}), 401

    user = User.query.get(user_id)
    if not user:
        return jsonify({"message": "User not found"}), 404

    try:
        client = get_stream_client()
        avatar_url = user.image_avatar if user.image_avatar else User.DEFAULT_AVATAR_URL
        client.upsert_user({
            "id": str(user.id),
            "name": user.username,
            "email": user.email,
            "image": avatar_url,
        })
        stream_token = client.create_token(str(user.id))

        return jsonify({
            "stream_token": stream_token,
            "user_id": str(user.id),
            "username": user.username
        }), 200

    except ValueError as e:
        return jsonify({"message": str(e)}), 500
    except Exception as e:
        return jsonify({"message": f"Error generating Stream token: {str(e)}"}), 500


@api.route("/chat/sync-my-avatar", methods=["POST"])
def sync_my_avatar():
    """
    Sincroniza el avatar del usuario autenticado desde la BD a Stream Chat.
    Debe llamarse después de que el usuario guarde su foto de perfil, para que
    la nueva imagen aparezca en el chat sin tener que volver a iniciar sesión.
    """
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return jsonify({"message": "Missing or invalid Authorization header"}), 401

    token = auth_header.split(" ")[1]
    user_id = verify_token(token)
    if not user_id:
        return jsonify({"message": "Invalid or expired token"}), 401

    user = User.query.get(user_id)
    if not user:
        return jsonify({"message": "User not found"}), 404

    try:
        client = get_stream_client()
        avatar_url = user.image_avatar if user.image_avatar else User.DEFAULT_AVATAR_URL
        client.upsert_user({
            "id": str(user.id),
            "name": user.username,
            "email": user.email,
            "image": avatar_url,
        })
        return jsonify({"ok": True, "image": avatar_url}), 200
    except Exception as e:
        return jsonify({"message": f"Error syncing avatar: {str(e)}"}), 500


@api.route("/chat/create-channel", methods=["POST"])
def create_channel():
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return jsonify({"message": "Missing or invalid Authorization header"}), 401

    token = auth_header.split(" ")[1]
    user_id = verify_token(token)

    if not user_id:
        return jsonify({"message": "Invalid or expired token"}), 401
    data = request.get_json() or {}
    channel_id = data.get("channel_id")
    book_title = data.get("book_title")
    member_ids = data.get("member_ids", [])

    if not channel_id or not book_title:
        return jsonify({"message": "channel_id and book_title are required"}), 400

    user_id_str = str(user_id)

    if user_id_str not in member_ids:
        member_ids.append(user_id_str)

    try:
        client = get_stream_client()

        channel = client.channel(
            "messaging",
            channel_id,
            {
                "name": f"📚 {book_title}",
                "book_title": book_title,
                "members": member_ids,
            }
        )

        channel.create(user_id_str)

        return jsonify({
            "message": "Channel created successfully",
            "channel_id": channel_id,
            "book_title": book_title
        }), 201

    except Exception as e:
        return jsonify({"message": f"Error creating channel: {str(e)}"}), 500


@api.route("/chat/join-channel/<channel_id>", methods=["POST"])
def join_channel(channel_id):
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return jsonify({"message": "Missing or invalid Authorization header"}), 401

    token = auth_header.split(" ")[1]
    user_id = verify_token(token)

    if not user_id:
        return jsonify({"message": "Invalid or expired token"}), 401

    try:
        client = get_stream_client()
        channel = client.channel("messaging", channel_id)
        channel.add_members([str(user_id)])

        return jsonify({
            "message": "Successfully joined channel",
            "channel_id": channel_id
        }), 200

    except Exception as e:
        return jsonify({"message": f"Error joining channel: {str(e)}"}), 500


@api.route("/chat/public-channels", methods=["GET"])
def get_public_channels():
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return jsonify({"message": "Missing or invalid Authorization header"}), 401

    token = auth_header.split(" ")[1]
    user_id = verify_token(token)

    if not user_id:
        return jsonify({"message": "Invalid or expired token"}), 401

    try:
        client = get_stream_client()

        channels = client.query_channels(
            filter_conditions={
                "type": "messaging",
            },
            sort=[{"last_message_at": -1}],
            limit=100
        )

        channel_list = []
        for ch in channels.get("channels", []):
            channel_data = ch.get("channel", {})
            channel_id = channel_data.get("id", "")

            if channel_id.startswith("book-"):
                channel_list.append({
                    "id": channel_id,
                    "name": channel_data.get("name"),
                    "book_title": channel_data.get("book_title"),
                    "member_count": channel_data.get("member_count", 0),
                    "created_at": channel_data.get("created_at"),
                    "last_message_at": channel_data.get("last_message_at"),
                    "created_by_id": channel_data.get("created_by_id"),
                })

        return jsonify({
            "channels": channel_list,
            "count": len(channel_list)
        }), 200

    except Exception as e:
        return jsonify({"message": f"Error fetching channels: {str(e)}"}), 500


@api.route("/chat/create-or-join-channel", methods=["POST"])
def create_or_join_channel():
    """
    Crea (si no existe) o une al usuario autenticado a un canal de Stream Chat
    usando el TÍTULO del libro como base para el ID del canal.

    Flujo:
    - Valida el token JWT del usuario.
    - Recibe book_title en el cuerpo del POST.
    - Normaliza el título y genera un channel_id del tipo "book-<titulo-normalizado>".
    - Usa la API de Stream Chat (servidor) para crear el canal si no existe.
    - Asegura que el usuario actual quede como miembro del canal.
    - Devuelve el channel_id y el book_title al frontend.
    """
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return jsonify({"message": "Missing or invalid Authorization header"}), 401

    token = auth_header.split(" ")[1]
    user_id = verify_token(token)

    if not user_id:
        return jsonify({"message": "Invalid or expired token"}), 401

    data = request.get_json() or {}
    book_title = data.get("book_title")

    if not book_title:
        return jsonify({"message": "book_title is required"}), 400

    import re
    import unicodedata

    normalized = unicodedata.normalize("NFD", book_title.lower())
    cleaned = re.sub(r"[\u0300-\u036f]", "", normalized)
    cleaned = re.sub(r"[^a-z0-9\s-]", "", cleaned)
    cleaned = re.sub(r"\s+", "-", cleaned)
    cleaned = re.sub(r"-+", "-", cleaned)
    channel_id = f"book-{cleaned.strip('-')}"

    user_id_str = str(user_id)

    try:
        client = get_stream_client()

        channel = client.channel(
            "messaging",
            channel_id,
            {
                "name": f"📚 {book_title}",
                "book_title": book_title,
                "members": [user_id_str],
            }
        )

        channel.create(user_id_str)

        try:
            channel.add_members([user_id_str])
        except Exception:
            pass

        return jsonify({
            "message": "Successfully joined channel",
            "channel_id": channel_id,
            "book_title": book_title,
        }), 200

    except Exception as e:
        return jsonify({"message": f"Error creating/joining channel: {str(e)}"}), 500


@api.route("/chat/create-or-join-channel-by-isbn", methods=["POST"])
def create_or_join_channel_by_isbn():
    """
    Crea un canal de libro NUEVO o une al usuario si ya existe,
    usando el ISBN como identificador ÚNICO del canal.

    Diferencias clave con create_or_join_channel (por título):
    - El ID del canal es "book-isbn-<ISBN_NORMALIZADO>".
    - Se guardan metadatos extra del libro en el canal (thumbnail, autores, isbn).
    - Está pensado para que todos los usuarios que leen el mismo ISBN
      acaben SIEMPRE en el mismo canal de chat, aunque el título se escriba distinto.
    """
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return jsonify({"message": "Missing or invalid Authorization header"}), 401
    
    token = auth_header.split(" ")[1]
    user_id = verify_token(token)
    
    if not user_id:
        return jsonify({"message": "Invalid or expired token"}), 401

    data = request.get_json() or {}
    isbn = normalize_isbn(data.get("isbn"))
    book_title = data.get("book_title", "Libro sin título")
    thumbnail = data.get("thumbnail")
    authors = data.get("authors", [])
    
    if not isbn:
        return jsonify({"message": "isbn is required"}), 400
    
    channel_id = f"book-isbn-{isbn}"
    user_id_str = str(user_id)
    
    try:
        client = get_stream_client()
        channel = client.channel(
            "messaging",
            channel_id,
            {
                "name": f"📚 {book_title}",
                "book_title": book_title,
                "isbn": isbn,
                "thumbnail": thumbnail,
                "authors": authors if isinstance(authors, list) else [authors] if authors else [],
                "members": [user_id_str],
            },
        )

        # Crear el canal si no existe; si ya existe, simplemente asegurarse de que el usuario es miembro.
        try:
            channel.create(user_id_str)
        except Exception:
            try:
                channel.add_members([user_id_str])
            except Exception:
                # Si ya es miembro o hay cualquier otro problema no crítico, lo ignoramos:
                # desde el punto de vista de la UX el usuario ya está "en el chat".
                pass

        return jsonify(
            {
                "message": "Successfully joined channel",
                "channel_id": channel_id,
                "book_title": book_title,
                "isbn": isbn,
            }
        ), 200
    except Exception as e:
        # Evitar que un fallo puntual en Stream rompa la UI: devolver error controlado
        return jsonify({"message": f"Error creating/joining channel: {str(e)}"}), 500


@api.route("/chat/sync-channel-avatars", methods=["GET"])
def sync_channel_avatars():
    """
    Sincroniza los avatares de los miembros del canal desde la BD a Stream.
    Así todos los usuarios ven las fotos de perfil de los demás en el chat.
    Debe llamarse antes de abrir el canal en el frontend (p. ej. antes de watch()).
    """
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return jsonify({"message": "Missing or invalid Authorization header"}), 401

    token = auth_header.split(" ")[1]
    if not verify_token(token):
        return jsonify({"message": "Invalid or expired token"}), 401

    channel_id = request.args.get("channel_id")
    if not channel_id:
        return jsonify({"message": "channel_id is required"}), 400

    client = get_stream_client()
    try:
        channel = client.channel("messaging", channel_id)
        result = channel.query_members(limit=100)
        members_data = result.get("members", [])
    except Exception:
        return jsonify({"ok": True, "synced": 0}), 200

    synced = 0
    for m in members_data:
        u = m.get("user") or m
        user_id_str = u.get("id") or m.get("user_id")
        if not user_id_str:
            continue
        db_user = User.query.get(user_id_str)
        if not db_user:
            continue
        avatar_url = db_user.image_avatar if db_user.image_avatar else User.DEFAULT_AVATAR_URL
        try:
            client.upsert_user({
                "id": str(user_id_str),
                "name": db_user.username,
                "email": getattr(db_user, "email", None) or "",
                "image": avatar_url,
            })
            synced += 1
        except Exception:
            pass
    return jsonify({"ok": True, "synced": synced}), 200


@api.route("/chat/channel-members-by-isbn", methods=["GET"])
def get_channel_members_by_isbn():
    """
    Devuelve los miembros (id, nombre, imagen) del canal de un libro dado su ISBN.

    Uso principal:
    - La pantalla de Home llama a este endpoint para mostrar avatares reales
      de lectores que han participado en el chat de ese libro.
    - No crea canales ni modifica nada en Stream, solo consulta miembros (si el canal existe).
    """
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return jsonify({"message": "Missing or invalid Authorization header"}), 401

    token = auth_header.split(" ")[1]
    user_id = verify_token(token)

    if not user_id:
        return jsonify({"message": "Invalid or expired token"}), 401

    isbn = normalize_isbn(request.args.get("isbn"))
    if not isbn:
        return jsonify({"message": "isbn is required"}), 400

    channel_id = f"book-isbn-{isbn}"
    channel_cid = f"messaging:{channel_id}"

    client = get_stream_client()

    # Caso 1: intentar obtener miembros desde el propio canal
    try:
        channel = client.channel("messaging", channel_id)
        result = channel.query_members(limit=50)
        members_data = result.get("members", [])
    except Exception:
        # Caso 2: si el canal aún no existe o falla query_members, devolver lista vacía
        return jsonify({"members": [], "count": 0}), 200

    users = []
    for m in members_data:
        u = m.get("user") or m
        user_id_str = u.get("id") or m.get("user_id")
        if not user_id_str:
            continue
        db_user = User.query.get(user_id_str)
        image = u.get("image")
        if db_user:
            avatar_url = db_user.image_avatar if db_user.image_avatar else User.DEFAULT_AVATAR_URL
            if image != avatar_url:
                try:
                    client.upsert_user({
                        "id": str(user_id_str),
                        "name": db_user.username,
                        "image": avatar_url,
                    })
                except Exception:
                    pass
            image = image or avatar_url
        elif not image:
            image = User.DEFAULT_AVATAR_URL
        users.append(
            {
                "id": str(user_id_str),
                "name": u.get("name") or (db_user.username if db_user else str(user_id_str)),
                "image": image,
            }
        )
    return jsonify({"members": users, "count": len(users)}), 200


@api.route("/library/<int:user_id>/books", methods=["GET"])
def get_user_library(user_id):
    user = User.query.get(user_id)
    if not user:
        return jsonify({"msg": "User not found"}), 404

    return jsonify([book.serialize() for book in user.library_books]), 200


@api.route("/library/<int:user_id>/books", methods=["POST"])
def add_book_to_library(user_id):
    data = request.get_json() or {}

    isbn = normalize_isbn(data.get("isbn"))
    title = data.get("title")
    authors = data.get("authors") or []
    publisher = data.get("publisher")
    thumbnail = data.get("thumbnail")

    if not isbn or not title:
        return jsonify({"msg": "Missing isbn or title"}), 400

    user = User.query.get(user_id)
    if not user:
        return jsonify({"msg": "User not found"}), 404

    if isinstance(authors, str):
        authors = [authors]

    if any(b.isbn == isbn for b in user.library_books):
        return jsonify({"msg": "Book already in library"}), 409

    book = Book.query.get(isbn)

    if not book:
        book = Book(
            isbn=isbn,
            title=title,
            author=";".join(authors),
            publisher=publisher,
            thumbnail=thumbnail,
        )
        db.session.add(book)

    user.library_books.append(book)
    db.session.commit()

    return jsonify({"msg": "Book added to library", "book": book.serialize()}), 201


@api.route("/library/<int:user_id>/books/<string:isbn>", methods=["DELETE"])
def remove_book_from_library(user_id, isbn):
    user = User.query.get(user_id)
    if not user:
        return jsonify({"msg": "User not found"}), 404

    isbn = normalize_isbn(isbn)

    book = next((b for b in user.library_books if b.isbn == isbn), None)
    if not book:
        return jsonify({"msg": "Book not found in library"}), 404

    # Si se elimina un libro que está marcado como current reading, lo quitamos también de ahí
    if user.current_reading_isbn and normalize_isbn(user.current_reading_isbn) == isbn:
        user.current_reading_isbn = None

    user.library_books.remove(book)
    db.session.commit()

    return jsonify({"msg": "Book removed from library"}), 200


@api.route("/users/<int:user_id>/current-reading", methods=["GET"])
def get_current_reading(user_id):
    user = User.query.get(user_id)
    if not user:
        return jsonify({"msg": "User not found"}), 404

    current_book = None
    current_isbn_norm = None
    if user.current_reading_isbn:
        current_isbn_norm = normalize_isbn(user.current_reading_isbn)
        book = Book.query.get(user.current_reading_isbn)
        if book:
            current_book = book.serialize()

    # History sin el libro actual para no repetirlo
    history = [
        book.serialize()
        for book in user.library_books
        if normalize_isbn(book.isbn) != current_isbn_norm
    ]

    return jsonify({"current": current_book, "history": history}), 200


@api.route("/users/<int:user_id>/current-reading", methods=["PUT"])
def set_current_reading(user_id):
    user = User.query.get(user_id)
    if not user:
        return jsonify({"msg": "User not found"}), 404

    data = request.get_json() or {}

    isbn = normalize_isbn(data.get("isbn"))
    title = data.get("title")
    authors = data.get("authors") or []
    publisher = data.get("publisher")
    thumbnail = data.get("thumbnail")

    if not isbn or not title:
        return jsonify({"msg": "Missing isbn or title"}), 400

    if isinstance(authors, str):
        authors = [authors]

    book = Book.query.get(isbn)
    if not book:
        book = Book(
            isbn=isbn,
            title=title,
            author=";".join(authors),
            publisher=publisher,
            thumbnail=thumbnail,
        )
        db.session.add(book)

    if not any(b.isbn == isbn for b in user.library_books):
        user.library_books.append(book)

    user.current_reading_isbn = isbn
    db.session.commit()

    # History sin el libro actual para no repetirlo
    history = [
        b.serialize()
        for b in user.library_books
        if normalize_isbn(b.isbn) != normalize_isbn(isbn)
    ]
    return jsonify(
        {
            "current": book.serialize(),
            "history": history,
        }
    ), 200


@api.route("/users/<int:user_id>/current-reading", methods=["DELETE"])
def clear_current_reading(user_id):
    user = User.query.get(user_id)
    if not user:
        return jsonify({"msg": "User not found"}), 404

    data = request.get_json(silent=True) or {}
    isbn = normalize_isbn(data.get("isbn")) if data.get("isbn") else None

    if isbn and user.current_reading_isbn and normalize_isbn(user.current_reading_isbn) != isbn:
        # Si se pasa un isbn distinto al current, simplemente lo quitamos de la librería
        book = next((b for b in user.library_books if b.isbn == isbn), None)
        if book:
            user.library_books.remove(book)
        db.session.commit()
        return jsonify({"msg": "Book removed from library"}), 200

    # Si no se pasa isbn o coincide con el current, limpiamos current_reading
    user.current_reading_isbn = None
    db.session.commit()

    return jsonify({"msg": "Current reading cleared"}), 200


@api.route("/users/<int:user_id>/top3", methods=["GET"])
def get_user_top3(user_id):
    user = User.query.get(user_id)
    if not user:
        return jsonify({"msg": "User not found"}), 404

    rows = (
        UserTop3.query.filter_by(user_id=user_id)
        .order_by(UserTop3.position)
        .all()
    )
    # positions 1, 2, 3 -> indices 0, 1, 2
    result = [None, None, None]
    for row in rows:
        if 1 <= row.position <= 3 and row.book_isbn:
            book = Book.query.get(row.book_isbn)
            if book:
                result[row.position - 1] = book.serialize()
    return jsonify({"top3": result}), 200


@api.route("/users/<int:user_id>/top3", methods=["PUT"])
def set_user_top3(user_id):
    user = User.query.get(user_id)
    if not user:
        return jsonify({"msg": "User not found"}), 404

    data = request.get_json() or {}
    top3 = data.get("top3")
    if not isinstance(top3, list) or len(top3) < 3:
        return jsonify({"msg": "top3 must be an array of 3 elements"}), 400

    # Ensure we have exactly 3 slots (book object or null)
    slots = [
        top3[0] if top3[0] is not None else None,
        top3[1] if top3[1] is not None else None,
        top3[2] if top3[2] is not None else None,
    ]

    # No permitir repetidos: mismo ISBN solo puede aparecer en un slot
    isbns = [normalize_isbn(s.get("isbn")) for s in slots if s and s.get("isbn")]
    if len(isbns) != len(set(isbns)):
        return jsonify({"msg": "Duplicate books are not allowed in Top 3"}), 400

    # Remove existing top3 rows for this user
    UserTop3.query.filter_by(user_id=user_id).delete()

    for pos, slot in enumerate(slots, start=1):
        if slot is None:
            continue
        isbn = normalize_isbn(slot.get("isbn"))
        title = slot.get("title")
        authors = slot.get("authors") or []
        if not isbn or not title:
            continue
        if isinstance(authors, str):
            authors = [authors]
        book = Book.query.get(isbn)
        if not book:
            book = Book(
                isbn=isbn,
                title=title,
                author=";".join(authors),
                publisher=slot.get("publisher"),
                thumbnail=slot.get("thumbnail"),
            )
            db.session.add(book)
        row = UserTop3(user_id=user_id, position=pos, book_isbn=isbn)
        db.session.add(row)

    db.session.commit()

    rows = (
        UserTop3.query.filter_by(user_id=user_id)
        .order_by(UserTop3.position)
        .all()
    )
    result = [None, None, None]
    for row in rows:
        if 1 <= row.position <= 3 and row.book_isbn:
            book = Book.query.get(row.book_isbn)
            if book:
                result[row.position - 1] = book.serialize()
    return jsonify({"top3": result}), 200


@api.route("/users/<int:user_id>/profile", methods=["GET"])
def get_user_profile(user_id):
    """Devuelve perfil del usuario: aboutText, favoriteGenres, top3 (todo lo que antes era profile_prefs)."""
    user = User.query.get(user_id)
    if not user:
        return jsonify({"msg": "User not found"}), 404

    rows = (
        UserTop3.query.filter_by(user_id=user_id)
        .order_by(UserTop3.position)
        .all()
    )
    top3 = [None, None, None]
    for row in rows:
        if 1 <= row.position <= 3 and row.book_isbn:
            book = Book.query.get(row.book_isbn)
            if book:
                top3[row.position - 1] = book.serialize()

    genres = user.get_favorite_genres_list()
    return jsonify({
        "aboutText": user.about_text or "",
        "favoriteGenres": genres,
        "top3": top3,
    }), 200


@api.route("/users/<int:user_id>/profile", methods=["PUT"])
def set_user_profile(user_id):
    """Actualiza aboutText y/o favoriteGenres del usuario."""
    user = User.query.get(user_id)
    if not user:
        return jsonify({"msg": "User not found"}), 404

    data = request.get_json() or {}
    if "aboutText" in data:
        user.about_text = data["aboutText"] if data["aboutText"] is not None else ""
    if "favoriteGenres" in data:
        genres = data["favoriteGenres"]
        if isinstance(genres, list):
            user.favorite_genres = json.dumps(genres)
        else:
            user.favorite_genres = "[]"
    db.session.commit()

    genres = user.get_favorite_genres_list()
    return jsonify({
        "aboutText": user.about_text or "",
        "favoriteGenres": genres,
    }), 200


@api.route("/ai-chat", methods=["POST"])
def ai_chat():
    """
    Endpoint principal del Chat de IA.

    Qué hace:
    - Requiere Authorization: Bearer <access_token> (usuario autenticado).
    - Recibe el mensaje actual del usuario y el historial de conversación.
    - Construye un prompt en español para el modelo de Gemini (google-generativeai),
      actuando como asistente de recomendaciones de libros.
    - Llama al modelo en modo streaming y va devolviendo trozos de texto
      usando Server-Sent Events (líneas "data: {...}").

    Relación con el frontend:
    - El componente AIChat.jsx abre una petición fetch a /api/ai-chat.
    - Va leyendo cada "chunk" y actualizando el mensaje del asistente en tiempo real.
    """
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return jsonify({"message": "Missing or invalid Authorization header"}), 401

    token = auth_header.split(" ")[1]
    user_id = verify_token(token)

    if not user_id:
        return jsonify({"message": "Invalid or expired token"}), 401

    data = request.get_json() or {}
    user_message = data.get("message", "").strip()

    if not user_message:
        return jsonify({"message": "Message is required"}), 400

    gemini_api_key = os.getenv("GEMINI_API_KEY")
    if not gemini_api_key:
        return jsonify({"message": "GEMINI_API_KEY not configured"}), 500

    try:
        import google.generativeai as genai
        genai.configure(api_key=gemini_api_key)

        conversation_history = data.get("history", [])

        system_prompt = """Eres un asistente virtual especializado en recomendar libros. 
        Tu objetivo es ayudar a los usuarios a encontrar libros que disfruten basándote en sus preferencias, 
        géneros favoritos, estados de ánimo, o cualquier otra información que compartan.
        
        Sé amigable, entusiasta y específico en tus recomendaciones. Si el usuario menciona un libro, 
        autor o género, úsalo como referencia para sugerir libros similares.
        
        Responde siempre en español y de forma conversacional."""

        conversation_text = system_prompt + "\n\n"

        for msg in conversation_history:
            role = "Usuario" if msg.get("role") == "user" else "Asistente"
            conversation_text += f"{role}: {msg.get('content', '')}\n\n"

        conversation_text += f"Usuario: {user_message}\n\nAsistente:"

        try:
            available_models = genai.list_models()
            model_name = None

            for m in available_models:
                if 'generateContent' in m.supported_generation_methods:
                    if 'gemini' in m.name.lower():
                        model_name = m.name
                        break

            if model_name is None:
                for m in available_models:
                    if 'generateContent' in m.supported_generation_methods:
                        model_name = m.name
                        break

            if model_name is None:
                available_names = [m.name for m in available_models]
                raise Exception(f"No se encontró ningún modelo disponible que soporte generateContent. Modelos disponibles: {available_names}")

            model = genai.GenerativeModel(model_name)

        except Exception as list_error:
            model_names = ['gemini-pro', 'gemini-1.0-pro', 'gemini-1.5-pro']
            model = None
            last_error = str(list_error)

            for model_name in model_names:
                try:
                    model = genai.GenerativeModel(model_name)
                    break
                except Exception as e:
                    last_error = str(e)
                    continue

            if model is None:
                raise Exception(f"No se pudo inicializar ningún modelo. Error al listar: {str(list_error)}. Errores al probar modelos: {last_error}")

        try:
            response = model.generate_content(
                conversation_text,
                stream=True,
                generation_config=genai.types.GenerationConfig(
                    temperature=0.7,
                    max_output_tokens=2048,
                )
            )
        except Exception as e:
            return jsonify({"message": f"Error generating response: {str(e)}"}), 500

        def generate():
            try:
                for chunk in response:
                    if hasattr(chunk, 'text') and chunk.text:
                        yield f"data: {json.dumps({'content': chunk.text})}\n\n"
                yield "data: [DONE]\n\n"
            except Exception as e:
                yield f"data: {json.dumps({'error': str(e)})}\n\n"
                yield "data: [DONE]\n\n"

        return Response(
            stream_with_context(generate()),
            mimetype='text/event-stream',
            headers={
                'Cache-Control': 'no-cache',
                'X-Accel-Buffering': 'no',
                'Connection': 'keep-alive'
            }
        )

    except ImportError:
        return jsonify({
            "message": "google-generativeai library not installed. Run: pipenv install google-generativeai (or install_genai.bat) and restart the backend with: pipenv run flask run -p 3001"
        }), 500

    except Exception as e:
        return jsonify({"message": f"Error in AI chat: {str(e)}"}), 500


@api.route("/ai-chat/random-book", methods=["GET"])
def get_random_book():
    """
    Endpoint de apoyo al Chat de IA para la función "Sorpréndeme".

    Qué hace:
    - Requiere Authorization: Bearer <access_token>.
    - Elige aleatoriamente un término de búsqueda de libros (novela, fantasía, etc.).
    - Llama a la API de Google Books con ese término.
    - Escoge un libro al azar entre los resultados.
    - Devuelve un JSON con información rica del libro (título, autores, descripción,
      categorías, páginas, idioma, enlaces para más info y posible compra).

    Relación con el frontend:
    - AIChat.jsx llama a /api/ai-chat/random-book cuando pulsas "🎲 Sorpréndeme".
    - Con la respuesta construye un mensaje formateado que el usuario ve en el chat.
    """
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return jsonify({"message": "Missing or invalid Authorization header"}), 401

    token = auth_header.split(" ")[1]
    user_id = verify_token(token)

    if not user_id:
        return jsonify({"message": "Invalid or expired token"}), 401

    search_terms = [
        "best seller", "novela", "ciencia ficción", "fantasía", "misterio",
        "romance", "historia", "biografía", "aventura", "thriller",
        "literatura", "clásico", "contemporáneo", "drama", "comedia"
    ]

    search_term = random.choice(search_terms)

    url = "https://www.googleapis.com/books/v1/volumes"
    params = {
        "q": search_term,
        "maxResults": 40,
        "langRestrict": "es",
        "printType": "books",
        "orderBy": "relevance"
    }
    google_books_api_key = os.getenv("GOOGLE_BOOKS_API_KEY")
    if google_books_api_key:
        params["key"] = google_books_api_key

    try:
        r = requests.get(
            url,
            params=params,
            timeout=10,
            headers={"User-Agent": "Mozilla/5.0"}
        )
        if r.status_code == 429:
            return jsonify({
                "message": "Se ha excedido el límite de búsquedas. Intenta de nuevo en unos minutos.",
                "error": "rate_limit"
            }), 429

        if r.status_code != 200:
            return jsonify({
                "message": "Error fetching books from Google Books",
                "status_code": r.status_code
            }), 502

        data = r.json()
        items = data.get("items", []) or []

        if not items:
            return jsonify({"message": "No books found"}), 404

        random_item = random.choice(items)
        vi = random_item.get("volumeInfo", {}) or {}
        img = (vi.get("imageLinks", {}) or {})
        sale_info = (random_item.get("saleInfo", {}) or {})

        isbn = None
        identifiers = vi.get("industryIdentifiers", []) or []
        for ident in identifiers:
            if ident.get("type") in ["ISBN_13", "ISBN_10"]:
                isbn = ident.get("identifier")
                break
            if not isbn:
                for ident in identifiers:
                    if "ISBN" in (ident.get("type", "") or ""):
                        isbn = ident.get("identifier")
                        break

        # Enlaces útiles
        google_books_url = vi.get("infoLink") or vi.get("previewLink") or vi.get("canonicalVolumeLink")
        buy_link = sale_info.get("buyLink")

        book_data = {
            "id": random_item.get("id"),
            "title": vi.get("title"),
            "authors": vi.get("authors", []),
            "publishedDate": vi.get("publishedDate"),
            "thumbnail": img.get("thumbnail") or img.get("smallThumbnail"),
            "isbn": isbn,
            "description": vi.get("description", ""),
            "categories": vi.get("categories", []),
            "pageCount": vi.get("pageCount"),
            "language": vi.get("language"),
            "googleBooksUrl": google_books_url,
            "buyLink": buy_link,
        }

        return jsonify(book_data), 200

    except requests.RequestException as e:
        return jsonify({
            "message": "Error connecting to Google Books",
            "error": str(e)
        }), 502
