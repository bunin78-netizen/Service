import { useState } from 'react';
import { AppData, Expense } from '../types';
import { Plus, Trash2, Wallet, Tag, X, Save } from 'lucide-react';
import { format } from 'date-fns';
import { generateId } from '../store';

export default function Expenses({ data, updateData }: { data: AppData, updateData: (d: Partial<AppData>) => void }) {
  const currentUser = data.users.find(u => u.id === data.currentUserId);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    category: '',
    amount: 0,
    date: format(new Date(), 'yyyy-MM-dd'),
    description: '',
  });

  const totalExpenses = data.expenses.reduce((acc, curr) => acc + curr.amount, 0);

  const categories = ['Оренда', 'Комунальні', 'Інструменти', 'Зарплата', 'Реклама', 'Інше'];

  const handleSave = () => {
    if (!formData.category || formData.amount <= 0) return;

    const newExpense: Expense = {
      id: generateId(),
      ...formData,
    };
    updateData({ expenses: [newExpense, ...data.expenses] });
    setShowModal(false);
    setFormData({
      category: '',
      amount: 0,
      date: format(new Date(), 'yyyy-MM-dd'),
      description: '',
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm('Видалити витрату?')) return;
    updateData({ expenses: data.expenses.filter(e => e.id !== id) });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-neutral-100 flex items-center gap-4">
          <div className="w-12 h-12 bg-red-100 text-red-600 rounded-xl flex items-center justify-center">
            <Wallet size={24} />
          </div>
          <div>
            <p className="text-sm text-neutral-500 font-medium">Витрати за весь час</p>
            <p className="text-2xl font-bold text-neutral-900">{totalExpenses.toLocaleString()} ₴</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-neutral-100 flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center">
            <Tag size={24} />
          </div>
          <div>
            <p className="text-sm text-neutral-500 font-medium">Записів</p>
            <p className="text-2xl font-bold text-neutral-900">{data.expenses.length}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-neutral-100 flex items-center justify-center">
          <button 
            onClick={() => setShowModal(true)}
            className="w-full bg-[#ffcc00] text-black font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-[#e6b800] transition-colors"
          >
            <Plus size={20} /> Додати витрату
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
        <div className="p-4 border-b bg-neutral-50/50">
          <h3 className="font-bold">Історія витрат</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-neutral-50 text-neutral-500 text-[10px] uppercase font-bold tracking-wider border-b">
                <th className="px-6 py-4">Дата</th>
                <th className="px-6 py-4">Категорія</th>
                <th className="px-6 py-4">Опис</th>
                <th className="px-6 py-4 text-right">Сума</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y text-sm">
              {data.expenses.map(expense => (
                <tr key={expense.id} className="hover:bg-neutral-50 transition-colors">
                  <td className="px-6 py-4 text-neutral-500">{format(new Date(expense.date), 'dd.MM.yyyy')}</td>
                  <td className="px-6 py-4">
                    <span className="px-3 py-1 bg-neutral-100 rounded-full text-xs font-bold text-neutral-600">
                      {expense.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-medium text-neutral-800">{expense.description}</td>
                  <td className="px-6 py-4 text-right font-bold text-red-600">-{expense.amount.toLocaleString()} ₴</td>
                  <td className="px-6 py-4 text-right">
                    {currentUser?.permissions.canDeleteOrders && (
                    <button 
                      onClick={() => handleDelete(expense.id)}
                      className="text-neutral-400 hover:text-red-500 p-2"
                    >
                      <Trash2 size={16} />
                    </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-6 border-b bg-neutral-50 flex items-center justify-between">
              <h3 className="font-bold text-lg">Нова витрата</h3>
              <button onClick={() => setShowModal(false)} className="text-neutral-400 hover:text-neutral-600">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Категорія</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-[#ffcc00]"
                >
                  <option value="">Оберіть категорію...</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Сума (₴)</label>
                <input
                  type="number"
                  value={formData.amount || ''}
                  onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                  className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-[#ffcc00]"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Дата</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-[#ffcc00]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Опис</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-[#ffcc00]"
                  placeholder="Короткий опис..."
                />
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
                className="bg-[#ffcc00] text-black px-6 py-2 rounded-lg font-bold flex items-center gap-2"
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
