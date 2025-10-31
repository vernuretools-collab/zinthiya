import { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { Button } from '../../components/ui/button';
import { Avatar, AvatarFallback } from '../../components/ui/avatar';
import { 
  LayoutDashboard, 
  Calendar, 
  Clock, 
  User, 
  LogOut, 
  Bell,
  Heart,
  Menu,
  X
} from 'lucide-react';

export default function VolunteerLayout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/volunteer/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const navItems = [
    { path: '/volunteer/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/volunteer/bookings', label: 'My Bookings', icon: Calendar },
    { path: '/volunteer/availability', label: 'Availability', icon: Clock },
    { path: '/volunteer/profile', label: 'Profile', icon: User },
  ];

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="container mx-auto px-3 sm:px-4">
          <div className="flex items-center justify-between h-14 sm:h-16">
            {/* Left Section - Logo & Hamburger */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Hamburger Menu - Mobile Only */}
              <Button 
                variant="ghost" 
                size="sm" 
                className="lg:hidden p-2"
                onClick={toggleSidebar}
              >
                <Menu className="h-5 w-5 sm:h-6 sm:w-6" />
              </Button>

              <Heart className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 text-blue-600 flex-shrink-0" />
              <div className="hidden sm:block">
                <h1 className="font-bold text-sm sm:text-base md:text-lg">Zinthiya Trust</h1>
                <p className="text-xs text-gray-600">Volunteer Portal</p>
              </div>
            </div>

            {/* Right Section - Actions */}
            <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
              <Button variant="ghost" size="sm" className="p-2">
                <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
              <Avatar 
                className="h-7 w-7 sm:h-8 sm:w-8 cursor-pointer" 
                onClick={() => navigate('/volunteer/profile')}
              >
                <AvatarFallback className="text-xs sm:text-sm">V</AvatarFallback>
              </Avatar>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleLogout}
                className="hidden sm:flex items-center gap-2 text-xs sm:text-sm"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden md:inline">Logout</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* Main Container */} 
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <div className="flex gap-4 sm:gap-6">
          {/* Sidebar - Desktop & Mobile Drawer */}
          <aside 
            className={`
              fixed lg:static top-0 left-0 h-full lg:h-auto
              w-64 sm:w-72 lg:w-64 flex-shrink-0
              bg-white lg:bg-transparent
              shadow-xl lg:shadow-none
              z-50 lg:z-auto
              transition-transform duration-300 ease-in-out
              ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            `}
          >
            {/* Mobile Sidebar Header */}
            <div className="lg:hidden flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-2">
                <Heart className="h-6 w-6 text-blue-600" />
                <div>
                  <h2 className="font-bold text-sm">Zinthiya Trust</h2>
                  <p className="text-xs text-gray-600">Volunteer Portal</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={closeSidebar}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Navigation */}
            <nav className="space-y-1 p-3 lg:p-0">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={closeSidebar}
                    className={`
                      flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200
                      ${isActive 
                        ? 'bg-blue-600 text-white shadow-md' 
                        : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                      }
                    `}
                  >
                    <Icon className="h-5 w-5 flex-shrink-0" />
                    <span className="font-medium text-sm sm:text-base">{item.label}</span>
                  </Link>
                );
              })}

              {/* Mobile Logout Button */}
              <button
                onClick={handleLogout}
                className="lg:hidden flex items-center gap-3 px-4 py-3 rounded-lg w-full text-left text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <LogOut className="h-5 w-5 flex-shrink-0" />
                <span className="font-medium text-sm sm:text-base">Logout</span>
              </button>
            </nav>
          </aside>

          {/* Main Content */}
          <main className="flex-1 min-w-0 pb-20 lg:pb-0">
            {children}
          </main>
        </div>
      </div>

      {/* Bottom Navigation - Mobile Only */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 shadow-lg">
        <div className="grid grid-cols-4 gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`
                  flex flex-col items-center justify-center py-2 px-1
                  transition-colors duration-200
                  ${isActive 
                    ? 'text-blue-600' 
                    : 'text-gray-600 active:text-blue-600'
                  }
                `}
              >
                <Icon className={`h-5 w-5 sm:h-6 sm:w-6 mb-1 ${isActive ? 'text-blue-600' : ''}`} />
                <span className="text-xs font-medium truncate w-full text-center">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
