import React, { useState, useEffect } from 'react';
import { 
  Plane, 
  MapPin, 
  Clock, 
  TrendingUp,
  Calendar,
  BarChart3
} from 'lucide-react';
import { analyticsAPI, flightsAPI, apiUtils } from '../services/api';
import RegionsTop from '../components/RegionsTop';

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalFlights: 0,
    totalRegions: 0,
    avgDuration: 0,
    todayFlights: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Получаем рейтинг регионов и список полетов параллельно
      const [ratingResponse, flightsResponse] = await Promise.all([
        analyticsAPI.getRegionRating({ limit: 10 }),
        flightsAPI.getFlights({ limit: 100 })
      ]);
      
      // Получаем общую статистику
      const totalFlights = ratingResponse.data.total_flights || 0;
      const flights = flightsResponse.data || [];
      
      // Вычисляем среднюю длительность
      const avgDuration = flights.length > 0 
        ? Math.round(flights.reduce((sum, flight) => sum + (flight.duration_minutes || 0), 0) / flights.length)
        : 0;
      
      // Подсчитываем полеты за сегодня
      const today = new Date().toISOString().split('T')[0];
      const todayFlights = flights.filter(flight => 
        flight.takeoff_time && flight.takeoff_time.startsWith(today)
      ).length;
      
      setStats({
        totalFlights,
        totalRegions: ratingResponse.data.rating?.length || 0,
        avgDuration,
        todayFlights
      });
    } catch (error) {
      console.error('Ошибка загрузки данных:', apiUtils.handleError(error));
      // Устанавливаем пустые данные в случае ошибки
      setStats({
        totalFlights: 0,
        totalRegions: 0,
        avgDuration: 0,
        todayFlights: 0
      });
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, icon: Icon, color = 'blue' }) => (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center">
        <div className={`p-3 rounded-full bg-${color}-100`}>
          <Icon className={`h-6 w-6 text-${color}-600`} />
        </div>
        <div className="ml-4">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-semibold text-gray-900">
            {loading ? '...' : value}
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Дашборд UAV Analytics
            </h1>
            <p className="text-gray-600">
              Обзор статистики полетов беспилотных летательных аппаратов
            </p>
          </div>
          <button
            onClick={fetchDashboardData}
            disabled={loading}
            className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            ) : (
              <TrendingUp className="h-4 w-4 mr-2" />
            )}
            {loading ? 'Обновление...' : 'Обновить данные'}
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Всего полетов"
          value={stats.totalFlights}
          icon={Plane}
          color="blue"
        />
        <StatCard
          title="Активных регионов"
          value={stats.totalRegions}
          icon={MapPin}
          color="green"
        />
        <StatCard
          title="Средняя длительность"
          value={`${stats.avgDuration} мин`}
          icon={Clock}
          color="yellow"
        />
        <StatCard
          title="Полеты сегодня"
          value={stats.todayFlights}
          icon={TrendingUp}
          color="purple"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Regions */}
        <RegionsTop limit={5} />

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Быстрые действия
          </h2>
          <div className="space-y-3">
            <button className="w-full text-left p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
              <div className="flex items-center space-x-3">
                <Calendar className="h-5 w-5 text-blue-600" />
                <div>
                  <div className="font-medium text-gray-900">Посмотреть динамику</div>
                  <div className="text-sm text-gray-600">Анализ по дням и периодам</div>
                </div>
              </div>
            </button>
            
            <button 
              onClick={() => window.location.href = '/reports'}
              className="w-full text-left p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <BarChart3 className="h-5 w-5 text-green-600" />
                <div>
                  <div className="font-medium text-gray-900">Создать отчет</div>
                  <div className="text-sm text-gray-600">Генерация аналитического отчета</div>
                </div>
              </div>
            </button>
            
            <button className="w-full text-left p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
              <div className="flex items-center space-x-3">
                <TrendingUp className="h-5 w-5 text-purple-600" />
                <div>
                  <div className="font-medium text-gray-900">Загрузить данные</div>
                  <div className="text-sm text-gray-600">Импорт новых полетов</div>
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
