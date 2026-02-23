import { useState, useMemo } from 'react';
import { AppData, WorkOrder, Notification, DiagnosticCard, Client } from '../types';
import {
  Plus, Search, FileText, Printer, Stethoscope, CheckCircle,
  AlertTriangle, XCircle, ChevronDown, ChevronUp, X, Save,
  Trash2, CreditCard, Banknote, Building, Edit2, RotateCcw,
  ClipboardList, Clock, History, Filter, Eye, Car, User, Send, Loader
} from 'lucide-react';
import { format } from 'date-fns';
import { generateId, generateOrderId } from '../store';
import { loadDbExtras } from './Database';
import { sendTelegramReceipt, sendTelegramWorkOrderDocument } from './Telegram';

interface WorkOrdersProps {
  data: AppData;
  updateData: (d: Partial<AppData>) => void;
  addNotification: (n: Omit<Notification, 'id' | 'date' | 'isRead'>) => void;
  openDiagnosisByDefault?: boolean;
}

export type DocumentLog = {
  id: string;
  action: 'created' | 'edited' | 'cancelled' | 'payment_cancelled' | 'deleted' | 'paid' | 'status_changed';
  orderId: string;
  userId?: string;
  userName: string;
  timestamp: string;
  details: string;
};

const LOG_KEY = 'smartkharkov_doc_log';

function loadLog(): DocumentLog[] {
  const s = localStorage.getItem(LOG_KEY);
  return s ? JSON.parse(s) : [];
}

function saveLog(log: DocumentLog[]) {
  localStorage.setItem(LOG_KEY, JSON.stringify(log));
}

function addLog(entry: Omit<DocumentLog, 'id' | 'timestamp'>) {
  const log = loadLog();
  const newEntry: DocumentLog = {
    ...entry,
    id: generateId(),
    timestamp: new Date().toISOString(),
  };
  saveLog([newEntry, ...log].slice(0, 500)); // keep last 500
}

const emptyDiagnosis: DiagnosticCard = {
  masterId: '',
  date: '',
  engine: { status: 'ok', note: '' },
  brakes: { status: 'ok', note: '' },
  suspension: { status: 'ok', note: '' },
  fluids: { status: 'ok', note: '' },
  electrical: { status: 'ok', note: '' },
  tires: { status: 'ok', note: '' },
  body: { status: 'ok', note: '' },
  exhaust: { status: 'ok', note: '' },
};

const diagnosisLabels: Record<string, string> = {
  engine: 'Двигун та трансмісія',
  brakes: 'Гальмівна система',
  suspension: 'Підвіска та рульове',
  fluids: 'Технічні рідини',
  electrical: 'Електрообладнання',
  tires: 'Колеса та шини',
  body: 'Кузов та салон',
  exhaust: 'Вихлопна система',
};

const STATUS_LABELS: Record<string, string> = {
  New: 'Новий',
  InProgress: 'В роботі',
  Completed: 'Завершено',
  PendingParts: 'Очікує запчастин',
  Cancelled: 'Скасовано',
};

const STATUS_COLORS: Record<string, string> = {
  Completed: 'bg-green-100 text-green-700',
  InProgress: 'bg-blue-100 text-blue-700',
  PendingParts: 'bg-yellow-100 text-yellow-700',
  Cancelled: 'bg-red-100 text-red-700',
  New: 'bg-neutral-100 text-neutral-700',
};

type ServiceForm = { id: string; name: string; price: number; hours: number; masterId: string };
type PartForm = { id: string; partId: string; quantity: number; price: number };
type OrderForm = {
  clientId: string;
  masterId: string;
  paymentType: 'Cash' | 'Card' | 'Bank';
  services: ServiceForm[];
  parts: PartForm[];
};

const emptyOrderForm = (): OrderForm => ({
  clientId: '',
  masterId: '',
  paymentType: 'Cash',
  services: [{ id: generateId(), name: '', price: 0, hours: 1, masterId: '' }],
  parts: [],
});

const emptyQuickClientForm = (): Omit<Client, 'id' | 'createdAt'> => ({
  name: '', phone: '', email: '',
  car: { make: '', model: '', year: new Date().getFullYear(), vin: '', plate: '' }
});

export default function WorkOrders({ data, updateData, addNotification, openDiagnosisByDefault = false }: WorkOrdersProps) {
  const db = loadDbExtras();
  const currentUser = data.users.find(u => u.id === data.currentUserId);
  const currentUserName = currentUser?.name || 'Система';

  const [expandedId, setExpandedId] = useState<string | null>(openDiagnosisByDefault ? data.workOrders[0]?.id : null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [activeModal, setActiveModal] = useState<'create' | 'edit' | 'diagnosis' | 'log' | null>(null);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [orderForm, setOrderForm] = useState<OrderForm>(emptyOrderForm());
  const [diagnosisForm, setDiagnosisForm] = useState<DiagnosticCard>(emptyDiagnosis);
  const [diagOrderId, setDiagOrderId] = useState<string | null>(null);
  const [log] = useState<DocumentLog[]>(loadLog());
  const [showNormsDropdown, setShowNormsDropdown] = useState<number | null>(null);
  const [showAddClientModal, setShowAddClientModal] = useState(false);
  const [quickClientForm, setQuickClientForm] = useState<Omit<Client, 'id' | 'createdAt'>>(emptyQuickClientForm());
  const [receiptSendStatus, setReceiptSendStatus] = useState<Record<string, 'idle' | 'loading' | 'success' | 'error'>>({});
  const [docSendStatus, setDocSendStatus] = useState<Record<string, 'idle' | 'loading' | 'success' | 'error'>>({});

  // ── Filtered orders ──────────────────────────────────────────────────────
  const filteredOrders = useMemo(() => {
    return data.workOrders.filter(o => {
      const client = data.clients.find(c => c.id === o.clientId);
      const matchSearch = o.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client?.car.plate.toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = statusFilter === 'all' || o.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [data.workOrders, data.clients, searchTerm, statusFilter]);

  // ── Totals ───────────────────────────────────────────────────────────────
  const calcTotal = (form: OrderForm) => {
    const s = form.services.reduce((acc, s) => acc + (s.price || 0), 0);
    const p = form.parts.reduce((acc, p) => acc + ((p.price || 0) * (p.quantity || 0)), 0);
    return s + p;
  };

  // ── Create Order ─────────────────────────────────────────────────────────
  const handleOpenCreate = () => {
    setOrderForm(emptyOrderForm());
    setActiveModal('create');
  };

  const handleCreateOrder = () => {
    if (!orderForm.clientId) return;
    const order: WorkOrder = {
      id: generateOrderId(),
      clientId: orderForm.clientId,
      masterId: orderForm.masterId || undefined,
      status: 'New',
      date: format(new Date(), 'yyyy-MM-dd'),
      services: orderForm.services.filter(s => s.name),
      parts: orderForm.parts.filter(p => p.partId),
      paymentType: orderForm.paymentType,
      isPaid: false,
      total: calcTotal(orderForm),
    };
    updateData({ workOrders: [order, ...data.workOrders] });
    addLog({ action: 'created', orderId: order.id, userName: currentUserName, details: `Клієнт: ${data.clients.find(c => c.id === order.clientId)?.name}, Сума: ${order.total} ₴` });
    addNotification({ type: 'order', title: 'Нове замовлення', message: `Створено наряд-замовлення ${order.id}` });
    setActiveModal(null);
  };

  // ── Edit Order ───────────────────────────────────────────────────────────
  const handleOpenEdit = (order: WorkOrder) => {
    setEditingOrderId(order.id);
    setOrderForm({
      clientId: order.clientId,
      masterId: order.masterId || '',
      paymentType: order.paymentType,
      services: order.services.length > 0 ? order.services.map(s => ({ ...s })) : [{ id: generateId(), name: '', price: 0, hours: 1, masterId: '' }],
      parts: order.parts.map(p => ({ ...p })),
    });
    setActiveModal('edit');
  };

  const handleSaveEdit = () => {
    if (!editingOrderId) return;
    const updated = data.workOrders.map(o =>
      o.id === editingOrderId ? {
        ...o,
        clientId: orderForm.clientId,
        masterId: orderForm.masterId || undefined,
        paymentType: orderForm.paymentType,
        services: orderForm.services.filter(s => s.name),
        parts: orderForm.parts.filter(p => p.partId),
        total: calcTotal(orderForm),
      } : o
    );
    updateData({ workOrders: updated });
    addLog({ action: 'edited', orderId: editingOrderId, userName: currentUserName, details: `Відредаговано. Нова сума: ${calcTotal(orderForm)} ₴` });
    setActiveModal(null);
    setEditingOrderId(null);
  };

  // ── Cancel Order ─────────────────────────────────────────────────────────
  const handleCancelOrder = (orderId: string) => {
    const order = data.workOrders.find(o => o.id === orderId);
    if (!order) return;
    if (order.isPaid) {
      alert('Не можна скасувати оплачене замовлення. Спочатку скасуйте оплату.');
      return;
    }
    if (!confirm(`Скасувати замовлення ${orderId}?`)) return;
    const updated = data.workOrders.map(o => o.id === orderId ? { ...o, status: 'Cancelled' as const } : o);
    updateData({ workOrders: updated });
    addLog({ action: 'cancelled', orderId, userName: currentUserName, details: `Замовлення скасовано` });
    addNotification({ type: 'order', title: 'Замовлення скасовано', message: `Наряд ${orderId} скасовано` });
  };

  // ── Delete Order ─────────────────────────────────────────────────────────
  const handleDeleteOrder = (orderId: string) => {
    if (!confirm(`Видалити замовлення ${orderId}? Цю дію не можна скасувати.`)) return;
    updateData({ workOrders: data.workOrders.filter(o => o.id !== orderId) });
    addLog({ action: 'deleted', orderId, userName: currentUserName, details: `Замовлення видалено` });
  };

  // ── Status Change ────────────────────────────────────────────────────────
  const handleUpdateStatus = (orderId: string, status: WorkOrder['status']) => {
    const updated = data.workOrders.map(o => o.id === orderId ? { ...o, status } : o);
    updateData({ workOrders: updated });
    addLog({ action: 'status_changed', orderId, userName: currentUserName, details: `Статус змінено на: ${STATUS_LABELS[status]}` });
    if (status === 'Completed') {
      addNotification({ type: 'order', title: 'Замовлення завершено', message: `Наряд-замовлення ${orderId} виконано` });
    }
  };

  // ── Payment ───────────────────────────────────────────────────────────────
  const handlePayment = (orderId: string, paymentType: 'Cash' | 'Card' | 'Bank') => {
    const updated = data.workOrders.map(o =>
      o.id === orderId ? { ...o, isPaid: true, paymentType, status: 'Completed' as const } : o
    );
    updateData({ workOrders: updated });
    const ptLabel = paymentType === 'Cash' ? 'Готівка' : paymentType === 'Card' ? 'Карта' : 'Б/Н';
    addLog({ action: 'paid', orderId, userName: currentUserName, details: `Оплачено: ${ptLabel}` });
    addNotification({ type: 'payment', title: 'Оплата отримана', message: `Замовлення ${orderId} оплачено (${ptLabel})` });
  };

  // ── Cancel Payment ────────────────────────────────────────────────────────
  const handleCancelPayment = (orderId: string) => {
    if (!confirm('Скасувати оплату? Замовлення буде повернуто до статусу "Завершено (неоплачено)".')) return;
    const updated = data.workOrders.map(o =>
      o.id === orderId ? { ...o, isPaid: false, status: 'Completed' as const } : o
    );
    updateData({ workOrders: updated });
    addLog({ action: 'payment_cancelled', orderId, userName: currentUserName, details: `Оплату скасовано` });
    addNotification({ type: 'order', title: 'Оплату скасовано', message: `Оплата замовлення ${orderId} скасована` });
  };

  // ── Send Telegram Receipt ─────────────────────────────────────────────────
  const handleSendTelegramReceipt = async (order: WorkOrder) => {
    const tg = data.telegramSettings;
    if (!tg?.enabled || !tg.sendReceipts) return;
    setReceiptSendStatus(s => ({ ...s, [order.id]: 'loading' }));
    const client = data.clients.find(c => c.id === order.clientId);
    const cs = data.companySettings;
    const ok = await sendTelegramReceipt(tg, {
      orderId: order.id,
      clientName: client?.name || '-',
      carInfo: client?.car ? `${client.car.make} ${client.car.model} (${client.car.year}) ${client.car.plate}` : '-',
      services: order.services.map(s => ({ name: s.name, price: s.price })),
      parts: order.parts.map(p => {
        const part = data.inventory.find(inv => inv.id === p.partId);
        return { name: part?.name || 'Запчастина', quantity: p.quantity, price: p.price };
      }),
      total: order.total,
      paymentType: order.paymentType,
      date: format(new Date(order.date), 'dd.MM.yyyy'),
      companyName: cs.name,
    });
    setReceiptSendStatus(s => ({ ...s, [order.id]: ok ? 'success' : 'error' }));
    setTimeout(() => setReceiptSendStatus(s => ({ ...s, [order.id]: 'idle' })), 4000);
  };

  // ── Send Work Order Document via Telegram ─────────────────────────────────
  const handleSendTelegramDocument = async (order: WorkOrder) => {
    const tg = data.telegramSettings;
    if (!tg?.enabled || !tg.sendDocuments) return;
    setDocSendStatus(s => ({ ...s, [order.id]: 'loading' }));
    const client = data.clients.find(c => c.id === order.clientId);
    const master = data.employees.find(e => e.id === order.masterId);
    const cs = data.companySettings;
    const ok = await sendTelegramWorkOrderDocument(tg, {
      orderId: order.id,
      clientName: client?.name || '-',
      carInfo: client?.car ? `${client.car.make} ${client.car.model} (${client.car.year}) ${client.car.plate}` : '-',
      date: format(new Date(order.date), 'dd.MM.yyyy'),
      masterName: master?.name || '-',
      services: order.services.map(s => ({ name: s.name, price: s.price, hours: s.hours })),
      parts: order.parts.map(p => {
        const part = data.inventory.find(inv => inv.id === p.partId);
        return { name: part?.name || 'Запчастина', quantity: p.quantity, price: p.price };
      }),
      total: order.total,
      companyName: cs.name,
      companyPhone: cs.phone,
      companyAddress: cs.address,
    });
    setDocSendStatus(s => ({ ...s, [order.id]: ok ? 'success' : 'error' }));
    setTimeout(() => setDocSendStatus(s => ({ ...s, [order.id]: 'idle' })), 4000);
  };

  // ── Restore Cancelled ─────────────────────────────────────────────────────
  const handleRestoreOrder = (orderId: string) => {
    if (!confirm('Відновити скасоване замовлення до статусу "Нове"?')) return;
    const updated = data.workOrders.map(o => o.id === orderId ? { ...o, status: 'New' as const } : o);
    updateData({ workOrders: updated });
    addLog({ action: 'status_changed', orderId, userName: currentUserName, details: `Скасоване замовлення відновлено` });
  };

  // ── Diagnosis ─────────────────────────────────────────────────────────────
  const openDiagnosisModal = (orderId: string) => {
    setDiagOrderId(orderId);
    const order = data.workOrders.find(o => o.id === orderId);
    setDiagnosisForm(order?.diagnosis ? { ...order.diagnosis } : {
      ...emptyDiagnosis,
      masterId: order?.masterId || '',
      date: format(new Date(), 'yyyy-MM-dd'),
    });
    setActiveModal('diagnosis');
  };

  const saveDiagnosis = () => {
    if (!diagOrderId) return;
    const updated = data.workOrders.map(o =>
      o.id === diagOrderId ? { ...o, diagnosis: diagnosisForm } : o
    );
    updateData({ workOrders: updated });
    addLog({ action: 'edited', orderId: diagOrderId, userName: currentUserName, details: 'Оновлено діагностичну карту' });
    setActiveModal(null);
  };

  // ── Add norm from DB ──────────────────────────────────────────────────────
  const addNormToService = (normId: string, idx: number) => {
    const norm = db.workNorms.find(n => n.id === normId);
    if (!norm) return;
    const updated = [...orderForm.services];
    updated[idx] = { ...updated[idx], name: norm.name, price: norm.price, hours: norm.hours };
    setOrderForm({ ...orderForm, services: updated });
    setShowNormsDropdown(null);
  };

  // ── Quick Add Client ───────────────────────────────────────────────────────
  const handleQuickAddClient = () => {
    if (!quickClientForm.name.trim() || !quickClientForm.phone.trim()) {
      alert('Будь ласка, заповніть обов\'язкові поля (Ім\'я та Телефон)');
      return;
    }
    const newClient: Client = {
      id: generateId(),
      ...quickClientForm,
      createdAt: format(new Date(), 'yyyy-MM-dd'),
    };
    updateData({ clients: [...data.clients, newClient] });
    setOrderForm({ ...orderForm, clientId: newClient.id });
    setShowAddClientModal(false);
    setQuickClientForm(emptyQuickClientForm());
  };

  // ── Print Act ─────────────────────────────────────────────────────────────
  const handlePrintWorkAct = (order: WorkOrder) => {
    const client = data.clients.find(c => c.id === order.clientId);
    const master = data.employees.find(e => e.id === order.masterId);
    const cs = data.companySettings;
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<html><head><title>Акт ${order.id}</title>
    <style>
      body{font-family:Arial,sans-serif;padding:40px;color:#333;max-width:800px;margin:0 auto}
      .header{display:flex;justify-content:space-between;border-bottom:3px solid #ffcc00;padding-bottom:20px;margin-bottom:20px}
      .company{font-size:22px;font-weight:bold}
      .info{font-size:11px;color:#666}
      .title{text-align:center;font-size:18px;font-weight:bold;text-transform:uppercase;margin:20px 0}
      .grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:20px;font-size:13px}
      table{width:100%;border-collapse:collapse;margin-bottom:20px}
      th,td{border:1px solid #ddd;padding:8px;font-size:12px;text-align:left}
      th{background:#f5f5f5;font-weight:bold}
      .total{font-weight:bold;background:#fffbe6}
      .footer{margin-top:50px;display:flex;justify-content:space-between}
      .sig{width:200px;border-top:1px solid #000;text-align:center;font-size:11px;padding-top:5px}
      .paid{background:#f0fdf4;border:1px solid #bbf7d0;padding:10px;border-radius:6px;margin-bottom:20px}
    </style></head><body>
    <div class="header">
      <div>
        <div class="company">${cs.name}</div>
        <div class="info">${cs.address}<br>Тел: ${cs.phone}<br>ЄДРПОУ: ${cs.edrpou}</div>
      </div>
      <div style="text-align:right">
        <div style="font-weight:bold">АКТ № ${order.id}</div>
        <div style="font-size:13px">від ${format(new Date(order.date), 'dd.MM.yyyy')}</div>
      </div>
    </div>
    <div class="title">Акт виконаних робіт</div>
    <div class="grid">
      <div><strong>Замовник:</strong> ${client?.name || '-'}</div>
      <div><strong>Телефон:</strong> ${client?.phone || '-'}</div>
      <div><strong>Автомобіль:</strong> ${client?.car.make} ${client?.car.model} (${client?.car.year})</div>
      <div><strong>Держ. номер:</strong> ${client?.car.plate || '-'}</div>
      <div><strong>VIN:</strong> ${client?.car.vin || '-'}</div>
      <div><strong>Майстер:</strong> ${master?.name || '-'}</div>
    </div>
    <table>
      <thead><tr><th>#</th><th>Найменування</th><th>К-сть</th><th>Ціна, ₴</th><th>Сума, ₴</th></tr></thead>
      <tbody>
        ${order.services.map((s, i) => `<tr><td>${i + 1}</td><td>${s.name} (робота)</td><td>${s.hours} год</td><td>${s.price}</td><td>${s.price}</td></tr>`).join('')}
        ${order.parts.map((p, i) => {
          const part = data.inventory.find(inv => inv.id === p.partId);
          return `<tr><td>${order.services.length + i + 1}</td><td>${part?.name || 'Запчастина'}</td><td>${p.quantity} шт</td><td>${p.price}</td><td>${p.price * p.quantity}</td></tr>`;
        }).join('')}
        <tr class="total"><td colspan="4" style="text-align:right">ВСЬОГО:</td><td>${order.total} ₴</td></tr>
      </tbody>
    </table>
    <div class="${order.isPaid ? 'paid' : ''}">
      <strong>Спосіб оплати:</strong> ${order.paymentType === 'Cash' ? 'Готівка' : order.paymentType === 'Card' ? 'Банківська карта' : 'Безготівковий'}&nbsp;&nbsp;
      <strong>Статус:</strong> ${order.isPaid ? '✓ ОПЛАЧЕНО' : 'Не оплачено'}
    </div>
    <div class="footer">
      <div class="sig">Виконавець<br>(${cs.managerName || cs.name})</div>
      <div class="sig">Замовник<br>(${client?.name || ''})</div>
    </div>
    </body></html>`);
    w.document.close();
    w.print();
  };

  const handlePrintDiagnostic = (order: WorkOrder) => {
    const client = data.clients.find(c => c.id === order.clientId);
    const master = data.employees.find(e => e.id === (order.diagnosis?.masterId || order.masterId));
    const cs = data.companySettings;
    const diag = order.diagnosis || emptyDiagnosis;
    const w = window.open('', '_blank');
    if (!w) return;
    const renderRow = (key: string, item: { status: string; note: string }) => `
      <tr>
        <td style="padding:8px;border:1px solid #ddd"><strong>${diagnosisLabels[key] || key}</strong></td>
        <td style="padding:8px;border:1px solid #ddd;text-align:center">
          <span style="padding:3px 10px;border-radius:20px;font-weight:bold;font-size:11px;color:white;background:${item.status === 'ok' ? '#22c55e' : item.status === 'warn' ? '#f59e0b' : '#ef4444'}">
            ${item.status === 'ok' ? 'НОРМА' : item.status === 'warn' ? 'УВАГА' : 'КРИТИЧНО'}
          </span>
        </td>
        <td style="padding:8px;border:1px solid #ddd">${item.note || '—'}</td>
      </tr>`;
    w.document.write(`<html><head><title>Акт Діагностики</title>
    <style>body{font-family:Arial,sans-serif;padding:40px;max-width:800px;margin:0 auto;color:#333}</style>
    </head><body>
    <div style="display:flex;justify-content:space-between;border-bottom:3px solid #ffcc00;padding-bottom:20px;margin-bottom:20px">
      <div>
        <div style="font-size:22px;font-weight:bold">${cs.name}</div>
        <div style="font-size:11px;color:#666">${cs.address} | ${cs.phone} | ЄДРПОУ: ${cs.edrpou}</div>
      </div>
      <div style="text-align:right">
        <div style="font-weight:bold">АКТ ДІАГНОСТИКИ</div>
        <div style="font-size:13px">№ ${order.id} від ${format(new Date(diag.date || order.date), 'dd.MM.yyyy')}</div>
      </div>
    </div>
    <div style="text-align:center;font-size:18px;font-weight:bold;text-transform:uppercase;margin:20px 0">Акт огляду та діагностики ТЗ</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:20px;font-size:13px;background:#f9f9f9;padding:15px;border-radius:8px">
      <div><strong>Власник:</strong> ${client?.name || '-'}</div>
      <div><strong>Телефон:</strong> ${client?.phone || '-'}</div>
      <div><strong>Авто:</strong> ${client?.car.make} ${client?.car.model} (${client?.car.year})</div>
      <div><strong>Держ. номер:</strong> ${client?.car.plate || '-'}</div>
      <div><strong>VIN:</strong> ${client?.car.vin || '-'}</div>
      <div><strong>Майстер:</strong> ${master?.name || '-'}</div>
    </div>
    <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
      <thead><tr>
        <th style="padding:10px;border:1px solid #ddd;background:#f5f5f5;width:35%">Система / Вузол</th>
        <th style="padding:10px;border:1px solid #ddd;background:#f5f5f5;width:20%;text-align:center">Стан</th>
        <th style="padding:10px;border:1px solid #ddd;background:#f5f5f5">Результати / Рекомендації</th>
      </tr></thead>
      <tbody>
        ${Object.entries(diag).filter(([k]) => k !== 'masterId' && k !== 'date').map(([k, v]) => renderRow(k, v as { status: string; note: string })).join('')}
      </tbody>
    </table>
    <div style="font-size:11px;color:#666;background:#f9f9f9;padding:10px;border-radius:4px;margin-bottom:30px">
      <strong>Умовні позначення:</strong>
      <span style="color:#22c55e">● НОРМА</span> — задовільний стан;
      <span style="color:#f59e0b">● УВАГА</span> — рекомендується увага;
      <span style="color:#ef4444">● КРИТИЧНО</span> — потребує ремонту
    </div>
    <div style="margin-top:50px;display:flex;justify-content:space-between">
      <div style="width:200px;border-top:1px solid #000;text-align:center;font-size:11px;padding-top:5px">Майстер</div>
      <div style="width:200px;border-top:1px solid #000;text-align:center;font-size:11px;padding-top:5px">Замовник</div>
    </div>
    </body></html>`);
    w.document.close();
    w.print();
  };

  // ── Service/Part form helpers ──────────────────────────────────────────────
  const updateService = (idx: number, field: string, value: string | number) => {
    const updated = [...orderForm.services];
    updated[idx] = { ...updated[idx], [field]: value };
    setOrderForm({ ...orderForm, services: updated });
  };

  const addService = () => setOrderForm({
    ...orderForm,
    services: [...orderForm.services, { id: generateId(), name: '', price: 0, hours: 1, masterId: '' }]
  });

  const removeService = (idx: number) => {
    if (orderForm.services.length <= 1) return;
    setOrderForm({ ...orderForm, services: orderForm.services.filter((_, i) => i !== idx) });
  };

  const updatePart = (idx: number, field: string, value: string | number) => {
    const updated = [...orderForm.parts];
    if (field === 'partId') {
      const part = data.inventory.find(p => p.id === value);
      updated[idx] = { ...updated[idx], partId: value as string, price: part?.salePrice || 0 };
    } else {
      updated[idx] = { ...updated[idx], [field]: value };
    }
    setOrderForm({ ...orderForm, parts: updated });
  };

  const addPart = () => setOrderForm({
    ...orderForm,
    parts: [...orderForm.parts, { id: generateId(), partId: '', quantity: 1, price: 0 }]
  });

  const removePart = (idx: number) => setOrderForm({ ...orderForm, parts: orderForm.parts.filter((_, i) => i !== idx) });

  const actionIcon = (action: DocumentLog['action']) => {
    switch (action) {
      case 'created': return '🆕';
      case 'edited': return '✏️';
      case 'cancelled': return '🚫';
      case 'payment_cancelled': return '↩️';
      case 'deleted': return '🗑️';
      case 'paid': return '💳';
      case 'status_changed': return '🔄';
      default: return '📄';
    }
  };

  const actionLabel = (action: DocumentLog['action']) => {
    const map: Record<string, string> = {
      created: 'Створено', edited: 'Відредаговано', cancelled: 'Скасовано',
      payment_cancelled: 'Оплату скасовано', deleted: 'Видалено',
      paid: 'Оплачено', status_changed: 'Змінено статус',
    };
    return map[action] || action;
  };

  // ── Order Form Modal ──────────────────────────────────────────────────────
  const renderOrderModal = (mode: 'create' | 'edit') => (
    <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 sm:p-4">
      <div className="bg-white sm:rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden max-h-[95vh] flex flex-col rounded-t-2xl">
        <div className="p-5 border-b bg-neutral-50 flex items-center justify-between shrink-0">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <FileText className="text-[#ffcc00]" size={20} />
            {mode === 'create' ? 'Нове наряд-замовлення' : `Редагування ${editingOrderId}`}
          </h3>
          <button onClick={() => setActiveModal(null)} className="text-neutral-400 hover:text-neutral-600">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-5 overflow-y-auto flex-1">
          {/* Client & Master */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-neutral-600 mb-1">Клієнт *</label>
              <div className="flex gap-2">
                <select
                  value={orderForm.clientId}
                  onChange={e => setOrderForm({ ...orderForm, clientId: e.target.value })}
                  className="flex-1 p-2 border rounded-lg outline-none focus:ring-2 focus:ring-[#ffcc00]"
                >
                  <option value="">Оберіть клієнта...</option>
                  {data.clients.map(c => (
                    <option key={c.id} value={c.id}>{c.name} — {c.car.plate}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setShowAddClientModal(true)}
                  className="bg-[#ffcc00] text-black p-2 rounded-lg font-bold flex items-center justify-center hover:bg-[#e6b800] transition-colors shrink-0"
                  title="Додати клієнта"
                  aria-label="Додати клієнта"
                >
                  <Plus size={18} />
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-neutral-600 mb-1">Відповідальний майстер</label>
              <select
                value={orderForm.masterId}
                onChange={e => setOrderForm({ ...orderForm, masterId: e.target.value })}
                className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-[#ffcc00]"
              >
                <option value="">Оберіть майстра...</option>
                {data.employees.filter(e => e.role === 'Master').map(e => (
                  <option key={e.id} value={e.id}>{e.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Selected client car info */}
          {orderForm.clientId && (() => {
            const selectedClient = data.clients.find(c => c.id === orderForm.clientId);
            if (!selectedClient) return null;
            return (
              <div className="flex items-center gap-3 p-3 bg-[#ffcc00]/10 border border-[#ffcc00]/40 rounded-xl text-sm">
                <Car size={18} className="text-[#ffcc00] shrink-0" />
                <div className="flex flex-wrap gap-x-4 gap-y-0.5">
                  <span className="font-bold text-neutral-800">{selectedClient.car.make} {selectedClient.car.model} ({selectedClient.car.year})</span>
                  <span className="font-mono text-neutral-600">{selectedClient.car.plate}</span>
                  {selectedClient.car.vin && <span className="font-mono text-neutral-400 text-xs">VIN: {selectedClient.car.vin}</span>}
                </div>
              </div>
            );
          })()}

          {/* Payment type */}
          <div>
            <label className="block text-sm font-bold text-neutral-600 mb-1">Тип оплати</label>
            <div className="flex gap-2">
              {(['Cash', 'Card', 'Bank'] as const).map(pt => (
                <button
                  key={pt}
                  onClick={() => setOrderForm({ ...orderForm, paymentType: pt })}
                  className={`flex-1 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-1 transition-colors ${orderForm.paymentType === pt ? 'bg-[#ffcc00] text-black' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'}`}
                >
                  {pt === 'Cash' ? <><Banknote size={14} /> Готівка</> : pt === 'Card' ? <><CreditCard size={14} /> Карта</> : <><Building size={14} /> Б/Н</>}
                </button>
              ))}
            </div>
          </div>

          {/* Services */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-bold text-neutral-600">Роботи та послуги</label>
              <span className="text-xs text-neutral-400">з бази норм або вручну</span>
            </div>
            <div className="space-y-2">
              {orderForm.services.map((service, idx) => (
                <div key={service.id} className="p-2 border rounded-lg space-y-2">
                  <div className="flex gap-2 items-center">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        placeholder="Назва роботи (або оберіть з бази)"
                        value={service.name}
                        onChange={e => updateService(idx, 'name', e.target.value)}
                        className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-[#ffcc00] text-sm pr-8"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNormsDropdown(showNormsDropdown === idx ? null : idx)}
                        className="absolute right-2 top-2 text-neutral-400 hover:text-[#ffcc00]"
                        title="Обрати з бази норм"
                      >
                        <ClipboardList size={16} />
                      </button>
                      {showNormsDropdown === idx && (
                        <div className="absolute top-10 left-0 right-0 z-10 bg-white border rounded-xl shadow-xl max-h-48 overflow-y-auto">
                          {db.workNorms.map(norm => (
                            <button
                              key={norm.id}
                              onClick={() => addNormToService(norm.id, idx)}
                              className="w-full text-left px-3 py-2 hover:bg-[#ffcc00]/20 text-sm flex justify-between items-center"
                            >
                              <span>{norm.name}</span>
                              <span className="text-neutral-500 text-xs ml-2">{norm.hours} год · {norm.price} ₴</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <button onClick={() => removeService(idx)} className="p-2 text-red-400 hover:text-red-600 shrink-0">
                      <X size={16} />
                    </button>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <input
                      type="number"
                      placeholder="Год"
                      value={service.hours || ''}
                      onChange={e => updateService(idx, 'hours', Number(e.target.value))}
                      className="w-20 p-2 border rounded-lg outline-none focus:ring-2 focus:ring-[#ffcc00] text-sm"
                      title="Кількість годин"
                    />
                    <input
                      type="number"
                      placeholder="Ціна ₴"
                      value={service.price || ''}
                      onChange={e => updateService(idx, 'price', Number(e.target.value))}
                      className="w-28 p-2 border rounded-lg outline-none focus:ring-2 focus:ring-[#ffcc00] text-sm"
                    />
                    <select
                      value={service.masterId}
                      onChange={e => updateService(idx, 'masterId', e.target.value)}
                      className="flex-1 min-w-[120px] p-2 border rounded-lg outline-none focus:ring-2 focus:ring-[#ffcc00] text-xs"
                    >
                      <option value="">Майстер</option>
                      {data.employees.filter(e => e.role === 'Master').map(e => (
                        <option key={e.id} value={e.id}>{e.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
              <button
                onClick={addService}
                className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1 font-medium"
              >
                <Plus size={14} /> Додати роботу
              </button>
            </div>
          </div>

          {/* Parts */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-bold text-neutral-600">Запчастини зі складу</label>
              <span className="text-xs text-neutral-400">ціна підтягується автоматично, але може бути змінена</span>
            </div>
            <div className="space-y-2">
              {orderForm.parts.map((part, idx) => (
                <div key={part.id} className="p-2 border rounded-lg space-y-2">
                  <div className="flex gap-2 items-center">
                    <select
                      value={part.partId}
                      onChange={e => updatePart(idx, 'partId', e.target.value)}
                      className="flex-1 p-2 border rounded-lg outline-none focus:ring-2 focus:ring-[#ffcc00] text-sm"
                    >
                      <option value="">Оберіть запчастину...</option>
                      {data.inventory.filter(p => p.stock > 0).map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name} (є: {p.stock} шт) — {p.salePrice} ₴
                        </option>
                      ))}
                    </select>
                    <button onClick={() => removePart(idx)} className="p-2 text-red-400 hover:text-red-600 shrink-0">
                      <X size={16} />
                    </button>
                  </div>
                  <div className="flex gap-2 flex-wrap items-center">
                    <input
                      type="number"
                      min={0}
                      value={part.price || ''}
                      onChange={e => updatePart(idx, 'price', Number(e.target.value))}
                      className="w-28 p-2 border rounded-lg outline-none focus:ring-2 focus:ring-[#ffcc00] text-sm"
                      placeholder="Ціна ₴"
                      title="Ціна за одиницю"
                    />
                    <input
                      type="number"
                      min={1}
                      value={part.quantity || ''}
                      onChange={e => updatePart(idx, 'quantity', Number(e.target.value))}
                      className="w-20 p-2 border rounded-lg outline-none focus:ring-2 focus:ring-[#ffcc00] text-sm"
                      placeholder="К-сть"
                    />
                    <span className="text-sm font-bold ml-auto">
                      {(part.price * part.quantity).toLocaleString()} ₴
                    </span>
                  </div>
                </div>
              ))}
              <button
                onClick={addPart}
                className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1 font-medium"
              >
                <Plus size={14} /> Додати запчастину
              </button>
            </div>
          </div>
        </div>

        <div className="p-5 border-t bg-neutral-50 flex items-center justify-between shrink-0">
          <div className="text-lg font-bold">
            Всього: <span className="text-[#ffcc00]">{calcTotal(orderForm).toLocaleString()} ₴</span>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setActiveModal(null)} className="px-5 py-2 rounded-lg text-neutral-600 hover:bg-neutral-200 font-medium">
              Скасувати
            </button>
            <button
              onClick={mode === 'create' ? handleCreateOrder : handleSaveEdit}
              disabled={!orderForm.clientId}
              className="bg-[#ffcc00] text-black px-6 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-[#e6b800] disabled:opacity-40"
            >
              <Save size={18} /> {mode === 'create' ? 'Створити' : 'Зберегти'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex gap-2 flex-wrap items-center flex-1 min-w-0">
          <div className="relative flex-1 min-w-0 sm:flex-none">
            <Search className="absolute left-3 top-2.5 text-neutral-400" size={18} />
            <input
              type="text"
              placeholder="Пошук замовлення..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border rounded-xl focus:ring-2 focus:ring-[#ffcc00] outline-none w-full sm:w-64 text-sm"
            />
          </div>
          <div className="flex items-center gap-1">
            <Filter size={16} className="text-neutral-400" />
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#ffcc00]"
            >
              <option value="all">Всі статуси</option>
              {Object.entries(STATUS_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={() => setActiveModal('log')}
            aria-label={`Журнал документів (${loadLog().length} записів)`}
            className="bg-neutral-100 hover:bg-neutral-200 text-neutral-700 px-3 sm:px-4 py-2 rounded-xl font-bold flex items-center gap-2 text-sm transition-colors"
          >
            <History size={16} /> <span className="hidden sm:inline">Журнал ({loadLog().length})</span>
          </button>
          <button
            onClick={handleOpenCreate}
            aria-label="Нове замовлення"
            className="bg-[#ffcc00] text-black px-3 sm:px-5 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-[#e6b800] transition-colors shadow-sm text-sm"
          >
            <Plus size={18} /> <span className="hidden sm:inline">Нове замовлення</span><span className="sm:hidden">Нове</span>
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Всього', value: data.workOrders.length, color: 'text-neutral-700', bg: 'bg-neutral-100' },
          { label: 'Нові', value: data.workOrders.filter(o => o.status === 'New').length, color: 'text-neutral-700', bg: 'bg-neutral-100' },
          { label: 'В роботі', value: data.workOrders.filter(o => o.status === 'InProgress').length, color: 'text-blue-700', bg: 'bg-blue-50' },
          { label: 'Завершено', value: data.workOrders.filter(o => o.status === 'Completed').length, color: 'text-green-700', bg: 'bg-green-50' },
          { label: 'Скасовано', value: data.workOrders.filter(o => o.status === 'Cancelled').length, color: 'text-red-700', bg: 'bg-red-50' },
        ].map((s, i) => (
          <div key={i} className={`${s.bg} rounded-xl px-4 py-3 flex items-center gap-3`}>
            <div>
              <p className="text-xs text-neutral-500">{s.label}</p>
              <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Orders list */}
      <div className="space-y-3">
        {filteredOrders.length === 0 && (
          <div className="bg-white rounded-2xl border p-16 text-center text-neutral-400">
            <FileText size={48} className="mx-auto mb-3 opacity-30" />
            <p>Замовлень не знайдено</p>
          </div>
        )}
        {filteredOrders.map(order => {
          const client = data.clients.find(c => c.id === order.clientId);
          const master = data.employees.find(e => e.id === order.masterId);
          const isExpanded = expandedId === order.id;

          return (
            <div key={order.id} className={`bg-white rounded-2xl shadow-sm border overflow-hidden ${order.status === 'Cancelled' ? 'opacity-70' : ''}`}>
              {/* Header row */}
              <div
                className={`p-4 flex items-center justify-between cursor-pointer transition-colors ${isExpanded ? 'bg-neutral-50' : 'hover:bg-neutral-50'}`}
                onClick={() => setExpandedId(isExpanded ? null : order.id)}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-neutral-100 rounded-xl flex flex-col items-center justify-center font-bold text-[10px] text-neutral-600 shrink-0">
                    <span className="text-sm">{order.id.split('-')[1]}</span>
                    <span>WO</span>
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold truncate">{client?.name || 'Невідомий клієнт'}</h4>
                    <p className="text-sm text-neutral-500 truncate">
                      {client?.car.make} {client?.car.model} · <span className="font-mono">{client?.car.plate}</span>
                      {master && <span className="ml-2 text-blue-600 hidden sm:inline">· {master.name}</span>}
                    </p>
                    <p className="text-xs text-neutral-400">{format(new Date(order.date), 'dd.MM.yyyy')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 sm:gap-6">
                  <span className={`hidden sm:inline text-[11px] px-3 py-1 rounded-full font-bold uppercase tracking-wider ${STATUS_COLORS[order.status]}`}>
                    {STATUS_LABELS[order.status]}
                  </span>
                  <span className={`sm:hidden w-2.5 h-2.5 rounded-full shrink-0 ${order.status === 'Completed' ? 'bg-green-500' : order.status === 'InProgress' ? 'bg-blue-500' : order.status === 'PendingParts' ? 'bg-yellow-500' : order.status === 'Cancelled' ? 'bg-red-400' : 'bg-neutral-400'}`} aria-label={STATUS_LABELS[order.status]} />
                  <div className="text-right">
                    <p className="font-bold text-base sm:text-lg whitespace-nowrap">{order.total.toLocaleString()} ₴</p>
                    <p className={`text-[10px] font-bold ${order.isPaid ? 'text-green-600' : order.status === 'Cancelled' ? 'text-neutral-400' : 'text-red-500'}`}>
                      {order.isPaid ? '✓ ОПЛАЧЕНО' : order.status === 'Cancelled' ? 'СКАСОВАНО' : 'НЕ ОПЛАЧЕНО'}
                    </p>
                  </div>
                  {isExpanded ? <ChevronUp size={18} className="text-neutral-400 shrink-0" /> : <ChevronDown size={18} className="text-neutral-400 shrink-0" />}
                </div>
              </div>

              {/* Expanded details */}
              {isExpanded && (
                <div className="border-t p-5 grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Left: services/parts */}
                  <div className="space-y-4">
                    <h5 className="font-bold flex items-center gap-2 text-neutral-800">
                      <FileText size={16} className="text-[#ffcc00]" /> Склад замовлення
                    </h5>
                    <div className="border rounded-xl overflow-hidden text-sm">
                      <table className="w-full">
                        <thead className="bg-neutral-50 text-xs text-neutral-500 uppercase">
                          <tr>
                            <th className="px-3 py-2 text-left">Найменування</th>
                            <th className="px-3 py-2 text-right">К-сть</th>
                            <th className="px-3 py-2 text-right">Сума</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {order.services.map(s => (
                            <tr key={s.id}>
                              <td className="px-3 py-2">{s.name} <span className="text-neutral-400 text-xs">(робота)</span></td>
                              <td className="px-3 py-2 text-right text-neutral-500">{s.hours} год</td>
                              <td className="px-3 py-2 text-right font-medium">{s.price.toLocaleString()} ₴</td>
                            </tr>
                          ))}
                          {order.parts.map(p => {
                            const part = data.inventory.find(inv => inv.id === p.partId);
                            return (
                              <tr key={p.id} className="bg-blue-50/40">
                                <td className="px-3 py-2 font-medium">{part?.name || 'Запчастина'}</td>
                                <td className="px-3 py-2 text-right text-neutral-500">{p.quantity} шт</td>
                                <td className="px-3 py-2 text-right font-medium">{(p.price * p.quantity).toLocaleString()} ₴</td>
                              </tr>
                            );
                          })}
                          {order.services.length === 0 && order.parts.length === 0 && (
                            <tr><td colSpan={3} className="px-3 py-4 text-center text-neutral-400">Позицій немає</td></tr>
                          )}
                        </tbody>
                        <tfoot className="bg-neutral-50 font-bold">
                          <tr>
                            <td colSpan={2} className="px-3 py-2 text-right">ВСЬОГО:</td>
                            <td className="px-3 py-2 text-right">{order.total.toLocaleString()} ₴</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-wrap gap-2">
                      {/* Edit */}
                      {order.status !== 'Cancelled' && (
                        <button
                          onClick={() => handleOpenEdit(order)}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-100 text-blue-700 flex items-center gap-1 hover:bg-blue-200"
                        >
                          <Edit2 size={12} /> Редагувати
                        </button>
                      )}

                      {/* Status buttons */}
                      {order.status === 'New' && (
                        <button onClick={() => handleUpdateStatus(order.id, 'InProgress')} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-100 text-blue-700 hover:bg-blue-200">
                          ▶ В роботу
                        </button>
                      )}
                      {order.status === 'InProgress' && (
                        <>
                          <button onClick={() => handleUpdateStatus(order.id, 'PendingParts')} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-yellow-100 text-yellow-700 hover:bg-yellow-200">
                            ⏳ Очікує запчастин
                          </button>
                          <button onClick={() => handleUpdateStatus(order.id, 'Completed')} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-green-100 text-green-700 hover:bg-green-200">
                            ✓ Завершити
                          </button>
                        </>
                      )}
                      {order.status === 'PendingParts' && (
                        <>
                          <button onClick={() => handleUpdateStatus(order.id, 'InProgress')} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-100 text-blue-700 hover:bg-blue-200">
                            ▶ В роботу
                          </button>
                          <button onClick={() => handleUpdateStatus(order.id, 'Completed')} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-green-100 text-green-700 hover:bg-green-200">
                            ✓ Завершити
                          </button>
                        </>
                      )}

                      {/* Cancel order */}
                      {order.status !== 'Cancelled' && order.status !== 'Completed' && (
                        <button onClick={() => handleCancelOrder(order.id)} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-red-100 text-red-700 flex items-center gap-1 hover:bg-red-200">
                          <XCircle size={12} /> Скасувати
                        </button>
                      )}

                      {/* Restore cancelled */}
                      {order.status === 'Cancelled' && (
                        <button onClick={() => handleRestoreOrder(order.id)} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-neutral-100 text-neutral-700 flex items-center gap-1 hover:bg-neutral-200">
                          <RotateCcw size={12} /> Відновити
                        </button>
                      )}

                      {/* Cancel payment */}
                      {order.isPaid && (
                        <button onClick={() => handleCancelPayment(order.id)} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-orange-100 text-orange-700 flex items-center gap-1 hover:bg-orange-200">
                          <RotateCcw size={12} /> Скасувати оплату
                        </button>
                      )}

                      {/* Delete */}
                      {currentUser?.permissions.canDeleteOrders && (
                      <button
                        onClick={() => handleDeleteOrder(order.id)}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-red-50 text-red-500 flex items-center gap-1 hover:bg-red-100"
                      >
                        <Trash2 size={12} /> Видалити
                      </button>
                      )}
                    </div>

                    {/* Print */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => handlePrintWorkAct(order)}
                        className="flex-1 bg-neutral-100 hover:bg-neutral-200 py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-colors"
                      >
                        <Printer size={15} /> Акт виконаних робіт
                      </button>
                    </div>
                  </div>

                  {/* Right: diagnosis + payment */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h5 className="font-bold flex items-center gap-2 text-neutral-800">
                        <Stethoscope size={16} className="text-[#ffcc00]" /> Діагностична карта
                      </h5>
                      <div className="flex gap-2">
                        <button
                          onClick={() => openDiagnosisModal(order.id)}
                          className="text-xs text-blue-600 hover:underline font-bold flex items-center gap-1"
                        >
                          <Stethoscope size={12} /> {order.diagnosis ? 'Редагувати' : 'Заповнити'}
                        </button>
                        {order.diagnosis && (
                          <button
                            onClick={() => handlePrintDiagnostic(order)}
                            className="text-xs text-blue-600 hover:underline font-bold flex items-center gap-1"
                          >
                            <Printer size={12} /> Друк
                          </button>
                        )}
                      </div>
                    </div>

                    {order.diagnosis ? (
                      <div className="grid grid-cols-2 gap-2">
                        {Object.entries(order.diagnosis)
                          .filter(([k]) => k !== 'masterId' && k !== 'date')
                          .map(([key, value]) => (
                            <div key={key} className="p-2 border rounded-lg flex items-center justify-between gap-2">
                              <div className="min-w-0">
                                <p className="text-[10px] text-neutral-400 uppercase font-bold truncate">{diagnosisLabels[key]}</p>
                                <p className="text-xs text-neutral-500 truncate">{(value as { note: string }).note || 'Без зауважень'}</p>
                              </div>
                              {(value as { status: string }).status === 'ok' && <CheckCircle size={15} className="text-green-500 shrink-0" />}
                              {(value as { status: string }).status === 'warn' && <AlertTriangle size={15} className="text-yellow-500 shrink-0" />}
                              {(value as { status: string }).status === 'crit' && <XCircle size={15} className="text-red-500 shrink-0" />}
                            </div>
                          ))}
                      </div>
                    ) : (
                      <div className="py-6 text-center text-neutral-400 bg-neutral-50 rounded-xl border-2 border-dashed text-sm">
                        Карта діагностики не заповнена
                      </div>
                    )}

                    {/* Payment block */}
                    {!order.isPaid && order.status !== 'Cancelled' && (
                      <div className="pt-4 border-t">
                        <p className="text-sm font-bold mb-2 text-neutral-700">Прийняти оплату:</p>
                        <div className="grid grid-cols-3 gap-2">
                          <button
                            onClick={() => handlePayment(order.id, 'Cash')}
                            className="bg-green-100 hover:bg-green-200 text-green-800 py-3 rounded-xl font-bold text-sm flex flex-col items-center gap-1 transition-colors"
                          >
                            <Banknote size={18} /> Готівка
                          </button>
                          <button
                            onClick={() => handlePayment(order.id, 'Card')}
                            className="bg-blue-100 hover:bg-blue-200 text-blue-800 py-3 rounded-xl font-bold text-sm flex flex-col items-center gap-1 transition-colors"
                          >
                            <CreditCard size={18} /> Карта
                          </button>
                          <button
                            onClick={() => handlePayment(order.id, 'Bank')}
                            className="bg-purple-100 hover:bg-purple-200 text-purple-800 py-3 rounded-xl font-bold text-sm flex flex-col items-center gap-1 transition-colors"
                          >
                            <Building size={18} /> Б/Н
                          </button>
                        </div>
                        {data.telegramSettings?.enabled && data.telegramSettings?.sendDocuments && order.status === 'Completed' && (
                          <button
                            onClick={() => handleSendTelegramDocument(order)}
                            disabled={docSendStatus[order.id] === 'loading'}
                            className={`mt-2 w-full flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition-colors ${
                              docSendStatus[order.id] === 'success'
                                ? 'bg-green-100 text-green-700'
                                : docSendStatus[order.id] === 'error'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                            } disabled:opacity-50`}
                          >
                            {docSendStatus[order.id] === 'loading' ? (
                              <><Loader size={14} className="animate-spin" /> Відправка...</>
                            ) : docSendStatus[order.id] === 'success' ? (
                              <><CheckCircle size={14} /> Акт відправлено!</>
                            ) : docSendStatus[order.id] === 'error' ? (
                              <><AlertTriangle size={14} /> Помилка відправки</>
                            ) : (
                              <><FileText size={14} /> Надіслати акт в Telegram</>
                            )}
                          </button>
                        )}
                      </div>
                    )}

                    {order.isPaid && (
                      <div className="pt-4 border-t">
                        <div className="flex items-center gap-3 p-3 bg-green-50 rounded-xl border border-green-200">
                          <CheckCircle size={20} className="text-green-600" />
                          <div>
                            <p className="font-bold text-green-700 text-sm">Оплачено</p>
                            <p className="text-xs text-green-600">
                              {order.paymentType === 'Cash' ? '💵 Готівка' : order.paymentType === 'Card' ? '💳 Карта' : '🏦 Безготівковий'}
                              · {order.total.toLocaleString()} ₴
                            </p>
                          </div>
                        </div>
                        {data.telegramSettings?.enabled && data.telegramSettings?.sendReceipts && (
                          <button
                            onClick={() => handleSendTelegramReceipt(order)}
                            disabled={receiptSendStatus[order.id] === 'loading'}
                            className={`mt-2 w-full flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition-colors ${
                              receiptSendStatus[order.id] === 'success'
                                ? 'bg-green-100 text-green-700'
                                : receiptSendStatus[order.id] === 'error'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                            } disabled:opacity-50`}
                          >
                            {receiptSendStatus[order.id] === 'loading' ? (
                              <><Loader size={14} className="animate-spin" /> Відправка...</>
                            ) : receiptSendStatus[order.id] === 'success' ? (
                              <><CheckCircle size={14} /> Чек відправлено!</>
                            ) : receiptSendStatus[order.id] === 'error' ? (
                              <><AlertTriangle size={14} /> Помилка відправки</>
                            ) : (
                              <><Send size={14} /> Надіслати чек в Telegram</>
                            )}
                          </button>
                        )}
                        {data.telegramSettings?.enabled && data.telegramSettings?.sendDocuments && order.status === 'Completed' && (
                          <button
                            onClick={() => handleSendTelegramDocument(order)}
                            disabled={docSendStatus[order.id] === 'loading'}
                            className={`mt-2 w-full flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition-colors ${
                              docSendStatus[order.id] === 'success'
                                ? 'bg-green-100 text-green-700'
                                : docSendStatus[order.id] === 'error'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                            } disabled:opacity-50`}
                          >
                            {docSendStatus[order.id] === 'loading' ? (
                              <><Loader size={14} className="animate-spin" /> Відправка...</>
                            ) : docSendStatus[order.id] === 'success' ? (
                              <><CheckCircle size={14} /> Акт відправлено!</>
                            ) : docSendStatus[order.id] === 'error' ? (
                              <><AlertTriangle size={14} /> Помилка відправки</>
                            ) : (
                              <><FileText size={14} /> Надіслати акт в Telegram</>
                            )}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Create/Edit Modal ── */}
      {activeModal === 'create' && renderOrderModal('create')}
      {activeModal === 'edit' && renderOrderModal('edit')}

      {/* ── Diagnosis Modal ── */}
      {activeModal === 'diagnosis' && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-5 border-b bg-neutral-50 flex items-center justify-between shrink-0">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <Stethoscope className="text-[#ffcc00]" size={20} /> Діагностична карта
              </h3>
              <button onClick={() => setActiveModal(null)} className="text-neutral-400 hover:text-neutral-600"><X size={20} /></button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-neutral-600 mb-1">Майстер</label>
                  <select
                    value={diagnosisForm.masterId || ''}
                    onChange={e => setDiagnosisForm({ ...diagnosisForm, masterId: e.target.value })}
                    className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-[#ffcc00]"
                  >
                    <option value="">Оберіть майстра...</option>
                    {data.employees.filter(e => e.role === 'Master').map(e => (
                      <option key={e.id} value={e.id}>{e.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-neutral-600 mb-1">Дата огляду</label>
                  <input
                    type="date"
                    value={diagnosisForm.date || ''}
                    onChange={e => setDiagnosisForm({ ...diagnosisForm, date: e.target.value })}
                    className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-[#ffcc00]"
                  />
                </div>
              </div>

              <div className="space-y-3">
                {Object.entries(diagnosisLabels).map(([key, label]) => {
                  const diagKey = key as keyof Omit<DiagnosticCard, 'masterId' | 'date'>;
                  const item = diagnosisForm[diagKey] as { status: string; note: string };
                  return (
                    <div key={key} className="p-4 border rounded-xl">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-sm">{label}</span>
                        <div className="flex gap-1.5">
                          {(['ok', 'warn', 'crit'] as const).map(status => (
                            <button
                              key={status}
                              onClick={() => setDiagnosisForm({
                                ...diagnosisForm,
                                [diagKey]: { ...item, status }
                              })}
                              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                                item?.status === status
                                  ? status === 'ok' ? 'bg-green-500 text-white'
                                    : status === 'warn' ? 'bg-yellow-500 text-white'
                                    : 'bg-red-500 text-white'
                                  : 'bg-neutral-100 text-neutral-400 hover:bg-neutral-200'
                              }`}
                            >
                              {status === 'ok' ? <CheckCircle size={15} /> : status === 'warn' ? <AlertTriangle size={15} /> : <XCircle size={15} />}
                            </button>
                          ))}
                        </div>
                      </div>
                      <input
                        type="text"
                        placeholder="Примітка..."
                        value={item?.note || ''}
                        onChange={e => setDiagnosisForm({
                          ...diagnosisForm,
                          [diagKey]: { ...item, note: e.target.value }
                        })}
                        className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-[#ffcc00] text-sm"
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="p-5 border-t bg-neutral-50 flex gap-3 justify-end shrink-0">
              <button onClick={() => setActiveModal(null)} className="px-5 py-2 rounded-lg text-neutral-600 hover:bg-neutral-100 font-medium">
                Скасувати
              </button>
              <button onClick={saveDiagnosis} className="bg-[#ffcc00] text-black px-6 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-[#e6b800]">
                <Save size={18} /> Зберегти
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Document Log Modal ── */}
      {activeModal === 'log' && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-5 border-b bg-neutral-50 flex items-center justify-between shrink-0">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <History className="text-[#ffcc00]" size={20} /> Журнал документів
              </h3>
              <button onClick={() => setActiveModal(null)} className="text-neutral-400 hover:text-neutral-600"><X size={20} /></button>
            </div>

            <div className="overflow-y-auto overflow-x-auto flex-1">
              {log.length === 0 ? (
                <div className="p-16 text-center text-neutral-400">
                  <History size={48} className="mx-auto mb-3 opacity-30" />
                  <p>Журнал порожній</p>
                </div>
              ) : (
                <table className="w-full text-sm min-w-[600px]">
                  <thead className="bg-neutral-50 text-neutral-500 text-[10px] uppercase font-bold border-b sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left">Час</th>
                      <th className="px-4 py-3 text-left">Замовлення</th>
                      <th className="px-4 py-3 text-left">Дія</th>
                      <th className="px-4 py-3 text-left">Деталі</th>
                      <th className="px-4 py-3 text-left">Користувач</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {log.map(entry => (
                      <tr key={entry.id} className="hover:bg-neutral-50">
                        <td className="px-4 py-3 text-neutral-400 text-xs">
                          {format(new Date(entry.timestamp), 'dd.MM.yyyy HH:mm:ss')}
                        </td>
                        <td className="px-4 py-3 font-mono font-bold text-xs">{entry.orderId}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${
                            entry.action === 'created' ? 'bg-green-100 text-green-700' :
                            entry.action === 'deleted' ? 'bg-red-100 text-red-700' :
                            entry.action === 'paid' ? 'bg-blue-100 text-blue-700' :
                            entry.action === 'cancelled' ? 'bg-red-100 text-red-700' :
                            entry.action === 'payment_cancelled' ? 'bg-orange-100 text-orange-700' :
                            'bg-neutral-100 text-neutral-700'
                          }`}>
                            {actionIcon(entry.action)} {actionLabel(entry.action)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-neutral-600 text-xs">{entry.details}</td>
                        <td className="px-4 py-3 text-neutral-500 text-xs flex items-center gap-1">
                          <Eye size={10} /> {entry.userName}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="p-4 border-t bg-neutral-50 flex justify-between items-center shrink-0">
              <p className="text-xs text-neutral-400">{log.length} записів (останні 500)</p>
              <button
                onClick={() => {
                  const csv = ['Час,Замовлення,Дія,Деталі,Користувач', ...log.map(e =>
                    `${format(new Date(e.timestamp), 'dd.MM.yyyy HH:mm:ss')},${e.orderId},${actionLabel(e.action)},"${e.details}",${e.userName}`
                  )].join('\n');
                  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
                  const link = document.createElement('a');
                  link.href = URL.createObjectURL(blob);
                  link.download = `doc_log_${format(new Date(), 'yyyyMMdd')}.csv`;
                  link.click();
                }}
                className="bg-neutral-900 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2"
              >
                <Clock size={14} /> Експорт CSV
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Quick Add Client Modal ── */}
      {showAddClientModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="p-5 border-b bg-neutral-50 flex items-center justify-between">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <User className="text-[#ffcc00]" size={20} /> Новий клієнт
              </h3>
              <button onClick={() => setShowAddClientModal(false)} className="text-neutral-400 hover:text-neutral-600">
                <X size={20} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Ім'я *</label>
                  <input
                    type="text"
                    value={quickClientForm.name}
                    onChange={e => setQuickClientForm({ ...quickClientForm, name: e.target.value })}
                    className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-[#ffcc00]"
                    placeholder="Повне ім'я клієнта"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Телефон *</label>
                  <input
                    type="tel"
                    value={quickClientForm.phone}
                    onChange={e => setQuickClientForm({ ...quickClientForm, phone: e.target.value })}
                    className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-[#ffcc00]"
                    placeholder="+380..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={quickClientForm.email || ''}
                    onChange={e => setQuickClientForm({ ...quickClientForm, email: e.target.value })}
                    className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-[#ffcc00]"
                    placeholder="email@example.com"
                  />
                </div>
              </div>
              <div className="pt-2 border-t">
                <h4 className="font-bold text-sm text-neutral-600 mb-3 flex items-center gap-2">
                  <Car size={16} /> Автомобіль
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">Марка</label>
                    <select
                      value={quickClientForm.car.make}
                      onChange={e => setQuickClientForm({ ...quickClientForm, car: { ...quickClientForm.car, make: e.target.value, model: '' } })}
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
                      value={quickClientForm.car.model}
                      onChange={e => setQuickClientForm({ ...quickClientForm, car: { ...quickClientForm.car, model: e.target.value } })}
                      className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-[#ffcc00]"
                      disabled={!quickClientForm.car.make}
                    >
                      <option value="">Оберіть модель...</option>
                      {(db.vehicleMakes.find(vm => vm.make === quickClientForm.car.make)?.models || []).map(m => (
                        <option key={m.id} value={m.name}>{m.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">Рік</label>
                    <input
                      type="number"
                      value={quickClientForm.car.year}
                      onChange={e => setQuickClientForm({ ...quickClientForm, car: { ...quickClientForm.car, year: Number(e.target.value) } })}
                      className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-[#ffcc00]"
                      placeholder="2020"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">Держ. номер</label>
                    <input
                      type="text"
                      value={quickClientForm.car.plate}
                      onChange={e => setQuickClientForm({ ...quickClientForm, car: { ...quickClientForm.car, plate: e.target.value.toUpperCase() } })}
                      className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-[#ffcc00] font-mono"
                      placeholder="AX1234AB"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-neutral-700 mb-1">VIN-код</label>
                    <input
                      type="text"
                      value={quickClientForm.car.vin}
                      onChange={e => setQuickClientForm({ ...quickClientForm, car: { ...quickClientForm.car, vin: e.target.value.toUpperCase() } })}
                      className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-[#ffcc00] font-mono"
                      placeholder="17-значний VIN"
                      maxLength={17}
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="p-5 border-t bg-neutral-50 flex gap-3 justify-end">
              <button
                onClick={() => setShowAddClientModal(false)}
                className="px-5 py-2 rounded-lg font-medium text-neutral-600 hover:bg-neutral-100"
              >
                Скасувати
              </button>
              <button
                onClick={handleQuickAddClient}
                className="bg-[#ffcc00] text-black px-5 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-[#e6b800]"
              >
                <Save size={16} /> Додати та вибрати
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
