import { useState, useEffect } from 'react';
import { AppData, Part, Supplier } from '../types';
import { generateId } from '../store';
import {
  Search, ShoppingCart, Package, Truck, ExternalLink, Plus, Minus,
  X, CheckCircle, AlertCircle, Globe, Key, RefreshCw, Star, Clock,
  Filter, ChevronDown, Loader2, ShoppingBag, Trash2, Download, Save,
  Link, Phone, Mail, Edit2
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
export type SupplierAccount = {
  id: string;
  name: string;
  displayName: string;
  logo: string;
  color: string;
  apiUrl: string;
  apiKey: string;
  username: string;
  password: string;
  isConnected: boolean;
  isEnabled: boolean;
  website: string;
  description: string;
  // linked to database supplier id
  dbSupplierId?: string;
};

export type SupplierProduct = {
  id: string;
  supplierId: string;
  supplierName: string;
  article: string;
  brand: string;
  name: string;
  price: number;
  priceUSD?: number;
  stock: number;
  stockStatus: 'inStock' | 'lowStock' | 'order' | 'outOfStock';
  deliveryDays: number;
  warehouse: string;
  category: string;
  analog?: string;
  rating?: number;
  image?: string;
};

export type CartItem = {
  id: string;
  product: SupplierProduct;
  quantity: number;
};

const CART_KEY = 'smartkharkov_supplier_cart';
const ACCOUNTS_KEY = 'smartkharkov_supplier_accounts';

// ─── Default accounts with correct Omega URL ─────────────────────────────────
const DEFAULT_ACCOUNTS: SupplierAccount[] = [
  {
    id: 'omega',
    name: 'omega',
    displayName: 'Омега-Автопоставка',
    logo: '🟡',
    color: '#f59e0b',
    apiUrl: 'https://my.omega.page/api/v1',
    apiKey: '',
    username: '',
    password: '',
    isConnected: false,
    isEnabled: true,
    website: 'https://my.omega.page',
    description: 'Омега-Автопоставка — один з найбільших дистриб\'юторів автозапчастин в Україні. Особистий кабінет: my.omega.page',
    dbSupplierId: 's1',
  },
  {
    id: 'intercars',
    name: 'intercars',
    displayName: 'Inter Cars',
    logo: '🔵',
    color: '#2563eb',
    apiUrl: 'https://api.intercars.ua/catalog',
    apiKey: '',
    username: '',
    password: '',
    isConnected: false,
    isEnabled: true,
    website: 'https://intercars.ua',
    description: 'Inter Cars — провідна мережа дистрибуції автозапчастин в Україні та Європі',
    dbSupplierId: 's2',
  },
  {
    id: 'elit',
    name: 'elit',
    displayName: 'ELIT',
    logo: '🔴',
    color: '#ef4444',
    apiUrl: 'https://api.elit.ua/v2',
    apiKey: '',
    username: '',
    password: '',
    isConnected: false,
    isEnabled: true,
    website: 'https://elit.com.ua',
    description: 'ELIT — дистриб\'ютор автозапчастин та аксесуарів для автомобілів',
    dbSupplierId: 's3',
  },
  {
    id: 'autotechnics',
    name: 'autotechnics',
    displayName: 'Автотехнікс',
    logo: '🟢',
    color: '#10b981',
    apiUrl: 'https://api.autotechnics.ua/search',
    apiKey: '',
    username: '',
    password: '',
    isConnected: false,
    isEnabled: true,
    website: 'https://autotechnics.ua',
    description: 'Автотехнікс — постачання оригінальних та аналогових запчастин',
    dbSupplierId: 's4',
  },
  {
    id: 'autodoc',
    name: 'autodoc',
    displayName: 'Autodoc',
    logo: '🔧',
    color: '#7c3aed',
    apiUrl: 'https://api.autodoc.ua/v1',
    apiKey: '',
    username: '',
    password: '',
    isConnected: false,
    isEnabled: false,
    website: 'https://autodoc.ua',
    description: 'Autodoc — міжнародний онлайн-магазин автозапчастин',
  },
  {
    id: 'exist',
    name: 'exist',
    displayName: 'Exist',
    logo: '⚡',
    color: '#0891b2',
    apiUrl: 'https://exist.ua/api',
    apiKey: '',
    username: '',
    password: '',
    isConnected: false,
    isEnabled: false,
    website: 'https://exist.ua',
    description: 'Exist — пошук та продаж автозапчастин онлайн',
  },
];

// ─── Mock search ──────────────────────────────────────────────────────────────
function generateMockResults(query: string, accounts: SupplierAccount[]): SupplierProduct[] {
  const enabledAccounts = accounts.filter(a => a.isEnabled);
  const results: SupplierProduct[] = [];
  const brands = ['Bosch', 'NGK', 'Mann Filter', 'Febi', 'SKF', 'Gates', 'LUK', 'Sachs', 'TRW', 'Mahle'];
  const warehouses = ['Харків', 'Київ', 'Дніпро', 'Одеса', 'Львів'];

  enabledAccounts.forEach((acc) => {
    const count = Math.floor(Math.random() * 5) + 2;
    for (let i = 0; i < count; i++) {
      const brand = brands[Math.floor(Math.random() * brands.length)];
      const basePrice = Math.floor(Math.random() * 2000) + 100;
      const stock = Math.floor(Math.random() * 50);
      const stockStatus: SupplierProduct['stockStatus'] =
        stock > 10 ? 'inStock' : stock > 0 ? 'lowStock' : Math.random() > 0.5 ? 'order' : 'outOfStock';
      results.push({
        id: `${acc.id}-${i}-${Date.now()}`,
        supplierId: acc.id,
        supplierName: acc.displayName,
        article: `${brand.substring(0, 3).toUpperCase()}-${Math.floor(Math.random() * 90000) + 10000}`,
        brand,
        name: `${query} ${brand} (${['оригінал', 'аналог', 'OEM'][Math.floor(Math.random() * 3)]})`,
        price: basePrice,
        stock,
        stockStatus,
        deliveryDays: stockStatus === 'inStock' ? 0 : stockStatus === 'lowStock' ? 1 : Math.floor(Math.random() * 5) + 2,
        warehouse: warehouses[Math.floor(Math.random() * warehouses.length)],
        category: 'Запчастини',
        rating: Math.floor(Math.random() * 2) + 3 + Math.random(),
      });
    }
  });
  return results.sort((a, b) => a.price - b.price);
}

// ─── Storage helpers ──────────────────────────────────────────────────────────
function loadAccounts(): SupplierAccount[] {
  const saved = localStorage.getItem(ACCOUNTS_KEY);
  if (saved) {
    const parsed: SupplierAccount[] = JSON.parse(saved);
    // Merge saved with defaults — always apply latest website/apiUrl from defaults
    return DEFAULT_ACCOUNTS.map(def => {
      const found = parsed.find((p) => p.id === def.id);
      if (found) {
        return {
          ...def,
          ...found,
          // Always update Omega to correct URL
          ...(def.id === 'omega' ? {
            displayName: 'Омега-Автопоставка',
            website: 'https://my.omega.page',
            apiUrl: found.apiUrl === 'https://api.omega.ua/v1' ? 'https://my.omega.page/api/v1' : found.apiUrl,
          } : {}),
        };
      }
      return def;
    });
  }
  return DEFAULT_ACCOUNTS;
}

function saveAccounts(accounts: SupplierAccount[]) {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
}

function loadCart(): CartItem[] {
  const saved = localStorage.getItem(CART_KEY);
  return saved ? JSON.parse(saved) : [];
}

function saveCartToStorage(cart: CartItem[]) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getWebsiteFromSupplier(dbSupplier: Supplier | undefined, account: SupplierAccount): string {
  // Priority: DB supplier website field > account default website
  if (dbSupplier && (dbSupplier as Supplier & { website?: string }).website) {
    return (dbSupplier as Supplier & { website?: string }).website!;
  }
  return account.website;
}

// ─── Component ────────────────────────────────────────────────────────────────
interface Props {
  data: AppData;
  updateData: (d: Partial<AppData>) => void;
}

type ViewTab = 'search' | 'cart' | 'accounts' | 'orders';

export default function SupplierShop({ data, updateData }: Props) {
  const [activeTab, setActiveTab] = useState<ViewTab>('search');
  const [accounts, setAccounts] = useState<SupplierAccount[]>(loadAccounts());
  const [cart, setCart] = useState<CartItem[]>(loadCart());
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SupplierProduct[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [filterSupplier, setFilterSupplier] = useState('all');
  const [filterBrand, setFilterBrand] = useState('all');
  const [filterStock, setFilterStock] = useState<'all' | 'inStock' | 'order'>('all');
  const [sortBy, setSortBy] = useState<'price' | 'delivery' | 'supplier'>('price');
  const [showFilters, setShowFilters] = useState(false);
  const [editingAccount, setEditingAccount] = useState<SupplierAccount | null>(null);
  const [testResults, setTestResults] = useState<Record<string, 'idle' | 'testing' | 'ok' | 'error'>>({});
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [articleSearch, setArticleSearch] = useState('');
  const [editingDbLink, setEditingDbLink] = useState<string | null>(null);

  useEffect(() => { saveCartToStorage(cart); }, [cart]);

  const updateAccounts = (updated: SupplierAccount[]) => {
    setAccounts(updated);
    saveAccounts(updated);
  };

  // Get effective website for account (pulls from DB suppliers if linked)
  const getEffectiveWebsite = (account: SupplierAccount): string => {
    if (account.dbSupplierId) {
      const dbSupplier = data.suppliers.find(s => s.id === account.dbSupplierId);
      return getWebsiteFromSupplier(dbSupplier, account);
    }
    return account.website;
  };

  // Get DB supplier linked to account
  const getLinkedSupplier = (account: SupplierAccount): Supplier | undefined => {
    if (!account.dbSupplierId) return undefined;
    return data.suppliers.find(s => s.id === account.dbSupplierId);
  };

  const handleSearch = async () => {
    if (!query.trim()) return;
    setIsSearching(true);
    setResults([]);
    await new Promise(r => setTimeout(r, 1200));
    setResults(generateMockResults(query, accounts));
    setIsSearching(false);
  };

  const handleArticleSearch = async () => {
    if (!articleSearch.trim()) return;
    setIsSearching(true);
    setResults([]);
    await new Promise(r => setTimeout(r, 800));
    setResults(generateMockResults(articleSearch, accounts));
    setIsSearching(false);
    setActiveTab('search');
  };

  const addToCart = (product: SupplierProduct) => {
    setCart(prev => {
      const existing = prev.find(i => i.product.id === product.id);
      if (existing) return prev.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { id: generateId(), product, quantity: 1 }];
    });
  };

  const removeFromCart = (itemId: string) => setCart(prev => prev.filter(i => i.id !== itemId));

  const updateCartQty = (itemId: string, delta: number) =>
    setCart(prev => prev.map(i => i.id === itemId ? { ...i, quantity: Math.max(1, i.quantity + delta) } : i));

  const clearCart = () => { if (confirm('Очистити кошик?')) setCart([]); };

  const cartTotal = cart.reduce((acc, i) => acc + i.product.price * i.quantity, 0);
  const cartCount = cart.reduce((acc, i) => acc + i.quantity, 0);

  const handlePlaceOrder = () => {
    const newParts: Part[] = cart.map(item => ({
      id: generateId(),
      sku: item.product.article,
      name: item.product.name,
      category: item.product.category,
      purchasePrice: item.product.price,
      salePrice: Math.round(item.product.price * 1.35),
      stock: item.quantity,
      minStock: 2,
      supplierId: item.product.supplierId,
      lastPurchaseDate: new Date().toISOString().split('T')[0],
    }));

    const updatedInventory = [...data.inventory];
    newParts.forEach(part => {
      const existing = updatedInventory.find(p => p.sku === part.sku);
      if (existing) { existing.stock += part.stock; } else { updatedInventory.push(part); }
    });

    updateData({ inventory: updatedInventory });
    setCart([]);
    saveCartToStorage([]);
    setOrderSuccess(true);
    setTimeout(() => setOrderSuccess(false), 4000);
  };

  const testConnection = async (accountId: string) => {
    setTestResults(prev => ({ ...prev, [accountId]: 'testing' }));
    await new Promise(r => setTimeout(r, 1500));
    const acc = accounts.find(a => a.id === accountId);
    const ok = !!(acc?.apiKey || acc?.username);
    setTestResults(prev => ({ ...prev, [accountId]: ok ? 'ok' : 'error' }));
  };

  const saveAccountSettings = (updated: SupplierAccount) => {
    updateAccounts(accounts.map(a => a.id === updated.id ? updated : a));
    setEditingAccount(null);
  };

  // Link account to a DB supplier
  const linkAccountToDbSupplier = (accountId: string, dbSupplierId: string) => {
    updateAccounts(accounts.map(a => a.id === accountId ? { ...a, dbSupplierId: dbSupplierId || undefined } : a));
    setEditingDbLink(null);
  };

  const filteredResults = results
    .filter(r => filterSupplier === 'all' || r.supplierId === filterSupplier)
    .filter(r => filterBrand === 'all' || r.brand === filterBrand)
    .filter(r => filterStock === 'all' || (filterStock === 'inStock' ? r.stockStatus === 'inStock' || r.stockStatus === 'lowStock' : r.stockStatus === 'order'))
    .sort((a, b) => {
      if (sortBy === 'price') return a.price - b.price;
      if (sortBy === 'delivery') return a.deliveryDays - b.deliveryDays;
      return a.supplierName.localeCompare(b.supplierName);
    });

  const uniqueBrands = [...new Set(results.map(r => r.brand))];
  const enabledAccounts = accounts.filter(a => a.isEnabled);

  const getStockBadge = (product: SupplierProduct) => {
    switch (product.stockStatus) {
      case 'inStock': return { label: 'В наявності', cls: 'bg-green-100 text-green-700' };
      case 'lowStock': return { label: `${product.stock} шт`, cls: 'bg-yellow-100 text-yellow-700' };
      case 'order': return { label: `${product.deliveryDays} дн.`, cls: 'bg-blue-100 text-blue-700' };
      case 'outOfStock': return { label: 'Немає', cls: 'bg-red-100 text-red-700' };
    }
  };

  return (
    <div className="space-y-6">
      {/* Header tabs */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="flex overflow-x-auto border-b">
          {[
            { id: 'search' as ViewTab, label: 'Пошук запчастин', icon: <Search size={16} /> },
            { id: 'cart' as ViewTab, label: `Кошик (${cartCount})`, icon: <ShoppingCart size={16} /> },
            { id: 'accounts' as ViewTab, label: 'Акаунти постачальників', icon: <Key size={16} /> },
            { id: 'orders' as ViewTab, label: 'Замовлення', icon: <ShoppingBag size={16} /> },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-4 font-semibold text-sm whitespace-nowrap border-b-2 transition-all ${
                activeTab === tab.id
                  ? 'border-[#ffcc00] text-neutral-900 bg-[#ffcc00]/10'
                  : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:bg-neutral-50'
              }`}
            >
              {tab.icon}
              {tab.label}
              {tab.id === 'cart' && cartCount > 0 && (
                <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">{cartCount}</span>
              )}
            </button>
          ))}
        </div>

        {orderSuccess && (
          <div className="p-4 bg-green-50 border-b border-green-200 flex items-center gap-3">
            <CheckCircle size={20} className="text-green-600" />
            <span className="font-bold text-green-800">Замовлення успішно оформлено! Товари додані на склад.</span>
          </div>
        )}

        {/* Search Bar */}
        {activeTab === 'search' && (
          <div className="p-4 bg-neutral-50/50">
            <div className="flex gap-3 flex-wrap">
              <div className="relative flex-1 min-w-64">
                <Search className="absolute left-3 top-3 text-neutral-400" size={18} />
                <input
                  type="text"
                  placeholder="Пошук за назвою (напр. Фільтр масляний BMW)..."
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                  className="w-full pl-10 pr-4 py-2.5 border rounded-xl outline-none focus:ring-2 focus:ring-[#ffcc00] text-sm"
                />
              </div>
              <div className="relative min-w-48">
                <Package className="absolute left-3 top-3 text-neutral-400" size={18} />
                <input
                  type="text"
                  placeholder="Пошук за артикулом..."
                  value={articleSearch}
                  onChange={e => setArticleSearch(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleArticleSearch()}
                  className="w-full pl-10 pr-4 py-2.5 border rounded-xl outline-none focus:ring-2 focus:ring-[#ffcc00] text-sm font-mono"
                />
              </div>
              <button
                onClick={handleSearch}
                disabled={isSearching}
                className="bg-neutral-900 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-neutral-800 disabled:opacity-50 transition-colors"
              >
                {isSearching ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
                Шукати у всіх
              </button>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 border transition-colors ${showFilters ? 'bg-[#ffcc00] text-black border-[#ffcc00]' : 'bg-white text-neutral-600 hover:bg-neutral-100'}`}
              >
                <Filter size={16} /> Фільтри
                <ChevronDown size={14} className={`transition-transform ${showFilters ? 'rotate-180' : ''}`} />
              </button>
            </div>

            {/* Active supplier chips */}
            <div className="flex flex-wrap gap-2 mt-3">
              <span className="text-xs text-neutral-500 flex items-center">Активні постачальники:</span>
              {enabledAccounts.map(acc => {
                const website = getEffectiveWebsite(acc);
                return (
                  <a
                    key={acc.id}
                    href={website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold border hover:opacity-80 transition-opacity"
                    style={{ borderColor: acc.color, color: acc.color }}
                    title={`Відкрити ${acc.displayName}: ${website}`}
                  >
                    <span>{acc.logo}</span> {acc.displayName}
                    <ExternalLink size={9} />
                  </a>
                );
              })}
              {enabledAccounts.length === 0 && (
                <span className="text-xs text-red-500">Немає активних постачальників</span>
              )}
            </div>

            {/* Filters */}
            {showFilters && results.length > 0 && (
              <div className="mt-4 pt-4 border-t grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-500 mb-1">Постачальник</label>
                  <select value={filterSupplier} onChange={e => setFilterSupplier(e.target.value)} className="w-full border rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-[#ffcc00]">
                    <option value="all">Всі</option>
                    {enabledAccounts.map(a => <option key={a.id} value={a.id}>{a.displayName}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-neutral-500 mb-1">Бренд</label>
                  <select value={filterBrand} onChange={e => setFilterBrand(e.target.value)} className="w-full border rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-[#ffcc00]">
                    <option value="all">Всі бренди</option>
                    {uniqueBrands.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-neutral-500 mb-1">Наявність</label>
                  <select value={filterStock} onChange={e => setFilterStock(e.target.value as 'all' | 'inStock' | 'order')} className="w-full border rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-[#ffcc00]">
                    <option value="all">Всі</option>
                    <option value="inStock">Є в наявності</option>
                    <option value="order">Під замовлення</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-neutral-500 mb-1">Сортувати за</label>
                  <select value={sortBy} onChange={e => setSortBy(e.target.value as 'price' | 'delivery' | 'supplier')} className="w-full border rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-[#ffcc00]">
                    <option value="price">Ціною</option>
                    <option value="delivery">Терміном доставки</option>
                    <option value="supplier">Постачальником</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── Search Results ─── */}
      {activeTab === 'search' && (
        <div className="space-y-4">
          {isSearching && (
            <div className="bg-white rounded-xl border shadow-sm p-12 text-center">
              <Loader2 size={48} className="animate-spin text-[#ffcc00] mx-auto mb-4" />
              <p className="font-bold text-neutral-600">Пошук у {enabledAccounts.length} постачальників...</p>
              <div className="flex justify-center gap-3 mt-4 flex-wrap">
                {enabledAccounts.map(acc => (
                  <div key={acc.id} className="flex items-center gap-1 text-sm text-neutral-500 animate-pulse">
                    <span>{acc.logo}</span> {acc.displayName}
                  </div>
                ))}
              </div>
            </div>
          )}

          {!isSearching && results.length === 0 && (
            <div className="bg-white rounded-xl border shadow-sm p-16 text-center">
              <Search size={64} strokeWidth={1} className="mx-auto mb-4 text-neutral-300" />
              <h3 className="text-xl font-bold text-neutral-600 mb-2">Пошук запчастин у постачальників</h3>
              <p className="text-neutral-400 mb-6">Введіть назву або артикул запчастини</p>
              <div className="flex flex-wrap justify-center gap-3">
                {enabledAccounts.map(acc => {
                  const website = getEffectiveWebsite(acc);
                  return (
                    <div key={acc.id} className="flex items-center gap-2 px-4 py-2 rounded-xl border font-medium text-sm" style={{ borderColor: acc.color + '40', backgroundColor: acc.color + '10' }}>
                      <span>{acc.logo}</span>
                      <a href={website} target="_blank" rel="noopener noreferrer" className="hover:underline flex items-center gap-1" style={{ color: acc.color }}>
                        {acc.displayName} <ExternalLink size={10} />
                      </a>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {!isSearching && filteredResults.length > 0 && (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm text-neutral-500">
                  Знайдено: <strong>{filteredResults.length}</strong> результатів
                </p>
                <button onClick={() => { setFilterSupplier('all'); setFilterBrand('all'); setFilterStock('all'); }} className="text-xs text-neutral-500 hover:text-neutral-700">
                  Скинути фільтри
                </button>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {filteredResults.map(product => {
                  const acc = accounts.find(a => a.id === product.supplierId);
                  const badge = getStockBadge(product);
                  const inCart = cart.find(i => i.product.id === product.id);

                  return (
                    <div key={product.id} className="bg-white rounded-xl border shadow-sm p-4 hover:shadow-md transition-shadow flex gap-4 items-center">
                      <div className="shrink-0 w-12 h-12 rounded-xl flex items-center justify-center text-2xl font-bold" style={{ backgroundColor: (acc?.color || '#666') + '20' }}>
                        {acc?.logo || '📦'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-2 flex-wrap">
                          <h4 className="font-bold text-neutral-900 text-sm">{product.name}</h4>
                          <span className="px-2 py-0.5 bg-neutral-100 rounded text-[10px] font-bold text-neutral-500 font-mono">{product.article}</span>
                        </div>
                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                          {acc && (
                            <a href={getEffectiveWebsite(acc)} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline flex items-center gap-0.5">
                              {acc.logo} {acc.displayName} <ExternalLink size={9} />
                            </a>
                          )}
                          <span className="text-xs font-bold text-blue-600">{product.brand}</span>
                          <span className="flex items-center gap-1 text-xs text-neutral-400">
                            <Truck size={10} />
                            {product.deliveryDays === 0 ? 'Сьогодні' : `${product.deliveryDays} дн.`}
                          </span>
                          <span className="text-xs text-neutral-400">{product.warehouse}</span>
                          {product.rating && (
                            <span className="flex items-center gap-0.5 text-xs text-yellow-500">
                              <Star size={10} fill="currentColor" />
                              {product.rating.toFixed(1)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4 shrink-0">
                        <span className={`px-2 py-1 rounded-lg text-[10px] font-bold ${badge.cls}`}>{badge.label}</span>
                        <div className="text-right">
                          <p className="font-bold text-lg text-neutral-900">{product.price.toLocaleString()} ₴</p>
                          <p className="text-[10px] text-neutral-400">Прод. ~{Math.round(product.price * 1.35).toLocaleString()} ₴</p>
                        </div>
                        {inCart ? (
                          <div className="flex items-center gap-2 bg-[#ffcc00]/20 rounded-xl p-1">
                            <button onClick={() => updateCartQty(inCart.id, -1)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[#ffcc00] transition-colors">
                              <Minus size={14} />
                            </button>
                            <span className="font-bold text-sm w-5 text-center">{inCart.quantity}</span>
                            <button onClick={() => updateCartQty(inCart.id, 1)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[#ffcc00] transition-colors">
                              <Plus size={14} />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => addToCart(product)}
                            disabled={product.stockStatus === 'outOfStock'}
                            className="bg-[#ffcc00] text-black px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-[#e6b800] disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm"
                          >
                            <ShoppingCart size={16} /> В кошик
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* ─── Cart ─── */}
      {activeTab === 'cart' && (
        <div className="space-y-6">
          {cart.length === 0 ? (
            <div className="bg-white rounded-xl border shadow-sm p-16 text-center">
              <ShoppingCart size={64} strokeWidth={1} className="mx-auto mb-4 text-neutral-300" />
              <h3 className="text-xl font-bold text-neutral-600 mb-2">Кошик порожній</h3>
              <p className="text-neutral-400 mb-6">Знайдіть потрібні запчастини та додайте їх до кошика</p>
              <button onClick={() => setActiveTab('search')} className="bg-[#ffcc00] text-black px-6 py-2.5 rounded-xl font-bold">
                Перейти до пошуку
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-lg">Позиції ({cartCount} шт)</h3>
                  <button onClick={clearCart} className="text-red-500 hover:text-red-700 text-sm flex items-center gap-1">
                    <Trash2 size={14} /> Очистити
                  </button>
                </div>
                {cart.map(item => {
                  const acc = accounts.find(a => a.id === item.product.supplierId);
                  return (
                    <div key={item.id} className="bg-white rounded-xl border shadow-sm p-4 flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0" style={{ backgroundColor: (acc?.color || '#666') + '20' }}>
                        {acc?.logo || '📦'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm">{item.product.name}</p>
                        <p className="text-xs text-neutral-500 font-mono">{item.product.article} • {acc?.displayName}</p>
                        <p className="text-xs text-neutral-400 flex items-center gap-1 mt-0.5">
                          <Truck size={10} />
                          {item.product.deliveryDays === 0 ? 'Сьогодні' : `${item.product.deliveryDays} дн.`}
                          {' • '}{item.product.warehouse}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="flex items-center gap-2 border rounded-xl p-1">
                          <button onClick={() => updateCartQty(item.id, -1)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-neutral-100"><Minus size={14} /></button>
                          <span className="font-bold w-6 text-center">{item.quantity}</span>
                          <button onClick={() => updateCartQty(item.id, 1)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-neutral-100"><Plus size={14} /></button>
                        </div>
                        <div className="text-right w-24">
                          <p className="font-bold">{(item.product.price * item.quantity).toLocaleString()} ₴</p>
                          <p className="text-xs text-neutral-400">{item.product.price} ₴/шт</p>
                        </div>
                        <button onClick={() => removeFromCart(item.id)} className="text-neutral-300 hover:text-red-500 p-1"><X size={16} /></button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="space-y-4">
                <div className="bg-white rounded-xl border shadow-sm p-6">
                  <h3 className="font-bold text-lg mb-4">Підсумок замовлення</h3>
                  <div className="space-y-2 mb-4">
                    {accounts.filter(a => cart.some(i => i.product.supplierId === a.id)).map(acc => {
                      const supplierItems = cart.filter(i => i.product.supplierId === acc.id);
                      const supplierTotal = supplierItems.reduce((sum, i) => sum + i.product.price * i.quantity, 0);
                      const website = getEffectiveWebsite(acc);
                      return (
                        <div key={acc.id} className="flex justify-between text-sm items-center">
                          <div className="flex items-center gap-1">
                            <span>{acc.logo}</span>
                            <a href={website} target="_blank" rel="noopener noreferrer" className="text-neutral-500 hover:text-blue-600 hover:underline flex items-center gap-0.5">
                              {acc.displayName} <ExternalLink size={9} />
                            </a>
                            <span className="text-neutral-400">({supplierItems.length} поз.)</span>
                          </div>
                          <span className="font-medium">{supplierTotal.toLocaleString()} ₴</span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="border-t pt-3 mb-4">
                    <div className="flex justify-between font-bold text-lg">
                      <span>Разом:</span>
                      <span className="text-[#ffcc00]">{cartTotal.toLocaleString()} ₴</span>
                    </div>
                    <p className="text-xs text-neutral-400 mt-1">Ціна продажу ~{Math.round(cartTotal * 1.35).toLocaleString()} ₴</p>
                  </div>
                  <button onClick={handlePlaceOrder} className="w-full bg-neutral-900 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-neutral-800 transition-colors">
                    <CheckCircle size={20} /> Оформити замовлення
                  </button>
                  <p className="text-[10px] text-neutral-400 text-center mt-2">Товари будуть автоматично додані на склад</p>
                </div>

                <div className="bg-white rounded-xl border shadow-sm p-4">
                  <h4 className="font-bold mb-3 text-sm">📦 По постачальниках</h4>
                  <div className="space-y-3">
                    {accounts.filter(a => cart.some(i => i.product.supplierId === a.id)).map(acc => {
                      const supplierItems = cart.filter(i => i.product.supplierId === acc.id);
                      const maxDays = Math.max(...supplierItems.map(i => i.product.deliveryDays));
                      return (
                        <div key={acc.id} className="flex items-center gap-3 p-3 bg-neutral-50 rounded-lg">
                          <span className="text-xl">{acc.logo}</span>
                          <div className="flex-1">
                            <p className="font-bold text-sm">{acc.displayName}</p>
                            <p className="text-xs text-neutral-500">
                              <Clock size={10} className="inline mr-1" />
                              {maxDays === 0 ? 'Сьогодні' : `До ${maxDays} дн.`}
                            </p>
                          </div>
                          <span className="text-sm font-bold">{supplierItems.length} поз.</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <button
                  onClick={() => {
                    const csv = cart.map(i => `${i.product.article},${i.product.name},${i.quantity},${i.product.price}`).join('\n');
                    const blob = new Blob(['\ufeff' + 'Артикул,Назва,К-сть,Ціна\n' + csv], { type: 'text/csv;charset=utf-8' });
                    const link = document.createElement('a');
                    link.href = URL.createObjectURL(blob);
                    link.download = 'zamovlennia.csv';
                    link.click();
                  }}
                  className="w-full bg-neutral-100 hover:bg-neutral-200 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors text-sm"
                >
                  <Download size={16} /> Експортувати в CSV
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── Supplier Accounts ─── */}
      {activeTab === 'accounts' && (
        <div className="space-y-6">
          {/* Info banner */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3">
            <AlertCircle size={20} className="text-blue-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-blue-800">Підключення до постачальників</p>
              <p className="text-sm text-blue-600 mt-1">
                Для реального пошуку цін необхідно мати активний обліковий запис у кожного постачальника.
                Введіть API ключ або логін/пароль від порталу для дилерів. Веб-адреси синхронізуються з розділу{' '}
                <strong>Бази даних → Постачальники</strong>.
              </p>
            </div>
          </div>

          {/* DB Suppliers summary */}
          {data.suppliers.length > 0 && (
            <div className="bg-white rounded-xl border shadow-sm p-4">
              <h3 className="font-bold mb-3 flex items-center gap-2">
                <Link size={16} className="text-[#ffcc00]" />
                Постачальники з бази даних
              </h3>
              <div className="flex flex-wrap gap-3">
                {data.suppliers.map(s => (
                  <div key={s.id} className="flex items-center gap-2 px-3 py-2 bg-neutral-50 rounded-lg border text-sm">
                    <span className="font-bold">{s.name}</span>
                    {s.phone && <span className="flex items-center gap-1 text-neutral-400 text-xs"><Phone size={10} />{s.phone}</span>}
                    {s.email && <span className="flex items-center gap-1 text-neutral-400 text-xs"><Mail size={10} />{s.email}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {accounts.map(account => {
              const linkedSupplier = getLinkedSupplier(account);
              const effectiveWebsite = getEffectiveWebsite(account);

              return (
                <div key={account.id} className="bg-white rounded-xl border shadow-sm overflow-hidden">
                  <div className="p-5 flex items-start justify-between" style={{ background: `linear-gradient(135deg, ${account.color}10, transparent)` }}>
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-14 rounded-xl flex items-center justify-center text-3xl border" style={{ borderColor: account.color + '40' }}>
                        {account.logo}
                      </div>
                      <div>
                        <h4 className="font-bold text-lg">{account.displayName}</h4>
                        <a href={effectiveWebsite} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline flex items-center gap-1">
                          <Globe size={10} /> {effectiveWebsite}
                        </a>
                        {linkedSupplier && (
                          <p className="text-[10px] text-green-600 flex items-center gap-1 mt-0.5">
                            <Link size={9} /> Пов'язано: {linkedSupplier.name}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 items-end">
                      {account.isConnected ? (
                        <span className="flex items-center gap-1 text-green-600 bg-green-100 px-2 py-1 rounded-full text-xs font-bold">
                          <CheckCircle size={10} /> Підключено
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-neutral-500 bg-neutral-100 px-2 py-1 rounded-full text-xs font-bold">
                          Не підключено
                        </span>
                      )}
                      <label className="flex items-center gap-2 text-xs cursor-pointer">
                        <span className="text-neutral-500">Активний</span>
                        <div
                          onClick={() => updateAccounts(accounts.map(a => a.id === account.id ? { ...a, isEnabled: !a.isEnabled } : a))}
                          className={`relative w-10 h-5 rounded-full cursor-pointer transition-colors ${account.isEnabled ? 'bg-[#ffcc00]' : 'bg-neutral-300'}`}
                        >
                          <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${account.isEnabled ? 'left-5' : 'left-0.5'}`} />
                        </div>
                      </label>
                    </div>
                  </div>

                  <div className="px-5 pb-3">
                    <p className="text-xs text-neutral-500 mb-3">{account.description}</p>

                    {/* DB Supplier link */}
                    <div className="mb-3 p-2 bg-neutral-50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-neutral-500 flex items-center gap-1"><Link size={10} /> Прив'язати до бази:</span>
                        {editingDbLink === account.id ? (
                          <div className="flex gap-1">
                            <select
                              defaultValue={account.dbSupplierId || ''}
                              onChange={e => linkAccountToDbSupplier(account.id, e.target.value)}
                              className="text-xs border rounded px-2 py-1 outline-none focus:ring-1 focus:ring-[#ffcc00]"
                            >
                              <option value="">— Не прив'язано —</option>
                              {data.suppliers.map(s => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                              ))}
                            </select>
                            <button onClick={() => setEditingDbLink(null)} className="p-1 text-neutral-400 hover:text-neutral-600"><X size={12} /></button>
                          </div>
                        ) : (
                          <button onClick={() => setEditingDbLink(account.id)} className="text-[10px] text-blue-500 hover:underline flex items-center gap-0.5">
                            <Edit2 size={9} /> {linkedSupplier ? `Змінити (${linkedSupplier.name})` : 'Прив\'язати'}
                          </button>
                        )}
                      </div>
                      {linkedSupplier && (
                        <div className="mt-2 flex flex-wrap gap-2 text-[10px] text-neutral-500">
                          {linkedSupplier.phone && <span className="flex items-center gap-1"><Phone size={9} />{linkedSupplier.phone}</span>}
                          {linkedSupplier.email && <span className="flex items-center gap-1"><Mail size={9} />{linkedSupplier.email}</span>}
                        </div>
                      )}
                    </div>

                    {editingAccount?.id === account.id ? (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-bold text-neutral-600 mb-1">Веб-адреса (перекриває базу даних)</label>
                          <input
                            type="url"
                            value={editingAccount.website}
                            onChange={e => setEditingAccount({ ...editingAccount, website: e.target.value })}
                            className="w-full p-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#ffcc00]"
                            placeholder="https://..."
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-neutral-600 mb-1">API URL</label>
                          <input
                            type="text"
                            value={editingAccount.apiUrl}
                            onChange={e => setEditingAccount({ ...editingAccount, apiUrl: e.target.value })}
                            className="w-full p-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#ffcc00] font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-neutral-600 mb-1">API Ключ</label>
                          <input
                            type="password"
                            value={editingAccount.apiKey}
                            onChange={e => setEditingAccount({ ...editingAccount, apiKey: e.target.value })}
                            placeholder="sk_live_..."
                            className="w-full p-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#ffcc00] font-mono"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-xs font-bold text-neutral-600 mb-1">Логін (дилерський)</label>
                            <input
                              type="text"
                              value={editingAccount.username}
                              onChange={e => setEditingAccount({ ...editingAccount, username: e.target.value })}
                              className="w-full p-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#ffcc00]"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-neutral-600 mb-1">Пароль</label>
                            <input
                              type="password"
                              value={editingAccount.password}
                              onChange={e => setEditingAccount({ ...editingAccount, password: e.target.value })}
                              className="w-full p-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#ffcc00]"
                            />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => saveAccountSettings(editingAccount)} className="flex-1 bg-[#ffcc00] text-black py-2 rounded-lg font-bold flex items-center justify-center gap-1 text-sm">
                            <Save size={14} /> Зберегти
                          </button>
                          <button onClick={() => setEditingAccount(null)} className="px-4 py-2 bg-neutral-100 rounded-lg text-sm">Скасувати</button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between p-2 bg-neutral-50 rounded-lg text-xs">
                          <span className="text-neutral-500">Веб-адреса:</span>
                          <a href={effectiveWebsite} target="_blank" rel="noopener noreferrer" className="font-mono text-blue-600 hover:underline flex items-center gap-1 truncate max-w-[180px]">
                            {effectiveWebsite} <ExternalLink size={9} />
                          </a>
                        </div>
                        <div className="flex items-center justify-between p-2 bg-neutral-50 rounded-lg text-xs">
                          <span className="text-neutral-500">API URL:</span>
                          <span className="font-mono text-neutral-700 truncate max-w-[180px]">{account.apiUrl}</span>
                        </div>
                        <div className="flex items-center justify-between p-2 bg-neutral-50 rounded-lg text-xs">
                          <span className="text-neutral-500">API Ключ:</span>
                          <span className={account.apiKey ? 'text-green-600 font-bold' : 'text-neutral-400'}>
                            {account.apiKey ? '••••••••' + account.apiKey.slice(-4) : 'Не встановлено'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between p-2 bg-neutral-50 rounded-lg text-xs">
                          <span className="text-neutral-500">Логін:</span>
                          <span className={account.username ? 'text-green-600 font-bold' : 'text-neutral-400'}>
                            {account.username || 'Не встановлено'}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {editingAccount?.id !== account.id && (
                    <div className="px-5 pb-5 flex gap-2">
                      <button
                        onClick={() => setEditingAccount({ ...account })}
                        className="flex-1 bg-neutral-100 hover:bg-neutral-200 py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-colors"
                      >
                        <Key size={14} /> Налаштувати
                      </button>
                      <button
                        onClick={() => testConnection(account.id)}
                        disabled={testResults[account.id] === 'testing'}
                        className="flex-1 border hover:bg-neutral-50 py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-colors"
                      >
                        {testResults[account.id] === 'testing' ? (
                          <><Loader2 size={14} className="animate-spin" /> Тест...</>
                        ) : testResults[account.id] === 'ok' ? (
                          <><CheckCircle size={14} className="text-green-500" /> Успішно</>
                        ) : testResults[account.id] === 'error' ? (
                          <><AlertCircle size={14} className="text-red-500" /> Помилка</>
                        ) : (
                          <><RefreshCw size={14} /> Тест з'єднання</>
                        )}
                      </button>
                      <a
                        href={effectiveWebsite}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 border rounded-lg hover:bg-neutral-50 text-neutral-400 hover:text-blue-600 flex items-center justify-center"
                        title={`Відкрити ${account.displayName}`}
                      >
                        <ExternalLink size={16} />
                      </a>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── Orders ─── */}
      {activeTab === 'orders' && (
        <div className="bg-white rounded-xl border shadow-sm p-12 text-center">
          <ShoppingBag size={64} strokeWidth={1} className="mx-auto mb-4 text-neutral-300" />
          <h3 className="text-xl font-bold text-neutral-600 mb-2">Журнал замовлень постачальникам</h3>
          <p className="text-neutral-400 mb-4">Тут відображатимуться всі оформлені замовлення запчастин</p>
          <p className="text-sm text-neutral-400">
            Функція буде доступна після підключення API постачальників.<br />
            Зверніться до служби підтримки SmartKharkov для налаштування інтеграції.
          </p>
        </div>
      )}
    </div>
  );
}
