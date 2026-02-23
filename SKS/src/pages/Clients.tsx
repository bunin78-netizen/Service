import { useState } from 'react';
import { AppData, Client, Notification } from '../types';
import { Plus, Search, User, Car, Phone, Mail, Edit2, Trash2, X, Save, BadgePercent, Send } from 'lucide-react';
import { generateId } from '../store';
import { format } from 'date-fns';
import { loadDbExtras } from './Database';

interface ClientsProps {
  data: AppData;
  updateData: (d: Partial<AppData>) => void;
  addNotification: (notification: Omit<Notification, 'id' | 'date' | 'isRead'>) => void;
}

const emptyClient: Omit<Client, 'id' | 'createdAt'> = {
  name: '',
  phone: '',
  email: '',
  discountPercent: 0,
  phoneVerified: false,
  telegramChatId: '',
  car: {
    make: '',
    model: '',
    year: new Date().getFullYear(),
    vin: '',
    plate: '',
  }
};

const normalizePhoneForMatch = (phone: string) => phone.replace(/\D/g, '').slice(-10);

export default function Clients({ data, updateData, addNotification }: ClientsProps) {
  const db = loadDbExtras();
  const currentUser = data.users.find(u => u.id === data.currentUserId);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [formData, setFormData] = useState<Omit<Client, 'id' | 'createdAt'>>(emptyClient);

  const filteredClients = data.clients.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.phone.includes(searchTerm) ||
    c.car.plate.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenModal = (client?: Client) => {
    if (client) {
      setEditingClient(client);
      setFormData({
        name: client.name,
        phone: client.phone,
        email: client.email,
        discountPercent: client.discountPercent || 0,
        telegramChatId: client.telegramChatId || '',
        car: { ...client.car }
      });
    } else {
      setEditingClient(null);
      setFormData({ ...emptyClient, car: { ...emptyClient.car } });
    }
    setShowModal(true);
  };

  const handleSave = () => {
    if (!formData.name || !formData.phone) {
      alert('Будь ласка, заповніть обов\'язкові поля (Ім\'я та Телефон)');
      return;
    }

    if (editingClient) {
      // Update existing client
      const phoneChanged = normalizePhoneForMatch(formData.phone) !== normalizePhoneForMatch(editingClient.phone);
      const sanitizedClient = {
        ...formData,
        discountPercent: Math.max(0, Math.min(100, Number(formData.discountPercent || 0))),
        telegramChatId: phoneChanged ? '' : (editingClient.telegramChatId || ''),
      };
      const updated = data.clients.map(c => 
        c.id === editingClient.id 
          ? { ...c, ...sanitizedClient }
          : c
      );
      updateData({ clients: updated });
    } else {
      // Create new client
      const newClient: Client = {
        id: generateId(),
        ...formData,
        discountPercent: Math.max(0, Math.min(100, Number(formData.discountPercent || 0))),
        telegramChatId: '',
        createdAt: format(new Date(), 'yyyy-MM-dd'),
      };
      updateData({ clients: [...data.clients, newClient] });
      addNotification({
        type: 'system',
        title: 'Новий клієнт',
        message: `Додано клієнта ${newClient.name}`,
      });
    }
    setShowModal(false);
  };

  const handleDelete = (id: string) => {
    // Check if client has orders
    const hasOrders = data.workOrders.some(o => o.clientId === id);
    if (hasOrders) {
      alert('Неможливо видалити клієнта з активними замовленнями!');
      return;
    }
    if (!confirm('Видалити клієнта?')) return;
    updateData({ clients: data.clients.filter(c => c.id !== id) });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div className="relative w-80">
          <Search className="absolute left-3 top-2.5 text-neutral-400" size={18} />
          <input 
            type="text" 
            placeholder="Пошук клієнта або авто..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-xl focus:ring-2 focus:ring-[#ffcc00] outline-none"
          />
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="bg-[#ffcc00] text-black px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-[#e6b800] transition-colors shadow-sm"
        >
          <Plus size={20} />
          Додати клієнта
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredClients.map(client => (
          <div key={client.id} className="bg-white p-6 rounded-2xl shadow-sm border border-neutral-100 hover:shadow-md transition-shadow group">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-[#ffcc00]/20 text-neutral-800 rounded-xl flex items-center justify-center">
                  <User size={24} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-lg leading-tight">{client.name}</h4>
                    {client.telegramChatId && <Send size={14} className="text-sky-500" title="Клієнт підключений до Telegram бота" />}
                  </div>
                  <p className="text-xs text-neutral-400">ID: {client.id} • Створено {client.createdAt}</p>
                </div>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => handleOpenModal(client)}
                  className="p-2 text-neutral-400 hover:text-blue-600 rounded-lg hover:bg-blue-50"
                >
                  <Edit2 size={16} />
                </button>
                {currentUser?.permissions.canDeleteOrders && (
                <button 
                  onClick={() => handleDelete(client.id)}
                  className="p-2 text-neutral-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                >
                  <Trash2 size={16} />
                </button>
                )}
              </div>
            </div>

            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-2 text-neutral-600 text-sm">
                <Phone size={16} className="text-neutral-400" />
                <a href={`tel:${client.phone}`} className="hover:text-blue-600 transition-colors">{client.phone}</a>
              </div>
              {client.email && (
                <div className="flex items-center gap-2 text-neutral-600 text-sm">
                  <Mail size={16} className="text-neutral-400" />
                  <span>{client.email}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-neutral-600 text-sm">
                <BadgePercent size={16} className="text-neutral-400" />
                <span>Знижка: <span className="font-semibold">{client.discountPercent || 0}%</span></span>
              </div>
              <div className="flex items-center gap-2 text-neutral-600 text-sm">
                <Send size={16} className={client.telegramChatId ? 'text-sky-500' : 'text-neutral-400'} />
                <span>{client.telegramChatId ? 'Підключено до Telegram бота' : 'Не підключено до Telegram бота'}</span>
              </div>
            </div>

            <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-100 relative overflow-hidden">
              <Car size={48} className="absolute -right-4 -bottom-4 text-neutral-100 -rotate-12" />
              <div className="relative">
                <p className="text-xs text-neutral-400 uppercase font-bold tracking-wider mb-1">Автомобіль</p>
                <p className="font-bold text-neutral-800">{client.car.make} {client.car.model} ({client.car.year})</p>
                <div className="flex items-center gap-3 mt-2">
                  <span className="bg-white border px-2 py-0.5 rounded font-mono text-xs font-bold">{client.car.plate}</span>
                  <span className="text-[10px] text-neutral-400 font-mono">{client.car.vin}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredClients.length === 0 && (
        <div className="text-center py-12 text-neutral-400">
          <User size={48} className="mx-auto mb-4 opacity-50" />
          <p>Клієнтів не знайдено</p>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="p-6 border-b bg-neutral-50 flex items-center justify-between">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <User className="text-[#ffcc00]" size={20} />
                {editingClient ? 'Редагування клієнта' : 'Новий клієнт'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-neutral-400 hover:text-neutral-600">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Ім'я *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-[#ffcc00]"
                    placeholder="Повне ім'я клієнта"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Телефон *</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-[#ffcc00]"
                    placeholder="+380..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email || ''}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-[#ffcc00]"
                    placeholder="email@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Знижка, %</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={formData.discountPercent || 0}
                    onChange={(e) => setFormData({ ...formData, discountPercent: Number(e.target.value) })}
                    className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-[#ffcc00]"
                    placeholder="0"
                  />
                </div>
                <div className="col-span-2 p-3 rounded-lg border border-sky-100 bg-sky-50 text-xs text-sky-800">
                  Telegram Chat ID заповнюється автоматично, коли клієнт надсилає свій номер телефону в Telegram-бот.
                </div>
                <div className="col-span-2 flex items-center justify-between rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2">
                  <span className="text-sm font-medium text-neutral-700">Статус Telegram</span>
                  <div className="flex items-center gap-2 text-sm">
                    <Send size={16} className={formData.telegramChatId ? 'text-sky-500' : 'text-neutral-400'} />
                    <span className={formData.telegramChatId ? 'text-sky-700 font-medium' : 'text-neutral-500'}>
                      {formData.telegramChatId ? 'Підключено' : 'Не підключено'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t">
                <h4 className="font-bold text-sm text-neutral-600 mb-3 flex items-center gap-2">
                  <Car size={16} /> Автомобіль
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">Марка</label>
                    <select
                      value={formData.car.make}
                      onChange={(e) => setFormData({ ...formData, car: { ...formData.car, make: e.target.value, model: '' } })}
                      className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-[#ffcc00]"
                    >
                      <option value="">Оберіть марку...</option>
                      {db.vehicleMakes.map(vm => (
                        <option key={vm.id} value={vm.make}>{vm.make}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">Модель</label>
                    <select
                      value={formData.car.model}
                      onChange={(e) => setFormData({ ...formData, car: { ...formData.car, model: e.target.value } })}
                      className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-[#ffcc00]"
                      disabled={!formData.car.make}
                    >
                      <option value="">Оберіть модель...</option>
                      {(db.vehicleMakes.find(vm => vm.make === formData.car.make)?.models || []).map(m => (
                        <option key={m.id} value={m.name}>{m.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">Рік</label>
                    <input
                      type="number"
                      value={formData.car.year}
                      onChange={(e) => setFormData({ ...formData, car: { ...formData.car, year: Number(e.target.value) } })}
                      className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-[#ffcc00]"
                      placeholder="2020"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">Держ. номер</label>
                    <input
                      type="text"
                      value={formData.car.plate}
                      onChange={(e) => setFormData({ ...formData, car: { ...formData.car, plate: e.target.value.toUpperCase() } })}
                      className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-[#ffcc00] font-mono"
                      placeholder="AX1234AB"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-neutral-700 mb-1">VIN-код</label>
                    <input
                      type="text"
                      value={formData.car.vin}
                      onChange={(e) => setFormData({ ...formData, car: { ...formData.car, vin: e.target.value.toUpperCase() } })}
                      className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-[#ffcc00] font-mono"
                      placeholder="17-значний VIN"
                      maxLength={17}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t bg-neutral-50 flex gap-3 justify-end">
              <button 
                onClick={() => setShowModal(false)}
                className="px-6 py-2 rounded-lg font-medium text-neutral-600 hover:bg-neutral-100"
              >
                Скасувати
              </button>
              <button 
                onClick={handleSave}
                className="bg-[#ffcc00] text-black px-6 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-[#e6b800]"
              >
                <Save size={18} /> Зберегти
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
