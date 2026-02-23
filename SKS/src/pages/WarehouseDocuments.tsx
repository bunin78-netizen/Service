import { useState, useEffect } from 'react';
import { AppData, WarehouseDocument, WarehouseDocumentItem } from '../types';
import { Plus, FileText, X, Save, Trash2, ChevronDown, ChevronUp, Printer, RefreshCw, Search } from 'lucide-react';
import { generateId } from '../store';

function applyDocumentToInventory(
  docType: WarehouseDocument['type'],
  items: WarehouseDocumentItem[],
  inventory: AppData['inventory'],
  multiplier: 1 | -1,
): AppData['inventory'] {
  const itemMap = new Map(items.map(i => [i.partId, i]));
  return inventory.map(part => {
    const item = itemMap.get(part.id);
    if (!item) return part;
    const delta = item.quantity * multiplier;
    const stockChange = docType === 'incoming' ? delta : -delta;
    return { ...part, stock: Math.max(0, part.stock + stockChange) };
  });
}

function checkStock(
  docType: WarehouseDocument['type'],
  items: WarehouseDocumentItem[],
  inventory: AppData['inventory'],
): string | null {
  if (docType === 'incoming') return null;
  for (const item of items) {
    const part = inventory.find(p => p.id === item.partId);
    if (!part) continue;
    if (part.stock < item.quantity) {
      return `Недостатньо товару "${part.name}" на складі: є ${part.stock} шт., потрібно ${item.quantity} шт.`;
    }
  }
  return null;
}

function syncInventoryFromDocuments(
  documents: WarehouseDocument[],
  inventory: AppData['inventory'],
): AppData['inventory'] {
  const sorted = [...documents].sort((a, b) => {
    const d = a.date.localeCompare(b.date);
    if (d !== 0) return d;
    return (a.createdAt || '').localeCompare(b.createdAt || '');
  });
  // Reset to 0 then replay completed documents.
  // Documents without a status field are treated as 'completed' for backward compatibility.
  const zeroed = inventory.map(p => ({ ...p, stock: 0 }));
  return sorted
    .filter(doc => !doc.status || doc.status === 'completed')
    .reduce(
      (inv, doc) => applyDocumentToInventory(doc.type, doc.items, inv, 1),
      zeroed,
    );
}

const DOC_TYPE_LABELS: Record<WarehouseDocument['type'], string> = {
  incoming: 'Прихідна накладна',
  outgoing: 'Видаткова накладна',
  writeoff: 'Списання',
  inventory: 'Інвентаризація',
  return: 'Повернення',
};

const DOC_TYPE_COLORS: Record<WarehouseDocument['type'], string> = {
  incoming: 'bg-green-100 text-green-700',
  outgoing: 'bg-blue-100 text-blue-700',
  writeoff: 'bg-red-100 text-red-700',
  inventory: 'bg-purple-100 text-purple-700',
  return: 'bg-orange-100 text-orange-700',
};

const EMPTY_FORM: Omit<WarehouseDocument, 'id'> = {
  type: 'incoming',
  number: '',
  date: new Date().toISOString().split('T')[0],
  supplierId: '',
  clientId: '',
  note: '',
  items: [],
};

export default function WarehouseDocuments({
  data,
  updateData,
  autoOpenNew,
  onAutoOpenHandled,
}: {
  data: AppData;
  updateData: (d: Partial<AppData>) => void;
  autoOpenNew?: boolean;
  onAutoOpenHandled?: () => void;
}) {
  const currentUser = data.users.find(u => u.id === data.currentUserId);
  const [showModal, setShowModal] = useState(false);
  const [editingDoc, setEditingDoc] = useState<WarehouseDocument | null>(null);
  const [form, setForm] = useState<Omit<WarehouseDocument, 'id'>>(EMPTY_FORM);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<WarehouseDocument['type'] | 'all'>('all');

  const docs = data.warehouseDocuments || [];

  useEffect(() => {
    if (autoOpenNew) {
      setEditingDoc(null);
      setForm({ ...EMPTY_FORM, type: 'incoming', date: new Date().toISOString().split('T')[0], items: [] });
      setShowModal(true);
      onAutoOpenHandled?.();
    }
  }, [autoOpenNew, onAutoOpenHandled]);

  const openNew = () => {
    setEditingDoc(null);
    setForm({ ...EMPTY_FORM, date: new Date().toISOString().split('T')[0], items: [] });
    setShowModal(true);
  };

  const openEdit = (doc: WarehouseDocument) => {
    setEditingDoc(doc);
    setForm({
      type: doc.type,
      number: doc.number,
      date: doc.date,
      supplierId: doc.supplierId || '',
      clientId: doc.clientId || '',
      note: doc.note || '',
      items: doc.items.map(i => ({ ...i })),
    });
    setShowModal(true);
  };

  const handleSave = () => {
    if (!form.number.trim() || !form.date) return;
    if (editingDoc) {
      // Reverse old document effect, then validate and apply new document effect
      let newInventory = applyDocumentToInventory(editingDoc.type, editingDoc.items, data.inventory, -1);
      const err = checkStock(form.type, form.items, newInventory);
      if (err) { alert(err); return; }
      newInventory = applyDocumentToInventory(form.type, form.items, newInventory, 1);
      const updated = docs.map(d =>
        d.id === editingDoc.id ? { ...d, ...form } : d
      );
      updateData({ warehouseDocuments: updated, inventory: newInventory });
    } else {
      const err = checkStock(form.type, form.items, data.inventory);
      if (err) { alert(err); return; }
      const newInventory = applyDocumentToInventory(form.type, form.items, data.inventory, 1);
      const newDoc: WarehouseDocument = { id: generateId(), ...form };
      updateData({ warehouseDocuments: [newDoc, ...docs], inventory: newInventory });
    }
    setShowModal(false);
  };

  const handleDelete = (id: string) => {
    if (!confirm('Видалити документ?')) return;
    const doc = docs.find(d => d.id === id);
    const newDocs = docs.filter(d => d.id !== id);
    if (doc) {
      const newInventory = applyDocumentToInventory(doc.type, doc.items, data.inventory, -1);
      updateData({ warehouseDocuments: newDocs, inventory: newInventory });
    } else {
      updateData({ warehouseDocuments: newDocs });
    }
  };

  const addItem = () => {
    if (data.inventory.length === 0) return;
    setForm(prev => ({
      ...prev,
      items: [...prev.items, { partId: data.inventory[0].id, quantity: 1, price: 0 }],
    }));
  };

  const updateItem = (idx: number, patch: Partial<WarehouseDocumentItem>) => {
    setForm(prev => ({
      ...prev,
      items: prev.items.map((item, i) => (i === idx ? { ...item, ...patch } : item)),
    }));
  };

  const removeItem = (idx: number) => {
    setForm(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== idx) }));
  };

  const handleSync = () => {
    if (!confirm('Синхронізувати залишки складу за документами? Поточні залишки буде перераховано.')) return;
    const newInventory = syncInventoryFromDocuments(docs, data.inventory);
    updateData({ inventory: newInventory });
  };

  const docTotal = (doc: WarehouseDocument) =>
    doc.items.reduce((sum, it) => sum + it.quantity * it.price, 0);

  const escHtml = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  const handlePrint = (doc: WarehouseDocument) => {
    const cs = data.companySettings;
    const supplier = data.suppliers.find(s => s.id === doc.supplierId);
    const client = data.clients.find(c => c.id === doc.clientId);
    const total = docTotal(doc);
    const w = window.open('', '_blank');
    if (!w) { alert('Дозвольте спливаючі вікна у браузері для друку документа.'); return; }
    w.document.write(`<html><head><title>${escHtml(DOC_TYPE_LABELS[doc.type])} № ${escHtml(doc.number)}</title>
    <style>
      body{font-family:Arial,sans-serif;padding:40px;color:#333;max-width:800px;margin:0 auto}
      .header{display:flex;justify-content:space-between;border-bottom:3px solid #ffcc00;padding-bottom:20px;margin-bottom:20px}
      .company{font-size:22px;font-weight:bold}
      .info{font-size:11px;color:#666}
      .title{text-align:center;font-size:18px;font-weight:bold;text-transform:uppercase;margin:20px 0}
      .meta{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:20px;font-size:13px;background:#f9f9f9;padding:15px;border-radius:8px}
      table{width:100%;border-collapse:collapse;margin-bottom:20px}
      th,td{border:1px solid #ddd;padding:8px;font-size:12px;text-align:left}
      th{background:#f5f5f5;font-weight:bold}
      .total{font-weight:bold;background:#fffbe6}
      .footer{margin-top:50px;display:flex;justify-content:space-between}
      .sig{width:200px;border-top:1px solid #000;text-align:center;font-size:11px;padding-top:5px}
      @media print{body{padding:20px}}
    </style></head><body>
    <div class="header">
      <div>
        <div class="company">${escHtml(cs.name)}</div>
        <div class="info">${escHtml(cs.address)}<br>Тел: ${escHtml(cs.phone)}<br>ЄДРПОУ: ${escHtml(cs.edrpou)}</div>
      </div>
      <div style="text-align:right">
        <div style="font-weight:bold">${escHtml(DOC_TYPE_LABELS[doc.type]).toUpperCase()} № ${escHtml(doc.number)}</div>
        <div style="font-size:13px">від ${escHtml(doc.date.split('-').reverse().join('.'))}</div>
      </div>
    </div>
    <div class="title">${escHtml(DOC_TYPE_LABELS[doc.type])}</div>
    <div class="meta">
      <div><strong>Номер документа:</strong> ${escHtml(doc.number)}</div>
      <div><strong>Дата:</strong> ${escHtml(doc.date.split('-').reverse().join('.'))}</div>
      ${doc.type === 'incoming' && supplier ? `<div><strong>Постачальник:</strong> ${escHtml(supplier.name)}</div><div><strong>Тел. постачальника:</strong> ${escHtml(supplier.phone || '—')}</div>` : ''}
      ${doc.type === 'outgoing' && client ? `<div><strong>Клієнт:</strong> ${escHtml(client.name)}</div><div><strong>Тел. клієнта:</strong> ${escHtml(client.phone || '—')}</div>` : ''}
      ${doc.note ? `<div style="grid-column:span 2"><strong>Примітка:</strong> ${escHtml(doc.note)}</div>` : ''}
    </div>
    <table>
      <thead><tr><th>#</th><th>Найменування</th><th>К-сть, шт</th><th>Ціна, ₴</th><th>Сума, ₴</th></tr></thead>
      <tbody>
        ${doc.items.map((item, i) => {
          const part = data.inventory.find(p => p.id === item.partId);
          const name = escHtml(part?.name || item.name || '—');
          return `<tr><td>${i + 1}</td><td>${name}</td><td>${item.quantity}</td><td>${item.price.toFixed(2)}</td><td>${(item.quantity * item.price).toFixed(2)}</td></tr>`;
        }).join('')}
        <tr class="total"><td colspan="4" style="text-align:right">ВСЬОГО:</td><td>${total.toFixed(2)} ₴</td></tr>
      </tbody>
    </table>
    <div class="footer">
      <div class="sig">Склав(ла)<br>(${escHtml(cs.managerName || cs.name)})</div>
      <div class="sig">Прийняв(ла)<br>&nbsp;</div>
    </div>
    </body></html>`);
    w.document.close();
    w.print();
  };

  const filteredDocs = docs.filter(doc => {
    const matchesType = typeFilter === 'all' || doc.type === typeFilter;
    const term = searchTerm.toLowerCase();
    const matchesSearch = !term || doc.number.toLowerCase().includes(term) || (doc.note || '').toLowerCase().includes(term);
    return matchesType && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {(['incoming', 'outgoing', 'writeoff'] as const).map(type => (
          <div key={type} className="bg-white p-6 rounded-2xl shadow-sm border">
            <p className="text-neutral-500 text-sm mb-1">{DOC_TYPE_LABELS[type]}</p>
            <h3 className="text-2xl font-bold text-neutral-900">
              {docs.filter(d => d.type === type).length} докум.
            </h3>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
        <div className="p-4 border-b flex flex-wrap gap-4 items-center justify-between bg-neutral-50/50">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setTypeFilter('all')}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${typeFilter === 'all' ? 'bg-neutral-900 text-white' : 'bg-white border hover:bg-neutral-100'}`}
            >
              Всі
            </button>
            {(Object.keys(DOC_TYPE_LABELS) as WarehouseDocument['type'][]).map(t => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${typeFilter === t ? 'bg-neutral-900 text-white' : 'bg-white border hover:bg-neutral-100'}`}
              >
                {DOC_TYPE_LABELS[t]}
              </button>
            ))}
          </div>
          <div className="flex gap-2 items-center">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-neutral-400" size={18} />
              <input
                type="text"
                placeholder="Пошук за номером або нотаткою..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border rounded-xl focus:ring-2 focus:ring-[#ffcc00] outline-none text-sm w-52"
              />
            </div>
            <button
              onClick={handleSync}
              className="bg-neutral-100 text-neutral-700 px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-neutral-200 transition-colors shadow-sm text-sm"
              title="Перерахувати залишки складу за документами"
            >
              <RefreshCw size={18} /> Синхронізувати
            </button>
            <button
              onClick={openNew}
              className="bg-[#ffcc00] text-black px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-[#e6b800] transition-colors shadow-sm text-sm"
            >
              <Plus size={18} /> Новий документ
            </button>
          </div>
        </div>

        {docs.length === 0 ? (
          <div className="p-12 text-center text-neutral-400">
            <FileText size={40} className="mx-auto mb-3 opacity-30" />
            <p>Немає складських документів</p>
          </div>
        ) : filteredDocs.length === 0 ? (
          <div className="p-12 text-center text-neutral-400">
            <Search size={40} className="mx-auto mb-3 opacity-30" />
            <p>Нічого не знайдено</p>
          </div>
        ) : (
          <div className="divide-y">
            {filteredDocs.map(doc => (
              <div key={doc.id}>
                <div
                  className="flex items-center gap-4 px-6 py-4 hover:bg-neutral-50 cursor-pointer transition-colors"
                  onClick={() => setExpandedId(expandedId === doc.id ? null : doc.id)}
                >
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${DOC_TYPE_COLORS[doc.type]}`}>
                    {DOC_TYPE_LABELS[doc.type]}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-neutral-900">{doc.number}</p>
                    <p className="text-xs text-neutral-400">{doc.date}</p>
                  </div>
                  {doc.supplierId && doc.type === 'incoming' && (
                    <span className="text-xs text-neutral-500 hidden md:block">
                      {data.suppliers.find(s => s.id === doc.supplierId)?.name || ''}
                    </span>
                  )}
                  {doc.clientId && doc.type === 'outgoing' && (
                    <span className="text-xs text-neutral-500 hidden md:block">
                      {data.clients.find(c => c.id === doc.clientId)?.name || ''}
                    </span>
                  )}
                  <span className="font-bold text-sm text-neutral-700">
                    {docTotal(doc).toLocaleString()} ₴
                  </span>
                  <div className="flex gap-1 ml-2" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => handlePrint(doc)}
                      className="p-1.5 text-neutral-400 hover:text-green-600 rounded-lg hover:bg-green-50"
                      title="Друк"
                    >
                      <Printer size={15} />
                    </button>
                    <button
                      onClick={() => openEdit(doc)}
                      className="p-1.5 text-neutral-400 hover:text-blue-600 rounded-lg hover:bg-blue-50"
                    >
                      <FileText size={15} />
                    </button>
                    {currentUser?.permissions.canDeleteOrders && (
                    <button
                      onClick={() => handleDelete(doc.id)}
                      className="p-1.5 text-neutral-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                    >
                      <Trash2 size={15} />
                    </button>
                    )}
                  </div>
                  {expandedId === doc.id ? (
                    <ChevronUp size={16} className="text-neutral-400" />
                  ) : (
                    <ChevronDown size={16} className="text-neutral-400" />
                  )}
                </div>

                {/* Expanded rows */}
                {expandedId === doc.id && doc.items.length > 0 && (
                  <div className="px-8 pb-4 bg-neutral-50/60">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-neutral-400 text-xs uppercase border-b">
                          <th className="py-2 text-left font-bold">Запчастина</th>
                          <th className="py-2 text-right font-bold">Кількість</th>
                          <th className="py-2 text-right font-bold">Ціна</th>
                          <th className="py-2 text-right font-bold">Сума</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-100">
                        {doc.items.map((item, idx) => {
                          const part = data.inventory.find(p => p.id === item.partId);
                          return (
                            <tr key={idx}>
                              <td className="py-2 text-neutral-700">{part?.name || '(видалено)'}</td>
                              <td className="py-2 text-right text-neutral-600">{item.quantity} шт</td>
                              <td className="py-2 text-right text-neutral-600">{item.price} ₴</td>
                              <td className="py-2 text-right font-bold text-neutral-800">
                                {(item.quantity * item.price).toLocaleString()} ₴
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    {doc.note && (
                      <p className="mt-2 text-xs text-neutral-400 italic">Примітка: {doc.note}</p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-6 border-b bg-neutral-50 flex items-center justify-between shrink-0">
              <h3 className="font-bold text-lg">
                {editingDoc ? 'Редагування документа' : 'Новий складський документ'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-neutral-400 hover:text-neutral-600">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Тип документа</label>
                  <select
                    value={form.type}
                    onChange={e => setForm({ ...form, type: e.target.value as WarehouseDocument['type'] })}
                    className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-[#ffcc00]"
                  >
                    {(Object.keys(DOC_TYPE_LABELS) as WarehouseDocument['type'][]).map(t => (
                      <option key={t} value={t}>{DOC_TYPE_LABELS[t]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Номер *</label>
                  <input
                    type="text"
                    value={form.number}
                    onChange={e => setForm({ ...form, number: e.target.value })}
                    className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-[#ffcc00]"
                    placeholder="ПН-0001"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Дата *</label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={e => setForm({ ...form, date: e.target.value })}
                    className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-[#ffcc00]"
                  />
                </div>
                {form.type === 'outgoing' ? (
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">Клієнт</label>
                    <select
                      value={form.clientId || ''}
                      onChange={e => setForm({ ...form, clientId: e.target.value })}
                      className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-[#ffcc00]"
                    >
                      <option value="">— не вказано —</option>
                      {data.clients.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                ) : form.type === 'incoming' ? (
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">Постачальник</label>
                    <select
                      value={form.supplierId || ''}
                      onChange={e => setForm({ ...form, supplierId: e.target.value })}
                      className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-[#ffcc00]"
                    >
                      <option value="">— не вказано —</option>
                      {data.suppliers.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                ) : null}
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Примітка</label>
                <input
                  type="text"
                  value={form.note || ''}
                  onChange={e => setForm({ ...form, note: e.target.value })}
                  className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-[#ffcc00]"
                  placeholder="Необов'язково"
                />
              </div>

              {/* Items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-neutral-700">Товари</label>
                  <button
                    onClick={addItem}
                    disabled={data.inventory.length === 0}
                    className="text-xs text-blue-600 hover:underline flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
                    title={data.inventory.length === 0 ? 'Склад порожній' : undefined}
                  >
                    <Plus size={13} /> Додати рядок
                  </button>
                </div>
                <div className="space-y-2">
                  {form.items.map((item, idx) => {
                    const part = data.inventory.find(p => p.id === item.partId);
                    const insufficient = form.type !== 'incoming' && !!part && part.stock < item.quantity;
                    return (
                      <div key={idx} className="space-y-0.5">
                        <div className="grid grid-cols-[1fr_80px_90px_32px] gap-2 items-center">
                          <select
                            value={item.partId}
                            onChange={e => updateItem(idx, { partId: e.target.value })}
                            className="p-2 border rounded-lg outline-none focus:ring-2 focus:ring-[#ffcc00] text-sm"
                          >
                            {data.inventory.map(p => (
                              <option key={p.id} value={p.id}>{p.name} (залишок: {p.stock} шт.)</option>
                            ))}
                          </select>
                          <input
                            type="number"
                            min={1}
                            value={item.quantity}
                            onChange={e => updateItem(idx, { quantity: Number(e.target.value) })}
                            className={`p-2 border rounded-lg outline-none focus:ring-2 focus:ring-[#ffcc00] text-sm ${insufficient ? 'border-red-400 bg-red-50' : ''}`}
                            placeholder="Кіл."
                          />
                          <input
                            type="number"
                            min={0}
                            value={item.price}
                            onChange={e => updateItem(idx, { price: Number(e.target.value) })}
                            className="p-2 border rounded-lg outline-none focus:ring-2 focus:ring-[#ffcc00] text-sm"
                            placeholder="Ціна"
                          />
                          <button
                            onClick={() => removeItem(idx)}
                            className="p-1.5 text-red-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                          >
                            <X size={15} />
                          </button>
                        </div>
                        {insufficient && (
                          <p className="text-xs text-red-500 pl-1">
                            На складі лише {part?.stock} шт.
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="p-6 border-t bg-neutral-50 flex gap-3 justify-end shrink-0">
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
