import { useState, useMemo } from 'react';
import { AppData } from '../types';
import { format, startOfMonth, parseISO, startOfWeek, endOfWeek, startOfYear, subDays } from 'date-fns';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  LineChart,
  Line,
  Legend
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Package, 
  Wrench, 
  FileText, 
  Printer, 
  Download,
  Filter,
  Calendar,
  User,
  Car,
  CreditCard,
  Tag,
  Truck,
  X,
  ChevronDown
} from 'lucide-react';

type QuickPeriod = 'today' | 'yesterday' | 'week' | 'month' | 'quarter' | 'year' | 'custom';

export default function Reports({ data }: { data: AppData }) {
  const [dateRange, setDateRange] = useState({
    start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd')
  });
  const [quickPeriod, setQuickPeriod] = useState<QuickPeriod>('month');
  const [activeReport, setActiveReport] = useState<'financial' | 'warehouse' | 'work'>('financial');
  const [showFilters, setShowFilters] = useState(false);

  // Filters
  const [filters, setFilters] = useState({
    // Financial filters
    paymentType: 'all' as 'all' | 'Cash' | 'Card' | 'Bank',
    clientId: 'all',
    
    // Warehouse filters
    category: 'all',
    supplierId: 'all',
    stockStatus: 'all' as 'all' | 'inStock' | 'lowStock' | 'outOfStock',
    
    // Work filters
    masterId: 'all',
    status: 'all' as 'all' | 'New' | 'InProgress' | 'Completed' | 'Cancelled',
    carMake: 'all'
  });

  // Quick period selection
  const handleQuickPeriod = (period: QuickPeriod) => {
    setQuickPeriod(period);
    const today = new Date();
    let start: Date;
    let end: Date = today;

    switch (period) {
      case 'today':
        start = today;
        break;
      case 'yesterday':
        start = subDays(today, 1);
        end = subDays(today, 1);
        break;
      case 'week':
        start = startOfWeek(today, { weekStartsOn: 1 });
        end = endOfWeek(today, { weekStartsOn: 1 });
        break;
      case 'month':
        start = startOfMonth(today);
        break;
      case 'quarter':
        start = subDays(today, 90);
        break;
      case 'year':
        start = startOfYear(today);
        break;
      default:
        return;
    }

    setDateRange({
      start: format(start, 'yyyy-MM-dd'),
      end: format(end, 'yyyy-MM-dd')
    });
  };

  // Filtered data
  const filteredOrders = useMemo(() => {
    return data.workOrders.filter(o => {
      if (o.date < dateRange.start || o.date > dateRange.end) return false;
      if (filters.paymentType !== 'all' && o.paymentType !== filters.paymentType) return false;
      if (filters.clientId !== 'all' && o.clientId !== filters.clientId) return false;
      if (filters.masterId !== 'all' && o.masterId !== filters.masterId) return false;
      if (filters.status !== 'all' && o.status !== filters.status) return false;
      if (filters.carMake !== 'all') {
        const client = data.clients.find(c => c.id === o.clientId);
        if (client?.car.make !== filters.carMake) return false;
      }
      return true;
    });
  }, [data.workOrders, data.clients, dateRange, filters]);

  const filteredInventory = useMemo(() => {
    return data.inventory.filter(item => {
      if (filters.category !== 'all' && item.category !== filters.category) return false;
      if (filters.supplierId !== 'all' && item.supplierId !== filters.supplierId) return false;
      if (filters.stockStatus !== 'all') {
        if (filters.stockStatus === 'outOfStock' && item.stock > 0) return false;
        if (filters.stockStatus === 'lowStock' && (item.stock === 0 || item.stock > item.minStock)) return false;
        if (filters.stockStatus === 'inStock' && item.stock <= item.minStock) return false;
      }
      return true;
    });
  }, [data.inventory, filters]);

  const filteredExpenses = useMemo(() => {
    return data.expenses.filter(e => 
      e.date >= dateRange.start && e.date <= dateRange.end
    );
  }, [data.expenses, dateRange]);

  const paidOrders = filteredOrders.filter(o => o.isPaid);
  const completedOrders = filteredOrders.filter(o => o.status === 'Completed');

  const totalRevenue = paidOrders.reduce((acc, curr) => acc + curr.total, 0);
  const totalExpenses = filteredExpenses.reduce((acc, curr) => acc + curr.amount, 0);
  const netProfit = totalRevenue - totalExpenses;

  // Payment distribution
  const paymentData = [
    { name: 'Готівка', value: paidOrders.filter(o => o.paymentType === 'Cash').reduce((acc, curr) => acc + curr.total, 0), color: '#ffcc00' },
    { name: 'Карта', value: paidOrders.filter(o => o.paymentType === 'Card').reduce((acc, curr) => acc + curr.total, 0), color: '#2563eb' },
    { name: 'Безготівковий', value: paidOrders.filter(o => o.paymentType === 'Bank').reduce((acc, curr) => acc + curr.total, 0), color: '#10b981' },
  ];

  // Warehouse stats
  const totalInventoryValue = filteredInventory.reduce((acc, p) => acc + (p.purchasePrice * p.stock), 0);
  const totalSaleValue = filteredInventory.reduce((acc, p) => acc + (p.salePrice * p.stock), 0);
  const lowStockCount = filteredInventory.filter(p => p.stock <= p.minStock && p.stock > 0).length;
  const outOfStockCount = filteredInventory.filter(p => p.stock === 0).length;

  // Category breakdown
  const categoryData = data.categories.map(cat => {
    const items = filteredInventory.filter(p => p.category === cat.name);
    return {
      name: cat.name,
      count: items.length,
      value: items.reduce((acc, p) => acc + (p.salePrice * p.stock), 0),
      cost: items.reduce((acc, p) => acc + (p.purchasePrice * p.stock), 0),
      stock: items.reduce((acc, p) => acc + p.stock, 0),
    };
  }).filter(c => c.count > 0);

  // Work stats - by master
  const masterStats = data.employees.filter(e => e.role === 'Master').map(master => {
    const masterOrders = completedOrders.filter(o => 
      o.masterId === master.id || o.services.some(s => s.masterId === master.id)
    );
    const totalServices = masterOrders.reduce((acc, o) => {
      return acc + o.services.filter(s => s.masterId === master.id).reduce((a, s) => a + s.price, 0);
    }, 0);
    const totalHours = masterOrders.reduce((acc, o) => {
      return acc + o.services.filter(s => s.masterId === master.id).reduce((a, s) => a + s.hours, 0);
    }, 0);
    return {
      id: master.id,
      name: master.name,
      orders: masterOrders.length,
      revenue: totalServices,
      hours: totalHours,
    };
  });

  // Daily revenue chart
  const dailyData: { date: string; revenue: number; orders: number; expenses: number }[] = [];
  const dateMap = new Map<string, { revenue: number; orders: number; expenses: number }>();
  
  paidOrders.forEach(o => {
    const existing = dateMap.get(o.date) || { revenue: 0, orders: 0, expenses: 0 };
    dateMap.set(o.date, {
      ...existing,
      revenue: existing.revenue + o.total,
      orders: existing.orders + 1,
    });
  });

  filteredExpenses.forEach(e => {
    const existing = dateMap.get(e.date) || { revenue: 0, orders: 0, expenses: 0 };
    dateMap.set(e.date, {
      ...existing,
      expenses: existing.expenses + e.amount,
    });
  });
  
  dateMap.forEach((value, key) => {
    dailyData.push({ date: format(parseISO(key), 'dd.MM'), ...value });
  });
  dailyData.sort((a, b) => a.date.localeCompare(b.date));

  // Car makes for filter
  const carMakes = [...new Set(data.clients.map(c => c.car.make))].filter(Boolean);

  // Expense categories breakdown
  const expenseCategoryData = filteredExpenses.reduce((acc, e) => {
    const existing = acc.find(x => x.name === e.category);
    if (existing) {
      existing.value += e.amount;
    } else {
      acc.push({ name: e.category, value: e.amount });
    }
    return acc;
  }, [] as { name: string; value: number }[]);

  // Color palette for charts
const _COLORS = ['#ffcc00', '#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];
void _COLORS;

  const handlePrintReport = () => {
    window.print();
  };

  const handleExport = () => {
    // Generate CSV based on active report
    let csvContent = '';
    let filename = '';

    if (activeReport === 'financial') {
      csvContent = 'Дата,Номер замовлення,Клієнт,Тип оплати,Сума\n';
      paidOrders.forEach(o => {
        const client = data.clients.find(c => c.id === o.clientId);
        csvContent += `${o.date},${o.id},${client?.name || '-'},${o.paymentType},${o.total}\n`;
      });
      filename = `financial_report_${dateRange.start}_${dateRange.end}.csv`;
    } else if (activeReport === 'warehouse') {
      csvContent = 'Артикул,Назва,Категорія,Постачальник,Залишок,Закупівельна,Продажна,Загальна вартість\n';
      filteredInventory.forEach(item => {
        const supplier = data.suppliers.find(s => s.id === item.supplierId);
        csvContent += `${item.sku},${item.name},${item.category},${supplier?.name || '-'},${item.stock},${item.purchasePrice},${item.salePrice},${item.salePrice * item.stock}\n`;
      });
      filename = `warehouse_report_${dateRange.start}_${dateRange.end}.csv`;
    } else {
      csvContent = 'Дата,Номер,Клієнт,Авто,Майстер,Статус,Сума\n';
      filteredOrders.forEach(o => {
        const client = data.clients.find(c => c.id === o.clientId);
        const master = data.employees.find(e => e.id === o.masterId);
        csvContent += `${o.date},${o.id},${client?.name || '-'},${client?.car.make} ${client?.car.model},${master?.name || '-'},${o.status},${o.total}\n`;
      });
      filename = `work_report_${dateRange.start}_${dateRange.end}.csv`;
    }

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  };

  const resetFilters = () => {
    setFilters({
      paymentType: 'all',
      clientId: 'all',
      category: 'all',
      supplierId: 'all',
      stockStatus: 'all',
      masterId: 'all',
      status: 'all',
      carMake: 'all'
    });
  };

  const activeFiltersCount = Object.values(filters).filter(v => v !== 'all').length;

  return (
    <div className="space-y-6">
      {/* Header & Period Selection */}
      <div className="bg-white p-4 rounded-xl shadow-sm border">
        {/* Report Type Tabs */}
        <div className="flex flex-wrap gap-2 mb-4">
          <button 
            onClick={() => setActiveReport('financial')}
            className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-all ${activeReport === 'financial' ? 'bg-[#ffcc00] text-black shadow-md' : 'bg-neutral-100 hover:bg-neutral-200'}`}
          >
            <DollarSign size={16} /> Фінансовий
          </button>
          <button 
            onClick={() => setActiveReport('warehouse')}
            className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-all ${activeReport === 'warehouse' ? 'bg-[#ffcc00] text-black shadow-md' : 'bg-neutral-100 hover:bg-neutral-200'}`}
          >
            <Package size={16} /> Склад
          </button>
          <button 
            onClick={() => setActiveReport('work')}
            className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-all ${activeReport === 'work' ? 'bg-[#ffcc00] text-black shadow-md' : 'bg-neutral-100 hover:bg-neutral-200'}`}
          >
            <Wrench size={16} /> Виконані роботи
          </button>
        </div>

        {/* Quick Period & Date Range */}
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-neutral-500 flex items-center gap-1">
              <Calendar size={14} /> Період:
            </span>
            <div className="flex flex-wrap gap-1">
              {[
                { key: 'today', label: 'Сьогодні' },
                { key: 'yesterday', label: 'Вчора' },
                { key: 'week', label: 'Тиждень' },
                { key: 'month', label: 'Місяць' },
                { key: 'quarter', label: 'Квартал' },
                { key: 'year', label: 'Рік' },
              ].map(p => (
                <button
                  key={p.key}
                  onClick={() => handleQuickPeriod(p.key as QuickPeriod)}
                  className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${
                    quickPeriod === p.key 
                      ? 'bg-neutral-900 text-white' 
                      : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input 
              type="date" 
              value={dateRange.start}
              onChange={(e) => {
                setDateRange(prev => ({ ...prev, start: e.target.value }));
                setQuickPeriod('custom');
              }}
              className="border rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-[#ffcc00]"
            />
            <span className="text-neutral-400">—</span>
            <input 
              type="date" 
              value={dateRange.end}
              onChange={(e) => {
                setDateRange(prev => ({ ...prev, end: e.target.value }));
                setQuickPeriod('custom');
              }}
              className="border rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-[#ffcc00]"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t">
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-all ${
              showFilters || activeFiltersCount > 0 
                ? 'bg-blue-100 text-blue-700' 
                : 'bg-neutral-100 hover:bg-neutral-200'
            }`}
          >
            <Filter size={16} /> 
            Фільтри
            {activeFiltersCount > 0 && (
              <span className="bg-blue-600 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                {activeFiltersCount}
              </span>
            )}
            <ChevronDown size={14} className={`transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>
          
          {activeFiltersCount > 0 && (
            <button 
              onClick={resetFilters}
              className="px-3 py-2 rounded-lg text-sm flex items-center gap-1 text-red-600 hover:bg-red-50"
            >
              <X size={14} /> Скинути фільтри
            </button>
          )}

          <div className="flex-1" />

          <button 
            onClick={handleExport}
            className="bg-neutral-100 hover:bg-neutral-200 px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-all"
          >
            <Download size={16} /> Експорт CSV
          </button>
          <button 
            onClick={handlePrintReport}
            className="bg-neutral-100 hover:bg-neutral-200 px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-all"
          >
            <Printer size={16} /> Друк
          </button>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t bg-neutral-50 -mx-4 -mb-4 px-4 pb-4 rounded-b-xl">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Financial Filters */}
              {activeReport === 'financial' && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-neutral-500 mb-1 flex items-center gap-1">
                      <CreditCard size={12} /> Тип оплати
                    </label>
                    <select
                      value={filters.paymentType}
                      onChange={(e) => setFilters(f => ({ ...f, paymentType: e.target.value as any }))}
                      className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#ffcc00]"
                    >
                      <option value="all">Всі типи</option>
                      <option value="Cash">Готівка</option>
                      <option value="Card">Карта</option>
                      <option value="Bank">Безготівковий</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-neutral-500 mb-1 flex items-center gap-1">
                      <User size={12} /> Клієнт
                    </label>
                    <select
                      value={filters.clientId}
                      onChange={(e) => setFilters(f => ({ ...f, clientId: e.target.value }))}
                      className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#ffcc00]"
                    >
                      <option value="all">Всі клієнти</option>
                      {data.clients.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              {/* Warehouse Filters */}
              {activeReport === 'warehouse' && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-neutral-500 mb-1 flex items-center gap-1">
                      <Tag size={12} /> Категорія
                    </label>
                    <select
                      value={filters.category}
                      onChange={(e) => setFilters(f => ({ ...f, category: e.target.value }))}
                      className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#ffcc00]"
                    >
                      <option value="all">Всі категорії</option>
                      {data.categories.map(c => (
                        <option key={c.id} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-neutral-500 mb-1 flex items-center gap-1">
                      <Truck size={12} /> Постачальник
                    </label>
                    <select
                      value={filters.supplierId}
                      onChange={(e) => setFilters(f => ({ ...f, supplierId: e.target.value }))}
                      className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#ffcc00]"
                    >
                      <option value="all">Всі постачальники</option>
                      {data.suppliers.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-neutral-500 mb-1 flex items-center gap-1">
                      <Package size={12} /> Стан залишків
                    </label>
                    <select
                      value={filters.stockStatus}
                      onChange={(e) => setFilters(f => ({ ...f, stockStatus: e.target.value as any }))}
                      className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#ffcc00]"
                    >
                      <option value="all">Всі товари</option>
                      <option value="inStock">В наявності</option>
                      <option value="lowStock">Критичний залишок</option>
                      <option value="outOfStock">Немає в наявності</option>
                    </select>
                  </div>
                </>
              )}

              {/* Work Filters */}
              {activeReport === 'work' && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-neutral-500 mb-1 flex items-center gap-1">
                      <User size={12} /> Майстер
                    </label>
                    <select
                      value={filters.masterId}
                      onChange={(e) => setFilters(f => ({ ...f, masterId: e.target.value }))}
                      className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#ffcc00]"
                    >
                      <option value="all">Всі майстри</option>
                      {data.employees.filter(e => e.role === 'Master').map(m => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-neutral-500 mb-1 flex items-center gap-1">
                      <FileText size={12} /> Статус
                    </label>
                    <select
                      value={filters.status}
                      onChange={(e) => setFilters(f => ({ ...f, status: e.target.value as any }))}
                      className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#ffcc00]"
                    >
                      <option value="all">Всі статуси</option>
                      <option value="New">Новий</option>
                      <option value="InProgress">В роботі</option>
                      <option value="Completed">Завершено</option>
                      <option value="Cancelled">Скасовано</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-neutral-500 mb-1 flex items-center gap-1">
                      <Car size={12} /> Марка авто
                    </label>
                    <select
                      value={filters.carMake}
                      onChange={(e) => setFilters(f => ({ ...f, carMake: e.target.value }))}
                      className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#ffcc00]"
                    >
                      <option value="all">Всі марки</option>
                      {carMakes.map(make => (
                        <option key={make} value={make}>{make}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-neutral-500 mb-1 flex items-center gap-1">
                      <User size={12} /> Клієнт
                    </label>
                    <select
                      value={filters.clientId}
                      onChange={(e) => setFilters(f => ({ ...f, clientId: e.target.value }))}
                      className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#ffcc00]"
                    >
                      <option value="all">Всі клієнти</option>
                      {data.clients.map(c => (
                        <option key={c.id} value={c.id}>{c.name} ({c.car.make} {c.car.model})</option>
                      ))}
                    </select>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Financial Report */}
      {activeReport === 'financial' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-white p-5 rounded-2xl shadow-sm border">
              <p className="text-neutral-500 text-sm font-medium flex items-center gap-1">
                <TrendingUp size={14} className="text-green-500" /> Дохід
              </p>
              <h3 className="text-2xl font-bold text-neutral-900">{totalRevenue.toLocaleString()} ₴</h3>
              <p className="text-xs text-neutral-400 mt-1">{paidOrders.length} оплачених замовлень</p>
            </div>
            <div className="bg-white p-5 rounded-2xl shadow-sm border">
              <p className="text-neutral-500 text-sm font-medium flex items-center gap-1">
                <TrendingDown size={14} className="text-red-500" /> Витрати
              </p>
              <h3 className="text-2xl font-bold text-neutral-900">{totalExpenses.toLocaleString()} ₴</h3>
              <p className="text-xs text-neutral-400 mt-1">{filteredExpenses.length} записів</p>
            </div>
            <div className="bg-white p-5 rounded-2xl shadow-sm border bg-gradient-to-br from-[#ffcc00]/10 to-transparent">
              <p className="text-neutral-500 text-sm font-medium flex items-center gap-1">
                <DollarSign size={14} className="text-[#ffcc00]" /> Чистий прибуток
              </p>
              <h3 className={`text-2xl font-bold ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {netProfit.toLocaleString()} ₴
              </h3>
              <p className="text-xs text-neutral-400 mt-1">
                Маржа: {totalRevenue > 0 ? Math.round((netProfit / totalRevenue) * 100) : 0}%
              </p>
            </div>
            <div className="bg-white p-5 rounded-2xl shadow-sm border">
              <p className="text-neutral-500 text-sm font-medium flex items-center gap-1">
                <FileText size={14} className="text-blue-500" /> Середній чек
              </p>
              <h3 className="text-2xl font-bold text-neutral-900">
                {paidOrders.length > 0 ? Math.round(totalRevenue / paidOrders.length).toLocaleString() : 0} ₴
              </h3>
              <p className="text-xs text-neutral-400 mt-1">за замовлення</p>
            </div>
            <div className="bg-white p-5 rounded-2xl shadow-sm border">
              <p className="text-neutral-500 text-sm font-medium flex items-center gap-1">
                <Wrench size={14} className="text-purple-500" /> Виконано робіт
              </p>
              <h3 className="text-2xl font-bold text-neutral-900">{completedOrders.length}</h3>
              <p className="text-xs text-neutral-400 mt-1">
                {filteredOrders.length > 0 ? Math.round((completedOrders.length / filteredOrders.length) * 100) : 0}% завершено
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border">
              <h3 className="font-bold mb-4">📈 Дохід та витрати по днях</h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dailyData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="date" fontSize={12} />
                    <YAxis fontSize={12} />
                    <Tooltip formatter={(value) => `${value} ₴`} />
                    <Legend />
                    <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981' }} name="Дохід" />
                    <Line type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={2} dot={{ fill: '#ef4444' }} name="Витрати" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border">
              <h3 className="font-bold mb-4">💳 Розподіл оплат</h3>
              <div className="h-72 flex items-center">
                {paymentData.some(d => d.value > 0) ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={paymentData.filter(d => d.value > 0)}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                      >
                        {paymentData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => `${value} ₴`} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="w-full text-center text-neutral-400">Немає даних за обраний період</div>
                )}
              </div>
              <div className="flex justify-center gap-4 mt-2">
                {paymentData.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span>{item.name}: <strong>{item.value.toLocaleString()} ₴</strong></span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border">
            <h3 className="font-bold mb-4">📊 Витрати по категоріях</h3>
            {expenseCategoryData.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={expenseCategoryData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" fontSize={12} />
                    <YAxis type="category" dataKey="name" fontSize={12} width={120} />
                    <Tooltip formatter={(value) => `${value} ₴`} />
                    <Bar dataKey="value" fill="#ef4444" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="text-center py-12 text-neutral-400">Немає витрат за обраний період</div>
            )}
          </div>
        </>
      )}

      {/* Warehouse Report */}
      {activeReport === 'warehouse' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-white p-5 rounded-2xl shadow-sm border">
              <p className="text-neutral-500 text-sm font-medium">📦 Всього позицій</p>
              <h3 className="text-2xl font-bold text-neutral-900">{filteredInventory.length}</h3>
              <p className="text-xs text-neutral-400 mt-1">найменувань</p>
            </div>
            <div className="bg-white p-5 rounded-2xl shadow-sm border">
              <p className="text-neutral-500 text-sm font-medium">💰 Собівартість</p>
              <h3 className="text-2xl font-bold text-neutral-900">{totalInventoryValue.toLocaleString()} ₴</h3>
              <p className="text-xs text-neutral-400 mt-1">закупівельна ціна</p>
            </div>
            <div className="bg-white p-5 rounded-2xl shadow-sm border">
              <p className="text-neutral-500 text-sm font-medium">📈 Роздрібна вартість</p>
              <h3 className="text-2xl font-bold text-green-600">{totalSaleValue.toLocaleString()} ₴</h3>
              <p className="text-xs text-neutral-400 mt-1">потенційний виторг</p>
            </div>
            <div className="bg-white p-5 rounded-2xl shadow-sm border bg-gradient-to-br from-blue-50 to-transparent">
              <p className="text-neutral-500 text-sm font-medium">💎 Потенційний прибуток</p>
              <h3 className="text-2xl font-bold text-blue-600">{(totalSaleValue - totalInventoryValue).toLocaleString()} ₴</h3>
              <p className="text-xs text-neutral-400 mt-1">
                Маржа: {totalInventoryValue > 0 ? Math.round(((totalSaleValue - totalInventoryValue) / totalInventoryValue) * 100) : 0}%
              </p>
            </div>
            <div className="bg-white p-5 rounded-2xl shadow-sm border">
              <p className="text-neutral-500 text-sm font-medium">⚠️ Потребують уваги</p>
              <h3 className={`text-2xl font-bold ${(lowStockCount + outOfStockCount) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {lowStockCount + outOfStockCount}
              </h3>
              <p className="text-xs text-neutral-400 mt-1">
                {lowStockCount} критичних, {outOfStockCount} відсутніх
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border">
              <h3 className="font-bold mb-4">📊 Вартість по категоріях</h3>
              <div className="h-72">
                {categoryData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={categoryData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" fontSize={12} />
                      <YAxis type="category" dataKey="name" fontSize={12} width={100} />
                      <Tooltip formatter={(value) => `${value} ₴`} />
                      <Legend />
                      <Bar dataKey="value" fill="#ffcc00" radius={[0, 4, 4, 0]} name="Продажна" />
                      <Bar dataKey="cost" fill="#94a3b8" radius={[0, 4, 4, 0]} name="Закупівельна" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-neutral-400">Немає даних</div>
                )}
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border">
              <h3 className="font-bold mb-4">🚚 Розподіл по постачальниках</h3>
              <div className="space-y-3 max-h-72 overflow-y-auto">
                {data.suppliers.map(supplier => {
                  const items = filteredInventory.filter(p => p.supplierId === supplier.id);
                  const value = items.reduce((acc, p) => acc + (p.salePrice * p.stock), 0);
                  const totalStock = items.reduce((acc, p) => acc + p.stock, 0);
                  const maxValue = Math.max(...data.suppliers.map(s => {
                    const supplierItems = filteredInventory.filter(p => p.supplierId === s.id);
                    return supplierItems.reduce((acc, p) => acc + (p.salePrice * p.stock), 0);
                  }));
                  
                  return (
                    <div key={supplier.id} className="p-4 bg-neutral-50 rounded-xl">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-medium">{supplier.name}</span>
                        <span className="font-bold">{value.toLocaleString()} ₴</span>
                      </div>
                      <div className="flex justify-between text-xs text-neutral-500 mb-2">
                        <span>{items.length} позицій</span>
                        <span>{totalStock} шт на складі</span>
                      </div>
                      <div className="bg-neutral-200 rounded-full h-2">
                        <div 
                          className="bg-[#ffcc00] h-2 rounded-full transition-all" 
                          style={{ width: `${maxValue > 0 ? (value / maxValue) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Detailed Table */}
          <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
            <div className="p-4 border-b bg-neutral-50 flex justify-between items-center">
              <h3 className="font-bold">📋 Детальний звіт по складу ({filteredInventory.length} позицій)</h3>
            </div>
            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-sm">
                <thead className="bg-neutral-50 text-neutral-500 text-[10px] uppercase font-bold sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left">Артикул</th>
                    <th className="px-4 py-3 text-left">Найменування</th>
                    <th className="px-4 py-3 text-left">Категорія</th>
                    <th className="px-4 py-3 text-left">Постачальник</th>
                    <th className="px-4 py-3 text-center">Залишок</th>
                    <th className="px-4 py-3 text-right">Закупівельна</th>
                    <th className="px-4 py-3 text-right">Продажна</th>
                    <th className="px-4 py-3 text-right">Маржа</th>
                    <th className="px-4 py-3 text-right">Загальна вартість</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredInventory.map(item => {
                    const supplier = data.suppliers.find(s => s.id === item.supplierId);
                    const margin = item.purchasePrice > 0 
                      ? Math.round(((item.salePrice - item.purchasePrice) / item.purchasePrice) * 100) 
                      : 0;
                    return (
                      <tr key={item.id} className={`${
                        item.stock === 0 ? 'bg-red-50' : 
                        item.stock <= item.minStock ? 'bg-yellow-50' : ''
                      }`}>
                        <td className="px-4 py-3 font-mono text-xs">{item.sku}</td>
                        <td className="px-4 py-3 font-medium">{item.name}</td>
                        <td className="px-4 py-3 text-neutral-500">{item.category}</td>
                        <td className="px-4 py-3 text-neutral-500">{supplier?.name || '-'}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-1 rounded text-xs font-bold ${
                            item.stock === 0 ? 'bg-red-100 text-red-700' :
                            item.stock <= item.minStock ? 'bg-yellow-100 text-yellow-700' :
                            'bg-green-100 text-green-700'
                          }`}>
                            {item.stock} шт
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">{item.purchasePrice} ₴</td>
                        <td className="px-4 py-3 text-right">{item.salePrice} ₴</td>
                        <td className="px-4 py-3 text-right">
                          <span className={margin >= 30 ? 'text-green-600' : margin >= 15 ? 'text-yellow-600' : 'text-red-600'}>
                            {margin}%
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-bold">{(item.salePrice * item.stock).toLocaleString()} ₴</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-neutral-100 font-bold sticky bottom-0">
                  <tr>
                    <td colSpan={8} className="px-4 py-3 text-right">ВСЬОГО:</td>
                    <td className="px-4 py-3 text-right">{totalSaleValue.toLocaleString()} ₴</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Work Report */}
      {activeReport === 'work' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-white p-5 rounded-2xl shadow-sm border">
              <p className="text-neutral-500 text-sm font-medium">📋 Всього замовлень</p>
              <h3 className="text-2xl font-bold text-neutral-900">{filteredOrders.length}</h3>
              <p className="text-xs text-neutral-400 mt-1">за обраний період</p>
            </div>
            <div className="bg-white p-5 rounded-2xl shadow-sm border">
              <p className="text-neutral-500 text-sm font-medium">✅ Завершено</p>
              <h3 className="text-2xl font-bold text-green-600">{completedOrders.length}</h3>
              <p className="text-xs text-neutral-400 mt-1">
                {filteredOrders.length > 0 ? Math.round((completedOrders.length / filteredOrders.length) * 100) : 0}% від загальної
              </p>
            </div>
            <div className="bg-white p-5 rounded-2xl shadow-sm border">
              <p className="text-neutral-500 text-sm font-medium">🔧 В роботі</p>
              <h3 className="text-2xl font-bold text-blue-600">
                {filteredOrders.filter(o => o.status === 'InProgress').length}
              </h3>
              <p className="text-xs text-neutral-400 mt-1">активних</p>
            </div>
            <div className="bg-white p-5 rounded-2xl shadow-sm border">
              <p className="text-neutral-500 text-sm font-medium">💰 Виручка від робіт</p>
              <h3 className="text-2xl font-bold text-[#ffcc00]">
                {completedOrders.reduce((acc, o) => acc + o.services.reduce((a, s) => a + s.price, 0), 0).toLocaleString()} ₴
              </h3>
              <p className="text-xs text-neutral-400 mt-1">без запчастин</p>
            </div>
            <div className="bg-white p-5 rounded-2xl shadow-sm border">
              <p className="text-neutral-500 text-sm font-medium">⏱️ Всього годин</p>
              <h3 className="text-2xl font-bold text-purple-600">
                {completedOrders.reduce((acc, o) => acc + o.services.reduce((a, s) => a + s.hours, 0), 0)}
              </h3>
              <p className="text-xs text-neutral-400 mt-1">нормо-годин</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border">
              <h3 className="font-bold mb-4">👨‍🔧 Статистика по майстрах</h3>
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {masterStats.length > 0 ? masterStats.map(master => {
                  const maxRevenue = Math.max(...masterStats.map(m => m.revenue));
                  return (
                    <div key={master.id} className="p-4 bg-neutral-50 rounded-xl">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-bold">{master.name}</span>
                        <span className="text-lg font-bold text-green-600">{master.revenue.toLocaleString()} ₴</span>
                      </div>
                      <div className="flex justify-between text-sm text-neutral-500 mb-2">
                        <span>✅ {master.orders} замовлень</span>
                        <span>⏱️ {master.hours} год</span>
                        <span>💵 {master.orders > 0 ? Math.round(master.revenue / master.orders).toLocaleString() : 0} ₴/зам</span>
                      </div>
                      <div className="bg-neutral-200 rounded-full h-2">
                        <div 
                          className="bg-[#ffcc00] h-2 rounded-full transition-all" 
                          style={{ width: `${maxRevenue > 0 ? (master.revenue / maxRevenue) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                  );
                }) : (
                  <div className="text-center py-8 text-neutral-400">Немає даних про майстрів</div>
                )}
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border">
              <h3 className="font-bold mb-4">📊 Замовлення по днях</h3>
              <div className="h-72">
                {dailyData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dailyData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="date" fontSize={12} />
                      <YAxis fontSize={12} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="orders" fill="#2563eb" radius={[4, 4, 0, 0]} name="Замовлень" />
                      <Bar dataKey="revenue" fill="#ffcc00" radius={[4, 4, 0, 0]} name="Дохід (₴)" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-neutral-400">Немає даних за обраний період</div>
                )}
              </div>
            </div>
          </div>

          {/* Work Log Table */}
          <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
            <div className="p-4 border-b bg-neutral-50 flex justify-between items-center">
              <h3 className="font-bold">📋 Журнал виконаних робіт ({filteredOrders.length} замовлень)</h3>
            </div>
            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-sm">
                <thead className="bg-neutral-50 text-neutral-500 text-[10px] uppercase font-bold sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left">№ Замовлення</th>
                    <th className="px-4 py-3 text-left">Дата</th>
                    <th className="px-4 py-3 text-left">Клієнт</th>
                    <th className="px-4 py-3 text-left">Авто</th>
                    <th className="px-4 py-3 text-left">Майстер</th>
                    <th className="px-4 py-3 text-center">Послуги</th>
                    <th className="px-4 py-3 text-center">Години</th>
                    <th className="px-4 py-3 text-center">Статус</th>
                    <th className="px-4 py-3 text-center">Оплата</th>
                    <th className="px-4 py-3 text-right">Сума</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredOrders.map(order => {
                    const client = data.clients.find(c => c.id === order.clientId);
                    const master = data.employees.find(e => e.id === order.masterId);
                    const totalHours = order.services.reduce((acc, s) => acc + s.hours, 0);
                    return (
                      <tr key={order.id} className="hover:bg-neutral-50">
                        <td className="px-4 py-3 font-mono font-bold">{order.id}</td>
                        <td className="px-4 py-3">{format(parseISO(order.date), 'dd.MM.yyyy')}</td>
                        <td className="px-4 py-3 font-medium">{client?.name || '-'}</td>
                        <td className="px-4 py-3 text-neutral-500">{client?.car.make} {client?.car.model}</td>
                        <td className="px-4 py-3">{master?.name || '-'}</td>
                        <td className="px-4 py-3 text-center">{order.services.length}</td>
                        <td className="px-4 py-3 text-center">{totalHours} год</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${
                            order.status === 'Completed' ? 'bg-green-100 text-green-700' :
                            order.status === 'InProgress' ? 'bg-blue-100 text-blue-700' :
                            order.status === 'Cancelled' ? 'bg-red-100 text-red-700' :
                            'bg-neutral-100 text-neutral-700'
                          }`}>
                            {order.status === 'Completed' ? 'Завершено' :
                             order.status === 'InProgress' ? 'В роботі' :
                             order.status === 'Cancelled' ? 'Скасовано' :
                             order.status === 'New' ? 'Новий' : order.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {order.isPaid ? (
                            <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-green-100 text-green-700">
                              {order.paymentType === 'Cash' ? '💵' : order.paymentType === 'Card' ? '💳' : '🏦'}
                            </span>
                          ) : (
                            <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-yellow-100 text-yellow-700">
                              Очікує
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-bold">{order.total.toLocaleString()} ₴</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-neutral-100 font-bold sticky bottom-0">
                  <tr>
                    <td colSpan={9} className="px-4 py-3 text-right">ВСЬОГО:</td>
                    <td className="px-4 py-3 text-right">{filteredOrders.reduce((acc, o) => acc + o.total, 0).toLocaleString()} ₴</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
