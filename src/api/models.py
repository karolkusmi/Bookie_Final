from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import String, Boolean
from sqlalchemy.orm import Mapped, mapped_column
from werkzeug.security import generate_password_hash, check_password_hash
from sqlalchemy import String, Date, Time

db = SQLAlchemy()

user_event = db.Table(
    'user_event',
    db.Column('user_id', db.Integer, db.ForeignKey('user.id'), primary_key=True),
    db.Column('event_id', db.Integer, db.ForeignKey('event.id'), primary_key=True)
)

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
    
    events = db.relationship(
        "Event",
        secondary=user_event,
        back_populates="users"
    )
    
    def set_password(self, password):
        self.password = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password, password)

    def serialize(self):
        return {
            "id": self.id,
            "email": self.email,
            # do not serialize the password, its a security breach
        }
    
    
class Event(db.Model):
    __tablename__ = "event"

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(String(100), nullable=False)
    date = db.Column(Date, nullable=False)
    time = db.Column(Time, nullable=False)
    category = db.Column(String(50), nullable=False)
    location = db.Column(String(120), nullable=False)

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
            "location": self.location
        }