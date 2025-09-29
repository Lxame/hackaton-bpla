import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Download, 
  Calendar, 
  MapPin,
  Settings,
  Eye,
  Printer
} from 'lucide-react';
import axios from 'axios';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';

const Reports = () => {
  const [reportConfig, setReportConfig] = useState({
    title: 'Отчет по полетам UAV',
    dateRange: {
      startDate: '',
      endDate: ''
    },
    region: '',
    includeCharts: true,
    includeDetails: true,
    format: 'pdf'
  });
  
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  useEffect(() => {
    // Устанавливаем дефолтные даты
    const today = new Date();
    const monthAgo = new Date(today);
    monthAgo.setDate(today.getDate() - 30);
    
    setReportConfig({
      ...reportConfig,
      dateRange: {
        startDate: monthAgo.toISOString().split('T')[0],
        endDate: today.toISOString().split('T')[0]
      }
    });
  }, []);

  const generateReport = async () => {
    try {
      setLoading(true);
      
      const [dynamicsResponse, ratingResponse] = await Promise.all([
        axios.get('/analytics/dynamics', {
          params: {
            start_date: reportConfig.dateRange.startDate,
            end_date: reportConfig.dateRange.endDate,
            region_id: reportConfig.region || undefined
          }
        }),
        axios.get('/analytics/rating/regions', {
          params: {
            limit: 20,
            start_date: reportConfig.dateRange.startDate,
            end_date: reportConfig.dateRange.endDate
          }
        })
      ]);

      const report = {
        config: reportConfig,
        data: {
          dynamics: dynamicsResponse.data.data || [],
          regionRating: ratingResponse.data.rating || [],
          totalFlights: ratingResponse.data.total_flights || 0,
          generatedAt: new Date().toISOString()
        }
      };

      setReportData(report);
      setPreviewMode(true);
      
    } catch (error) {
      console.error('Ошибка генерации отчета:', error);
      alert('Ошибка при генерации отчета');
    } finally {
      setLoading(false);
    }
  };

  const exportToPDF = () => {
    if (!reportData) return;

    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    let yPosition = 20;

    // Заголовок
    pdf.setFontSize(20);
    pdf.text(reportConfig.title, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 20;

    // Даты
    pdf.setFontSize(12);
    pdf.text(`Период: ${reportConfig.dateRange.startDate} - ${reportConfig.dateRange.endDate}`, 20, yPosition);
    yPosition += 10;
    pdf.text(`Сгенерировано: ${new Date().toLocaleString('ru-RU')}`, 20, yPosition);
    yPosition += 20;

    // Общая статистика
    pdf.setFontSize(14);
    pdf.text('Общая статистика', 20, yPosition);
    yPosition += 10;
    
    pdf.setFontSize(12);
    pdf.text(`Всего полетов: ${reportData.data.totalFlights}`, 20, yPosition);
    yPosition += 8;
    pdf.text(`Активных регионов: ${reportData.data.regionRating.length}`, 20, yPosition);
    yPosition += 8;
    pdf.text(`Дней в отчете: ${reportData.data.dynamics.length}`, 20, yPosition);
    yPosition += 15;

    // Рейтинг регионов
    pdf.setFontSize(14);
    pdf.text('Рейтинг регионов', 20, yPosition);
    yPosition += 10;

    pdf.setFontSize(10);
    pdf.text('Регион', 20, yPosition);
    pdf.text('Полеты', 120, yPosition);
    yPosition += 8;

    reportData.data.regionRating.slice(0, 15).forEach((region, index) => {
      if (yPosition > pageHeight - 20) {
        pdf.addPage();
        yPosition = 20;
      }
      
      pdf.text(`Регион ${region.region_id}`, 20, yPosition);
      pdf.text(region.flight_count.toString(), 120, yPosition);
      yPosition += 6;
    });

    // Сохранение
    pdf.save(`uav-report-${reportConfig.dateRange.startDate}-${reportConfig.dateRange.endDate}.pdf`);
  };

  const exportToExcel = () => {
    if (!reportData) return;

    const wb = XLSX.utils.book_new();

    // Лист с динамикой
    const dynamicsWS = XLSX.utils.json_to_sheet(
      reportData.data.dynamics.map(item => ({
        'Дата': item.date,
        'Количество полетов': item.flight_count
      }))
    );
    XLSX.utils.book_append_sheet(wb, dynamicsWS, 'Динамика полетов');

    // Лист с рейтингом регионов
    const regionsWS = XLSX.utils.json_to_sheet(
      reportData.data.regionRating.map((region, index) => ({
        'Позиция': index + 1,
        'Регион': region.region_id,
        'Количество полетов': region.flight_count
      }))
    );
    XLSX.utils.book_append_sheet(wb, regionsWS, 'Рейтинг регионов');

    // Сохранение
    XLSX.writeFile(wb, `uav-report-${reportConfig.dateRange.startDate}-${reportConfig.dateRange.endDate}.xlsx`);
  };

  const exportReport = () => {
    if (reportConfig.format === 'pdf') {
      exportToPDF();
    } else if (reportConfig.format === 'excel') {
      exportToExcel();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Генерация отчетов
        </h1>
        <p className="text-gray-600">
          Создание и экспорт аналитических отчетов по полетам UAV
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Configuration Panel */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center mb-4">
              <Settings className="h-5 w-5 text-gray-400 mr-2" />
              <h2 className="text-lg font-semibold text-gray-900">Настройки отчета</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Название отчета
                </label>
                <input
                  type="text"
                  value={reportConfig.title}
                  onChange={(e) => setReportConfig({...reportConfig, title: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Дата начала
                </label>
                <input
                  type="date"
                  value={reportConfig.dateRange.startDate}
                  onChange={(e) => setReportConfig({
                    ...reportConfig, 
                    dateRange: {...reportConfig.dateRange, startDate: e.target.value}
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Дата окончания
                </label>
                <input
                  type="date"
                  value={reportConfig.dateRange.endDate}
                  onChange={(e) => setReportConfig({
                    ...reportConfig, 
                    dateRange: {...reportConfig.dateRange, endDate: e.target.value}
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Формат экспорта
                </label>
                <select
                  value={reportConfig.format}
                  onChange={(e) => setReportConfig({...reportConfig, format: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="pdf">PDF</option>
                  <option value="excel">Excel</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={reportConfig.includeCharts}
                    onChange={(e) => setReportConfig({...reportConfig, includeCharts: e.target.checked})}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Включить графики</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={reportConfig.includeDetails}
                    onChange={(e) => setReportConfig({...reportConfig, includeDetails: e.target.checked})}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Детальная статистика</span>
                </label>
              </div>

              <div className="space-y-2">
                <button
                  onClick={generateReport}
                  disabled={loading}
                  className="w-full flex items-center justify-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
                >
                  {loading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  ) : (
                    <FileText className="h-4 w-4 mr-2" />
                  )}
                  Сгенерировать отчет
                </button>

                {reportData && (
                  <button
                    onClick={exportReport}
                    className="w-full flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Экспортировать
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Preview Panel */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <Eye className="h-5 w-5 text-gray-400 mr-2" />
                <h2 className="text-lg font-semibold text-gray-900">Предварительный просмотр</h2>
              </div>
              {reportData && (
                <button
                  onClick={() => window.print()}
                  className="flex items-center px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <Printer className="h-4 w-4 mr-1" />
                  Печать
                </button>
              )}
            </div>

            {!previewMode ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Настройте параметры отчета и нажмите "Сгенерировать отчет"</p>
              </div>
            ) : reportData ? (
              <div className="space-y-6">
                {/* Report Header */}
                <div className="text-center border-b pb-4">
                  <h1 className="text-2xl font-bold text-gray-900">{reportConfig.title}</h1>
                  <p className="text-gray-600 mt-2">
                    Период: {reportConfig.dateRange.startDate} - {reportConfig.dateRange.endDate}
                  </p>
                  <p className="text-sm text-gray-500">
                    Сгенерировано: {new Date().toLocaleString('ru-RU')}
                  </p>
                </div>

                {/* Summary Stats */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {reportData.data.totalFlights}
                    </div>
                    <div className="text-sm text-gray-600">Всего полетов</div>
                  </div>
                  
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {reportData.data.regionRating.length}
                    </div>
                    <div className="text-sm text-gray-600">Активных регионов</div>
                  </div>
                  
                  <div className="text-center p-4 bg-yellow-50 rounded-lg">
                    <div className="text-2xl font-bold text-yellow-600">
                      {reportData.data.dynamics.length}
                    </div>
                    <div className="text-sm text-gray-600">Дней в отчете</div>
                  </div>
                </div>

                {/* Region Rating Table */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Рейтинг регионов</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Позиция
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Регион
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Количество полетов
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {reportData.data.regionRating.slice(0, 10).map((region, index) => (
                          <tr key={region.region_id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {index + 1}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              Регион {region.region_id}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {region.flight_count}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Dynamics Summary */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Динамика полетов</h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600 mb-2">
                      Всего дней с активностью: {reportData.data.dynamics.length}
                    </p>
                    <p className="text-sm text-gray-600 mb-2">
                      Среднее количество полетов в день: {
                        reportData.data.dynamics.length > 0 
                          ? Math.round(reportData.data.dynamics.reduce((sum, item) => sum + item.flight_count, 0) / reportData.data.dynamics.length)
                          : 0
                      }
                    </p>
                    <p className="text-sm text-gray-600">
                      Максимальное количество полетов в день: {
                        Math.max(...reportData.data.dynamics.map(item => item.flight_count), 0)
                      }
                    </p>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;
