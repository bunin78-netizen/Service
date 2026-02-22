import { useState } from 'react';
import { AppData } from '../types';
import { Search, Plus, ExternalLink, Package, Truck } from 'lucide-react';

export default function PartsSearch({ data }: { data: AppData }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{ name: string; price: number; delivery: string; stock: string }[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const localMatches = data.inventory.filter(p => 
    p.name.toLowerCase().includes(query.toLowerCase()) || 
    p.sku.toLowerCase().includes(query.toLowerCase())
  );

  const handleOnlineSearch = () => {
    if (!query) return;
    setIsSearching(true);
    // Simulate API calls to major UA suppliers
    setTimeout(() => {
      const suppliers = [
        { name: 'Omega-Автопоставка', price: 1150, delivery: 'Сьогодні', stock: '>10' },
        { name: 'Inter Cars Ukraine', price: 1220, delivery: 'Завтра', stock: '5' },
        { name: 'ELIT Ukraine', price: 1180, delivery: 'Сьогодні', stock: '2' },
        { name: 'Автотехнікс', price: 1100, delivery: '2 дні', stock: '20' },
      ];
      setResults(suppliers);
      setIsSearching(false);
    }, 800);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl shadow-sm border">
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 text-neutral-400" size={20} />
            <input 
              type="text" 
              placeholder="Введіть назву запчастини або артикул..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-xl focus:ring-2 focus:ring-[#ffcc00] outline-none"
            />
          </div>
          <button 
            onClick={handleOnlineSearch}
            className="bg-neutral-900 text-white px-6 py-2 rounded-xl font-bold hover:bg-neutral-800 transition-colors"
          >
            Пошук у постачальників
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Local Stock */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border">
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
            <Package className="text-[#ffcc00]" /> На нашому складі
          </h3>
          <div className="space-y-3">
            {localMatches.length > 0 ? localMatches.map(part => (
              <div key={part.id} className="p-4 rounded-xl border flex justify-between items-center hover:bg-neutral-50 transition-colors">
                <div>
                  <p className="font-bold">{part.name}</p>
                  <p className="text-xs text-neutral-500">{part.sku} • {part.category}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-green-600">{part.salePrice} ₴</p>
                  <p className="text-xs font-medium">Залишок: {part.stock} шт</p>
                </div>
              </div>
            )) : (
              <p className="text-neutral-500 text-center py-10">Нічого не знайдено локально</p>
            )}
          </div>
        </div>

        {/* Online Suppliers */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border">
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
            <Truck className="text-[#ffcc00]" /> Пропозиції постачальників
          </h3>
          <div className="space-y-3">
            {isSearching ? (
              <div className="animate-pulse space-y-3">
                {[1,2,3].map(i => <div key={i} className="h-16 bg-neutral-100 rounded-xl"></div>)}
              </div>
            ) : results.length > 0 ? results.map((res, i) => (
              <div key={i} className="p-4 rounded-xl border flex justify-between items-center hover:shadow-sm">
                <div>
                  <p className="font-bold">{res.name}</p>
                  <p className="text-xs text-neutral-500">Доставка: {res.delivery} • Наявність: {res.stock}</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="font-bold text-blue-600">{res.price} ₴</p>
                  </div>
                  <button className="p-2 bg-neutral-100 hover:bg-[#ffcc00] rounded-lg transition-colors">
                    <Plus size={18} />
                  </button>
                </div>
              </div>
            )) : (
              <div className="text-neutral-500 text-center py-10 flex flex-col items-center gap-2">
                <ExternalLink size={32} strokeWidth={1} />
                <p>Натисніть "Пошук у постачальників" для запиту цін</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
