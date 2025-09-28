# backend/app/main.py

from fastapi import FastAPI, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func # <-- ДОБАВИТЬ ЭТОТ ИМПОРТ
from geoalchemy2.shape import from_shape
from shapely.geometry import Point

from . import models
from .database import engine, get_db

models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="UAV Flight Analytics Service",
    description="Сервис для анализа полетов гражданских беспилотников"
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
            region_id=region_id, # <-- ПРИСВАИВАЕМ НАЙДЕННЫЙ ID
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

@app.get("/")
def read_root():
    return {"status": "Service is running"}