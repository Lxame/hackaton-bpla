# UAV Analytics - Настройка и запуск

## Требования

- Docker и Docker Compose
- Node.js 16+ (для разработки фронтенда)
- Python 3.9+ (для разработки бекенда)

## Быстрый старт с Docker

1. **Запуск всех сервисов:**
   ```bash
   cd uav-analytics
   docker-compose up --build
   ```

2. **Доступ к приложению:**
   - Фронтенд: http://localhost:3000
   - Бекенд API: http://localhost:8000
   - База данных: localhost:5432

## Разработка

### Бекенд

1. **Установка зависимостей:**
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

2. **Настройка переменных окружения:**
   ```bash
   export POSTGRES_USER=uav_user
   export POSTGRES_PASSWORD=strong_password
   export POSTGRES_DB=uav_analytics
   export DB_HOST=localhost
   ```

3. **Запуск сервера разработки:**
   ```bash
   cd backend
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

### Фронтенд

1. **Установка зависимостей:**
   ```bash
   cd frontend
   npm install
   ```

2. **Настройка переменных окружения:**
   Создайте файл `.env` в папке `frontend/`:
   ```env
   REACT_APP_API_URL=http://localhost:8000
   REACT_APP_ENV=development
   REACT_APP_ENABLE_DEBUG=true
   ```

3. **Запуск сервера разработки:**
   ```bash
   cd frontend
   npm start
   ```

## API Эндпоинты

### Полеты
- `POST /api/flights/upload` - Загрузка данных о полетах
- `GET /api/flights` - Получение списка полетов

### Аналитика
- `GET /api/analytics/rating/regions` - Рейтинг регионов по полетам
- `GET /api/analytics/dynamics` - Динамика полетов по дням

## Структура данных для загрузки

Пример JSON файла для загрузки полетов:

```json
{
  "flights": [
    {
      "drone_type": "Mavic 3",
      "takeoff_datetime": "2024-01-15T10:30:00",
      "landing_datetime": "2024-01-15T11:15:00",
      "takeoff_coordinates": "55.7558,37.6176",
      "landing_coordinates": "55.7658,37.6276"
    }
  ]
}
```

### Обязательные поля:
- `drone_type` - тип беспилотника
- `takeoff_datetime` - время взлета (ISO 8601)
- `landing_datetime` - время посадки (ISO 8601)
- `takeoff_coordinates` - координаты взлета (широта,долгота)
- `landing_coordinates` - координаты посадки (широта,долгота)

## Функциональность

### Загрузка данных
- Поддержка JSON файлов и прямого ввода
- Автоматическая валидация данных
- Геопривязка к регионам
- Вычисление длительности полетов

### Дашборд
- Общая статистика полетов
- Топ регионов по активности
- Обновление данных в реальном времени

### Аналитика
- Динамика полетов по дням
- Рейтинг регионов
- Фильтрация по датам и регионам
- Экспорт данных

### Реестр полетов
- Просмотр всех полетов
- Фильтрация и поиск
- Детальная информация о полетах
- Экспорт в CSV

## Устранение неполадок

### Проблемы с Docker
1. Убедитесь, что Docker Desktop запущен
2. Проверьте доступность портов 3000, 8000, 5432
3. Очистите кэш Docker: `docker system prune`

### Проблемы с API
1. Проверьте, что бекенд запущен на порту 8000
2. Убедитесь, что база данных доступна
3. Проверьте логи контейнеров: `docker-compose logs`

### Проблемы с фронтендом
1. Убедитесь, что переменные окружения настроены правильно
2. Проверьте консоль браузера на наличие ошибок
3. Очистите кэш браузера и npm: `npm start -- --reset-cache`
