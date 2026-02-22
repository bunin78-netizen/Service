import { useState, useMemo } from 'react';
import { AppData, Supplier, Part, WarehouseDocument, WarehouseDocumentItem } from '../types';
import { generateId } from '../store';
import {
  Car, Package, Wrench, Users, FileText, Truck,
  Plus, Search, Edit2, Trash2, X, Save, ChevronDown, ChevronUp,
  Clock, DollarSign, Phone, Mail, Globe, Hash,
  ArrowDownCircle, ArrowUpCircle, ClipboardList, RotateCcw,
} from 'lucide-react';

// ─── Extra DB Types (stored in AppData.dbExtras via localStorage) ────────────
export type VehicleMake = {
  id: string;
  make: string;
  models: { id: string; name: string; years: string }[];
};

export type CatalogPart = {
  id: string;
  oem: string;
  name: string;
  brand: string;
  category: string;
  description?: string;
  compatibleMakes: string[];
  purchasePrice: number;
  salePrice: number;
};

export type WorkNorm = {
  id: string;
  code: string;
  name: string;
  category: string;
  hours: number;
  price: number;
  description?: string;
};

export type DocumentTemplate = {
  id: string;
  name: string;
  type: 'invoice' | 'act' | 'diagnostic' | 'receipt' | 'contract';
  content: string;
  createdAt: string;
};

export type DbExtras = {
  vehicleMakes: VehicleMake[];
  catalogParts: CatalogPart[];
  workNorms: WorkNorm[];
  documentTemplates: DocumentTemplate[];
};

const DB_KEY = 'smartkharkov_db_extras';

export function loadDbExtras(): DbExtras {
  const raw = localStorage.getItem(DB_KEY);
  if (raw) {
    const parsed = JSON.parse(raw);
    // Ensure new fields are present when loading older stored data
    return {
      ...parsed,
    };
  }
  return {
    vehicleMakes: [
      { id: 'vm1', make: 'Toyota', models: [{ id: 'm1', name: 'Camry', years: '2012-2024' }, { id: 'm2', name: 'RAV4', years: '2013-2024' }, { id: 'm3', name: 'Corolla', years: '2000-2024' }] },
      { id: 'vm2', make: 'BMW', models: [{ id: 'm4', name: 'X5', years: '2010-2024' }, { id: 'm5', name: '3 Series', years: '2005-2024' }, { id: 'm6', name: '5 Series', years: '2010-2024' }] },
      { id: 'vm3', make: 'Volkswagen', models: [{ id: 'm7', name: 'Passat', years: '2005-2024' }, { id: 'm8', name: 'Golf', years: '2000-2024' }, { id: 'm9', name: 'Tiguan', years: '2010-2024' }] },
      { id: 'vm4', make: 'Ford', models: [{ id: 'm10', name: 'Focus', years: '2000-2024' }, { id: 'm11', name: 'Mondeo', years: '2007-2022' }] },
      { id: 'vm5', make: 'Hyundai', models: [{ id: 'm12', name: 'Tucson', years: '2015-2024' }, { id: 'm13', name: 'Elantra', years: '2010-2024' }] },
      { id: 'vm6', make: 'Kia', models: [{ id: 'm14', name: 'Sportage', years: '2015-2024' }, { id: 'm15', name: 'Cerato', years: '2013-2024' }] },
      { id: 'vm7', make: 'Mercedes-Benz', models: [{ id: 'm16', name: 'E-Class', years: '2010-2024' }, { id: 'm17', name: 'C-Class', years: '2005-2024' }] },
      { id: 'vm8', make: 'Renault', models: [{ id: 'm18', name: 'Logan', years: '2005-2024' }, { id: 'm19', name: 'Megane', years: '2002-2020' }] },
    ],
    catalogParts: [
      { id: 'cp1', oem: 'TOY-04152-YZZA6', name: 'Фільтр масляний Toyota', brand: 'Toyota OEM', category: 'Фільтри', compatibleMakes: ['Toyota'], purchasePrice: 280, salePrice: 520, description: 'Оригінальний фільтр масляний' },
      { id: 'cp2', oem: 'NGK-BKR6EGP', name: 'Свічка запалювання NGK', brand: 'NGK', category: 'Двигун', compatibleMakes: ['Toyota', 'Hyundai', 'Kia'], purchasePrice: 120, salePrice: 240, description: 'Платинова свічка запалювання' },
      { id: 'cp3', oem: 'BOS-0451103259', name: 'Фільтр масляний Bosch', brand: 'Bosch', category: 'Фільтри', compatibleMakes: ['BMW', 'Mercedes-Benz', 'Volkswagen'], purchasePrice: 180, salePrice: 350 },
      { id: 'cp4', oem: 'ATE-603053060010', name: 'Гальмівні колодки передні ATE', brand: 'ATE', category: 'Гальма', compatibleMakes: ['BMW', 'Volkswagen'], purchasePrice: 750, salePrice: 1400 },
      { id: 'cp5', oem: 'MOB-104069', name: 'Масло Mobil 5W-30 4л', brand: 'Mobil', category: 'Мастила', compatibleMakes: [], purchasePrice: 1100, salePrice: 1900, description: 'Синтетична олива для сучасних двигунів' },
      { id: 'cp6', oem: 'MAN-W71383', name: 'Фільтр масляний Mann', brand: 'Mann Filter', category: 'Фільтри', compatibleMakes: ['Volkswagen', 'Ford', 'Renault'], purchasePrice: 160, salePrice: 320 },
    ],
    workNorms: [
      { id: 'wn1', code: 'MOI-001', name: 'Заміна моторної оливи', category: 'ТО', hours: 0.5, price: 300, description: 'Заміна оливи + фільтр' },
      { id: 'wn2', code: 'MOI-002', name: 'Заміна оливи в КПП', category: 'ТО', hours: 1.0, price: 500 },
      { id: 'wn3', code: 'GAL-001', name: 'Заміна гальмівних колодок (пер.)', category: 'Гальма', hours: 1.5, price: 700 },
      { id: 'wn4', code: 'GAL-002', name: 'Заміна гальмівних колодок (зад.)', category: 'Гальма', hours: 1.5, price: 700 },
      { id: 'wn5', code: 'GAL-003', name: 'Заміна гальмівних дисків (пер.)', category: 'Гальма', hours: 2.0, price: 1200 },
      { id: 'wn6', code: 'HOD-001', name: 'Заміна амортизатора', category: 'Ходова', hours: 2.5, price: 1500 },
      { id: 'wn7', code: 'HOD-002', name: 'Заміна кульової опори', category: 'Ходова', hours: 1.5, price: 900 },
      { id: 'wn8', code: 'HOD-003', name: 'Заміна рульової тяги', category: 'Ходова', hours: 2.0, price: 1200 },
      { id: 'wn9', code: 'DVI-001', name: 'Комп\'ютерна діагностика', category: 'Діагностика', hours: 1.0, price: 500 },
      { id: 'wn10', code: 'DVI-002', name: 'Заміна ременя ГРМ', category: 'Двигун', hours: 4.0, price: 2500 },
      { id: 'wn11', code: 'DVI-003', name: 'Заміна ланцюга ГРМ', category: 'Двигун', hours: 6.0, price: 4000 },
      { id: 'wn12', code: 'ELE-001', name: 'Діагностика електрики', category: 'Електрика', hours: 1.5, price: 700 },
      { id: 'wn13', code: 'ELE-002', name: 'Заміна акумулятора', category: 'Електрика', hours: 0.5, price: 200 },
      { id: 'wn14', code: 'KUZ-001', name: 'Антикорозійна обробка', category: 'Кузов', hours: 3.0, price: 2000 },
      { id: 'wn15', code: 'SHI-001', name: 'Шиномонтаж (4 колеса)', category: 'Шини', hours: 1.0, price: 600 },
      { id: 'wn16', code: 'SHI-002', name: 'Балансування (4 колеса)', category: 'Шини', hours: 0.5, price: 400 },
    ],
    documentTemplates: [
      { id: 'dt1', name: 'Акт виконаних робіт (Стандарт)', type: 'act', content: 'Стандартний шаблон акту виконаних робіт', createdAt: '2024-01-01' },
      { id: 'dt2', name: 'Діагностична карта', type: 'diagnostic', content: 'Шаблон діагностичної карти автомобіля', createdAt: '2024-01-01' },
      { id: 'dt3', name: 'Рахунок-фактура', type: 'invoice', content: 'Шаблон рахунку-фактури', createdAt: '2024-01-01' },
      { id: 'dt4', name: 'Договір на обслуговування', type: 'contract', content: 'Договір технічного обслуговування', createdAt: '2024-01-01' },
    ],
  };
}

export function saveDbExtras(db: DbExtras) {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
}

// ─── Tab types ────────────────────────────────────────────────────────────────
type DbTab = 'vehicles' | 'parts' | 'norms' | 'clients' | 'documents' | 'suppliers' | 'warehouse';

interface Props {
  data: AppData;
  updateData: (d: Partial<AppData>) => void;
}

export default function Database({ data, updateData }: Props) {
  const [activeTab, setActiveTab] = useState<DbTab>('vehicles');
  const [db, setDb] = useState<DbExtras>(loadDbExtras());
  const [search, setSearch] = useState('');

  const saveDb = (updated: DbExtras) => {
    setDb(updated);
    saveDbExtras(updated);
  };

  const tabs: { id: DbTab; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: 'vehicles', label: 'Автомобілі', icon: <Car size={16} />, count: db.vehicleMakes.length },
    { id: 'parts', label: 'Каталог запчастин', icon: <Package size={16} />, count: db.catalogParts.length },
    { id: 'norms', label: 'Роботи та норми', icon: <Wrench size={16} />, count: db.workNorms.length },
    { id: 'clients', label: 'Клієнти', icon: <Users size={16} />, count: data.clients.length },
    { id: 'documents', label: 'Документи', icon: <FileText size={16} />, count: db.documentTemplates.length },
    { id: 'suppliers', label: 'Постачальники', icon: <Truck size={16} />, count: data.suppliers.length },
    { id: 'warehouse', label: 'Складські документи', icon: <ClipboardList size={16} />, count: data.warehouseDocuments.length },
  ];

  return (
    <div className="space-y-6">
      {/* Tab Bar */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="flex overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setSearch(''); }}
              className={`flex items-center gap-2 px-5 py-4 font-semibold text-sm whitespace-nowrap border-b-2 transition-all ${
                activeTab === tab.id
                  ? 'border-[#ffcc00] text-neutral-900 bg-[#ffcc00]/10'
                  : 'border-transparent text-neutral-500 hover:bg-neutral-50 hover:text-neutral-700'
              }`}
            >
              {tab.icon}
              {tab.label}
              {tab.count !== undefined && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  activeTab === tab.id ? 'bg-[#ffcc00] text-black' : 'bg-neutral-100 text-neutral-500'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 text-neutral-400" size={18} />
          <input
            type="text"
            placeholder={`Пошук у "${tabs.find(t => t.id === activeTab)?.label}"...`}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-xl focus:ring-2 focus:ring-[#ffcc00] outline-none"
          />
        </div>
      </div>

      {/* Content */}
      {activeTab === 'vehicles' && <VehiclesTab db={db} saveDb={saveDb} search={search} />}
      {activeTab === 'parts' && <CatalogPartsTab db={db} saveDb={saveDb} search={search} data={data} />}
      {activeTab === 'norms' && <WorkNormsTab db={db} saveDb={saveDb} search={search} />}
      {activeTab === 'clients' && <ClientsDbTab data={data} search={search} updateData={updateData} />}
      {activeTab === 'documents' && <DocumentsTab db={db} saveDb={saveDb} search={search} data={data} />}
      {activeTab === 'suppliers' && <SuppliersTab data={data} updateData={updateData} search={search} />}
      {activeTab === 'warehouse' && <WarehouseDocumentsTab search={search} data={data} updateData={updateData} />}
    </div>
  );
}

// ─── Vehicles Tab ─────────────────────────────────────────────────────────────
function VehiclesTab({ db, saveDb, search }: { db: DbExtras; saveDb: (d: DbExtras) => void; search: string }) {
  const [showModal, setShowModal] = useState(false);
  const [editMake, setEditMake] = useState<VehicleMake | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [makeForm, setMakeForm] = useState({ make: '' });
  const [modelForm, setModelForm] = useState({ name: '', years: '' });
  const [addingModelToId, setAddingModelToId] = useState<string | null>(null);

  const filtered = useMemo(() =>
    db.vehicleMakes.filter(v =>
      v.make.toLowerCase().includes(search.toLowerCase()) ||
      v.models.some(m => m.name.toLowerCase().includes(search.toLowerCase()))
    ), [db.vehicleMakes, search]);

  const handleSaveMake = () => {
    if (!makeForm.make.trim()) return;
    if (editMake) {
      saveDb({ ...db, vehicleMakes: db.vehicleMakes.map(v => v.id === editMake.id ? { ...v, make: makeForm.make } : v) });
    } else {
      saveDb({ ...db, vehicleMakes: [...db.vehicleMakes, { id: generateId(), make: makeForm.make, models: [] }] });
    }
    setShowModal(false);
    setEditMake(null);
    setMakeForm({ make: '' });
  };

  const handleDeleteMake = (id: string) => {
    if (!confirm('Видалити марку авто?')) return;
    saveDb({ ...db, vehicleMakes: db.vehicleMakes.filter(v => v.id !== id) });
  };

  const handleAddModel = (makeId: string) => {
    if (!modelForm.name.trim()) return;
    const updated = db.vehicleMakes.map(v =>
      v.id === makeId ? { ...v, models: [...v.models, { id: generateId(), name: modelForm.name, years: modelForm.years }] } : v
    );
    saveDb({ ...db, vehicleMakes: updated });
    setModelForm({ name: '', years: '' });
    setAddingModelToId(null);
  };

  const handleDeleteModel = (makeId: string, modelId: string) => {
    const updated = db.vehicleMakes.map(v =>
      v.id === makeId ? { ...v, models: v.models.filter(m => m.id !== modelId) } : v
    );
    saveDb({ ...db, vehicleMakes: updated });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={() => { setEditMake(null); setMakeForm({ make: '' }); setShowModal(true); }}
          className="bg-[#ffcc00] text-black px-4 py-2 rounded-xl font-bold flex items-center gap-2"
        >
          <Plus size={18} /> Додати марку
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map(vehicle => (
          <div key={vehicle.id} className="bg-white rounded-xl border shadow-sm overflow-hidden">
            <div
              className="p-4 flex items-center justify-between cursor-pointer hover:bg-neutral-50"
              onClick={() => setExpandedId(expandedId === vehicle.id ? null : vehicle.id)}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#ffcc00]/20 rounded-lg flex items-center justify-center">
                  <Car size={20} className="text-neutral-700" />
                </div>
                <div>
                  <h4 className="font-bold">{vehicle.make}</h4>
                  <p className="text-xs text-neutral-500">{vehicle.models.length} моделей</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={(e) => { e.stopPropagation(); setEditMake(vehicle); setMakeForm({ make: vehicle.make }); setShowModal(true); }} className="p-1 text-neutral-400 hover:text-blue-600">
                  <Edit2 size={14} />
                </button>
                <button onClick={(e) => { e.stopPropagation(); handleDeleteMake(vehicle.id); }} className="p-1 text-neutral-400 hover:text-red-600">
                  <Trash2 size={14} />
                </button>
                {expandedId === vehicle.id ? <ChevronUp size={16} className="text-neutral-400" /> : <ChevronDown size={16} className="text-neutral-400" />}
              </div>
            </div>

            {expandedId === vehicle.id && (
              <div className="border-t bg-neutral-50 p-4 space-y-2">
                {vehicle.models.map(model => (
                  <div key={model.id} className="flex items-center justify-between p-2 bg-white rounded-lg border">
                    <div>
                      <span className="font-medium text-sm">{model.name}</span>
                      {model.years && <span className="ml-2 text-xs text-neutral-400">{model.years}</span>}
                    </div>
                    <button onClick={() => handleDeleteModel(vehicle.id, model.id)} className="text-neutral-300 hover:text-red-500">
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}

                {addingModelToId === vehicle.id ? (
                  <div className="flex gap-2 mt-2">
                    <input
                      type="text"
                      placeholder="Модель"
                      value={modelForm.name}
                      onChange={e => setModelForm({ ...modelForm, name: e.target.value })}
                      className="flex-1 p-1.5 border rounded-lg text-sm outline-none focus:ring-1 focus:ring-[#ffcc00]"
                    />
                    <input
                      type="text"
                      placeholder="Роки (напр. 2010-2024)"
                      value={modelForm.years}
                      onChange={e => setModelForm({ ...modelForm, years: e.target.value })}
                      className="w-36 p-1.5 border rounded-lg text-sm outline-none focus:ring-1 focus:ring-[#ffcc00]"
                    />
                    <button onClick={() => handleAddModel(vehicle.id)} className="p-1.5 bg-[#ffcc00] rounded-lg">
                      <Save size={14} />
                    </button>
                    <button onClick={() => setAddingModelToId(null)} className="p-1.5 bg-neutral-200 rounded-lg">
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setAddingModelToId(vehicle.id)}
                    className="w-full py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg flex items-center justify-center gap-1 mt-1"
                  >
                    <Plus size={14} /> Додати модель
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-80 shadow-2xl">
            <h3 className="font-bold text-lg mb-4">{editMake ? 'Редагувати марку' : 'Нова марка авто'}</h3>
            <input
              type="text"
              value={makeForm.make}
              onChange={e => setMakeForm({ make: e.target.value })}
              placeholder="Назва марки (напр. Toyota)"
              className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-[#ffcc00] mb-4"
            />
            <div className="flex gap-2">
              <button onClick={() => setShowModal(false)} className="flex-1 py-2 bg-neutral-100 rounded-lg font-medium">Скасувати</button>
              <button onClick={handleSaveMake} className="flex-1 py-2 bg-[#ffcc00] rounded-lg font-bold">Зберегти</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Catalog Parts Tab ────────────────────────────────────────────────────────
function CatalogPartsTab({ db, saveDb, search, data }: { db: DbExtras; saveDb: (d: DbExtras) => void; search: string; data: AppData }) {
  const [showModal, setShowModal] = useState(false);
  const [editPart, setEditPart] = useState<CatalogPart | null>(null);
  const [form, setForm] = useState<Partial<CatalogPart>>({});

  const filtered = useMemo(() =>
    db.catalogParts.filter(p =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.oem.toLowerCase().includes(search.toLowerCase()) ||
      p.brand.toLowerCase().includes(search.toLowerCase())
    ), [db.catalogParts, search]);

  const openModal = (part?: CatalogPart) => {
    setEditPart(part || null);
    setForm(part || { oem: '', name: '', brand: '', category: '', compatibleMakes: [], purchasePrice: 0, salePrice: 0 });
    setShowModal(true);
  };

  const handleSave = () => {
    if (!form.name || !form.oem) return;
    const part: CatalogPart = {
      id: editPart?.id || generateId(),
      oem: form.oem!, name: form.name!, brand: form.brand || '',
      category: form.category || '', compatibleMakes: form.compatibleMakes || [],
      purchasePrice: form.purchasePrice || 0, salePrice: form.salePrice || 0,
      description: form.description,
    };
    if (editPart) {
      saveDb({ ...db, catalogParts: db.catalogParts.map(p => p.id === editPart.id ? part : p) });
    } else {
      saveDb({ ...db, catalogParts: [...db.catalogParts, part] });
    }
    setShowModal(false);
  };

  const handleDelete = (id: string) => {
    if (!confirm('Видалити запчастину з каталогу?')) return;
    saveDb({ ...db, catalogParts: db.catalogParts.filter(p => p.id !== id) });
  };

  const handleAddToStock = (part: CatalogPart) => {
    const existing = data.inventory.find(i => i.sku === part.oem);
    if (existing) { alert('Ця запчастина вже є на складі!'); return; }
    const newPart = {
      id: generateId(), sku: part.oem, name: part.name,
      category: part.category, purchasePrice: part.purchasePrice,
      salePrice: part.salePrice, stock: 0, minStock: 2,
      supplierId: '', lastPurchaseDate: new Date().toISOString().split('T')[0],
    };
    alert(`Запчастину "${part.name}" додано на склад!`);
    void newPart;
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => openModal()} className="bg-[#ffcc00] text-black px-4 py-2 rounded-xl font-bold flex items-center gap-2">
          <Plus size={18} /> Додати до каталогу
        </button>
      </div>

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 border-b text-[10px] uppercase font-bold text-neutral-500">
              <tr>
                <th className="px-4 py-3 text-left">OEM / Назва</th>
                <th className="px-4 py-3 text-left">Бренд</th>
                <th className="px-4 py-3 text-left">Категорія</th>
                <th className="px-4 py-3 text-left">Сумісність</th>
                <th className="px-4 py-3 text-right">Закуп</th>
                <th className="px-4 py-3 text-right">Продаж</th>
                <th className="px-4 py-3 text-right">Маржа</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map(part => {
                const margin = part.purchasePrice > 0 ? Math.round(((part.salePrice - part.purchasePrice) / part.purchasePrice) * 100) : 0;
                return (
                  <tr key={part.id} className="hover:bg-neutral-50">
                    <td className="px-4 py-3">
                      <p className="font-semibold">{part.name}</p>
                      <p className="text-[10px] font-mono text-neutral-400">{part.oem}</p>
                    </td>
                    <td className="px-4 py-3 text-neutral-600">{part.brand}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 bg-neutral-100 rounded text-xs">{part.category}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {part.compatibleMakes.length > 0 ? part.compatibleMakes.slice(0, 3).map(m => (
                          <span key={m} className="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-[10px]">{m}</span>
                        )) : <span className="text-neutral-400 text-xs">Універсальна</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-neutral-500">{part.purchasePrice} ₴</td>
                    <td className="px-4 py-3 text-right font-bold">{part.salePrice} ₴</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`font-bold ${margin >= 30 ? 'text-green-600' : margin >= 15 ? 'text-yellow-600' : 'text-red-600'}`}>{margin}%</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 justify-end">
                        <button onClick={() => handleAddToStock(part)} className="p-1.5 bg-green-50 text-green-600 rounded hover:bg-green-100 text-[10px] font-bold px-2">На склад</button>
                        <button onClick={() => openModal(part)} className="p-1.5 text-neutral-400 hover:text-blue-600 rounded"><Edit2 size={14} /></button>
                        <button onClick={() => handleDelete(part.id)} className="p-1.5 text-neutral-400 hover:text-red-600 rounded"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="p-5 border-b bg-neutral-50 flex justify-between items-center">
              <h3 className="font-bold text-lg">{editPart ? 'Редагувати запчастину' : 'Нова запчастина в каталог'}</h3>
              <button onClick={() => setShowModal(false)}><X size={20} className="text-neutral-400" /></button>
            </div>
            <div className="p-5 grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-xs font-bold text-neutral-600 mb-1">Назва</label>
                <input type="text" value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-[#ffcc00]" />
              </div>
              <div>
                <label className="block text-xs font-bold text-neutral-600 mb-1">OEM код</label>
                <input type="text" value={form.oem || ''} onChange={e => setForm({ ...form, oem: e.target.value })} className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-[#ffcc00] font-mono" />
              </div>
              <div>
                <label className="block text-xs font-bold text-neutral-600 mb-1">Бренд</label>
                <input type="text" value={form.brand || ''} onChange={e => setForm({ ...form, brand: e.target.value })} className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-[#ffcc00]" />
              </div>
              <div>
                <label className="block text-xs font-bold text-neutral-600 mb-1">Категорія</label>
                <input type="text" value={form.category || ''} onChange={e => setForm({ ...form, category: e.target.value })} className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-[#ffcc00]" />
              </div>
              <div>
                <label className="block text-xs font-bold text-neutral-600 mb-1">Закупівельна ціна</label>
                <input type="number" value={form.purchasePrice || ''} onChange={e => setForm({ ...form, purchasePrice: Number(e.target.value) })} className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-[#ffcc00]" />
              </div>
              <div>
                <label className="block text-xs font-bold text-neutral-600 mb-1">Ціна продажу</label>
                <input type="number" value={form.salePrice || ''} onChange={e => setForm({ ...form, salePrice: Number(e.target.value) })} className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-[#ffcc00]" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-bold text-neutral-600 mb-1">Опис</label>
                <textarea value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-[#ffcc00] text-sm" />
              </div>
            </div>
            <div className="p-5 border-t bg-neutral-50 flex gap-3 justify-end">
              <button onClick={() => setShowModal(false)} className="px-5 py-2 rounded-lg text-neutral-600 hover:bg-neutral-100">Скасувати</button>
              <button onClick={handleSave} className="bg-[#ffcc00] text-black px-5 py-2 rounded-lg font-bold flex items-center gap-2"><Save size={16} /> Зберегти</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Work Norms Tab ───────────────────────────────────────────────────────────
function WorkNormsTab({ db, saveDb, search }: { db: DbExtras; saveDb: (d: DbExtras) => void; search: string }) {
  const [showModal, setShowModal] = useState(false);
  const [editNorm, setEditNorm] = useState<WorkNorm | null>(null);
  const [form, setForm] = useState<Partial<WorkNorm>>({});
  const [activeCategory, setActiveCategory] = useState('all');

  const categories = [...new Set(db.workNorms.map(n => n.category))];

  const filtered = useMemo(() =>
    db.workNorms.filter(n => {
      const matchesSearch = n.name.toLowerCase().includes(search.toLowerCase()) || n.code.toLowerCase().includes(search.toLowerCase());
      const matchesCat = activeCategory === 'all' || n.category === activeCategory;
      return matchesSearch && matchesCat;
    }), [db.workNorms, search, activeCategory]);

  const openModal = (norm?: WorkNorm) => {
    setEditNorm(norm || null);
    setForm(norm || { code: '', name: '', category: '', hours: 1, price: 0 });
    setShowModal(true);
  };

  const handleSave = () => {
    if (!form.name || !form.code) return;
    const norm: WorkNorm = {
      id: editNorm?.id || generateId(),
      code: form.code!, name: form.name!, category: form.category || '',
      hours: form.hours || 0, price: form.price || 0, description: form.description,
    };
    if (editNorm) {
      saveDb({ ...db, workNorms: db.workNorms.map(n => n.id === editNorm.id ? norm : n) });
    } else {
      saveDb({ ...db, workNorms: [...db.workNorms, norm] });
    }
    setShowModal(false);
  };

  const handleDelete = (id: string) => {
    if (!confirm('Видалити норму?')) return;
    saveDb({ ...db, workNorms: db.workNorms.filter(n => n.id !== id) });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveCategory('all')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium ${activeCategory === 'all' ? 'bg-neutral-900 text-white' : 'bg-neutral-100 hover:bg-neutral-200'}`}
          >
            Всі
          </button>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium ${activeCategory === cat ? 'bg-[#ffcc00] text-black' : 'bg-neutral-100 hover:bg-neutral-200'}`}
            >
              {cat}
            </button>
          ))}
        </div>
        <button onClick={() => openModal()} className="bg-[#ffcc00] text-black px-4 py-2 rounded-xl font-bold flex items-center gap-2">
          <Plus size={18} /> Додати норму
        </button>
      </div>

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 border-b text-[10px] uppercase font-bold text-neutral-500">
              <tr>
                <th className="px-4 py-3 text-left">Код</th>
                <th className="px-4 py-3 text-left">Назва роботи</th>
                <th className="px-4 py-3 text-left">Категорія</th>
                <th className="px-4 py-3 text-center"><Clock size={12} className="inline" /> Норма годин</th>
                <th className="px-4 py-3 text-right"><DollarSign size={12} className="inline" /> Вартість</th>
                <th className="px-4 py-3 text-right">₴/год</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map(norm => (
                <tr key={norm.id} className="hover:bg-neutral-50">
                  <td className="px-4 py-3 font-mono text-xs text-neutral-500">{norm.code}</td>
                  <td className="px-4 py-3">
                    <p className="font-semibold">{norm.name}</p>
                    {norm.description && <p className="text-xs text-neutral-400">{norm.description}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs font-medium">{norm.category}</span>
                  </td>
                  <td className="px-4 py-3 text-center font-bold">{norm.hours} год</td>
                  <td className="px-4 py-3 text-right font-bold">{norm.price.toLocaleString()} ₴</td>
                  <td className="px-4 py-3 text-right text-neutral-500">
                    {norm.hours > 0 ? Math.round(norm.price / norm.hours).toLocaleString() : '-'} ₴
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 justify-end">
                      <button onClick={() => openModal(norm)} className="p-1.5 text-neutral-400 hover:text-blue-600 rounded"><Edit2 size={14} /></button>
                      <button onClick={() => handleDelete(norm.id)} className="p-1.5 text-neutral-400 hover:text-red-600 rounded"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-neutral-50 font-bold border-t">
              <tr>
                <td colSpan={3} className="px-4 py-3 text-right text-neutral-500">Підсумок:</td>
                <td className="px-4 py-3 text-center">{filtered.reduce((a, n) => a + n.hours, 0).toFixed(1)} год</td>
                <td className="px-4 py-3 text-right">{filtered.reduce((a, n) => a + n.price, 0).toLocaleString()} ₴</td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-5 border-b bg-neutral-50 flex justify-between items-center">
              <h3 className="font-bold text-lg">{editNorm ? 'Редагувати норму' : 'Нова норма роботи'}</h3>
              <button onClick={() => setShowModal(false)}><X size={20} className="text-neutral-400" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-600 mb-1">Код норми</label>
                  <input type="text" value={form.code || ''} onChange={e => setForm({ ...form, code: e.target.value })} className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-[#ffcc00] font-mono" placeholder="MOI-001" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-neutral-600 mb-1">Категорія</label>
                  <input type="text" value={form.category || ''} onChange={e => setForm({ ...form, category: e.target.value })} className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-[#ffcc00]" placeholder="ТО, Гальма..." />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-neutral-600 mb-1">Назва роботи</label>
                <input type="text" value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-[#ffcc00]" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-600 mb-1">Норма годин</label>
                  <input type="number" step="0.5" value={form.hours || ''} onChange={e => setForm({ ...form, hours: Number(e.target.value) })} className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-[#ffcc00]" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-neutral-600 mb-1">Вартість (₴)</label>
                  <input type="number" value={form.price || ''} onChange={e => setForm({ ...form, price: Number(e.target.value) })} className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-[#ffcc00]" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-neutral-600 mb-1">Опис</label>
                <textarea value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-[#ffcc00] text-sm" />
              </div>
            </div>
            <div className="p-5 border-t bg-neutral-50 flex gap-3 justify-end">
              <button onClick={() => setShowModal(false)} className="px-5 py-2 rounded-lg text-neutral-600 hover:bg-neutral-100">Скасувати</button>
              <button onClick={handleSave} className="bg-[#ffcc00] text-black px-5 py-2 rounded-lg font-bold flex items-center gap-2"><Save size={16} /> Зберегти</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Clients DB Tab ───────────────────────────────────────────────────────────
function ClientsDbTab({ data, search }: { data: AppData; search: string; updateData: (d: Partial<AppData>) => void }) {
  const filtered = useMemo(() =>
    data.clients.filter(c =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search) ||
      c.car.plate.toLowerCase().includes(search.toLowerCase()) ||
      c.car.make.toLowerCase().includes(search.toLowerCase())
    ), [data.clients, search]);

  const getClientOrders = (clientId: string) =>
    data.workOrders.filter(o => o.clientId === clientId);

  const getClientRevenue = (clientId: string) =>
    data.workOrders.filter(o => o.clientId === clientId && o.isPaid).reduce((acc, o) => acc + o.total, 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border shadow-sm">
          <p className="text-neutral-500 text-sm">Всього клієнтів</p>
          <p className="text-2xl font-bold">{data.clients.length}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border shadow-sm">
          <p className="text-neutral-500 text-sm">Середній дохід з клієнта</p>
          <p className="text-2xl font-bold text-green-600">
            {data.clients.length > 0 ? Math.round(data.workOrders.filter(o => o.isPaid).reduce((a, o) => a + o.total, 0) / data.clients.length).toLocaleString() : 0} ₴
          </p>
        </div>
        <div className="bg-white p-4 rounded-xl border shadow-sm">
          <p className="text-neutral-500 text-sm">Клієнтів у пошуку</p>
          <p className="text-2xl font-bold">{filtered.length}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 border-b text-[10px] uppercase font-bold text-neutral-500">
              <tr>
                <th className="px-4 py-3 text-left">Клієнт</th>
                <th className="px-4 py-3 text-left">Контакт</th>
                <th className="px-4 py-3 text-left">Автомобіль</th>
                <th className="px-4 py-3 text-left">Держ. номер</th>
                <th className="px-4 py-3 text-left">VIN</th>
                <th className="px-4 py-3 text-center">Замовлень</th>
                <th className="px-4 py-3 text-right">Загальна сума</th>
                <th className="px-4 py-3 text-left">З нами з</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map(client => {
                const orders = getClientOrders(client.id);
                const revenue = getClientRevenue(client.id);
                return (
                  <tr key={client.id} className="hover:bg-neutral-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-[#ffcc00]/20 rounded-full flex items-center justify-center font-bold text-sm">
                          {client.name.charAt(0)}
                        </div>
                        <span className="font-semibold">{client.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="flex items-center gap-1 text-xs"><Phone size={10} /> {client.phone}</span>
                        {client.email && <span className="flex items-center gap-1 text-xs text-neutral-400"><Mail size={10} /> {client.email}</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-medium">{client.car.make} {client.car.model} ({client.car.year})</td>
                    <td className="px-4 py-3 font-mono font-bold text-sm">{client.car.plate}</td>
                    <td className="px-4 py-3 font-mono text-xs text-neutral-400">{client.car.vin || '-'}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-bold">{orders.length}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-green-600">{revenue.toLocaleString()} ₴</td>
                    <td className="px-4 py-3 text-neutral-500 text-xs">{client.createdAt}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Documents Tab ────────────────────────────────────────────────────────────
function DocumentsTab({ db, saveDb, search, data }: { db: DbExtras; saveDb: (d: DbExtras) => void; search: string; data: AppData }) {
  const [showModal, setShowModal] = useState(false);
  const [editDoc, setEditDoc] = useState<DocumentTemplate | null>(null);
  const [form, setForm] = useState<Partial<DocumentTemplate>>({});

  const typeLabels: Record<string, string> = {
    act: 'Акт виконаних робіт', invoice: 'Рахунок-фактура',
    diagnostic: 'Діагностична карта', receipt: 'Чек', contract: 'Договір',
  };
  const typeColors: Record<string, string> = {
    act: 'bg-green-100 text-green-700', invoice: 'bg-blue-100 text-blue-700',
    diagnostic: 'bg-purple-100 text-purple-700', receipt: 'bg-yellow-100 text-yellow-700',
    contract: 'bg-red-100 text-red-700',
  };

  const filtered = useMemo(() =>
    db.documentTemplates.filter(d =>
      d.name.toLowerCase().includes(search.toLowerCase())
    ), [db.documentTemplates, search]);

  const openModal = (doc?: DocumentTemplate) => {
    setEditDoc(doc || null);
    setForm(doc || { name: '', type: 'act', content: '' });
    setShowModal(true);
  };

  const handleSave = () => {
    if (!form.name) return;
    const doc: DocumentTemplate = {
      id: editDoc?.id || generateId(), name: form.name!,
      type: form.type as DocumentTemplate['type'] || 'act',
      content: form.content || '', createdAt: editDoc?.createdAt || new Date().toISOString().split('T')[0],
    };
    if (editDoc) {
      saveDb({ ...db, documentTemplates: db.documentTemplates.map(d => d.id === editDoc.id ? doc : d) });
    } else {
      saveDb({ ...db, documentTemplates: [...db.documentTemplates, doc] });
    }
    setShowModal(false);
  };

  const handleDelete = (id: string) => {
    if (!confirm('Видалити шаблон документа?')) return;
    saveDb({ ...db, documentTemplates: db.documentTemplates.filter(d => d.id !== id) });
  };

  const handlePrintDoc = (doc: DocumentTemplate) => {
    const cs = data.companySettings;
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`
      <html><head><title>${doc.name}</title>
      <style>body{font-family:Arial,sans-serif;padding:40px;max-width:800px;margin:0 auto;}
      .header{border-bottom:3px solid #ffcc00;padding-bottom:20px;margin-bottom:30px;display:flex;justify-content:space-between;}
      .company-name{font-size:22px;font-weight:bold;}
      .content{white-space:pre-wrap;line-height:1.8;}</style></head>
      <body>
        <div class="header">
          <div>
            <div class="company-name">${cs.name}</div>
            <div style="font-size:12px;color:#666">${cs.address} | ${cs.phone} | ЄДРПОУ: ${cs.edrpou}</div>
          </div>
          <div style="text-align:right">
            <div style="font-weight:bold">${doc.name}</div>
            <div style="font-size:12px">від ${new Date().toLocaleDateString('uk-UA')}</div>
          </div>
        </div>
        <div class="content">${doc.content}</div>
        <div style="margin-top:60px;display:flex;justify-content:space-between">
          <div style="width:200px;border-top:1px solid #000;padding-top:5px;text-align:center;font-size:11px">Виконавець</div>
          <div style="width:200px;border-top:1px solid #000;padding-top:5px;text-align:center;font-size:11px">Замовник</div>
        </div>
      </body></html>
    `);
    w.document.close();
    w.print();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => openModal()} className="bg-[#ffcc00] text-black px-4 py-2 rounded-xl font-bold flex items-center gap-2">
          <Plus size={18} /> Новий шаблон
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map(doc => (
          <div key={doc.id} className="bg-white rounded-xl border shadow-sm p-5 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 bg-neutral-100 rounded-lg flex items-center justify-center">
                <FileText size={20} className="text-neutral-600" />
              </div>
              <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${typeColors[doc.type]}`}>
                {typeLabels[doc.type]}
              </span>
            </div>
            <h4 className="font-bold mb-1">{doc.name}</h4>
            <p className="text-xs text-neutral-400 mb-4">Створено: {doc.createdAt}</p>
            <p className="text-xs text-neutral-500 line-clamp-2 mb-4">{doc.content || 'Вміст не заповнено'}</p>
            <div className="flex gap-2 pt-3 border-t">
              <button onClick={() => handlePrintDoc(doc)} className="flex-1 py-2 bg-neutral-100 hover:bg-neutral-200 rounded-lg text-xs font-bold flex items-center justify-center gap-1">
                <FileText size={12} /> Друк
              </button>
              <button onClick={() => openModal(doc)} className="p-2 text-neutral-400 hover:text-blue-600 rounded-lg hover:bg-blue-50">
                <Edit2 size={14} />
              </button>
              <button onClick={() => handleDelete(doc.id)} className="p-2 text-neutral-400 hover:text-red-600 rounded-lg hover:bg-red-50">
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="p-5 border-b bg-neutral-50 flex justify-between items-center">
              <h3 className="font-bold text-lg">{editDoc ? 'Редагувати шаблон' : 'Новий шаблон документа'}</h3>
              <button onClick={() => setShowModal(false)}><X size={20} className="text-neutral-400" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-neutral-600 mb-1">Назва шаблону</label>
                <input type="text" value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-[#ffcc00]" />
              </div>
              <div>
                <label className="block text-xs font-bold text-neutral-600 mb-1">Тип документа</label>
                <select value={form.type || 'act'} onChange={e => setForm({ ...form, type: e.target.value as DocumentTemplate['type'] })} className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-[#ffcc00]">
                  {Object.entries(typeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-neutral-600 mb-1">Вміст / Шаблон</label>
                <textarea value={form.content || ''} onChange={e => setForm({ ...form, content: e.target.value })} rows={8} className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-[#ffcc00] text-sm font-mono" placeholder="Введіть текст документа..." />
              </div>
            </div>
            <div className="p-5 border-t bg-neutral-50 flex gap-3 justify-end">
              <button onClick={() => setShowModal(false)} className="px-5 py-2 rounded-lg text-neutral-600 hover:bg-neutral-100">Скасувати</button>
              <button onClick={handleSave} className="bg-[#ffcc00] text-black px-5 py-2 rounded-lg font-bold flex items-center gap-2"><Save size={16} /> Зберегти</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Suppliers Tab ────────────────────────────────────────────────────────────
function SuppliersTab({ data, updateData, search }: { data: AppData; updateData: (d: Partial<AppData>) => void; search: string }) {
  const [showModal, setShowModal] = useState(false);
  const [editSupplier, setEditSupplier] = useState<Supplier | null>(null);
  const [form, setForm] = useState<Partial<Supplier & { website: string; address: string; notes: string }>>({});

  const filtered = useMemo(() =>
    data.suppliers.filter(s =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.phone || '').includes(search) ||
      (s.email || '').toLowerCase().includes(search.toLowerCase())
    ), [data.suppliers, search]);

  const getSupplierPartsCount = (supplierId: string) =>
    data.inventory.filter(p => p.supplierId === supplierId).length;

  const getSupplierValue = (supplierId: string) =>
    data.inventory.filter(p => p.supplierId === supplierId).reduce((a, p) => a + (p.purchasePrice * p.stock), 0);

  const openModal = (supplier?: Supplier) => {
    setEditSupplier(supplier || null);
    setForm(supplier || { name: '', phone: '', email: '' });
    setShowModal(true);
  };

  const handleSave = () => {
    if (!form.name) return;
    const supplier: Supplier = {
      id: editSupplier?.id || generateId(),
      name: form.name!, phone: form.phone, email: form.email,
    };
    if (editSupplier) {
      updateData({ suppliers: data.suppliers.map(s => s.id === editSupplier.id ? supplier : s) });
    } else {
      updateData({ suppliers: [...data.suppliers, supplier] });
    }
    setShowModal(false);
  };

  const handleDelete = (id: string) => {
    if (!confirm('Видалити постачальника?')) return;
    updateData({ suppliers: data.suppliers.filter(s => s.id !== id) });
  };

  const supplierLogos: Record<string, string> = {
    'Омега-Автопоставка': '🟡',
    'Inter Cars Ukraine': '🔵',
    'ELIT Ukraine': '🔴',
    'Автотехнікс': '🟢',
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => openModal()} className="bg-[#ffcc00] text-black px-4 py-2 rounded-xl font-bold flex items-center gap-2">
          <Plus size={18} /> Додати постачальника
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filtered.map(supplier => {
          const partsCount = getSupplierPartsCount(supplier.id);
          const stockValue = getSupplierValue(supplier.id);
          const logo = supplierLogos[supplier.name] || '🏭';

          return (
            <div key={supplier.id} className="bg-white rounded-xl border shadow-sm p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-neutral-100 rounded-xl flex items-center justify-center text-3xl">
                    {logo}
                  </div>
                  <div>
                    <h4 className="font-bold text-lg">{supplier.name}</h4>
                    <p className="text-xs text-neutral-400">ID: {supplier.id}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openModal(supplier)} className="p-2 text-neutral-400 hover:text-blue-600 rounded-lg hover:bg-blue-50"><Edit2 size={16} /></button>
                  <button onClick={() => handleDelete(supplier.id)} className="p-2 text-neutral-400 hover:text-red-600 rounded-lg hover:bg-red-50"><Trash2 size={16} /></button>
                </div>
              </div>

              <div className="space-y-2 mb-4">
                {supplier.phone && (
                  <div className="flex items-center gap-2 text-sm text-neutral-600">
                    <Phone size={14} className="text-neutral-400" />
                    <a href={`tel:${supplier.phone}`} className="hover:text-blue-600">{supplier.phone}</a>
                  </div>
                )}
                {supplier.email && (
                  <div className="flex items-center gap-2 text-sm text-neutral-600">
                    <Mail size={14} className="text-neutral-400" />
                    <a href={`mailto:${supplier.email}`} className="hover:text-blue-600">{supplier.email}</a>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 pt-4 border-t">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <p className="text-2xl font-bold text-blue-700">{partsCount}</p>
                  <p className="text-xs text-neutral-500">позицій на складі</p>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <p className="text-xl font-bold text-green-700">{stockValue.toLocaleString()} ₴</p>
                  <p className="text-xs text-neutral-500">загальна вартість</p>
                </div>
              </div>

              {partsCount > 0 && (
                <div className="mt-3">
                  <p className="text-xs text-neutral-500 mb-1">Товари на складі:</p>
                  <div className="flex flex-wrap gap-1">
                    {data.inventory.filter(p => p.supplierId === supplier.id).slice(0, 5).map(p => (
                      <span key={p.id} className="px-2 py-0.5 bg-neutral-100 rounded text-[10px] font-medium">{p.name}</span>
                    ))}
                    {data.inventory.filter(p => p.supplierId === supplier.id).length > 5 && (
                      <span className="px-2 py-0.5 bg-neutral-100 rounded text-[10px] text-neutral-500">
                        +{data.inventory.filter(p => p.supplierId === supplier.id).length - 5} ще
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-5 border-b bg-neutral-50 flex justify-between items-center">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <Truck className="text-[#ffcc00]" size={20} />
                {editSupplier ? 'Редагувати постачальника' : 'Новий постачальник'}
              </h3>
              <button onClick={() => setShowModal(false)}><X size={20} className="text-neutral-400" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-neutral-600 mb-1 flex items-center gap-1"><Hash size={12} /> Назва *</label>
                <input type="text" value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-[#ffcc00]" placeholder="Назва компанії" />
              </div>
              <div>
                <label className="block text-xs font-bold text-neutral-600 mb-1 flex items-center gap-1"><Phone size={12} /> Телефон</label>
                <input type="tel" value={form.phone || ''} onChange={e => setForm({ ...form, phone: e.target.value })} className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-[#ffcc00]" placeholder="+380..." />
              </div>
              <div>
                <label className="block text-xs font-bold text-neutral-600 mb-1 flex items-center gap-1"><Mail size={12} /> Email</label>
                <input type="email" value={form.email || ''} onChange={e => setForm({ ...form, email: e.target.value })} className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-[#ffcc00]" placeholder="email@supplier.ua" />
              </div>
              <div>
                <label className="block text-xs font-bold text-neutral-600 mb-1 flex items-center gap-1"><Globe size={12} /> Вебсайт</label>
                <input type="url" value={form.website || ''} onChange={e => setForm({ ...form, website: e.target.value })} className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-[#ffcc00]" placeholder="https://..." />
              </div>
              <div>
                <label className="block text-xs font-bold text-neutral-600 mb-1">Адреса</label>
                <input type="text" value={form.address || ''} onChange={e => setForm({ ...form, address: e.target.value })} className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-[#ffcc00]" placeholder="м. Харків, вул..." />
              </div>
              <div>
                <label className="block text-xs font-bold text-neutral-600 mb-1">Примітки</label>
                <textarea value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-[#ffcc00] text-sm" />
              </div>
            </div>
            <div className="p-5 border-t bg-neutral-50 flex gap-3 justify-end">
              <button onClick={() => setShowModal(false)} className="px-5 py-2 rounded-lg text-neutral-600 hover:bg-neutral-100">Скасувати</button>
              <button onClick={handleSave} className="bg-[#ffcc00] text-black px-5 py-2 rounded-lg font-bold flex items-center gap-2"><Save size={16} /> Зберегти</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Warehouse Documents Tab ──────────────────────────────────────────────────
function WarehouseDocumentsTab({
  search, data, updateData,
}: {
  search: string;
  data: AppData;
  updateData: (d: Partial<AppData>) => void;
}) {
  const [typeFilter, setTypeFilter] = useState<'all' | WarehouseDocument['type']>('all');
  const [showModal, setShowModal] = useState(false);
  const [editDoc, setEditDoc] = useState<WarehouseDocument | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<WarehouseDocument>>({});
  const [itemForm, setItemForm] = useState<Partial<WarehouseDocumentItem>>({ name: '', quantity: 1, price: 0 });

  const warehouseDocs = data.warehouseDocuments || [];

  const typeConfig: Record<WarehouseDocument['type'], { label: string; icon: React.ReactNode; color: string; badgeColor: string; number: string }> = {
    incoming:  { label: 'Прихідна накладна', icon: <ArrowDownCircle size={16} />, color: 'text-green-600',  badgeColor: 'bg-green-100 text-green-700',  number: 'ПРХ' },
    outgoing:  { label: 'Видаткова накладна', icon: <ArrowUpCircle   size={16} />, color: 'text-red-600',    badgeColor: 'bg-red-100 text-red-700',      number: 'РЗХ' },
    writeoff:  { label: 'Списання',       icon: <Trash2          size={16} />, color: 'text-yellow-600', badgeColor: 'bg-yellow-100 text-yellow-700', number: 'СП' },
    inventory: { label: 'Інвентаризація', icon: <ClipboardList   size={16} />, color: 'text-blue-600',   badgeColor: 'bg-blue-100 text-blue-700',    number: 'ІНВ' },
    return:    { label: 'Повернення',     icon: <RotateCcw       size={16} />, color: 'text-orange-600', badgeColor: 'bg-orange-100 text-orange-700', number: 'ПВР' },
  };

  const filtered = useMemo(() =>
    warehouseDocs.filter(d => {
      const noteText = d.notes || d.note || '';
      const matchesSearch =
        d.number.toLowerCase().includes(search.toLowerCase()) ||
        noteText.toLowerCase().includes(search.toLowerCase()) ||
        d.items.some(i => (i.name || data.inventory.find(p => p.id === i.partId)?.name || '').toLowerCase().includes(search.toLowerCase()));
      const matchesType = typeFilter === 'all' || d.type === typeFilter;
      return matchesSearch && matchesType;
    }).sort((a, b) => b.date.localeCompare(a.date)),
    [warehouseDocs, search, typeFilter, data.inventory]
  );

  const generateDocNumber = (type: WarehouseDocument['type']) => {
    const prefix = typeConfig[type].number;
    const existing = warehouseDocs.filter(d => d.type === type).length;
    return `${prefix}-${String(existing + 1).padStart(4, '0')}`;
  };

  const openModal = (doc?: WarehouseDocument) => {
    if (doc) {
      setEditDoc(doc);
      // Ensure all items have an id for stable removal in the modal
      setForm({ ...doc, items: doc.items.map(i => ({ ...i, id: i.id || generateId() })) });
    } else {
      setEditDoc(null);
      setForm({
        type: 'incoming',
        date: new Date().toISOString().split('T')[0],
        status: 'draft',
        items: [],
        notes: '',
        supplierId: '',
      });
    }
    setItemForm({ name: '', quantity: 1, price: 0 });
    setShowModal(true);
  };

  const handleAddItem = () => {
    if (!itemForm.name || !itemForm.quantity) return;
    const newItem: WarehouseDocumentItem = {
      id: generateId(),
      partId: itemForm.partId || '',
      name: itemForm.name!,
      quantity: itemForm.quantity || 1,
      price: itemForm.price || 0,
    };
    setForm(prev => ({ ...prev, items: [...(prev.items || []), newItem] }));
    setItemForm({ name: '', quantity: 1, price: 0 });
  };

  const handleRemoveItem = (itemId: string) => {
    setForm(prev => ({ ...prev, items: (prev.items || []).filter(i => i.id !== itemId) }));
  };  const handlePartSelect = (partId: string) => {
    const part = data.inventory.find((p: Part) => p.id === partId);
    if (part) {
      setItemForm(prev => ({
        ...prev,
        partId: part.id,
        name: part.name,
        price: (form.type === 'outgoing') ? part.salePrice : part.purchasePrice,
      }));
    }
  };

  const handleSave = () => {
    if (!form.type || !(form.items || []).length) return;
    const doc: WarehouseDocument = {
      id: editDoc?.id || generateId(),
      number: editDoc?.number || generateDocNumber(form.type!),
      type: form.type!,
      date: form.date || new Date().toISOString().split('T')[0],
      supplierId: form.supplierId || undefined,
      items: form.items || [],
      notes: form.notes,
      status: form.status || 'draft',
      createdAt: editDoc?.createdAt || new Date().toISOString().split('T')[0],
    };

    // Update inventory stock when a document is completed for the first time
    if (doc.status === 'completed' && editDoc?.status !== 'completed') {
      const updatedInventory = [...data.inventory];
      doc.items.forEach(item => {
        if (!item.partId) return;
        const idx = updatedInventory.findIndex(p => p.id === item.partId);
        if (idx === -1) return;
        if (doc.type === 'incoming') {
          updatedInventory[idx] = { ...updatedInventory[idx], stock: updatedInventory[idx].stock + item.quantity };
        } else if (doc.type === 'outgoing' || doc.type === 'return' || doc.type === 'writeoff') {
          updatedInventory[idx] = { ...updatedInventory[idx], stock: Math.max(0, updatedInventory[idx].stock - item.quantity) };
        } else if (doc.type === 'inventory') {
          updatedInventory[idx] = { ...updatedInventory[idx], stock: item.quantity };
        }
      });
      updateData({ inventory: updatedInventory });
    }

    if (editDoc) {
      updateData({ warehouseDocuments: warehouseDocs.map(d => d.id === editDoc.id ? doc : d) });
    } else {
      updateData({ warehouseDocuments: [...warehouseDocs, doc] });
    }
    setShowModal(false);
  };

  const handleDelete = (id: string) => {
    if (!confirm('Видалити документ?')) return;
    updateData({ warehouseDocuments: warehouseDocs.filter(d => d.id !== id) });
  };

  const totalItems = filtered.reduce((acc, d) => acc + d.items.reduce((a, i) => a + i.quantity, 0), 0);
  const totalValue = filtered.reduce((acc, d) => acc + d.items.reduce((a, i) => a + i.quantity * i.price, 0), 0);

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {(Object.keys(typeConfig) as WarehouseDocument['type'][]).map(t => {
          const cfg = typeConfig[t];
          const count = warehouseDocs.filter(d => d.type === t).length;
          return (
            <div key={t} className="bg-white rounded-xl border shadow-sm p-4 flex items-center gap-3">
              <div className={`p-2 rounded-lg bg-neutral-100 ${cfg.color}`}>{cfg.icon}</div>
              <div>
                <p className="text-xs text-neutral-500">{cfg.label}</p>
                <p className="text-xl font-bold">{count}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filters + Add */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setTypeFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${typeFilter === 'all' ? 'bg-neutral-900 text-white' : 'bg-neutral-100 hover:bg-neutral-200'}`}
          >
            Всі ({warehouseDocs.length})
          </button>
          {(Object.keys(typeConfig) as WarehouseDocument['type'][]).map(t => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors ${typeFilter === t ? 'bg-[#ffcc00] text-black' : 'bg-neutral-100 hover:bg-neutral-200'}`}
            >
              {typeConfig[t].icon} {typeConfig[t].label}
            </button>
          ))}
        </div>
        <button
          onClick={() => openModal()}
          className="bg-[#ffcc00] text-black px-4 py-2 rounded-xl font-bold flex items-center gap-2"
        >
          <Plus size={18} /> Новий документ
        </button>
      </div>

      {/* Summary */}
      {filtered.length > 0 && (
        <div className="flex gap-4 text-sm text-neutral-500">
          <span>Документів: <strong className="text-neutral-800">{filtered.length}</strong></span>
          <span>Позицій: <strong className="text-neutral-800">{totalItems}</strong></span>
          <span>Сума: <strong className="text-neutral-800">{totalValue.toLocaleString()} ₴</strong></span>
        </div>
      )}

      {/* Documents List */}
      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="bg-white rounded-xl border shadow-sm p-10 text-center text-neutral-400">
            <ClipboardList size={40} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">Документи не знайдено</p>
          </div>
        )}
        {filtered.map(doc => {
          const cfg = typeConfig[doc.type];
          const docTotal = doc.items.reduce((a, i) => a + i.quantity * i.price, 0);
          const supplier = data.suppliers.find(s => s.id === doc.supplierId);
          const isExpanded = expandedId === doc.id;
          return (
            <div key={doc.id} className="bg-white rounded-xl border shadow-sm overflow-hidden">
              <div
                className="p-4 flex items-center justify-between cursor-pointer hover:bg-neutral-50"
                onClick={() => setExpandedId(isExpanded ? null : doc.id)}
              >
                <div className="flex items-center gap-4">
                  <div className={`p-2.5 rounded-lg bg-neutral-100 ${cfg.color}`}>{cfg.icon}</div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold font-mono">{doc.number}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${cfg.badgeColor}`}>{cfg.label}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${(doc.status ?? 'completed') === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {(doc.status ?? 'completed') === 'completed' ? 'Проведено' : 'Чернетка'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-neutral-500">
                      <span>{doc.date}</span>
                      {supplier && <span>• {supplier.name}</span>}
                      {(doc.notes || doc.note) && <span className="truncate max-w-xs">• {doc.notes || doc.note}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right hidden sm:block">
                    <p className="font-bold text-neutral-800">{docTotal.toLocaleString()} ₴</p>
                    <p className="text-xs text-neutral-400">{doc.items.length} позицій</p>
                  </div>
                  <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                    <button onClick={() => openModal(doc)} className="p-2 text-neutral-400 hover:text-blue-600 rounded-lg hover:bg-blue-50"><Edit2 size={14} /></button>
                    <button onClick={() => handleDelete(doc.id)} className="p-2 text-neutral-400 hover:text-red-600 rounded-lg hover:bg-red-50"><Trash2 size={14} /></button>
                  </div>
                  {isExpanded ? <ChevronUp size={16} className="text-neutral-400" /> : <ChevronDown size={16} className="text-neutral-400" />}
                </div>
              </div>

              {isExpanded && (
                <div className="border-t bg-neutral-50">
                  <table className="w-full text-sm">
                    <thead className="bg-neutral-100 text-[10px] uppercase font-bold text-neutral-500">
                      <tr>
                        <th className="px-4 py-2 text-left">Назва товару</th>
                        <th className="px-4 py-2 text-center">Кількість</th>
                        <th className="px-4 py-2 text-right">Ціна</th>
                        <th className="px-4 py-2 text-right">Сума</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {doc.items.map((item, idx) => {
                        const partName = item.name || data.inventory.find(p => p.id === item.partId)?.name || '(невідомо)';
                        return (
                        <tr key={item.id || idx} className="bg-white">
                          <td className="px-4 py-2.5 font-medium">{partName}</td>
                          <td className="px-4 py-2.5 text-center">{item.quantity} шт</td>
                          <td className="px-4 py-2.5 text-right text-neutral-500">{item.price.toLocaleString()} ₴</td>
                          <td className="px-4 py-2.5 text-right font-bold">{(item.quantity * item.price).toLocaleString()} ₴</td>
                        </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-neutral-100 font-bold">
                      <tr>
                        <td colSpan={3} className="px-4 py-2 text-right text-neutral-600 text-xs">Підсумок:</td>
                        <td className="px-4 py-2 text-right">{docTotal.toLocaleString()} ₴</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b bg-neutral-50 flex justify-between items-center shrink-0">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <ClipboardList className="text-[#ffcc00]" size={20} />
                {editDoc ? `Редагувати ${editDoc.number}` : 'Новий складський документ'}
              </h3>
              <button onClick={() => setShowModal(false)}><X size={20} className="text-neutral-400" /></button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto">
              {/* Type + Date + Status */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-600 mb-1">Тип документа</label>
                  <select
                    value={form.type || 'incoming'}
                    onChange={e => setForm({ ...form, type: e.target.value as WarehouseDocument['type'] })}
                    className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-[#ffcc00]"
                    disabled={!!editDoc}
                  >
                    {(Object.keys(typeConfig) as WarehouseDocument['type'][]).map(t => (
                      <option key={t} value={t}>{typeConfig[t].label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-neutral-600 mb-1">Дата</label>
                  <input
                    type="date"
                    value={form.date || ''}
                    onChange={e => setForm({ ...form, date: e.target.value })}
                    className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-[#ffcc00]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-neutral-600 mb-1">Статус</label>
                  <select
                    value={form.status || 'draft'}
                    onChange={e => setForm({ ...form, status: e.target.value as WarehouseDocument['status'] })}
                    className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-[#ffcc00]"
                  >
                    <option value="draft">Чернетка</option>
                    <option value="completed">Провести</option>
                  </select>
                </div>
              </div>

              {/* Supplier (for incoming/return) */}
              {(form.type === 'incoming' || form.type === 'return') && (
                <div>
                  <label className="block text-xs font-bold text-neutral-600 mb-1">Постачальник</label>
                  <select
                    value={form.supplierId || ''}
                    onChange={e => setForm({ ...form, supplierId: e.target.value })}
                    className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-[#ffcc00]"
                  >
                    <option value="">— Оберіть постачальника —</option>
                    {data.suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-neutral-600 mb-1">Примітки</label>
                <input
                  type="text"
                  value={form.notes || ''}
                  onChange={e => setForm({ ...form, notes: e.target.value })}
                  className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-[#ffcc00]"
                  placeholder="Додаткові примітки..."
                />
              </div>

              {/* Items */}
              <div>
                <label className="block text-xs font-bold text-neutral-600 mb-2">Позиції документа</label>

                {/* Add item row */}
                <div className="grid grid-cols-12 gap-2 mb-3">
                  <div className="col-span-5">
                    <select
                      value={itemForm.partId || ''}
                      onChange={e => e.target.value ? handlePartSelect(e.target.value) : setItemForm({ ...itemForm, partId: '', name: '' })}
                      className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-[#ffcc00] text-sm"
                    >
                      <option value="">Зі складу або вручну</option>
                      {data.inventory.map((p: Part) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div className="col-span-3">
                    <input
                      type="text"
                      value={itemForm.name || ''}
                      onChange={e => setItemForm({ ...itemForm, name: e.target.value })}
                      placeholder="Назва"
                      className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-[#ffcc00] text-sm"
                    />
                  </div>
                  <div className="col-span-1">
                    <input
                      type="number"
                      value={itemForm.quantity || ''}
                      onChange={e => setItemForm({ ...itemForm, quantity: Number(e.target.value) })}
                      placeholder="К-сть"
                      min={1}
                      className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-[#ffcc00] text-sm"
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="number"
                      value={itemForm.price || ''}
                      onChange={e => setItemForm({ ...itemForm, price: Number(e.target.value) })}
                      placeholder="Ціна"
                      min={0}
                      className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-[#ffcc00] text-sm"
                    />
                  </div>
                  <div className="col-span-1">
                    <button
                      onClick={handleAddItem}
                      className="w-full h-full bg-[#ffcc00] rounded-lg flex items-center justify-center font-bold"
                      title="Додати позицію"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>

                {/* Items table */}
                {(form.items || []).length > 0 ? (
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-neutral-50 text-[10px] uppercase font-bold text-neutral-500">
                        <tr>
                          <th className="px-3 py-2 text-left">Назва</th>
                          <th className="px-3 py-2 text-center">К-сть</th>
                          <th className="px-3 py-2 text-right">Ціна</th>
                          <th className="px-3 py-2 text-right">Сума</th>
                          <th className="px-3 py-2"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {(form.items || []).map((item, idx) => {
                          const itemName = item.name || data.inventory.find(p => p.id === item.partId)?.name || '';
                          return (
                          <tr key={item.id || idx} className="hover:bg-neutral-50">
                            <td className="px-3 py-2 font-medium">{itemName}</td>
                            <td className="px-3 py-2 text-center">{item.quantity}</td>
                            <td className="px-3 py-2 text-right text-neutral-500">{item.price.toLocaleString()} ₴</td>
                            <td className="px-3 py-2 text-right font-bold">{(item.quantity * item.price).toLocaleString()} ₴</td>
                            <td className="px-3 py-2 text-right">
                              <button onClick={() => item.id && handleRemoveItem(item.id)} className="text-neutral-300 hover:text-red-500">
                                <Trash2 size={12} />
                              </button>
                            </td>
                          </tr>
                          );
                        })}
                      </tbody>
                      <tfoot className="bg-neutral-50 font-bold border-t">
                        <tr>
                          <td colSpan={3} className="px-3 py-2 text-right text-xs text-neutral-500">Підсумок:</td>
                          <td className="px-3 py-2 text-right">
                            {(form.items || []).reduce((a, i) => a + i.quantity * i.price, 0).toLocaleString()} ₴
                          </td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                ) : (
                  <div className="border rounded-lg p-6 text-center text-neutral-400 text-sm bg-neutral-50">
                    Додайте позиції до документа
                  </div>
                )}
              </div>
            </div>

            <div className="p-5 border-t bg-neutral-50 flex gap-3 justify-end shrink-0">
              <button onClick={() => setShowModal(false)} className="px-5 py-2 rounded-lg text-neutral-600 hover:bg-neutral-100">
                Скасувати
              </button>
              <button
                onClick={handleSave}
                disabled={!(form.items || []).length}
                className="bg-[#ffcc00] text-black px-5 py-2 rounded-lg font-bold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save size={16} /> Зберегти
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
