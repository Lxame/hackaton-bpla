#!/bin/bash
echo "Инициализация регионов..."
python init_regions.py
echo "Запуск сервера..."
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
