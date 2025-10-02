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
COPY ./init_regions.py /app/init_regions.py
COPY ./start.sh /app/start.sh

# Делаем скрипт исполняемым
RUN chmod +x /app/start.sh

# Запускаем через скрипт
CMD ["/bin/bash", "/app/start.sh"]