import { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Users,
  Wrench,
  Package,
  Calculator,
  Settings,
  TrendingUp,
  Wallet,
  Menu,
  X,
  Bell,
  Stethoscope,
  UserCog,
  LogOut,
  Check,
  Bot,
  Database,
  ShoppingBag,
  Receipt,
  ChevronDown,
  MessageCircle,
} from 'lucide-react';
import { loadData, saveData } from './store';
import { AppData, Notification } from './types';
import Dashboard from './pages/Dashboard';
import Clients from './pages/Clients';
import Inventory from './pages/Inventory';
import WorkOrders from './pages/WorkOrders';
import Salary from './pages/Salary';
import Reports from './pages/Reports';
import Expenses from './pages/Expenses';
import SettingsPage from './pages/Settings';
import UsersPage from './pages/Users';
import TelegramPage from './pages/Telegram';
import ViberPage from './pages/Viber';
import DatabasePage from './pages/Database';
import SupplierShop from './pages/SupplierShop';
import RROPage from './pages/RRO';
import Login from './pages/Login';
import WarehouseDocuments from './pages/WarehouseDocuments';
import { sendTelegramNotification } from './pages/Telegram';
import { sendViberNotification } from './pages/Viber';

const MOBILE_BREAKPOINT = 768;

export function App() {
  const [data, setData] = useState<AppData>(loadData());
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < MOBILE_BREAKPOINT);
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => window.innerWidth >= MOBILE_BREAKPOINT);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  // ── Auth state ──────────────────────────────────────────────────────────────
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    // Check if remember-me token exists
    const rememberedId = localStorage.getItem('smartkharkov_remember');
    if (rememberedId) {
      const saved = localStorage.getItem('smartkharkov_data');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          const userExists = parsed.users?.find((u: { id: string }) => u.id === rememberedId);
          if (userExists) return true;
        } catch {
          // ignore
        }
      }
    }
    return false;
  });

  const [loggedInUserId, setLoggedInUserId] = useState<string>(() => {
    const rememberedId = localStorage.getItem('smartkharkov_remember');
    return rememberedId || 'u1';
  });

  // ── Persist data ────────────────────────────────────────────────────────────
  useEffect(() => {
    saveData(data);
  }, [data]);

  // ── Mobile detection ─────────────────────────────────────────────────────────
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const handleResize = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const mobile = window.innerWidth < MOBILE_BREAKPOINT;
        setIsMobile(mobile);
        setIsSidebarOpen(!mobile);
      }, 100);
    };
    window.addEventListener('resize', handleResize);
    return () => { window.removeEventListener('resize', handleResize); clearTimeout(timer); };
  }, []);

  const updateData = (newData: Partial<AppData>) => {
    setData(prev => ({ ...prev, ...newData }));
  };

  // ── Auth handlers ───────────────────────────────────────────────────────────
  const handleLogin = (userId: string) => {
    setLoggedInUserId(userId);
    setIsLoggedIn(true);
    updateData({ currentUserId: userId });
    const user = data.users.find(u => u.id === userId);
    setActiveTab(user?.role === 'master' ? 'workorders' : 'dashboard');
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setLoggedInUserId('u1');
    setShowUserMenu(false);
    setShowNotifications(false);
    // Remove remember-me token
    localStorage.removeItem('smartkharkov_remember');
    // Reset current user in data
    updateData({ currentUserId: undefined });
  };

  // ── Show Login screen ───────────────────────────────────────────────────────
  if (!isLoggedIn) {
    return <Login data={data} onLogin={handleLogin} />;
  }

  // ── App logic ───────────────────────────────────────────────────────────────
  const currentUser = data.users.find(u => u.id === loggedInUserId);
  const unreadNotifications = data.notifications.filter(n => !n.isRead);

  const markNotificationAsRead = (id: string) => {
    const updated = data.notifications.map(n =>
      n.id === id ? { ...n, isRead: true } : n
    );
    updateData({ notifications: updated });
  };

  const markAllAsRead = () => {
    const updated = data.notifications.map(n => ({ ...n, isRead: true }));
    updateData({ notifications: updated });
  };

  const addNotification = (notification: Omit<Notification, 'id' | 'date' | 'isRead'>) => {
    const newNotification: Notification = {
      ...notification,
      id: Math.random().toString(36).substr(2, 9),
      date: new Date().toISOString().split('T')[0],
      isRead: false,
    };
    updateData({ notifications: [newNotification, ...data.notifications] });

    // Send Telegram notification if enabled
    if (data.telegramSettings?.enabled) {
      const telegramType = notification.type === 'order' ? 'order'
        : notification.type === 'payment' ? 'payment'
        : notification.type === 'stock' ? 'stock'
        : 'order';
      sendTelegramNotification(
        data.telegramSettings,
        telegramType,
        notification.title,
        notification.message
      );
    }

    // Send Viber notification if enabled
    if (data.viberSettings?.enabled) {
      const viberType = notification.type === 'order' ? 'order'
        : notification.type === 'payment' ? 'payment'
        : notification.type === 'stock' ? 'stock'
        : 'order';
      sendViberNotification(
        data.viberSettings,
        viberType,
        notification.title,
        notification.message
      );
    }
  };

  const isAdmin = currentUser?.role === 'admin';
  const isMaster = currentUser?.role === 'master';

  // ── Navigation ──────────────────────────────────────────────────────────────
  const navGroups = [
    {
      label: 'Головне',
      items: [
        ...(!isMaster ? [{ id: 'dashboard', label: 'Панель', icon: LayoutDashboard }] : []),
        { id: 'workorders', label: 'Наряд-замовлення', icon: Wrench },
        { id: 'diagnosis', label: 'Діагностика', icon: Stethoscope },
        { id: 'clients', label: 'Клієнти', icon: Users },
      ],
    },
    {
      label: 'Склад',
      items: [
        { id: 'inventory', label: 'Склад', icon: Package },
        { id: 'warehousedocs', label: 'Складські документи', icon: Receipt },
        { id: 'suppliershop', label: 'Замовлення запчастин', icon: ShoppingBag },
        { id: 'database', label: 'Бази даних', icon: Database },
      ],
    },
    {
      label: 'Фінанси',
      items: [
        ...(!isMaster ? [{ id: 'expenses', label: 'Витрати', icon: Wallet }] : []),
        ...(isAdmin ? [{ id: 'salary', label: 'Зарплата', icon: Calculator }] : []),
        ...(isAdmin ? [{ id: 'reports', label: 'Звіти', icon: TrendingUp }] : []),
        ...(!isMaster ? [{ id: 'rro', label: 'РРО / ПРРО', icon: Receipt }] : []),
      ],
    },
    {
      label: 'Система',
      items: [
        ...(!isMaster ? [{ id: 'telegram', label: 'Telegram Бот', icon: Bot }] : []),
        ...(isAdmin ? [{ id: 'users', label: 'Користувачі', icon: UserCog }] : []),
        ...(isAdmin ? [{ id: 'settings', label: 'Налаштування', icon: Settings }] : []),
      ],
    },
  ];

  const allNavItems = navGroups.flatMap(g => g.items);

  const accessDenied = (
    <div className="flex flex-col items-center justify-center h-full text-neutral-400 py-20">
      <Settings size={48} className="mb-4 opacity-30" />
      <p className="text-lg font-bold">Доступ заборонено</p>
      <p className="text-sm mt-1">Цей розділ доступний лише адміністратору</p>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return isMaster ? accessDenied : <Dashboard data={data} setActiveTab={setActiveTab} />;
      case 'clients': return <Clients data={data} updateData={updateData} addNotification={addNotification} />;
      case 'inventory': return <Inventory data={data} updateData={updateData} />;
      case 'warehousedocs': return <WarehouseDocuments data={data} updateData={updateData} />;
      case 'workorders': return <WorkOrders data={data} updateData={updateData} addNotification={addNotification} />;
      case 'diagnosis': return <WorkOrders data={data} updateData={updateData} addNotification={addNotification} openDiagnosisByDefault />;
      case 'suppliershop': return <SupplierShop data={data} updateData={updateData} />;
      case 'salary': return isAdmin ? <Salary data={data} /> : accessDenied;
      case 'reports': return isAdmin ? <Reports data={data} /> : accessDenied;
      case 'expenses': return isMaster ? accessDenied : <Expenses data={data} updateData={updateData} />;
      case 'rro': return isMaster ? accessDenied : <RROPage data={data} updateData={updateData} />;
      case 'telegram': return isMaster ? accessDenied : <TelegramPage data={data} onSave={(d) => setData(d)} />;
      case 'users': return isAdmin ? <UsersPage data={data} updateData={updateData} /> : accessDenied;
      case 'settings': return isAdmin ? <SettingsPage data={data} updateData={updateData} /> : accessDenied;
      case 'database': return <DatabasePage data={data} updateData={updateData} />;
      default: return <Dashboard data={data} setActiveTab={setActiveTab} />;
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'order': return '📋';
      case 'stock': return '📦';
      case 'payment': return '💰';
      default: return '🔔';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'Адміністратор';
      case 'manager': return 'Менеджер';
      case 'master': return 'Майстер';
      default: return role;
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-700';
      case 'manager': return 'bg-blue-100 text-blue-700';
      case 'master': return 'bg-green-100 text-green-700';
      default: return 'bg-neutral-100 text-neutral-700';
    }
  };

  return (
    <div className="flex h-screen bg-neutral-50 text-neutral-900 font-sans overflow-hidden">
      {/* ── Mobile sidebar backdrop ──────────────────────────────────────────── */}
      {isMobile && isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
      <aside className={`bg-neutral-900 text-white flex flex-col shrink-0 ${
        isMobile
          ? `fixed inset-y-0 left-0 z-50 w-64 transition-transform duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`
          : `transition-all duration-300 ${isSidebarOpen ? 'w-64' : 'w-16'}`
      }`}>
        {/* Logo */}
        <div className={`p-4 flex items-center gap-3 border-b border-neutral-800 shrink-0 ${!isSidebarOpen ? 'justify-center' : ''}`}>
          <div className="w-9 h-9 bg-[#ffcc00] rounded-lg flex items-center justify-center shrink-0">
            <Wrench className="text-black w-5 h-5" />
          </div>
          {isSidebarOpen && (
            <span className="font-black text-lg tracking-tight text-[#ffcc00] truncate">
              SmartKharkov
            </span>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
          {navGroups.map(group => (
            <div key={group.label}>
              {isSidebarOpen && (
                <p className="text-[10px] uppercase font-bold tracking-widest text-neutral-600 px-2 mb-1">
                  {group.label}
                </p>
              )}
              <div className="space-y-0.5">
                {group.items.map(item => (
                  <button
                    key={item.id}
                    onClick={() => { setActiveTab(item.id); if (isMobile) setIsSidebarOpen(false); }}
                    title={!isSidebarOpen ? item.label : undefined}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm ${
                      activeTab === item.id
                        ? 'bg-[#ffcc00] text-black font-bold shadow-sm'
                        : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'
                    } ${!isSidebarOpen ? 'justify-center' : ''}`}
                  >
                    <item.icon size={18} className="shrink-0" />
                    {isSidebarOpen && <span className="truncate">{item.label}</span>}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Toggle sidebar */}
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-4 text-neutral-500 hover:text-white flex items-center justify-center border-t border-neutral-800 transition-colors shrink-0"
          title={isSidebarOpen ? 'Згорнути' : 'Розгорнути'}
        >
          {isSidebarOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </aside>

      {/* ── Main Content ─────────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Header */}
        <header className="h-14 bg-white border-b flex items-center justify-between px-5 shrink-0 shadow-sm">
          {/* Mobile hamburger button */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              className="md:hidden p-2 text-neutral-500 hover:bg-neutral-100 rounded-lg transition-colors shrink-0"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              title="Меню"
            >
              <Menu size={20} />
            </button>
            <h2 className="text-base font-bold text-neutral-800 truncate">
              {allNavItems.find(i => i.id === activeTab)?.label || 'Панель'}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            {/* Notifications bell */}
            <div className="relative">
              <button
                onClick={() => { setShowNotifications(!showNotifications); setShowUserMenu(false); }}
                className="p-2 text-neutral-500 hover:bg-neutral-100 rounded-full relative transition-colors"
                title="Сповіщення"
              >
                <Bell size={19} />
                {unreadNotifications.length > 0 && (
                  <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-red-500 rounded-full text-[9px] text-white font-bold flex items-center justify-center">
                    {unreadNotifications.length > 9 ? '9+' : unreadNotifications.length}
                  </span>
                )}
              </button>

              {/* Notification dropdown */}
              {showNotifications && (
                <div className="absolute right-0 top-11 w-80 bg-white rounded-xl shadow-2xl border z-50 overflow-hidden">
                  <div className="p-3 border-b flex items-center justify-between bg-neutral-50">
                    <h3 className="font-bold text-sm">
                      Сповіщення
                      {unreadNotifications.length > 0 && (
                        <span className="ml-2 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                          {unreadNotifications.length}
                        </span>
                      )}
                    </h3>
                    {unreadNotifications.length > 0 && (
                      <button
                        onClick={markAllAsRead}
                        className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                      >
                        <Check size={11} /> Прочитати всі
                      </button>
                    )}
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {data.notifications.length > 0 ? (
                      data.notifications.slice(0, 12).map(n => (
                        <div
                          key={n.id}
                          onClick={() => markNotificationAsRead(n.id)}
                          className={`p-3 border-b hover:bg-neutral-50 cursor-pointer flex gap-3 transition-colors ${!n.isRead ? 'bg-blue-50' : ''}`}
                        >
                          <span className="text-base shrink-0">{getNotificationIcon(n.type)}</span>
                          <div className="flex-1 min-w-0">
                            <p className={`text-xs ${!n.isRead ? 'font-bold' : 'font-medium'} truncate`}>{n.title}</p>
                            <p className="text-[11px] text-neutral-500 truncate">{n.message}</p>
                            <p className="text-[10px] text-neutral-400 mt-0.5">{n.date}</p>
                          </div>
                          {!n.isRead && <span className="w-2 h-2 bg-blue-500 rounded-full shrink-0 mt-1"></span>}
                        </div>
                      ))
                    ) : (
                      <div className="p-8 text-center text-neutral-400 text-sm">
                        Немає сповіщень
                      </div>
                    )}
                  </div>
                  {data.notifications.length > 12 && (
                    <div className="p-2 text-center border-t">
                      <p className="text-xs text-neutral-400">
                        Показано 12 з {data.notifications.length}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Separator */}
            <div className="w-px h-6 bg-neutral-200" />

            {/* User menu */}
            <div className="relative">
              <button
                onClick={() => { setShowUserMenu(!showUserMenu); setShowNotifications(false); }}
                className="flex items-center gap-2.5 hover:bg-neutral-100 px-2.5 py-1.5 rounded-xl transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-[#ffcc00] flex items-center justify-center text-sm font-black text-black shrink-0">
                  {currentUser?.name?.charAt(0) || 'U'}
                </div>
                <div className="text-left hidden sm:block">
                  <p className="text-xs font-bold text-neutral-800 leading-tight">{currentUser?.name || 'Користувач'}</p>
                  <p className="text-[10px] text-neutral-400 leading-tight">{getRoleLabel(currentUser?.role || '')}</p>
                </div>
                <ChevronDown size={14} className={`text-neutral-400 transition-transform hidden sm:block ${showUserMenu ? 'rotate-180' : ''}`} />
              </button>

              {/* User dropdown */}
              {showUserMenu && (
                <div className="absolute right-0 top-12 w-64 bg-white rounded-xl shadow-2xl border z-50 overflow-hidden">
                  {/* Profile header */}
                  <div className="p-4 bg-neutral-900 text-white">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-[#ffcc00] flex items-center justify-center text-lg font-black text-black">
                        {currentUser?.name?.charAt(0) || 'U'}
                      </div>
                      <div>
                        <p className="font-bold">{currentUser?.name}</p>
                        <p className="text-xs text-neutral-400">@{currentUser?.username}</p>
                        <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${getRoleBadgeColor(currentUser?.role || '')}`}>
                          {getRoleLabel(currentUser?.role || '')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Menu items */}
                  <div className="p-2">
                    {/* Permissions summary */}
                    <div className="px-3 py-2 mb-1">
                      <p className="text-[10px] uppercase font-bold text-neutral-400 mb-2">Права доступу:</p>
                      <div className="flex flex-wrap gap-1">
                        {currentUser && Object.entries(currentUser.permissions)
                          .filter(([, v]) => v)
                          .slice(0, 4)
                          .map(([key]) => {
                            const labels: Record<string, string> = {
                              canCreateOrders: 'Замовлення',
                              canEditOrders: 'Редагування',
                              canDeleteOrders: 'Видалення',
                              canManageClients: 'Клієнти',
                              canManageInventory: 'Склад',
                              canViewReports: 'Звіти',
                              canManageUsers: 'Користувачі',
                              canManageSettings: 'Налаштування',
                            };
                            return (
                              <span key={key} className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-[9px] font-bold">
                                ✓ {labels[key]}
                              </span>
                            );
                          })
                        }
                        {currentUser && Object.values(currentUser.permissions).filter(v => v).length > 4 && (
                          <span className="px-1.5 py-0.5 bg-neutral-100 text-neutral-500 rounded text-[9px]">
                            +{Object.values(currentUser.permissions).filter(v => v).length - 4}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="border-t my-1" />

                    {isAdmin && (
                    <button
                      onClick={() => { setActiveTab('settings'); setShowUserMenu(false); }}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-neutral-100 transition-colors text-sm text-neutral-700 font-medium"
                    >
                      <Settings size={15} className="text-neutral-400" />
                      Налаштування системи
                    </button>
                    )}

                    {isAdmin && (
                    <button
                      onClick={() => { setActiveTab('users'); setShowUserMenu(false); }}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-neutral-100 transition-colors text-sm text-neutral-700 font-medium"
                    >
                      <UserCog size={15} className="text-neutral-400" />
                      Керування користувачами
                    </button>
                    )}

                    <div className="border-t my-1" />

                    {/* LOGOUT BUTTON */}
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-red-50 transition-colors text-sm font-bold text-red-600 group"
                    >
                      <LogOut size={15} className="text-red-500 group-hover:text-red-600" />
                      Вийти з системи
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content area */}
        <div className="flex-1 overflow-y-auto p-5">
          {renderContent()}
        </div>
      </main>

      {/* Click outside overlays */}
      {(showNotifications || showUserMenu) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => { setShowNotifications(false); setShowUserMenu(false); }}
        />
      )}
    </div>
  );
}
