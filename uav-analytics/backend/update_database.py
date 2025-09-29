#!/usr/bin/env python3
"""
Скрипт для обновления схемы базы данных.
Добавляет новые колонки в таблицу flights в соответствии с российским стандартом.
"""

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
import os

# Настройки подключения к БД
DB_USER = os.getenv("POSTGRES_USER", "uav_user")
DB_PASSWORD = os.getenv("POSTGRES_PASSWORD", "strong_password")
DB_NAME = os.getenv("POSTGRES_DB", "uav_analytics")
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")

SQLALCHEMY_DATABASE_URL = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

def update_database():
    engine = create_engine(SQLALCHEMY_DATABASE_URL)
    
    with engine.connect() as connection:
        # Начинаем транзакцию
        trans = connection.begin()
        
        try:
            # Список новых колонок для добавления
            new_columns = [
                ("flight_id", "VARCHAR"),
                ("pilot_name", "VARCHAR"),
                ("pilot_license", "VARCHAR"),
                ("pilot_organization", "VARCHAR"),
                ("mission_type", "VARCHAR"),
                ("altitude_meters", "INTEGER"),
                ("weather_conditions", "VARCHAR"),
                ("flight_plan_approved", "VARCHAR"),
                ("emergency_landing", "VARCHAR DEFAULT 'false'")
            ]
            
            # Проверяем существующие колонки
            result = connection.execute(text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'flights' AND table_schema = 'public'
            """))
            
            existing_columns = {row[0] for row in result}
            
            # Добавляем недостающие колонки
            for column_name, column_type in new_columns:
                if column_name not in existing_columns:
                    print(f"Добавляем колонку: {column_name}")
                    if column_name == "emergency_landing":
                        connection.execute(text(f"""
                            ALTER TABLE flights 
                            ADD COLUMN {column_name} {column_type}
                        """))
                    else:
                        connection.execute(text(f"""
                            ALTER TABLE flights 
                            ADD COLUMN {column_name} {column_type}
                        """))
                else:
                    print(f"Колонка {column_name} уже существует")
            
            # Коммитим изменения
            trans.commit()
            print("База данных успешно обновлена!")
            
        except Exception as e:
            trans.rollback()
            print(f"Ошибка при обновлении базы данных: {e}")
            raise

if __name__ == "__main__":
    update_database()
