# backend/app/database.py

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import os

# Используем переменные окружения для настроек, а не хардкод
DB_USER = os.getenv("POSTGRES_USER", "uav_user")
DB_PASSWORD = os.getenv("POSTGRES_PASSWORD", "strong_password")
DB_NAME = os.getenv("POSTGRES_DB", "uav_analytics")
DB_HOST = os.getenv("DB_HOST", "db") # 'db' - это имя сервиса в docker-compose
DB_PORT = os.getenv("DB_PORT", "5432")

SQLALCHEMY_DATABASE_URL = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()