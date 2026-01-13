from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import String, Boolean
from sqlalchemy.orm import Mapped, mapped_column
from werkzeug.security import generate_password_hash, check_password_hash

db = SQLAlchemy()

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
    
    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def serialize(self):
        return {
            "id": self.id,
            "email": self.email,
            # do not serialize the password, its a security breach
        }