// Environment configuration for UAV Analytics Frontend

const config = {
  // API Configuration
  API_URL: process.env.REACT_APP_API_URL || 'http://localhost:8000',
  
  // Environment
  ENV: process.env.REACT_APP_ENV || 'development',
  
  // Feature flags
  ENABLE_DEBUG: process.env.REACT_APP_ENABLE_DEBUG === 'true' || process.env.NODE_ENV === 'development',
  
  // Polling settings (for real-time updates)
  POLLING_INTERVAL: parseInt(process.env.REACT_APP_POLLING_INTERVAL) || 30000,
  
  // Chart export settings
  ENABLE_CHART_EXPORT: process.env.REACT_APP_ENABLE_CHART_EXPORT !== 'false',
  
  // Pagination settings
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 1000,
  
  // Date format settings
  DATE_FORMAT: 'DD.MM.YYYY',
  DATETIME_FORMAT: 'DD.MM.YYYY HH:mm',
  
  // API timeout
  API_TIMEOUT: 10000,
};

// Validation
if (config.ENABLE_DEBUG) {
  console.log('UAV Analytics Config:', config);
}

export default config;
