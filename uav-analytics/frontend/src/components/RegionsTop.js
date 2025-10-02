import React, { useState, useEffect } from 'react';
import { 
  MapPin, 
  TrendingUp, 
  Award,
  RefreshCw
} from 'lucide-react';
import { analyticsAPI, regionsAPI, apiUtils } from '../services/api';

const RegionsTop = ({ limit = 10, showTitle = true, className = "" }) => {
  const [regionsData, setRegionsData] = useState([]);
  const [regionsMap, setRegionsMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [totalFlights, setTotalFlights] = useState(0);

  useEffect(() => {
    fetchRegionsTop();
  }, [limit]);

  const fetchRegionsTop = async () => {
    try {
      setLoading(true);
      
      // Получаем рейтинг регионов и список всех регионов параллельно
      const [ratingResponse, regionsResponse] = await Promise.all([
        analyticsAPI.getRegionRating({ limit }),
        regionsAPI.getRegions()
      ]);
      
      // Создаем карту регионов для быстрого поиска названий
      const regionsMap = {};
      if (regionsResponse.data) {
        regionsResponse.data.forEach(region => {
          regionsMap[region.id] = region.name;
        });
      }
      
      setRegionsMap(regionsMap);
      setRegionsData(ratingResponse.data.rating || []);
      setTotalFlights(ratingResponse.data.total_flights || 0);
      
    } catch (error) {
      console.error('Ошибка загрузки топа регионов:', apiUtils.handleError(error));
      setRegionsData([]);
      setTotalFlights(0);
    } finally {
      setLoading(false);
    }
  };

  const getRegionName = (regionId) => {
    return regionsMap[regionId] || `Регион ${regionId}`;
  };

  const getPercentage = (flightCount) => {
    if (totalFlights === 0) return 0;
    return Math.round((flightCount / totalFlights) * 100);
  };

  const getMedalIcon = (index) => {
    switch (index) {
      case 0:
        return <Award className="h-5 w-5 text-yellow-500" />;
      case 1:
        return <Award className="h-5 w-5 text-gray-400" />;
      case 2:
        return <Award className="h-5 w-5 text-amber-600" />;
      default:
        return <div className="w-5 h-5 bg-gray-200 rounded-full flex items-center justify-center text-xs font-medium text-gray-600">{index + 1}</div>;
    }
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
        {showTitle && (
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Топ регионов по полетам
            </h2>
          </div>
        )}
        <div className="animate-pulse space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center space-x-3">
              <div className="h-6 w-6 bg-gray-200 rounded-full"></div>
              <div className="h-4 bg-gray-200 rounded flex-1"></div>
              <div className="h-4 bg-gray-200 rounded w-16"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
      {showTitle && (
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <TrendingUp className="h-5 w-5 text-primary-600 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900">
              Топ регионов по полетам
            </h2>
          </div>
          <button
            onClick={fetchRegionsTop}
            disabled={loading}
            className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50"
            title="Обновить данные"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      )}
      
      {regionsData.length === 0 ? (
        <div className="text-center py-8">
          <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Данные о полетах не найдены</p>
          <p className="text-sm text-gray-500 mt-1">
            Загрузите данные о полетах для отображения статистики
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {regionsData.map((region, index) => (
            <div key={region.region_id} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  {getMedalIcon(index)}
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-900">
                    {getRegionName(region.region_id)}
                  </span>
                  <div className="text-xs text-gray-500">
                    {getPercentage(region.flight_count)}% от общего числа
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <div className="text-sm font-semibold text-gray-900">
                    {region.flight_count}
                  </div>
                  <div className="text-xs text-gray-500">
                    полетов
                  </div>
                </div>
                <div className="w-16 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${(region.flight_count / Math.max(...regionsData.map(r => r.flight_count))) * 100}%`
                    }}
                  ></div>
                </div>
              </div>
            </div>
          ))}
          
          {totalFlights > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="text-center text-sm text-gray-600">
                Всего полетов: <span className="font-semibold">{totalFlights}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RegionsTop;
