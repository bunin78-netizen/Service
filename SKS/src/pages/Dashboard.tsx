import { AppData } from '../types';
import { 
  Wrench, 
  Package, 
  AlertTriangle, 
  TrendingUp,
  Clock
} from 'lucide-react';

export default function Dashboard({ data, setActiveTab }: { data: AppData, setActiveTab: (t: string) => void }) {
  const activeOrders = data.workOrders.filter(o => o.status === 'InProgress' || o.status === 'PendingParts');
  const completedToday = data.workOrders.filter(o => o.status === 'Completed' && o.date === new Date().toISOString().split('T')[0]);
  const lowStock = data.inventory.filter(i => i.stock <= i.minStock);
  const revenueToday = data.workOrders
    .filter(o => o.isPaid && o.date === new Date().toISOString().split('T')[0])
    .reduce((acc, curr) => acc + curr.total, 0);

  const stats = [
    { label: 'Активні замовлення', value: activeOrders.length, icon: Wrench, color: 'bg-blue-500', tab: 'workorders' },
    { label: 'Завершено сьогодні', value: completedToday.length, icon: TrendingUp, color: 'bg-green-500', tab: 'workorders' },
    { label: 'Критичний склад', value: lowStock.length, icon: AlertTriangle, color: 'bg-red-500', tab: 'inventory' },
    { label: 'Дохід сьогодні', value: `${revenueToday} ₴`, icon: Package, color: 'bg-yellow-500', tab: 'reports' },
  ];

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <button 
            key={i} 
            onClick={() => setActiveTab(stat.tab)}
            className="bg-white p-6 rounded-2xl shadow-sm border border-neutral-100 flex items-center gap-4 hover:shadow-md transition-shadow text-left"
          >
            <div className={`w-12 h-12 ${stat.color} rounded-xl flex items-center justify-center text-white`}>
              <stat.icon size={24} />
            </div>
            <div>
              <p className="text-sm text-neutral-500 font-medium">{stat.label}</p>
              <p className="text-2xl font-bold text-neutral-900">{stat.value}</p>
            </div>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-lg flex items-center gap-2">
              <Clock className="text-[#ffcc00]" /> Останні замовлення
            </h3>
            <button onClick={() => setActiveTab('workorders')} className="text-sm text-neutral-500 hover:text-black">Всі</button>
          </div>
          <div className="space-y-4">
            {data.workOrders.slice(0, 5).map(order => {
              const client = data.clients.find(c => c.id === order.clientId);
              return (
                <div key={order.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-neutral-50 border border-transparent hover:border-neutral-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-neutral-100 rounded-full flex items-center justify-center font-bold text-xs">
                      {client?.car.plate?.substring(0, 4) || 'N/A'}
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{client?.name || 'Невідомий клієнт'}</p>
                      <p className="text-xs text-neutral-500">{client?.car.make} {client?.car.model}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-sm">{order.total} ₴</p>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                      order.status === 'Completed' ? 'bg-green-100 text-green-700' : 
                      order.status === 'InProgress' ? 'bg-blue-100 text-blue-700' :
                      'bg-neutral-100 text-neutral-700'
                    }`}>
                      {order.status === 'Completed' ? 'Готово' : 
                       order.status === 'InProgress' ? 'В роботі' :
                       order.status === 'New' ? 'Новий' : order.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-lg flex items-center gap-2">
              <Package className="text-[#ffcc00]" /> Критичні залишки
            </h3>
            <button onClick={() => setActiveTab('inventory')} className="text-sm text-neutral-500 hover:text-black">На склад</button>
          </div>
          <div className="space-y-4">
            {lowStock.slice(0, 5).map(part => (
              <div key={part.id} className="flex items-center justify-between p-3 rounded-lg bg-red-50 border border-red-100">
                <div>
                  <p className="font-semibold text-sm">{part.name}</p>
                  <p className="text-xs text-red-600">Залишилось: {part.stock} шт (Мін: {part.minStock})</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-sm text-neutral-700">
                    {data.suppliers.find(s => s.id === part.supplierId)?.name || 'Невідомо'}
                  </p>
                  <p className="text-[10px] text-neutral-500 uppercase">{part.sku}</p>
                </div>
              </div>
            ))}
            {lowStock.length === 0 && <p className="text-neutral-500 text-center py-8">Всі запчастини в достатній кількості</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
