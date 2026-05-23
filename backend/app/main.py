from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.bootstrap import ensure_bootstrap_users
from app.config import get_settings
from app.database import Base, engine
from app.routers import admin, auth, readmission
from app.schemas import HealthOut


@asynccontextmanager
async def lifespan(_app: FastAPI):
    settings = get_settings()
    if settings.auto_create_tables:
        Base.metadata.create_all(bind=engine)
    ensure_bootstrap_users()
    yield


settings = get_settings()
origins = [o.strip() for o in settings.cors_origins.split(",") if o.strip()]

app = FastAPI(title="Readmission Factors API", version="0.1.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(readmission.router)
app.include_router(admin.router)


@app.get("/health", response_model=HealthOut)
def health() -> HealthOut:
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        db_status = "ok"
    except Exception as exc:  # noqa: BLE001
        db_status = f"error: {exc}"
    return HealthOut(status="ok", database=db_status)
