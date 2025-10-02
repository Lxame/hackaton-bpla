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
def find_region_for_point(db: Session, point_wkt):
    """
    Находит ID региона, в котором находится заданная точка.
    """
    try:
        # Выполняем пространственный запрос с помощью функции PostGIS ST_Contains
        # Используем ST_GeomFromText для преобразования WKT в геометрию
        region = db.query(models.Region.id, models.Region.name).filter(
            func.ST_Contains(models.Region.geom, func.ST_GeomFromText(point_wkt))
        ).first()
        
        if region:
            return region.id
        
        # Если точное попадание не найдено, ищем ближайший регион
        nearest_region = db.query(
            models.Region.id, 
            models.Region.name,
            func.ST_Distance(models.Region.geom, func.ST_GeomFromText(point_wkt)).label('distance')
        ).order_by('distance').first()
        
        if nearest_region:
            return nearest_region.id
            
    except Exception as e:
        print(f"Ошибка при поиске региона для точки {point_wkt}: {e}")
    
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

# Aliases under /api for frontend proxy consistency
@app.post("/api/flights/upload", status_code=status.HTTP_201_CREATED)
def upload_flights_api_alias(request: models.FlightUploadRequest, db: Session = Depends(get_db)):
    return upload_flights(request, db)

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

@app.get("/api/flights", response_model=List[dict])
def get_flights_api_alias(
    limit: int = 100,
    offset: int = 0,
    region_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    return get_flights(limit=limit, offset=offset, region_id=region_id, db=db)

# API aliases for analytics endpoints
@app.get("/api/analytics/rating/regions", response_model=models.RegionRatingResponse)
def get_region_rating_api_alias(
    limit: int = 10,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db)
):
    return get_region_rating(limit=limit, start_date=start_date, end_date=end_date, db=db)

@app.get("/api/analytics/dynamics", response_model=models.FlightDynamicsResponse)
def get_flight_dynamics_api_alias(
    start_date: date,
    end_date: date,
    region_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    return get_flight_dynamics(start_date=start_date, end_date=end_date, region_id=region_id, db=db)

@app.get("/regions")
def get_regions(db: Session = Depends(get_db)):
    """
    Возвращает список всех регионов.
    """
    regions = db.query(models.Region.id, models.Region.name).all()
    return [{"id": r.id, "name": r.name} for r in regions]

@app.get("/api/regions")
def get_regions_api_alias(db: Session = Depends(get_db)):
    return get_regions(db)

@app.get("/reports/generate")
def generate_report(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    region_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """
    Генерирует подробный отчет по полетам.
    """
    try:
        # Определяем период по умолчанию (последние 30 дней)
        if not start_date:
            start_date = date.today() - timedelta(days=30)
        if not end_date:
            end_date = date.today()
        
        # Базовый запрос полетов
        flights_query = db.query(models.Flight)
        
        # Применяем фильтры
        flights_query = flights_query.filter(models.Flight.takeoff_time >= start_date)
        flights_query = flights_query.filter(models.Flight.takeoff_time < end_date + timedelta(days=1))
        
        if region_id:
            flights_query = flights_query.filter(models.Flight.region_id == region_id)
        
        flights = flights_query.all()
        
        # Получаем статистику по регионам
        region_stats_query = db.query(
            models.Region.id.label("region_id"),
            models.Region.name.label("region_name"),
            func.count(models.Flight.id).label("flight_count"),
            func.avg(models.Flight.duration_minutes).label("avg_duration"),
            func.sum(models.Flight.duration_minutes).label("total_duration")
        ).join(models.Flight, models.Region.id == models.Flight.region_id)
        
        # Применяем те же фильтры
        region_stats_query = region_stats_query.filter(models.Flight.takeoff_time >= start_date)
        region_stats_query = region_stats_query.filter(models.Flight.takeoff_time < end_date + timedelta(days=1))
        
        if region_id:
            region_stats_query = region_stats_query.filter(models.Flight.region_id == region_id)
        
        region_stats = region_stats_query.group_by(
            models.Region.id, models.Region.name
        ).order_by(func.count(models.Flight.id).desc()).all()
        
        # Статистика по типам дронов
        drone_stats = db.query(
            models.Flight.drone_type,
            func.count(models.Flight.id).label("count"),
            func.avg(models.Flight.duration_minutes).label("avg_duration")
        ).filter(models.Flight.takeoff_time >= start_date).filter(
            models.Flight.takeoff_time < end_date + timedelta(days=1)
        )
        
        if region_id:
            drone_stats = drone_stats.filter(models.Flight.region_id == region_id)
        
        drone_stats = drone_stats.group_by(models.Flight.drone_type).order_by(
            func.count(models.Flight.id).desc()
        ).all()
        
        # Динамика по дням
        flight_date = func.cast(models.Flight.takeoff_time, Date).label("date")
        daily_stats = db.query(
            flight_date,
            func.count(models.Flight.id).label("flight_count"),
            func.avg(models.Flight.duration_minutes).label("avg_duration")
        ).filter(models.Flight.takeoff_time >= start_date).filter(
            models.Flight.takeoff_time < end_date + timedelta(days=1)
        )
        
        if region_id:
            daily_stats = daily_stats.filter(models.Flight.region_id == region_id)
        
        daily_stats = daily_stats.group_by(flight_date).order_by(flight_date).all()
        
        # Формируем отчет
        report = {
            "report_info": {
                "generated_at": datetime.now().isoformat(),
                "period": {
                    "start_date": start_date.isoformat(),
                    "end_date": end_date.isoformat()
                },
                "region_filter": region_id
            },
            "summary": {
                "total_flights": len(flights),
                "total_duration_hours": sum(f.duration_minutes for f in flights) / 60 if flights else 0,
                "avg_duration_minutes": sum(f.duration_minutes for f in flights) / len(flights) if flights else 0,
                "unique_regions": len(region_stats),
                "unique_drone_types": len(drone_stats)
            },
            "regions_analysis": [
                {
                    "region_id": r.region_id,
                    "region_name": r.region_name,
                    "flight_count": r.flight_count,
                    "avg_duration_minutes": round(float(r.avg_duration), 2) if r.avg_duration else 0,
                    "total_duration_hours": round(float(r.total_duration) / 60, 2) if r.total_duration else 0
                }
                for r in region_stats
            ],
            "drone_types_analysis": [
                {
                    "drone_type": d.drone_type,
                    "flight_count": d.count,
                    "avg_duration_minutes": round(float(d.avg_duration), 2) if d.avg_duration else 0
                }
                for d in drone_stats
            ],
            "daily_dynamics": [
                {
                    "date": str(d.date),
                    "flight_count": d.flight_count,
                    "avg_duration_minutes": round(float(d.avg_duration), 2) if d.avg_duration else 0
                }
                for d in daily_stats
            ]
        }
        
        return report
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка генерации отчета: {str(e)}"
        )

@app.get("/api/reports/generate")
def generate_report_api_alias(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    region_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    return generate_report(start_date=start_date, end_date=end_date, region_id=region_id, db=db)

@app.get("/")
def read_root():
    return {"status": "Service is running"}