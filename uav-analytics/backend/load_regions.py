#!/usr/bin/env python3
"""
Скрипт для загрузки регионов из шейп-файла в базу данных.
"""

import os
import sys
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
import geopandas as gpd
from shapely.geometry import MultiPolygon, Polygon

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

def load_regions():
    """Загружает регионы из шейп-файла в базу данных"""
    
    # Путь к шейп-файлу
    shapefile_path = os.path.join(os.path.dirname(__file__), "..", "data", "admin_level_4.shp")
    
    if not os.path.exists(shapefile_path):
        print(f"Шейп-файл не найден: {shapefile_path}")
        return
    
    try:
        # Читаем шейп-файл
        print(f"Загружаем шейп-файл: {shapefile_path}")
        gdf = gpd.read_file(shapefile_path)
        
        # Проверяем CRS и преобразуем в WGS84 если нужно
        if gdf.crs != 'EPSG:4326':
            print(f"Преобразуем CRS из {gdf.crs} в EPSG:4326")
            gdf = gdf.to_crs('EPSG:4326')
        
        print(f"Найдено {len(gdf)} регионов")
        print(f"Колонки: {list(gdf.columns)}")
        
        # Создаем подключение к БД
        engine = create_engine(SQLALCHEMY_DATABASE_URL)
        Base.metadata.create_all(bind=engine)
        
        Session = sessionmaker(bind=engine)
        session = Session()
        
        try:
            # Очищаем существующие регионы
            session.query(Region).delete()
            
            # Определяем колонку с названием региона
            name_column = None
            possible_name_columns = ['name', 'NAME', 'region_name', 'admin_name', 'NAME_RU', 'NAME_EN']
            
            for col in possible_name_columns:
                if col in gdf.columns:
                    name_column = col
                    break
            
            if name_column is None:
                # Если нет подходящей колонки, используем индекс
                print("Не найдена колонка с названием, используем индексы")
                name_column = None
            
            # Загружаем регионы
            for idx, row in gdf.iterrows():
                # Получаем геометрию
                geom = row.geometry
                
                # Преобразуем в MultiPolygon если нужно
                if isinstance(geom, Polygon):
                    geom = MultiPolygon([geom])
                
                # Получаем название региона
                if name_column and name_column in row:
                    region_name = str(row[name_column])
                else:
                    region_name = f"Регион {idx + 1}"
                
                # Создаем объект региона
                region = Region(
                    id=idx + 1,
                    name=region_name,
                    geom=f"SRID=4326;{geom.wkt}"
                )
                
                session.add(region)
                
                if (idx + 1) % 100 == 0:
                    print(f"Обработано {idx + 1} регионов...")
            
            # Сохраняем изменения
            session.commit()
            print(f"Успешно загружено {len(gdf)} регионов в базу данных")
            
            # Проверяем результат
            count = session.query(Region).count()
            print(f"Всего регионов в базе: {count}")
            
        except Exception as e:
            session.rollback()
            print(f"Ошибка при загрузке регионов: {e}")
            raise
        finally:
            session.close()
            
    except Exception as e:
        print(f"Ошибка при чтении шейп-файла: {e}")
        print("Убедитесь, что установлены необходимые зависимости:")
        print("pip install geopandas")

def create_simple_regions():
    """Создает простые тестовые регионы для Москвы и области"""
    
    engine = create_engine(SQLALCHEMY_DATABASE_URL)
    Base.metadata.create_all(bind=engine)
    
    Session = sessionmaker(bind=engine)
    session = Session()
    
    try:
        # Очищаем существующие регионы
        session.query(Region).delete()
        
        # Создаем простые регионы для тестирования
        regions_data = [
            {
                'id': 1,
                'name': 'Москва',
                'bounds': (37.3, 55.5, 37.9, 55.9)  # min_lon, min_lat, max_lon, max_lat
            },
            {
                'id': 2, 
                'name': 'Московская область',
                'bounds': (35.0, 54.0, 40.0, 57.0)
            },
            {
                'id': 3,
                'name': 'Центральный регион',
                'bounds': (34.0, 53.0, 41.0, 58.0)
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
        print("Созданы тестовые регионы:")
        
        for region in session.query(Region).all():
            print(f"- {region.id}: {region.name}")
            
    except Exception as e:
        session.rollback()
        print(f"Ошибка при создании регионов: {e}")
        raise
    finally:
        session.close()

if __name__ == "__main__":
    print("Загрузка регионов в базу данных...")
    
    # Сначала пробуем загрузить из шейп-файла
    try:
        load_regions()
    except Exception as e:
        print(f"Не удалось загрузить из шейп-файла: {e}")
        print("Создаем простые тестовые регионы...")
        create_simple_regions()
