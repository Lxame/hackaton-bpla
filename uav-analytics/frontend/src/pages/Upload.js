import React, { useState } from 'react';
import { 
  Upload as UploadIcon, 
  FileText, 
  CheckCircle, 
  AlertCircle,
  Download,
  Info,
  Plane
} from 'lucide-react';
import axios from 'axios';

const Upload = () => {
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [uploadResult, setUploadResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [jsonInput, setJsonInput] = useState('');
  const [uploadMethod, setUploadMethod] = useState('file'); // 'file' or 'text'

  // Пример JSON структуры для справки
  const exampleJson = {
    "flights": [
      {
        "drone_type": "Mavic 3",
        "takeoff_datetime": "2024-01-15T10:30:00",
        "landing_datetime": "2024-01-15T11:15:00",
        "takeoff_coordinates": "55.7558,37.6176",
        "landing_coordinates": "55.7658,37.6276"
      },
      {
        "drone_type": "DJI Phantom 4",
        "takeoff_datetime": "2024-01-16T09:15:00",
        "landing_datetime": "2024-01-16T10:00:00",
        "takeoff_coordinates": "55.7458,37.6076",
        "landing_coordinates": "55.7558,37.6176"
      }
    ]
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (file) => {
    if (file.type !== 'application/json') {
      alert('Пожалуйста, выберите JSON файл');
      return;
    }

    setUploadedFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setJsonInput(e.target.result);
    };
    reader.readAsText(file);
  };

  const validateJson = (jsonText) => {
    try {
      const data = JSON.parse(jsonText);
      
      if (!data.flights || !Array.isArray(data.flights)) {
        throw new Error('JSON должен содержать массив "flights"');
      }

      const requiredFields = ['drone_type', 'takeoff_datetime', 'landing_datetime', 'takeoff_coordinates', 'landing_coordinates'];
      
      for (let i = 0; i < data.flights.length; i++) {
        const flight = data.flights[i];
        for (const field of requiredFields) {
          if (!flight[field]) {
            throw new Error(`Полет ${i + 1}: отсутствует обязательное поле "${field}"`);
          }
        }

        // Валидация координат
        if (!flight.takeoff_coordinates.includes(',') || !flight.landing_coordinates.includes(',')) {
          throw new Error(`Полет ${i + 1}: координаты должны быть в формате "широта,долгота"`);
        }
      }

      return data;
    } catch (error) {
      throw new Error(`Ошибка валидации JSON: ${error.message}`);
    }
  };

  const handleUpload = async () => {
    try {
      setLoading(true);
      setUploadResult(null);

      const jsonData = validateJson(jsonInput);
      
      const response = await axios.post('/flights/upload', jsonData);
      
      setUploadResult({
        success: true,
        message: response.data.message,
        flightsCount: jsonData.flights.length
      });

      // Очищаем форму после успешной загрузки
      setUploadedFile(null);
      setJsonInput('');
      
    } catch (error) {
      setUploadResult({
        success: false,
        message: error.response?.data?.detail || error.message || 'Ошибка при загрузке данных'
      });
    } finally {
      setLoading(false);
    }
  };

  const downloadExample = () => {
    const dataStr = JSON.stringify(exampleJson, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'example_flights.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Загрузка данных о полетах
        </h1>
        <p className="text-gray-600">
          Загрузите данные о полетах беспилотных летательных аппаратов в формате JSON
        </p>
      </div>

      {/* Info Panel */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <Info className="h-5 w-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
          <div>
            <h3 className="text-sm font-medium text-blue-800 mb-2">
              Требования к формату данных
            </h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Данные должны быть в формате JSON</li>
              <li>• Обязательные поля: drone_type, takeoff_datetime, landing_datetime, takeoff_coordinates, landing_coordinates</li>
              <li>• Координаты в формате "широта,долгота" (например: "55.7558,37.6176")</li>
              <li>• Даты в формате ISO 8601 (например: "2024-01-15T10:30:00")</li>
              <li>• Длительность полета вычисляется автоматически</li>
            </ul>
            <button
              onClick={downloadExample}
              className="mt-3 inline-flex items-center text-sm text-blue-600 hover:text-blue-800"
            >
              <Download className="h-4 w-4 mr-1" />
              Скачать пример файла
            </button>
          </div>
        </div>
      </div>

      {/* Upload Method Selection */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Способ загрузки</h2>
        <div className="flex space-x-4">
            <button
              onClick={() => setUploadMethod('file')}
              className={`flex items-center px-4 py-2 rounded-lg border transition-colors ${
                uploadMethod === 'file'
                  ? 'border-primary-500 bg-primary-50 text-primary-700'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <UploadIcon className="h-4 w-4 mr-2" />
              Загрузить файл
            </button>
          <button
            onClick={() => setUploadMethod('text')}
            className={`flex items-center px-4 py-2 rounded-lg border transition-colors ${
              uploadMethod === 'text'
                ? 'border-primary-500 bg-primary-50 text-primary-700'
                : 'border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <FileText className="h-4 w-4 mr-2" />
            Вставить JSON
          </button>
        </div>
      </div>

      {/* Upload Area */}
      {uploadMethod === 'file' ? (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Загрузка файла</h2>
          
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive
                ? 'border-primary-500 bg-primary-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <UploadIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            
            {uploadedFile ? (
              <div className="space-y-2">
                <CheckCircle className="h-8 w-8 text-green-500 mx-auto" />
                <p className="text-green-600 font-medium">{uploadedFile.name}</p>
                <p className="text-sm text-gray-600">
                  Размер: {(uploadedFile.size / 1024).toFixed(1)} KB
                </p>
              </div>
            ) : (
              <div>
                <p className="text-lg text-gray-600 mb-2">
                  Перетащите JSON файл сюда или
                </p>
                <label className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 cursor-pointer transition-colors">
                  <UploadIcon className="h-4 w-4 mr-2" />
                  Выберите файл
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleFileInput}
                    className="hidden"
                  />
                </label>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">JSON данные</h2>
          <textarea
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
            placeholder="Вставьте JSON данные о полетах здесь..."
            className="w-full h-64 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono text-sm"
          />
        </div>
      )}

      {/* Upload Button */}
      <div className="bg-white rounded-lg shadow p-6">
        <button
          onClick={handleUpload}
          disabled={loading || !jsonInput.trim()}
          className="w-full flex items-center justify-center px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
          ) : (
            <Plane className="h-5 w-5 mr-2" />
          )}
          {loading ? 'Загружается...' : 'Загрузить данные'}
        </button>
      </div>

      {/* Result */}
      {uploadResult && (
        <div className={`rounded-lg p-6 ${
          uploadResult.success 
            ? 'bg-green-50 border border-green-200' 
            : 'bg-red-50 border border-red-200'
        }`}>
          <div className="flex items-start">
            {uploadResult.success ? (
              <CheckCircle className="h-6 w-6 text-green-600 mt-0.5 mr-3 flex-shrink-0" />
            ) : (
              <AlertCircle className="h-6 w-6 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
            )}
            <div>
              <h3 className={`font-medium ${
                uploadResult.success ? 'text-green-800' : 'text-red-800'
              }`}>
                {uploadResult.success ? 'Успешно загружено!' : 'Ошибка загрузки'}
              </h3>
              <p className={`mt-1 text-sm ${
                uploadResult.success ? 'text-green-700' : 'text-red-700'
              }`}>
                {uploadResult.message}
              </p>
              {uploadResult.success && uploadResult.flightsCount && (
                <p className="mt-2 text-sm text-green-700">
                  Обработано полетов: {uploadResult.flightsCount}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Upload;
