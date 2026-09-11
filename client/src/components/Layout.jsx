import { useState, useEffect, useRef } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  ArrowLeftRight,
  Wallet,
  Landmark,
  User,
  ShieldCheck,
  Bell,
  LogOut,
  Menu,
  X,
  ChevronLeft,
  Diamond,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import api from '../lib/api';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/dashboard/trade', label: 'Trade', icon: ArrowLeftRight },
  { to: '/dashboard/wallet', label: 'Wallet', icon: Wallet },
  { to: '/dashboard/fixed-deposits', label: 'Fixed Deposits', icon: Landmark },
  { to: '/dashboard/profile', label: 'Profile', icon: User },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [expanded, setExpanded] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const hoverTimeout = useRef(null);
  const sidebarRef = useRef(null);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const res = await api.get('/notifications');
        const unread = res.data.filter(n => !n.is_read).length;
        setUnreadCount(unread);
      } catch {
        setUnreadCount(0);
      }
    };
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  const handleMouseEnter = () => {
    clearTimeout(hoverTimeout.current);
    setExpanded(true);
  };

  const handleMouseLeave = () => {
    hoverTimeout.current = setTimeout(() => setExpanded(false), 300);
  };

  const getInitial = () => {
    if (user?.full_name) return user.full_name.charAt(0).toUpperCase();
    if (user?.email) return user.email.charAt(0).toUpperCase();
    return 'U';
  };

  const allNavItems = [
    ...NAV_ITEMS,
    ...(user?.role === 'admin'
      ? [{ to: '/dashboard/admin', label: 'Admin Panel', icon: ShieldCheck }]
      : []),
  ];

  const sidebarWidth = expanded ? 'w-56' : 'w-16';

  const SidebarContent = ({ isMobile = false }) => (
    <div
      className={`
        flex flex-col h-full bg-white border-r border-sky-100
        transition-all duration-300 ease-in-out
        ${isMobile ? 'w-64' : sidebarWidth}
      `}
    >
      <div className={`
        flex items-center h-16 px-4 border-b border-sky-100
        ${expanded || isMobile ? 'justify-between' : 'justify-center'}
      `}>
        {(expanded || isMobile) && (
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-400 to-sky-600 flex items-center justify-center flex-shrink-0">
              <Diamond size={16} className="text-white" />
            </div>
            <span className="text-sm font-bold text-sky-600 truncate whitespace-nowrap">
              Gemini
            </span>
          </div>
        )}
        {isMobile && (
          <button onClick={() => setMobileOpen(false)} className="text-gray-400 hover:text-gray-600 p-1">
            <X size={20} />
          </button>
        )}
        {!isMobile && !expanded && (
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-400 to-sky-600 flex items-center justify-center">
            <Diamond size={16} className="text-white" />
          </div>
        )}
      </div>

      <nav className="flex-1 py-4 space-y-1 px-2">
        {allNavItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/dashboard'}
              className={({ isActive }) => `
                flex items-center gap-3 px-3 py-2.5 rounded-lg
                transition-all duration-200 group relative
                ${isActive
                  ? 'bg-sky-50 text-sky-600'
                  : 'text-gray-500 hover:text-sky-600 hover:bg-sky-50/50'
                }
                ${!expanded && !isMobile ? 'justify-center' : ''}
              `}
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 bg-sky-500 rounded-r-full" />
                  )}
                  <Icon
                    size={20}
                    className={`flex-shrink-0 ${isActive ? 'text-sky-500' : 'text-gray-400 group-hover:text-sky-500'}`}
                  />
                  {(expanded || isMobile) && (
                    <span className="text-sm font-medium whitespace-nowrap">{item.label}</span>
                  )}
                  {!expanded && !isMobile && (
                    <div className="absolute left-full ml-3 px-2.5 py-1 rounded-md bg-gray-900 text-xs font-medium text-white opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
                      {item.label}
                    </div>
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className={`border-t border-sky-100 p-2 space-y-1 ${!expanded && !isMobile ? 'px-2' : 'px-3'}`}>
        <button
          onClick={() => setExpanded(!expanded)}
          className={`hidden md:flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-gray-400 hover:text-sky-600 hover:bg-sky-50 transition-all duration-200 ${!expanded ? 'justify-center' : ''}`}
        >
          <ChevronLeft size={20} className={`flex-shrink-0 transition-transform duration-300 ${expanded ? '' : 'rotate-180'}`} />
          {expanded && <span className="text-sm font-medium whitespace-nowrap">Collapse</span>}
        </button>

        <NavLink
          to="/dashboard/notifications"
          className={({ isActive }) => `
            flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 relative
            ${isActive ? 'bg-sky-50 text-sky-600' : 'text-gray-500 hover:text-sky-600 hover:bg-sky-50/50'}
            ${!expanded && !isMobile ? 'justify-center' : ''}
          `}
        >
          <div className="relative flex-shrink-0">
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full px-1 leading-none">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </div>
          {(expanded || isMobile) && <span className="text-sm font-medium whitespace-nowrap">Notifications</span>}
        </NavLink>

        <div className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border-t border-sky-100 mt-1 pt-3 ${!expanded && !isMobile ? 'justify-center px-1' : ''}`}>
          <div className="w-9 h-9 rounded-full flex-shrink-0 bg-gradient-to-br from-sky-400 to-sky-600 flex items-center justify-center">
            <span className="text-sm font-bold text-white">{getInitial()}</span>
          </div>
          {(expanded || isMobile) && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">{user?.full_name || 'User'}</p>
              <p className="text-xs text-gray-400 truncate">{user?.email || ''}</p>
            </div>
          )}
        </div>

        <button
          onClick={logout}
          className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all duration-200 ${!expanded && !isMobile ? 'justify-center' : ''}`}
        >
          <LogOut size={20} className="flex-shrink-0" />
          {(expanded || isMobile) && <span className="text-sm font-medium whitespace-nowrap">Logout</span>}
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-50 text-gray-900 overflow-hidden">
      <div ref={sidebarRef} className="hidden md:block flex-shrink-0 transition-all duration-300 ease-in-out" style={{ width: expanded ? '224px' : '64px' }} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
        <SidebarContent />
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="relative h-full">
            <SidebarContent isMobile />
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 flex items-center justify-between px-4 md:px-6 border-b border-sky-100 bg-white/80 backdrop-blur-sm flex-shrink-0 z-30">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-sky-50 transition-colors">
              <Menu size={22} />
            </button>
            <h1 className="text-lg font-semibold text-gray-800 font-heading">
              {allNavItems.find((item) => location.pathname === item.to || (item.to !== '/' && location.pathname.startsWith(item.to)))?.label || 'Gemini Exchange'}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <NavLink to="/dashboard/notifications" className="relative p-2 rounded-lg text-gray-400 hover:text-sky-600 hover:bg-sky-50 transition-colors">
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 min-w-[16px] h-[16px] flex items-center justify-center bg-red-500 text-white text-[9px] font-bold rounded-full px-0.5 leading-none">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </NavLink>

            <div className="hidden sm:flex items-center gap-2.5 ml-1 pl-3 border-l border-sky-100">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sky-400 to-sky-600 flex items-center justify-center">
                <span className="text-xs font-bold text-white">{getInitial()}</span>
              </div>
              <span className="text-sm font-medium text-gray-600 hidden lg:block">{user?.full_name || 'User'}</span>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
