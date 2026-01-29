
"""
This module takes care of starting the API Server, Loading the DB and Adding the endpoints
"""
from flask import make_response, request, jsonify, url_for, Blueprint, Response, stream_with_context
import os
import jwt
from api.models import Event, db, User
from api.utils import generate_sitemap, APIException
from stream_chat import StreamChat
import jwt
from datetime import datetime, timedelta
from flask import current_app
from flask import request, jsonify
from api.utils_scripts.auth_utils import create_refresh_token, verify_token, create_token
import requests
from api.models import db, User, Book
import json
import random


api = Blueprint('api', __name__)

def normalize_isbn(isbn: str) -> str:
    return (isbn or "").replace("-", "").replace(" ", "").upper()


def generate_stream_token(user):
    """Generate a Stream Chat token for a user"""
    try:
        client = get_stream_client()
        if not client:
            return None
        
        user_id = str(user.id)
        
        try:
            client.restore_users([user_id])
        except Exception:
            pass
        
        client.upsert_user({
            "id": user_id,
            "name": user.username,
            "email": user.email,
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

#----RUTAS DE USUARIOS----#

@api.route('/users', methods=['GET'])
def get_users():
    users = User.query.all()
    return jsonify([u.serialize() for u in users]), 200


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

#----RUTAS DE EVENTOS----#

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


#----RUTAS DE STREAM CHAT----#

def get_stream_client():
    """Initialize Stream Chat client with API credentials"""
    api_key = os.getenv("STREAM_API_KEY")
    api_secret = os.getenv("STREAM_API_SECRET")
    
    if not api_key or not api_secret:
        raise ValueError("STREAM_API_KEY and STREAM_API_SECRET must be set in environment variables")
    
    return StreamChat(api_key=api_key, api_secret=api_secret)


@api.route("/stream-token", methods=["GET"])
def get_stream_token():
    """
    Generate a Stream Chat token for the authenticated user.
    Requires a valid JWT access token in the Authorization header.
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
        client.upsert_user({
            "id": str(user.id),
            "name": user.username,
            "email": user.email,
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


@api.route("/chat/create-channel", methods=["POST"])
def create_channel():
    """
    Create a new chat channel for a book discussion.
    Requires: channel_id, book_title, member_ids (list of user IDs)
    """
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
    """
    Join an existing book discussion channel.
    """
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
    """
    Get all public book discussion channels.
    Returns channels with IDs starting with 'book-'
    """

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
    Create a new book channel or join if it already exists.
    Uses consistent channel ID based on book title.
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
    Create a new book channel or join if it already exists.
    Uses ISBN as the unique identifier for the channel.
    This ensures all users discussing the same book (by ISBN) join the same channel.
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
            "isbn": isbn,
        }), 200
        
    except Exception as e:
        return jsonify({"message": f"Error creating/joining channel: {str(e)}"}), 500

    
    #---RUTAS BIBLOTECA DE LIBROS---#


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

    user.library_books.remove(book)
    db.session.commit()

    return jsonify({"msg": "Book removed from library"}), 200


#----RUTAS DE CHAT CON IA----#

@api.route("/ai-chat", methods=["POST"])
def ai_chat():
    """
    Endpoint para chat con IA que recomienda libros.
    Usa streaming para enviar respuestas en tiempo real.
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
    
    # Verificar si Gemini está configurado
    gemini_api_key = os.getenv("GEMINI_API_KEY")
    if not gemini_api_key:
        return jsonify({"message": "GEMINI_API_KEY not configured"}), 500
    
    try:
        import google.generativeai as genai
        genai.configure(api_key=gemini_api_key)
        
        # Obtener historial de conversación si existe
        conversation_history = data.get("history", [])
        
        # Prompt del sistema: respuestas directas, sinopsis primero y luego datos del libro
        system_prompt = """Eres un asistente de recomendación de libros. Responde SIEMPRE en español, de forma directa y concisa.

FORMATO OBLIGATORIO para cada recomendación:
1) Sinopsis: un párrafo breve (2-4 frases) que resuma por qué ese libro encaja con lo que pide el usuario. Sin rodeos.
2) Línea separadora: escribe exactamente "---"
3) Datos del libro en líneas cortas:
   • Título: [nombre del libro]
   • Autor: [nombre]
   • Género: [género(s)]
   (Opcional: Año o páginas si aporta.)

No des introducciones largas. No repitas la pregunta del usuario. Ve al grano con la sinopsis y luego la ficha."""
        
        # Listar modelos disponibles y usar el primero que soporte generateContent
        try:
            available_models = genai.list_models()
            model_name = None
            
            # Buscar un modelo que soporte generateContent
            for m in available_models:
                if 'generateContent' in m.supported_generation_methods:
                    # Preferir modelos que contengan 'gemini' en el nombre
                    if 'gemini' in m.name.lower():
                        model_name = m.name
                        break
            
            # Si no encontramos uno con 'gemini', usar el primero disponible
            if model_name is None:
                for m in available_models:
                    if 'generateContent' in m.supported_generation_methods:
                        model_name = m.name
                        break
            
            if model_name is None:
                available_names = [m.name for m in available_models]
                raise Exception(f"No se encontró ningún modelo disponible que soporte generateContent. Modelos disponibles: {available_names}")
            
            # Crear el modelo usando el nombre completo (incluye 'models/')
            model = genai.GenerativeModel(model_name)
            
        except Exception as list_error:
            # Si falla listar modelos, intentar con nombres conocidos
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
        
        # Construir el contexto de la conversación
        conversation_text = system_prompt + "\n\n"
        
        # Agregar historial de conversación
        for msg in conversation_history:
            role = "Usuario" if msg.get("role") == "user" else "Asistente"
            conversation_text += f"{role}: {msg.get('content', '')}\n\n"
        
        # Agregar el mensaje actual del usuario
        conversation_text += f"Usuario: {user_message}\n\nAsistente:"
        
        # Crear stream de respuesta
        try:
            response = model.generate_content(
                conversation_text,
                stream=True,
                generation_config=genai.types.GenerationConfig(
                    temperature=0.6,
                    max_output_tokens=1024,
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
    Obtiene un libro aleatorio de Google Books API para la función "Sorpréndeme"
    """
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return jsonify({"message": "Missing or invalid Authorization header"}), 401
    
    token = auth_header.split(" ")[1]
    user_id = verify_token(token)
    
    if not user_id:
        return jsonify({"message": "Invalid or expired token"}), 401
    
    # Lista de términos de búsqueda aleatorios para obtener libros diversos
    search_terms = [
        "best seller", "novela", "ciencia ficción", "fantasía", "misterio", 
        "romance", "historia", "biografía", "aventura", "thriller",
        "literatura", "clásico", "contemporáneo", "drama", "comedia"
    ]
    
    # Seleccionar término aleatorio
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
        
        # Seleccionar un libro aleatorio de los resultados
        random_item = random.choice(items)
        vi = random_item.get("volumeInfo", {}) or {}
        img = (vi.get("imageLinks", {}) or {})
        
        # Obtener ISBN
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
            "language": vi.get("language")
        }
        
        return jsonify(book_data), 200
        
    except requests.RequestException as e:
        return jsonify({
            "message": "Error connecting to Google Books",
            "error": str(e)
        }), 502


