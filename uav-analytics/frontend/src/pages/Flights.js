import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plane, 
  MapPin, 
  Clock, 
  User,
  Filter,
  Search,
  Eye,
  Download
} from 'lucide-react';
import { flightsAPI, apiUtils } from '../services/api';

const Flights = () => {
  const [flights, setFlights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    region: '',
    droneType: ''
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFlight, setSelectedFlight] = useState(null);

  useEffect(() => {
    fetchFlights();
  }, []);

  const fetchFlights = async () => {
    try {
      setLoading(true);
      const response = await flightsAPI.getFlights({ limit: 1000 });
      const payload = Array.isArray(response.data)
        ? response.data
        : (Array.isArray(response.data?.flights) ? response.data.flights : []);
      setFlights(payload);
    } catch (error) {
      console.error('Ошибка загрузки полетов:', apiUtils.handleError(error));
      setFlights([]);
    } finally {
      setLoading(false);
    }
  };

  const regionStats = useMemo(() => {
    const counts = flights.reduce((acc, flight) => {
      const regionId = flight.region_id ?? 'N/A';
      acc[regionId] = (acc[regionId] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts)
      .map(([regionId, count]) => ({ regionId, count }))
      .sort((a, b) => b.count - a.count);
  }, [flights]);

  const filteredFlights = flights.filter(flight => {
    const matchesSearch = searchTerm === '' || 
      flight.id?.toString().includes(searchTerm) ||
      flight.drone_type?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRegion = filters.region === '' || flight.region_id?.toString() === filters.region;
    const matchesDroneType = filters.droneType === '' || flight.drone_type?.toLowerCase().includes(filters.droneType.toLowerCase());

    return matchesSearch && matchesRegion && matchesDroneType;
  });

  const exportFlights = () => {
    const dataToExport = filteredFlights.map(flight => ({
      'ID': flight.id || 'N/A',
      'Тип БПЛА': flight.drone_type || 'N/A',
      'Время взлета': flight.takeoff_time ? new Date(flight.takeoff_time).toLocaleString('ru-RU') : 'N/A',
      'Время посадки': flight.landing_time ? new Date(flight.landing_time).toLocaleString('ru-RU') : 'N/A',
      'Длительность (мин)': flight.duration_minutes || 'N/A',
      'Регион': flight.region_id || 'N/A'
    }));

    const csvContent = [
      Object.keys(dataToExport[0]).join(','),
      ...dataToExport.map(row => Object.values(row).map(val => `"${val}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `flights-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const FlightCard = ({ flight }) => (
    <div className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow cursor-pointer"
         onClick={() => setSelectedFlight(flight)}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center">
          <div className="p-2 bg-blue-100 rounded-lg mr-3">
            <Plane className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">
              Полёт #{flight.id}
            </h3>
            <p className="text-sm text-gray-600">{flight.drone_type}</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-600">
            {flight.takeoff_time ? new Date(flight.takeoff_time).toLocaleDateString('ru-RU') : 'N/A'}
          </div>
          <div className="text-sm text-gray-500">
            {flight.duration_minutes} мин
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div className="flex items-center text-gray-600">
          <Clock className="h-4 w-4 mr-2" />
          <span>{flight.duration_minutes} мин</span>
        </div>
        <div className="flex items-center text-gray-600">
          <MapPin className="h-4 w-4 mr-2" />
          <span>Регион {flight.region_id || 'N/A'}</span>
        </div>
      </div>
    </div>
  );

  const FlightDetailModal = ({ flight, onClose }) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">
              Детали полета
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">ID полета</label>
                <p className="text-gray-900">{flight.id}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Тип БПЛА</label>
                <p className="text-gray-900">{flight.drone_type || 'Не указан'}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Время взлета</label>
                <p className="text-gray-900">
                  {flight.takeoff_time ? new Date(flight.takeoff_time).toLocaleString('ru-RU') : 'Не указано'}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Время посадки</label>
                <p className="text-gray-900">
                  {flight.landing_time ? new Date(flight.landing_time).toLocaleString('ru-RU') : 'Не указано'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Длительность</label>
                <p className="text-gray-900">{flight.duration_minutes} минут</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Регион</label>
                <p className="text-gray-900">Регион {flight.region_id || 'Не определен'}</p>
              </div>
            </div>
          </div>
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
              Реестр полетов
            </h1>
            <p className="text-gray-600">
              Просмотр всех загруженных полетов беспилотных летательных аппаратов
            </p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={fetchFlights}
              disabled={loading}
              className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              ) : (
                <Eye className="h-4 w-4 mr-2" />
              )}
              {loading ? 'Обновление...' : 'Обновить'}
            </button>
            <button
              onClick={exportFlights}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Download className="h-4 w-4 mr-2" />
              Экспорт CSV
            </button>
          </div>
        </div>
      </div>

      {/* Region stats (MVP) */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Статистика по регионам (MVP)</h2>
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : regionStats.length === 0 ? (
          <div className="text-gray-600">Данных о полетах нет</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Регион</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Количество полетов</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {regionStats.map((item) => (
                  <tr key={item.regionId}>
                    <td className="px-4 py-2 text-sm text-gray-900">{item.regionId}</td>
                    <td className="px-4 py-2 text-sm text-gray-900">{item.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center mb-4">
          <Filter className="h-5 w-5 text-gray-400 mr-2" />
          <h2 className="text-lg font-semibold text-gray-900">Фильтры и поиск</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Поиск
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="ID, тип БПЛА..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Регион
            </label>
            <input
              type="number"
              placeholder="ID региона"
              value={filters.region}
              onChange={(e) => setFilters({...filters, region: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Тип БПЛА
            </label>
            <input
              type="text"
              placeholder="Тип дрона"
              value={filters.droneType}
              onChange={(e) => setFilters({...filters, droneType: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Результаты ({filteredFlights.length} полетов)
          </h2>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : filteredFlights.length === 0 ? (
          <div className="text-center py-12">
            <Plane className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Полеты не найдены</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredFlights.map((flight) => (
              <FlightCard key={flight.id} flight={flight} />
            ))}
          </div>
        )}
      </div>

      {/* Flight Detail Modal */}
      {selectedFlight && (
        <FlightDetailModal 
          flight={selectedFlight} 
          onClose={() => setSelectedFlight(null)} 
        />
      )}
    </div>
  );
};

export default Flights;
