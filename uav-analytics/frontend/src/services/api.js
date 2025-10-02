// API service для связи с бекендом UAV Analytics
import axios from 'axios';
import config from '../config/environment';

// Базовый URL для API
const API_BASE_URL = config.API_URL;

// Создаем экземпляр axios с базовой конфигурацией
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: config.API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Интерцептор для обработки ошибок
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// API методы для работы с полетами
export const flightsAPI = {
  // Загрузка данных о полетах
  upload: (flightData) => api.post('/api/flights/upload', flightData),
  
  // Получение списка полетов
  getFlights: (params = {}) => api.get('/api/flights', { params }),
  
  // Получение полета по ID
  getFlight: (id) => api.get(`/flights/${id}`),
};

// API методы для аналитики
export const analyticsAPI = {
  // Рейтинг регионов по количеству полетов
  getRegionRating: (params = {}) => api.get('/api/analytics/rating/regions', { params }),
  
  // Динамика полетов по дням
  getFlightDynamics: (params = {}) => api.get('/api/analytics/dynamics', { params }),
};

// API методы для отчетов
export const reportsAPI = {
  // Генерация подробного отчета
  generateReport: (params = {}) => api.get('/api/reports/generate', { params }),
};

// API методы для регионов
export const regionsAPI = {
  // Получение списка регионов
  getRegions: () => api.get('/api/regions'),
  
  // Получение региона по ID
  getRegion: (id) => api.get(`/regions/${id}`),
};

// Общие утилиты
export const apiUtils = {
  // Проверка доступности API
  healthCheck: () => api.get('/'),
  
  // Форматирование дат для API
  formatDate: (date) => {
    if (!date) return null;
    return new Date(date).toISOString().split('T')[0];
  },
  
  // Обработка ошибок API
  handleError: (error) => {
    if (error.response) {
      // Сервер ответил с кодом ошибки
      return error.response.data?.detail || error.response.data?.message || 'Ошибка сервера';
    } else if (error.request) {
      // Запрос был отправлен, но ответа не получено
      return 'Сервер недоступен. Проверьте подключение.';
    } else {
      // Ошибка при настройке запроса
      return error.message || 'Неизвестная ошибка';
    }
  }
};

export default api;
