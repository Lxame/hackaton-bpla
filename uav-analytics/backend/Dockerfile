# backend/Dockerfile
FROM python:3.10-slim

WORKDIR /app

# Устанавливаем системные зависимости для psycopg2 и geoalchemy2
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY ./requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir --upgrade -r /app/requirements.txt

COPY ./app /app/app

# Uvicorn будет запускать наше приложение
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]