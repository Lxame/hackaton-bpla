import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  MapPin, 
  Filter, 
  Download,
  BarChart3,
  TrendingUp
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { analyticsAPI, apiUtils } from '../services/api';

const Analytics = () => {
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });
  const [selectedRegion, setSelectedRegion] = useState('');
  const [dynamicsData, setDynamicsData] = useState([]);
  const [regionRating, setRegionRating] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Устанавливаем дефолтные даты (весь 2024 год)
    setDateRange({
      startDate: '2024-01-01',
      endDate: '2025-01-01'
    });
  }, []);

  useEffect(() => {
    if (dateRange.startDate && dateRange.endDate) {
      fetchAnalyticsData();
    }
  }, [dateRange, selectedRegion]);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      
      // Получаем динамику полетов
      const dynamicsParams = {
        start_date: dateRange.startDate,
        end_date: dateRange.endDate
      };
      if (selectedRegion) {
        dynamicsParams.region_id = selectedRegion;
      }
      
      const dynamicsResponse = await analyticsAPI.getFlightDynamics(dynamicsParams);
      setDynamicsData(dynamicsResponse.data.data || []);

      // Получаем рейтинг регионов
      const ratingParams = {
        limit: 10,
        start_date: dateRange.startDate,
        end_date: dateRange.endDate
      };
      
      const ratingResponse = await analyticsAPI.getRegionRating(ratingParams);
      setRegionRating(ratingResponse.data.rating || []);
      
    } catch (error) {
      console.error('Ошибка загрузки аналитики:', apiUtils.handleError(error));
      // Устанавливаем пустые данные в случае ошибки
      setDynamicsData([]);
      setRegionRating([]);
    } finally {
      setLoading(false);
    }
  };

  const exportChart = (chartId, filename) => {
    const canvas = document.getElementById(chartId);
    if (canvas) {
      const link = document.createElement('a');
      link.download = `${filename}.png`;
      link.href = canvas.toDataURL();
      link.click();
    }
  };

  const exportData = () => {
    const dataToExport = {
      dateRange,
      dynamics: dynamicsData,
      regionRating
    };
    
    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], {
      type: 'application/json'
    });
    
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `uav-analytics-${dateRange.startDate}-${dateRange.endDate}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Аналитика полетов
            </h1>
            <p className="text-gray-600">
              Детальный анализ статистики полетов по регионам и времени
            </p>
          </div>
          <button
            onClick={exportData}
            className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Download className="h-4 w-4 mr-2" />
            Экспорт данных
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center mb-4">
          <Filter className="h-5 w-5 text-gray-400 mr-2" />
          <h2 className="text-lg font-semibold text-gray-900">Фильтры</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Дата начала
            </label>
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange({...dateRange, startDate: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Дата окончания
            </label>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange({...dateRange, endDate: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Регион
            </label>
            <select
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Все регионы</option>
              {regionRating.map(region => (
                <option key={region.region_id} value={region.region_id}>
                  {region.region_name || `Регион ${region.region_id}`}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Dynamics Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <TrendingUp className="h-5 w-5 text-blue-600 mr-2" />
              <h2 className="text-lg font-semibold text-gray-900">
                Динамика полетов
              </h2>
            </div>
            <button
              onClick={() => exportChart('dynamics-chart', 'flight-dynamics')}
              className="p-2 text-gray-400 hover:text-gray-600"
              title="Экспорт графика"
            >
              <Download className="h-4 w-4" />
            </button>
          </div>
          
          {loading ? (
            <div className="h-64 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dynamicsData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="flight_count" 
                  stroke="#2563eb" 
                  strokeWidth={2}
                  dot={{ fill: '#2563eb', strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Region Rating Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <BarChart3 className="h-5 w-5 text-green-600 mr-2" />
              <h2 className="text-lg font-semibold text-gray-900">
                Рейтинг регионов
              </h2>
            </div>
            <button
              onClick={() => exportChart('regions-chart', 'region-rating')}
              className="p-2 text-gray-400 hover:text-gray-600"
              title="Экспорт графика"
            >
              <Download className="h-4 w-4" />
            </button>
          </div>
          
          {loading ? (
            <div className="h-64 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={regionRating.slice(0, 8)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="region_id" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="flight_count" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Сводная статистика
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">
              {dynamicsData.reduce((sum, item) => sum + item.flight_count, 0)}
            </div>
            <div className="text-sm text-gray-600">Всего полетов</div>
          </div>
          
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              {regionRating.length}
            </div>
            <div className="text-sm text-gray-600">Активных регионов</div>
          </div>
          
          <div className="text-center p-4 bg-yellow-50 rounded-lg">
            <div className="text-2xl font-bold text-yellow-600">
              {dynamicsData.length > 0 ? Math.round(dynamicsData.reduce((sum, item) => sum + item.flight_count, 0) / dynamicsData.length) : 0}
            </div>
            <div className="text-sm text-gray-600">Среднее в день</div>
          </div>
          
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">
              {regionRating.length > 0 ? regionRating[0].flight_count : 0}
            </div>
            <div className="text-sm text-gray-600">Максимум в регионе</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
