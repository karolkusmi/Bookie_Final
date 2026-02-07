from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import String, Boolean, Float, Text
from sqlalchemy.orm import Mapped, mapped_column
from werkzeug.security import generate_password_hash, check_password_hash
from sqlalchemy import String, Date, Time

db = SQLAlchemy()

user_event = db.Table(
    'user_event',
    db.Column('user_id', db.Integer, db.ForeignKey('user.id'), primary_key=True),
    db.Column('event_id', db.Integer, db.ForeignKey('event.id'), primary_key=True)
)

user_library = db.Table(
    "user_library",
    db.Column("user_id", db.Integer, db.ForeignKey("user.id"), primary_key=True),
    db.Column("book_isbn", db.String(20), db.ForeignKey("book.isbn"), primary_key=True),
)


class UserTop3(db.Model):
    """Top 3 favorite books per user. position in (1, 2, 3)."""
    __tablename__ = "user_top3"
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), primary_key=True)
    position = db.Column(db.Integer, primary_key=True)  # 1, 2, 3
    book_isbn = db.Column(db.String(20), db.ForeignKey("book.isbn"), nullable=True)

#---- USER MODEL ----#
class User(db.Model):
    __tablename__ = "user"
    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column(
        String(50),
        unique=True,
        nullable=False
        )
    email: Mapped[str] = mapped_column(
        String(120),
            unique=True,
            nullable=False)
    password: Mapped[str] = mapped_column(
        String(255),
        nullable=False)
    is_active: Mapped[bool] = mapped_column(
        Boolean(),
            nullable=False,
            default=True)
    image_avatar: Mapped[str] = mapped_column(
        String(500),
        nullable=True, default="https://res.cloudinary.com/dcmqxfpnd/image/upload/v1770140317/i9acwjupwp34xsegrzm6.jpg")
    # ISBN del libro que el usuario está leyendo actualmente en Home
    current_reading_isbn: Mapped[str] = mapped_column(
        String(20),
        db.ForeignKey("book.isbn"),
        nullable=True
    )
    about_text: Mapped[str] = mapped_column(Text, nullable=True, default="")
    favorite_genres: Mapped[str] = mapped_column(Text, nullable=True, default="[]")  # JSON array of strings

    events = db.relationship(
        "Event",
        secondary=user_event,
        back_populates="users"
    )

    library_books = db.relationship(
        "Book",
        secondary=user_library,
        lazy= "select",
        backref=db.backref("owners", lazy="select")
    )

    def normalize_isbn(isbn: str) -> str:
        return isbn.replace("-", "").replace(" ", "").upper()


    def set_password(self, password):
        self.password = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password, password)

    DEFAULT_AVATAR_URL = "https://res.cloudinary.com/dcmqxfpnd/image/upload/v1770140317/i9acwjupwp34xsegrzm6.jpg"

    def serialize(self):
        return {
            "id": str(self.id),
            "email": self.email,
            "username": self.username,
            "is_active": self.is_active,
            "image_avatar": self.image_avatar or self.DEFAULT_AVATAR_URL,
            "current_reading_isbn": self.current_reading_isbn,
        }

    def get_favorite_genres_list(self):
        if not self.favorite_genres:
            return []
        try:
            import json
            return json.loads(self.favorite_genres)
        except Exception:
            return []

#---- EVENT MODEL ----#

class Event(db.Model):
    __tablename__ = "event"

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(String(100), nullable=False)
    date = db.Column(Date, nullable=False)
    time = db.Column(Time, nullable=False)
    category = db.Column(String(50), nullable=False)
    location = db.Column(String(120), nullable=False)
    lat = db.Column(Float, nullable=True)
    lng = db.Column(Float, nullable=True)

    users = db.relationship(
        "User",
        secondary=user_event,
        back_populates="events"
    )

    def serialize(self):
        return {
            "id": self.id,
            "title": self.title,
            "date": self.date.isoformat(),
            "time": self.time.strftime("%H:%M"),
            "category": self.category,
            "location": self.location,
            "lat": self.lat,
            "lng": self.lng
        }

#---- BOOK MODEL ----#
class Book(db.Model):
    __tablename__ = "book"

    isbn =db.Column(db.String(20), primary_key=True)
    title = db.Column(db.String(255), nullable=False)
    author = db.Column(db.String(500))
    publisher = db.Column(db.String(50))
    thumbnail = db.Column(db.String(500))

    def serialize(self):
        return {
            "isbn": self.isbn,
            "title": self.title,
            "authors": self.author.split(";") if self.author else [],
            "publisher": self.publisher,
            "thumbnail": self.thumbnail
        }
