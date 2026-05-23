from sqlalchemy import select

from app.config import get_settings
from app.database import SessionLocal
from app.models import User
from app.security import hash_password


def ensure_bootstrap_users() -> None:
    settings = get_settings()
    db = SessionLocal()
    try:
        admin = db.scalar(select(User).where(User.email == settings.bootstrap_admin_email.lower()))
        if admin is None:
            db.add(
                User(
                    email=settings.bootstrap_admin_email.lower(),
                    password_hash=hash_password(settings.bootstrap_admin_password),
                    display_name="Admin",
                    role="admin",
                )
            )
        reviewer_email = "reviewer@example.com"
        reviewer = db.scalar(select(User).where(User.email == reviewer_email))
        if reviewer is None:
            db.add(
                User(
                    email=reviewer_email,
                    password_hash=hash_password("changeme-reviewer"),
                    display_name="Demo Reviewer",
                    role="reviewer",
                )
            )
        db.commit()
    finally:
        db.close()
