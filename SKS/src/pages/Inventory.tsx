import { useState } from 'react';
import { AppData, Supplier, Part } from '../types';
import { Plus, Search, Package, AlertTriangle, Edit2, Trash2, X, Save } from 'lucide-react';
import { generateId } from '../store';

export default function Inventory({ data, updateData }: { data: AppData, updateData: (d: Partial<AppData>) => void }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'low'>('all');
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [showPartModal, setShowPartModal] = useState(false);
  const [editingPart, setEditingPart] = useState<Part | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [supplierForm, setSupplierForm] = useState({ name: '', phone: '', email: '' });
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [partForm, setPartForm] = useState<Partial<Part>>({
    sku: '',
    name: '',
    category: '',
    purchasePrice: 0,
    salePrice: 0,
    stock: 0,
    minStock: 0,
    supplierId: '',
    location: '',
  });

  const handleAddCategory = () => {
    if (!newCategoryName.trim()) return;
    const newCat = { id: generateId(), name: newCategoryName };
    updateData({ categories: [...(data.categories || []), newCat] });
    setNewCategoryName('');
  };

  const handleDeleteCategory = (id: string) => {
    updateData({ categories: data.categories.filter(c => c.id !== id) });
  };

  const handleSaveSupplier = () => {
    if (!supplierForm.name.trim()) return;
    
    if (editingSupplier) {
      const updated = data.suppliers.map(s => 
        s.id === editingSupplier.id ? { ...s, ...supplierForm } : s
      );
      updateData({ suppliers: updated });
    } else {
      const newSupplier: Supplier = { 
        id: generateId(), 
        name: supplierForm.name,
        phone: supplierForm.phone,
        email: supplierForm.email,
      };
      updateData({ suppliers: [...(data.suppliers || []), newSupplier] });
    }
    setSupplierForm({ name: '', phone: '', email: '' });
    setEditingSupplier(null);
  };

  const handleEditSupplier = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setSupplierForm({ 
      name: supplier.name, 
      phone: supplier.phone || '', 
      email: supplier.email || '' 
    });
  };

  const handleDeleteSupplier = (id: string) => {
    updateData({ suppliers: data.suppliers.filter(s => s.id !== id) });
  };

  const handleOpenPartModal = (part?: Part) => {
    if (part) {
      setEditingPart(part);
      setPartForm({ ...part });
    } else {
      setEditingPart(null);
      setPartForm({
        sku: '',
        name: '',
        category: data.categories[0]?.name || '',
        purchasePrice: 0,
        salePrice: 0,
        stock: 0,
        minStock: 0,
        supplierId: data.suppliers[0]?.id || '',
        location: '',
      });
    }
    setShowPartModal(true);
  };

  const handleSavePart = () => {
    if (!partForm.name || !partForm.sku) return;

    if (editingPart) {
      const updated = data.inventory.map(p => 
        p.id === editingPart.id ? { ...p, ...partForm, stock: p.stock } as Part : p
      );
      updateData({ inventory: updated });
    } else {
      const newPart: Part = {
        id: generateId(),
        sku: partForm.sku!,
        name: partForm.name!,
        category: partForm.category || '',
        purchasePrice: partForm.purchasePrice || 0,
        salePrice: partForm.salePrice || 0,
        stock: 0,
        minStock: partForm.minStock || 0,
        supplierId: partForm.supplierId || '',
        location: partForm.location,
      };
      updateData({ inventory: [...data.inventory, newPart] });
    }
    setShowPartModal(false);
  };

  const handleDeletePart = (id: string) => {
    if (!confirm('Видалити запчастину?')) return;
    updateData({ inventory: data.inventory.filter(p => p.id !== id) });
  };

  const filteredItems = data.inventory.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filter === 'all' || p.stock <= p.minStock;
    return matchesSearch && matchesFilter;
  });

  const totalValue = data.inventory.reduce((acc, curr) => acc + (curr.purchasePrice * curr.stock), 0);
  const potentialValue = data.inventory.reduce((acc, curr) => acc + (curr.salePrice * curr.stock), 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border">
          <p className="text-neutral-500 text-sm mb-1">Собівартість складу</p>
          <h3 className="text-2xl font-bold text-neutral-900">{totalValue.toLocaleString()} ₴</h3>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border">
          <p className="text-neutral-500 text-sm mb-1">Потенційний виторг</p>
          <h3 className="text-2xl font-bold text-green-600">{potentialValue.toLocaleString()} ₴</h3>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border">
          <p className="text-neutral-500 text-sm mb-1">Очікуваний прибуток</p>
          <h3 className="text-2xl font-bold text-blue-600">{(potentialValue - totalValue).toLocaleString()} ₴</h3>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
        <div className="p-4 border-b flex flex-wrap gap-4 items-center justify-between bg-neutral-50/50">
          <div className="flex gap-2">
            <button 
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${filter === 'all' ? 'bg-neutral-900 text-white' : 'bg-white border hover:bg-neutral-100'}`}
            >
              Всі запчастини
            </button>
            <button 
              onClick={() => setFilter('low')}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${filter === 'low' ? 'bg-red-500 text-white' : 'bg-white border text-red-500 hover:bg-red-50'}`}
            >
              Критичний залишок
            </button>
          </div>
          <div className="flex gap-4 items-center">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-neutral-400" size={18} />
              <input 
                type="text" 
                placeholder="Пошук артикула..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border rounded-xl focus:ring-2 focus:ring-[#ffcc00] outline-none text-sm w-64"
              />
            </div>
            <button 
              onClick={() => setShowCategoryModal(true)}
              className="bg-neutral-100 hover:bg-neutral-200 text-neutral-800 px-4 py-2 rounded-xl font-bold text-sm transition-colors"
            >
              Категорії
            </button>
            <button 
              onClick={() => setShowSupplierModal(true)}
              className="bg-neutral-100 hover:bg-neutral-200 text-neutral-800 px-4 py-2 rounded-xl font-bold text-sm transition-colors"
            >
              Постачальники
            </button>
            <button 
              onClick={() => handleOpenPartModal()}
              className="bg-[#ffcc00] text-black px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-[#e6b800] transition-colors shadow-sm text-sm"
            >
              <Plus size={18} /> Додати товар
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-neutral-50 text-neutral-500 text-[10px] uppercase font-bold tracking-wider border-b">
                <th className="px-6 py-4">Артикул / Назва</th>
                <th className="px-6 py-4 text-center">Категорія</th>
                <th className="px-6 py-4 text-center">Постачальник</th>
                <th className="px-6 py-4 text-center">Залишок</th>
                <th className="px-6 py-4 text-right">Ціна (Закуп)</th>
                <th className="px-6 py-4 text-right">Ціна (Продаж)</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y text-sm">
              {filteredItems.map(item => (
                <tr key={item.id} className="hover:bg-neutral-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${item.stock <= item.minStock ? 'bg-red-100 text-red-600' : 'bg-neutral-100 text-neutral-500'}`}>
                        {item.stock <= item.minStock ? <AlertTriangle size={16} /> : <Package size={16} />}
                      </div>
                      <div>
                        <p className="font-bold text-neutral-900">{item.name}</p>
                        <p className="text-[10px] font-mono text-neutral-400">{item.sku}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center text-neutral-500">{item.category}</td>
                  <td className="px-6 py-4 text-center">
                    <span className="px-2 py-0.5 rounded-lg bg-neutral-100 text-[10px] font-bold text-neutral-600">
                      {data.suppliers.find(s => s.id === item.supplierId)?.name || 'Невідомо'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex flex-col items-center">
                      <span className={`font-bold ${item.stock <= item.minStock ? 'text-red-500' : 'text-neutral-700'}`}>
                        {item.stock} шт
                      </span>
                      <span className="text-[10px] text-neutral-400">Мін: {item.minStock}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right font-medium text-neutral-500">{item.purchasePrice} ₴</td>
                  <td className="px-6 py-4 text-right font-bold text-neutral-900">{item.salePrice} ₴</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-1">
                      <button 
                        onClick={() => handleOpenPartModal(item)}
                        className="p-2 text-neutral-400 hover:text-blue-600 rounded-lg hover:bg-blue-50"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => handleDeletePart(item.id)}
                        className="p-2 text-neutral-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg">Керування категоріями</h3>
              <button onClick={() => setShowCategoryModal(false)} className="text-neutral-400 hover:text-neutral-600">
                <X size={20} />
              </button>
            </div>
            <div className="flex gap-2 mb-4">
              <input 
                type="text" 
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Назва категорії..."
                className="flex-1 border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[#ffcc00]"
              />
              <button 
                onClick={handleAddCategory}
                className="bg-[#ffcc00] font-bold px-4 py-2 rounded-lg"
              >
                Додати
              </button>
            </div>
            <div className="max-h-60 overflow-y-auto space-y-2 mb-6">
              {data.categories?.map(c => (
                <div key={c.id} className="p-2 bg-neutral-50 rounded flex justify-between items-center group">
                  <span className="text-sm">{c.name}</span>
                  <button 
                    onClick={() => handleDeleteCategory(c.id)}
                    className="text-red-400 opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 size={14}/>
                  </button>
                </div>
              ))}
            </div>
            <button 
              onClick={() => setShowCategoryModal(false)}
              className="w-full py-2 bg-neutral-900 text-white rounded-lg font-bold"
            >
              Закрити
            </button>
          </div>
        </div>
      )}

      {/* Supplier Modal */}
      {showSupplierModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-xl shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg">Керування постачальниками</h3>
              <button onClick={() => setShowSupplierModal(false)} className="text-neutral-400 hover:text-neutral-600">
                <X size={20} />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2 mb-4">
              <input 
                type="text" 
                value={supplierForm.name}
                onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })}
                placeholder="Назва..."
                className="border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[#ffcc00]"
              />
              <input 
                type="text" 
                value={supplierForm.phone}
                onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })}
                placeholder="Телефон..."
                className="border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[#ffcc00]"
              />
              <input 
                type="email" 
                value={supplierForm.email}
                onChange={(e) => setSupplierForm({ ...supplierForm, email: e.target.value })}
                placeholder="Email..."
                className="border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[#ffcc00]"
              />
              <button 
                onClick={handleSaveSupplier}
                className="col-span-3 bg-[#ffcc00] font-bold px-4 py-2 rounded-lg"
              >
                {editingSupplier ? 'Оновити' : 'Додати'} постачальника
              </button>
            </div>
            <div className="max-h-60 overflow-y-auto space-y-2 mb-6">
              {data.suppliers?.map(s => (
                <div key={s.id} className="p-3 bg-neutral-50 rounded flex justify-between items-center group">
                  <div>
                    <p className="text-sm font-bold">{s.name}</p>
                    <p className="text-xs text-neutral-500">{s.phone} {s.email && `• ${s.email}`}</p>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                    <button 
                      onClick={() => handleEditSupplier(s)}
                      className="text-blue-400 p-1"
                    >
                      <Edit2 size={14}/>
                    </button>
                    <button 
                      onClick={() => handleDeleteSupplier(s.id)}
                      className="text-red-400 p-1"
                    >
                      <Trash2 size={14}/>
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <button 
              onClick={() => { setShowSupplierModal(false); setEditingSupplier(null); }}
              className="w-full py-2 bg-neutral-900 text-white rounded-lg font-bold"
            >
              Закрити
            </button>
          </div>
        </div>
      )}

      {/* Part Modal */}
      {showPartModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="p-6 border-b bg-neutral-50 flex items-center justify-between">
              <h3 className="font-bold text-lg">{editingPart ? 'Редагування' : 'Нова запчастина'}</h3>
              <button onClick={() => setShowPartModal(false)} className="text-neutral-400 hover:text-neutral-600">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Артикул *</label>
                  <input
                    type="text"
                    value={partForm.sku || ''}
                    onChange={(e) => setPartForm({ ...partForm, sku: e.target.value })}
                    className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-[#ffcc00] font-mono"
                    placeholder="SKU-001"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Категорія</label>
                  <select
                    value={partForm.category || ''}
                    onChange={(e) => setPartForm({ ...partForm, category: e.target.value })}
                    className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-[#ffcc00]"
                  >
                    {data.categories.map(c => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Назва *</label>
                <input
                  type="text"
                  value={partForm.name || ''}
                  onChange={(e) => setPartForm({ ...partForm, name: e.target.value })}
                  className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-[#ffcc00]"
                  placeholder="Назва запчастини"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Закупівельна ціна</label>
                  <input
                    type="number"
                    value={partForm.purchasePrice || ''}
                    onChange={(e) => setPartForm({ ...partForm, purchasePrice: Number(e.target.value) })}
                    className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-[#ffcc00]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Ціна продажу</label>
                  <input
                    type="number"
                    value={partForm.salePrice || ''}
                    onChange={(e) => setPartForm({ ...partForm, salePrice: Number(e.target.value) })}
                    className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-[#ffcc00]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Поточний залишок</label>
                  <div className="w-full p-2 border rounded-lg bg-neutral-50 text-neutral-500 text-sm">
                    {editingPart ? `${editingPart.stock} шт` : '0 шт — керується через складські документи'}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Мін. залишок</label>
                  <input
                    type="number"
                    value={partForm.minStock || ''}
                    onChange={(e) => setPartForm({ ...partForm, minStock: Number(e.target.value) })}
                    className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-[#ffcc00]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Постачальник</label>
                <select
                  value={partForm.supplierId || ''}
                  onChange={(e) => setPartForm({ ...partForm, supplierId: e.target.value })}
                  className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-[#ffcc00]"
                >
                  <option value="">Оберіть постачальника...</option>
                  {data.suppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="p-6 border-t bg-neutral-50 flex gap-3 justify-end">
              <button 
                onClick={() => setShowPartModal(false)}
                className="px-6 py-2 rounded-lg font-medium text-neutral-600 hover:bg-neutral-100"
              >
                Скасувати
              </button>
              <button 
                onClick={handleSavePart}
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
