# backend/app/main.py

from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import func, Date # <-- ДОБАВИТЬ ЭТОТ ИМПОРТ
from geoalchemy2.shape import from_shape
from shapely.geometry import Point
from typing import List, Optional
from datetime import date, timedelta # Добавим импорт date

from . import models
from .database import engine, get_db

models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="UAV Flight Analytics Service",
    description="Сервис для анализа полетов гражданских беспилотников"
)

# Настройка CORS для работы с frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://frontend:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# +++ НАЧАЛО НОВОЙ ФУНКЦИИ +++
def find_region_for_point(db: Session, point_geom):
    """
    Находит ID региона, в котором находится заданная точка.
    """
    # Выполняем пространственный запрос с помощью функции PostGIS ST_Contains
    region = db.query(models.Region.id).filter(
        func.ST_Contains(models.Region.geom, point_geom)
    ).first()
    
    if region:
        return region.id
    return None
# +++ КОНЕЦ НОВОЙ ФУНКЦИИ +++


@app.post("/flights/upload", status_code=status.HTTP_201_CREATED)
def upload_flights(request: models.FlightUploadRequest, db: Session = Depends(get_db)):
    """
    Принимает пакет данных о полетах, валидирует, геопривязывает и сохраняет в БД.
    """
    new_flights_count = 0
    processed_flights = []

    for flight_data in request.flights:
        lat, lon = flight_data.parsed_takeoff_coords
        takeoff_point_geom = f'SRID=4326;POINT({lon} {lat})' # Используем WKT-представление
        
        lat_l, lon_l = flight_data.parsed_landing_coords
        landing_point_geom = f'SRID=4326;POINT({lon_l} {lat_l})'

        # --- ИЗМЕНЕНИЯ ЗДЕСЬ ---
        # Находим регион для точки взлета
        region_id = find_region_for_point(db, takeoff_point_geom)
        
        db_flight = models.Flight(
            drone_type=flight_data.drone_type,
            takeoff_time=flight_data.takeoff_datetime,
            landing_time=flight_data.landing_datetime,
            duration_minutes=flight_data.duration_minutes,
            takeoff_point=takeoff_point_geom,
            landing_point=landing_point_geom,
            region_id=region_id,
        )
        processed_flights.append(db_flight)

    db.add_all(processed_flights)
    new_flights_count = len(processed_flights)
    
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save flights to database: {e}"
        )

    return {"message": f"Successfully processed and saved {new_flights_count} flights."}

@app.get("/analytics/rating/regions", response_model=models.RegionRatingResponse)
def get_region_rating(
    limit: int = 10,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db)
):
    """
    Возвращает рейтинг регионов по количеству полетов.
    Можно фильтровать по дате.
    """
    # Начинаем строить запрос
    query = db.query(
        models.Region.id.label("region_id"),
        models.Region.name.label("region_name"),
        func.count(models.Flight.id).label("flight_count")
    ).join(models.Flight, models.Region.id == models.Flight.region_id)

    # Применяем фильтры по дате, если они заданы
    if start_date:
        query = query.filter(models.Flight.takeoff_time >= start_date)
    if end_date:
        # Добавляем 1 день к end_date, чтобы включить весь день
        query = query.filter(models.Flight.takeoff_time < end_date + timedelta(days=1))

    # Группируем, сортируем и ограничиваем результат
    rating_data = query.group_by(
        models.Region.id,
        models.Region.name
    ).order_by(
        func.count(models.Flight.id).desc()
    ).limit(limit).all()

    # Считаем общее количество полетов за период
    total_flights_query = db.query(func.count(models.Flight.id))
    if start_date:
        total_flights_query = total_flights_query.filter(models.Flight.takeoff_time >= start_date)
    if end_date:
        total_flights_query = total_flights_query.filter(models.Flight.takeoff_time < end_date + timedelta(days=1))
    
    total_flights = total_flights_query.scalar()

    return {"total_flights": total_flights, "rating": rating_data}


@app.get("/analytics/dynamics", response_model=models.FlightDynamicsResponse)
def get_flight_dynamics(
    start_date: date,
    end_date: date,
    region_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """
    Возвращает динамику количества полетов по дням.
    Можно фильтровать по конкретному региону.
    """
    # Кастуем timestamp к дате для группировки
    flight_date = func.cast(models.Flight.takeoff_time, Date).label("date")
    
    query = db.query(
        flight_date,
        func.count(models.Flight.id).label("flight_count")
    ).filter(
        models.Flight.takeoff_time >= start_date
    ).filter(
        models.Flight.takeoff_time < end_date + timedelta(days=1)
    )

    # Если указан регион, добавляем фильтр
    if region_id:
        query = query.filter(models.Flight.region_id == region_id)
    
    dynamics_data = query.group_by(flight_date).order_by(flight_date).all()
    
    # Конвертируем дату в строку для JSON-ответа
    result_data = [
        {"date": str(row.date), "flight_count": row.flight_count} 
        for row in dynamics_data
    ]

    return {"data": result_data}

@app.get("/flights", response_model=List[dict])
def get_flights(
    limit: int = 100,
    offset: int = 0,
    region_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """
    Получить список полетов с возможностью фильтрации.
    """
    query = db.query(models.Flight)
    
    if region_id:
        query = query.filter(models.Flight.region_id == region_id)
    
    flights = query.offset(offset).limit(limit).all()
    
    result = []
    for flight in flights:
        result.append({
            "id": flight.id,
            "drone_type": flight.drone_type,
            "takeoff_time": flight.takeoff_time,
            "landing_time": flight.landing_time,
            "duration_minutes": flight.duration_minutes,
            "region_id": flight.region_id
        })
    
    return result

@app.get("/")
def read_root():
    return {"status": "Service is running"}