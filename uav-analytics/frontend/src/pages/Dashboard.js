import React, { useState, useEffect } from 'react';
import { 
  Plane, 
  MapPin, 
  Clock, 
  TrendingUp,
  Calendar,
  BarChart3
} from 'lucide-react';
import axios from 'axios';

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalFlights: 0,
    totalRegions: 0,
    avgDuration: 0,
    todayFlights: 0
  });
  const [regionRating, setRegionRating] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Получаем рейтинг регионов
      const ratingResponse = await axios.get('/analytics/rating/regions?limit=5');
      setRegionRating(ratingResponse.data.rating || []);
      
      // Получаем общую статистику
      const totalFlights = ratingResponse.data.total_flights || 0;
      setStats({
        totalFlights,
        totalRegions: ratingResponse.data.rating?.length || 0,
        avgDuration: 45, // Пока заглушка, можно добавить отдельный API
        todayFlights: Math.floor(totalFlights * 0.1) // Примерная оценка
      });
    } catch (error) {
      console.error('Ошибка загрузки данных:', error);
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
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Дашборд UAV Analytics
        </h1>
        <p className="text-gray-600">
          Обзор статистики полетов беспилотных летательных аппаратов
        </p>
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
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Топ регионов по полетам
            </h2>
            <BarChart3 className="h-5 w-5 text-gray-400" />
          </div>
          
          {loading ? (
            <div className="animate-pulse space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center space-x-3">
                  <div className="h-4 bg-gray-200 rounded w-4"></div>
                  <div className="h-4 bg-gray-200 rounded flex-1"></div>
                  <div className="h-4 bg-gray-200 rounded w-16"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {regionRating.map((region, index) => (
                <div key={region.region_id} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0 w-6 h-6 bg-primary-100 rounded-full flex items-center justify-center">
                      <span className="text-xs font-medium text-primary-700">
                        {index + 1}
                      </span>
                    </div>
                    <span className="text-sm font-medium text-gray-900">
                      Регион {region.region_id}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="text-sm text-gray-600">
                      {region.flight_count} полетов
                    </div>
                    <div className="w-16 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-primary-600 h-2 rounded-full"
                        style={{
                          width: `${(region.flight_count / Math.max(...regionRating.map(r => r.flight_count))) * 100}%`
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

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
            
            <button className="w-full text-left p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
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
