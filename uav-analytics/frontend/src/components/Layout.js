import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  BarChart3, 
  TrendingUp, 
  FileText, 
  Plane,
  Upload as UploadIcon,
  List
} from 'lucide-react';

const Layout = ({ children }) => {
  const location = useLocation();

  const navItems = [
    { path: '/', label: 'Дашборд', icon: BarChart3 },
    { path: '/analytics', label: 'Аналитика', icon: TrendingUp },
    { path: '/reports', label: 'Отчеты', icon: FileText },
    { path: '/upload', label: 'Загрузка', icon: UploadIcon },
    { path: '/flights', label: 'Полеты', icon: List },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Plane className="h-8 w-8 text-primary-600 mr-3" />
              <h1 className="text-xl font-bold text-gray-900">
                UAV Analytics
              </h1>
            </div>
            <nav className="hidden md:flex space-x-8">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-primary-100 text-primary-700'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Mobile Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t">
        <div className="flex justify-around py-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center py-2 px-3 text-xs ${
                  isActive ? 'text-primary-600' : 'text-gray-600'
                }`}
              >
                <Icon className="h-5 w-5 mb-1" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Layout;
