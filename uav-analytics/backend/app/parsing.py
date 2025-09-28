import re
from typing import Optional

def parse_dms(coord_str: str) -> Optional[float]:
    """
    Парсит координату в формате ГГММСС (DDMMSS) в десятичные градусы.
    Пример: '523745' -> 52.629166...
    """
    try:
        degrees = int(coord_str[0:2])
        minutes = int(coord_str[2:4])
        seconds = int(coord_str[4:6])
        return degrees + minutes / 60 + seconds / 3600
    except (ValueError, IndexError):
        return None

def parse_dm(coord_str: str) -> Optional[float]:
    """
    Парсит координату в формате ГГММ (DDMM) в десятичные градусы.
    Пример: '6031' -> 60.516666...
    """
    try:
        degrees = int(coord_str[0:2])
        minutes = int(coord_str[2:4])
        return degrees + minutes / 60
    except (ValueError, IndexError):
        return None

def parse_coordinates(coords_str: str) -> Optional[tuple[float, float]]:
    """
    Главная функция-парсер. Определяет формат и возвращает (широта, долгота).
    Поддерживает форматы:
    1. 523745С1035519В (ГГММСС)
    2. 6031N10932E (ГГММ)
    """
    coords_str = coords_str.upper().strip()

    # Попробуем формат ГГММСС (DDMMSS) с русскими буквами
    match = re.match(r'^(\d{6})([СЮNS])(\d{6,7})([ВЗEW])$', coords_str)
    if match:
        lat_str, lat_hem, lon_str, lon_hem = match.groups()
        lat = parse_dms(lat_str)
        # Для долготы может быть 7 знаков (100+ градусов)
        lon = parse_dms(lon_str.zfill(8)[-6:]) # Берем последние 6 цифр для ГГММСС
        if lon_str.startswith('1'): # Простая проверка на долготу > 99
            lon_deg = int(lon_str[:3])
            lon_min = int(lon_str[3:5])
            lon_sec = int(lon_str[5:])
            lon = lon_deg + lon_min / 60 + lon_sec / 3600
        
        if lat is None or lon is None:
            return None

        if lat_hem in ('С', 'N'):
            pass
        elif lat_hem in ('Ю', 'S'):
            lat = -lat
        
        if lon_hem in ('В', 'E'):
            pass
        elif lon_hem in ('З', 'W'):
            lon = -lon
        
        return lat, lon

    # Попробуем формат ГГММ (DDMM) с английскими буквами
    match = re.match(r'^(\d{4})([NS])(\d{5})([EW])$', coords_str)
    if match:
        lat_str, lat_hem, lon_str, lon_hem = match.groups()
        lat = parse_dm(lat_str)
        lon = parse_dm(lon_str[-4:]) # Берем последние 4 цифры
        if lon_str.startswith('1'):
             lon_deg = int(lon_str[:3])
             lon_min = int(lon_str[3:])
             lon = lon_deg + lon_min / 60

        if lat is None or lon is None:
            return None

        if lat_hem == 'N':
            pass
        elif lat_hem == 'S':
            lat = -lat
        
        if lon_hem == 'E':
            pass
        elif lon_hem == 'W':
            lon = -lon
        
        return lat, lon

    return None

# Пример использования для проверки
if __name__ == '__main__':
    coord1 = "523745С1035519В"
    coord2 = "6031N10932E"
    print(f"{coord1} -> {parse_coordinates(coord1)}")
    print(f"{coord2} -> {parse_coordinates(coord2)}")