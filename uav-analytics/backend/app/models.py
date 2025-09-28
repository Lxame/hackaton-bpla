# backend/app/models.py

from sqlalchemy import create_engine, Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import declarative_base, relationship
from geoalchemy2 import Geometry
from pydantic import BaseModel, validator, root_validator
from typing import List
from datetime import datetime, timedelta

from .parsing import parse_coordinates

# --- SQLAlchemy Models (для базы данных) ---

Base = declarative_base()

class Region(Base):
    __tablename__ = 'regions'
    id = Column(Integer, primary_key=True)
    name = Column(String(255), nullable=False)
    geom = Column(Geometry('MULTIPOLYGON', srid=4326), nullable=False)
    flights = relationship("Flight", back_populates="region")

class Flight(Base):
    __tablename__ = 'flights'
    id = Column(Integer, primary_key=True, index=True)
    drone_type = Column(String, nullable=True)
    takeoff_point = Column(Geometry('POINT', srid=4326), nullable=False)
    landing_point = Column(Geometry('POINT', srid=4326), nullable=False)
    takeoff_time = Column(DateTime(timezone=True), nullable=False)
    landing_time = Column(DateTime(timezone=True), nullable=False)
    duration_minutes = Column(Integer, nullable=False)
    
    region_id = Column(Integer, ForeignKey('regions.id'), nullable=True)
    region = relationship("Region", back_populates="flights")

# --- Pydantic Models (для API) ---

class FlightRecordIn(BaseModel):
    drone_type: str
    takeoff_coords: str
    landing_coords: str
    takeoff_datetime: datetime
    landing_datetime: datetime
    
    # Эти поля будут вычислены, а не приняты из JSON
    parsed_takeoff_coords: tuple[float, float] = None
    parsed_landing_coords: tuple[float, float] = None
    duration_minutes: int = None
    
    # Валидатор для координат взлета
    @validator('takeoff_coords')
    def validate_takeoff_coords(cls, v):
        coords = parse_coordinates(v)
        if coords is None:
            raise ValueError(f"Invalid takeoff coordinates format: {v}")
        return v # Возвращаем исходную строку, а результат парсинга сохраним в root_validator
    
    # Валидатор для координат посадки
    @validator('landing_coords')
    def validate_landing_coords(cls, v):
        coords = parse_coordinates(v)
        if coords is None:
            raise ValueError(f"Invalid landing coordinates format: {v}")
        return v
    
    # Валидатор, который работает со всей моделью после индивидуальных валидаторов
    @root_validator(pre=False, skip_on_failure=True)
    def calculate_derived_fields(cls, values):
        # Парсим координаты и сохраняем в специальные поля
        values['parsed_takeoff_coords'] = parse_coordinates(values.get('takeoff_coords'))
        values['parsed_landing_coords'] = parse_coordinates(values.get('landing_coords'))
        
        # Вычисляем длительность полета в минутах, это надежнее, чем верить полю 'flight_duration'
        takeoff_dt = values.get('takeoff_datetime')
        landing_dt = values.get('landing_datetime')
        
        if landing_dt < takeoff_dt:
            raise ValueError("Landing datetime cannot be earlier than takeoff datetime")
            
        duration = landing_dt - takeoff_dt
        values['duration_minutes'] = int(duration.total_seconds() / 60)
        
        return values

class FlightUploadRequest(BaseModel):
    flights: List[FlightRecordIn]

# Модель для одного элемента в рейтинге регионов
class RegionStat(BaseModel):
    region_id: int
    region_name: str
    flight_count: int

    class Config:
        orm_mode = True # Позволяет Pydantic работать с объектами SQLAlchemy

# Модель для ответа с рейтингом регионов
class RegionRatingResponse(BaseModel):
    total_flights: int
    rating: List[RegionStat]

# Модель для одной точки во временном ряду
class TimeSeriesPoint(BaseModel):
    date: str # Будем возвращать дату в формате 'YYYY-MM-DD'
    flight_count: int

# Модель для ответа с временным рядом
class FlightDynamicsResponse(BaseModel):
    data: List[TimeSeriesPoint]