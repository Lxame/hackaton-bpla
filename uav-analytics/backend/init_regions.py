#!/usr/bin/env python3
"""
Скрипт инициализации регионов при запуске контейнера.
Создает простые тестовые регионы для демонстрации.
"""

import os
import sys
import time
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Добавляем путь к модулям приложения
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.models import Base, Region

# Настройки подключения к БД
DB_USER = os.getenv("POSTGRES_USER", "uav_user")
DB_PASSWORD = os.getenv("POSTGRES_PASSWORD", "strong_password")
DB_NAME = os.getenv("POSTGRES_DB", "uav_analytics")
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")

SQLALCHEMY_DATABASE_URL = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

def wait_for_db():
    """Ждем, пока база данных станет доступной"""
    max_retries = 30
    retry_count = 0
    
    while retry_count < max_retries:
        try:
            engine = create_engine(SQLALCHEMY_DATABASE_URL)
            engine.connect()
            print("База данных доступна!")
            return engine
        except Exception as e:
            retry_count += 1
            print(f"Попытка {retry_count}/{max_retries}: База данных недоступна, ждем... ({e})")
            time.sleep(2)
    
    raise Exception("Не удалось подключиться к базе данных")

def init_regions():
    """Инициализирует регионы в базе данных"""
    
    try:
        # Ждем доступности БД
        engine = wait_for_db()
        
        # Создаем таблицы
        Base.metadata.create_all(bind=engine)
        
        Session = sessionmaker(bind=engine)
        session = Session()
        
        try:
            # Проверяем, есть ли уже регионы
            existing_regions = session.query(Region).count()
            if existing_regions > 0:
                print(f"Регионы уже существуют ({existing_regions} шт.), пропускаем инициализацию")
                return
            
            # Создаем тестовые регионы для разных областей России
            regions_data = [
                {
                    'id': 1,
                    'name': 'Москва',
                    'bounds': (37.3, 55.5, 37.9, 55.9)
                },
                {
                    'id': 2, 
                    'name': 'Московская область',
                    'bounds': (35.0, 54.0, 40.0, 57.0)
                },
                {
                    'id': 3,
                    'name': 'Санкт-Петербург',
                    'bounds': (30.0, 59.7, 30.6, 60.1)
                },
                {
                    'id': 4,
                    'name': 'Ленинградская область',
                    'bounds': (28.0, 58.0, 33.0, 61.5)
                },
                {
                    'id': 5,
                    'name': 'Краснодарский край',
                    'bounds': (37.0, 44.0, 41.0, 47.0)
                },
                {
                    'id': 6,
                    'name': 'Свердловская область',
                    'bounds': (56.0, 56.0, 65.0, 62.0)
                },
                {
                    'id': 7,
                    'name': 'Новосибирская область',
                    'bounds': (75.0, 53.0, 85.0, 57.0)
                },
                {
                    'id': 8,
                    'name': 'Татарстан',
                    'bounds': (47.0, 54.5, 54.0, 56.5)
                }
            ]
            
            for region_data in regions_data:
                min_lon, min_lat, max_lon, max_lat = region_data['bounds']
                
                # Создаем прямоугольный полигон
                polygon_wkt = f"MULTIPOLYGON((({min_lon} {min_lat}, {max_lon} {min_lat}, {max_lon} {max_lat}, {min_lon} {max_lat}, {min_lon} {min_lat})))"
                
                region = Region(
                    id=region_data['id'],
                    name=region_data['name'],
                    geom=f"SRID=4326;{polygon_wkt}"
                )
                
                session.add(region)
            
            session.commit()
            print(f"Успешно создано {len(regions_data)} регионов:")
            
            for region in session.query(Region).all():
                print(f"- {region.id}: {region.name}")
                
        except Exception as e:
            session.rollback()
            print(f"Ошибка при создании регионов: {e}")
            raise
        finally:
            session.close()
            
    except Exception as e:
        print(f"Ошибка инициализации регионов: {e}")
        sys.exit(1)

if __name__ == "__main__":
    print("Инициализация регионов...")
    init_regions()
    print("Инициализация завершена!")
