# UAV Analytics

Система анализа полетов беспилотных летательных аппаратов с веб-интерфейсом для визуализации данных, аналитики и генерации отчетов.

## Архитектура

- **Backend**: FastAPI + PostgreSQL + PostGIS
- **Frontend**: React + Tailwind CSS + Recharts
- **База данных**: PostgreSQL с расширением PostGIS для работы с геоданными

## Возможности

### Дашборд
- Общая статистика по полетам
- Топ регионов по активности
- Быстрые действия

### Аналитика
- Динамика полетов по дням
- Рейтинг регионов
- Фильтрация по датам и регионам
- Экспорт графиков в PNG/JPEG

### Отчеты
- Генерация аналитических отчетов
- Экспорт в PDF и Excel
- Настраиваемые параметры отчета
- Предварительный просмотр

### Загрузка данных
- Загрузка данных о полетах в формате JSON
- Валидация данных в соответствии с российским стандартом
- Drag & Drop интерфейс для файлов
- Поддержка вставки JSON текста
- Автоматическое определение регионов по координатам

### Реестр полетов
- Просмотр всех загруженных полетов
- Детальная информация о каждом полете
- Фильтрация по регионам, пилотам, типам БПЛА
- Экспорт данных в CSV
- Поиск по ID полета, пилоту, типу БПЛА

## Запуск приложения

### Вариант 1: Docker Compose (рекомендуется)

```bash
# Запуск всех сервисов
docker-compose up --build

# Приложение будет доступно по адресам:
# Frontend: http://localhost:3000
# Backend API: http://localhost:8000
# API документация: http://localhost:8000/docs
```

### Вариант 2: Локальный запуск

#### Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

#### Frontend
```bash
cd frontend
npm install
npm start
```

## API Endpoints

### Основные эндпоинты:

- `GET /` - Проверка статуса сервиса
- `POST /flights/upload` - Загрузка данных о полетах
- `GET /flights` - Получение списка полетов
- `GET /analytics/rating/regions` - Рейтинг регионов по полетам
- `GET /analytics/dynamics` - Динамика полетов по дням

### Параметры запросов:

#### `/analytics/rating/regions`
- `limit` (int, optional): Количество регионов в рейтинге (по умолчанию 10)
- `start_date` (date, optional): Дата начала периода
- `end_date` (date, optional): Дата окончания периода

#### `/analytics/dynamics`
- `start_date` (date, required): Дата начала периода
- `end_date` (date, required): Дата окончания периода
- `region_id` (int, optional): ID региона для фильтрации

#### `/flights/upload`
Формат JSON для загрузки данных о полетах в соответствии с российским стандартом:

```json
{
  "flights": [
    {
      "flight_id": "UAV001",
      "drone_type": "Mavic 3",
      "takeoff_datetime": "2024-01-15T10:30:00",
      "landing_datetime": "2024-01-15T11:15:00",
      "takeoff_coordinates": "55.7558,37.6176",
      "landing_coordinates": "55.7658,37.6276",
      "pilot_info": {
        "name": "Иванов И.И.",
        "license": "UAV-PILOT-12345",
        "organization": "ООО Аэрофото"
      },
      "mission_type": "Аэрофотосъемка",
      "altitude_meters": 120,
      "weather_conditions": "Ясно, ветер 3 м/с",
      "flight_plan_approved": true,
      "emergency_landing": false
    }
  ]
}
```

**Обязательные поля:**
- `drone_type` - тип беспилотного летательного аппарата
- `takeoff_datetime` - время взлета (ISO 8601)
- `landing_datetime` - время посадки (ISO 8601)
- `takeoff_coordinates` - координаты взлета ("широта,долгота")
- `landing_coordinates` - координаты посадки ("широта,долгота")

**Опциональные поля:**
- `flight_id` - уникальный идентификатор полета
- `pilot_info` - информация о пилоте
- `mission_type` - тип миссии
- `altitude_meters` - высота полета в метрах
- `weather_conditions` - погодные условия
- `flight_plan_approved` - утверждение плана полета
- `emergency_landing` - аварийная посадка

## Структура проекта

```
uav-analytics/
├── backend/                 # FastAPI backend
│   ├── app/
│   │   ├── main.py         # Основное приложение
│   │   ├── models.py       # Модели данных
│   │   ├── database.py     # Настройки БД
│   │   └── parsing.py      # Парсинг данных
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/               # React frontend
│   ├── src/
│   │   ├── components/     # React компоненты
│   │   ├── pages/         # Страницы приложения
│   │   ├── services/      # API сервисы
│   │   └── utils/         # Утилиты
│   ├── public/
│   ├── Dockerfile
│   └── package.json
├── data/                   # Геоданные регионов
│   └── admin_level_4.*    # Shapefile с границами регионов
├── docker-compose.yml
└── README.md
```

## Технологии

### Backend
- **FastAPI** - современный веб-фреймворк для Python
- **SQLAlchemy** - ORM для работы с базой данных
- **PostgreSQL** - реляционная база данных
- **PostGIS** - расширение для работы с геоданными
- **GeoAlchemy2** - интеграция PostGIS с SQLAlchemy

### Frontend
- **React** - библиотека для создания пользовательских интерфейсов
- **Tailwind CSS** - utility-first CSS фреймворк
- **Recharts** - библиотека для создания графиков
- **React Router** - маршрутизация
- **Axios** - HTTP клиент
- **jsPDF** - генерация PDF отчетов
- **XLSX** - экспорт в Excel

## Разработка

### Добавление новых эндпоинтов

1. Определите модель данных в `backend/app/models.py`
2. Создайте эндпоинт в `backend/app/main.py`
3. Обновите frontend для работы с новым API

### Добавление новых страниц

1. Создайте компонент в `frontend/src/pages/`
2. Добавьте маршрут в `frontend/src/App.js`
3. Обновите навигацию в `frontend/src/components/Layout.js`

## Лицензия

MIT License
