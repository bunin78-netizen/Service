import { useState } from 'react';
import { AppData, WorkOrder, DiagnosticCard } from '../types';
import {
  Stethoscope, Search, CheckCircle, AlertTriangle, XCircle,
  Printer, Save, X, Send, Loader, Car, User, Calendar,
  Wrench, Eye, ChevronDown, ChevronUp,
} from 'lucide-react';
import { format } from 'date-fns';
import { sendTelegramDiagnosticCard } from './Telegram';

interface DiagnosisProps {
  data: AppData;
  updateData: (d: Partial<AppData>) => void;
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

type SendStatus = 'idle' | 'loading' | 'success' | 'error';

export default function Diagnosis({ data, updateData }: DiagnosisProps) {

  const [searchTerm, setSearchTerm] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [diagnosisForm, setDiagnosisForm] = useState<DiagnosticCard>(emptyDiagnosis);
  const [sendStatus, setSendStatus] = useState<Record<string, SendStatus>>({});
  const [showSendModal, setShowSendModal] = useState(false);
  const [sendOrderId, setSendOrderId] = useState<string | null>(null);
  const [sendChatId, setSendChatId] = useState('');

  // Work orders with diagnostic cards only
  const diagnosisOrders = data.workOrders.filter(o => !!o.diagnosis);

  const filtered = diagnosisOrders.filter(o => {
    const client = data.clients.find(c => c.id === o.clientId);
    const term = searchTerm.toLowerCase();
    return (
      !term ||
      o.id.toLowerCase().includes(term) ||
      client?.name.toLowerCase().includes(term) ||
      client?.car.plate?.toLowerCase().includes(term) ||
      client?.car.make?.toLowerCase().includes(term) ||
      client?.car.model?.toLowerCase().includes(term)
    );
  });

  const getStatusCount = (status: 'ok' | 'warn' | 'crit', order: WorkOrder) => {
    if (!order.diagnosis) return 0;
    return Object.entries(order.diagnosis)
      .filter(([k]) => k !== 'masterId' && k !== 'date')
      .filter(([, v]) => (v as { status: string }).status === status).length;
  };

  const openEditModal = (orderId: string) => {
    const order = data.workOrders.find(o => o.id === orderId);
    setEditingOrderId(orderId);
    setDiagnosisForm(
      order?.diagnosis
        ? { ...order.diagnosis }
        : { ...emptyDiagnosis, masterId: order?.masterId || '', date: format(new Date(), 'yyyy-MM-dd') }
    );
    setShowEditModal(true);
  };

  const saveDiagnosis = () => {
    if (!editingOrderId) return;
    const updated = data.workOrders.map(o =>
      o.id === editingOrderId ? { ...o, diagnosis: diagnosisForm } : o
    );
    updateData({ workOrders: updated });
    setShowEditModal(false);
  };

  const handlePrint = (order: WorkOrder) => {
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
      <strong>Умовні позначення:</strong>&nbsp;
      <span style="color:#22c55e">● НОРМА</span> — задовільний стан;&nbsp;
      <span style="color:#f59e0b">● УВАГА</span> — потребує уваги;&nbsp;
      <span style="color:#ef4444">● КРИТИЧНО</span> — термінове втручання
    </div>
    <div style="display:flex;justify-content:space-between;margin-top:40px">
      <div style="width:200px;border-top:1px solid #000;text-align:center;font-size:11px;padding-top:5px">Майстер (${master?.name || ''})</div>
      <div style="width:200px;border-top:1px solid #000;text-align:center;font-size:11px;padding-top:5px">Власник (${client?.name || ''})</div>
    </div>
    </body></html>`);
    w.document.close();
    w.print();
  };

  const openSendModal = (orderId: string) => {
    setSendOrderId(orderId);
    setSendChatId('');
    setShowSendModal(true);
  };

  const handleSendTelegram = async () => {
    if (!sendOrderId) return;
    const order = data.workOrders.find(o => o.id === sendOrderId);
    const tg = data.telegramSettings;
    if (!tg?.enabled || !tg.botToken) return;
    if (!sendChatId.trim() && !tg.chatId) return;

    const client = data.clients.find(c => c.id === order?.clientId);
    const master = data.employees.find(e => e.id === (order?.diagnosis?.masterId || order?.masterId));
    const cs = data.companySettings;
    const diag = order?.diagnosis;
    if (!order || !diag) return;

    setSendStatus(s => ({ ...s, [sendOrderId]: 'loading' }));

    const items = Object.entries(diag)
      .filter(([k]) => k !== 'masterId' && k !== 'date')
      .map(([k, v]) => ({
        label: diagnosisLabels[k] || k,
        status: (v as DiagnosticCard['engine']).status,
        note: (v as DiagnosticCard['engine']).note,
      }));

    const ok = await sendTelegramDiagnosticCard(
      tg,
      {
        orderId: order.id,
        clientName: client?.name || '-',
        carInfo: client?.car
          ? `${client.car.make} ${client.car.model} (${client.car.year}) ${client.car.plate}`
          : '-',
        date: format(new Date(diag.date || order.date), 'dd.MM.yyyy'),
        masterName: master?.name || '-',
        companyName: cs.name,
        companyPhone: cs.phone,
        items,
      },
      sendChatId.trim() || undefined
    );

    setSendStatus(s => ({ ...s, [sendOrderId]: ok ? 'success' : 'error' }));
    setTimeout(() => setSendStatus(s => ({ ...s, [sendOrderId]: 'idle' })), 4000);
    setShowSendModal(false);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-neutral-800 flex items-center gap-2">
            <Stethoscope size={22} className="text-[#ffcc00]" />
            Діагностика
          </h2>
          <p className="text-sm text-neutral-500 mt-0.5">
            Діагностичні карти автомобілів ({diagnosisOrders.length})
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="Пошук за клієнтом, авто, номером..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#ffcc00]"
          />
        </div>
      </div>

      {/* Summary stats */}
      {diagnosisOrders.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
            <CheckCircle size={20} className="text-green-500 mx-auto mb-1" />
            <p className="text-lg font-black text-green-700">
              {diagnosisOrders.reduce((acc, o) => acc + getStatusCount('ok', o), 0)}
            </p>
            <p className="text-xs text-green-600 font-medium">НОРМА</p>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-center">
            <AlertTriangle size={20} className="text-yellow-500 mx-auto mb-1" />
            <p className="text-lg font-black text-yellow-700">
              {diagnosisOrders.reduce((acc, o) => acc + getStatusCount('warn', o), 0)}
            </p>
            <p className="text-xs text-yellow-600 font-medium">УВАГА</p>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center">
            <XCircle size={20} className="text-red-500 mx-auto mb-1" />
            <p className="text-lg font-black text-red-700">
              {diagnosisOrders.reduce((acc, o) => acc + getStatusCount('crit', o), 0)}
            </p>
            <p className="text-xs text-red-600 font-medium">КРИТИЧНО</p>
          </div>
        </div>
      )}

      {/* Cards list */}
      {filtered.length === 0 ? (
        <div className="py-20 text-center text-neutral-400">
          <Stethoscope size={48} className="mx-auto mb-4 opacity-30" />
          <p className="font-bold text-lg">
            {searchTerm ? 'Нічого не знайдено' : 'Немає діагностичних карт'}
          </p>
          <p className="text-sm mt-1">
            {searchTerm
              ? 'Спробуйте змінити запит'
              : 'Діагностичні карти можна заповнити у розділі «Наряд-замовлення»'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(order => {
            const client = data.clients.find(c => c.id === order.clientId);
            const master = data.employees.find(e => e.id === (order.diagnosis?.masterId || order.masterId));
            const diag = order.diagnosis!;
            const diagEntries = Object.entries(diag).filter(([k]) => k !== 'masterId' && k !== 'date');
            const okCount = diagEntries.filter(([, v]) => (v as { status: string }).status === 'ok').length;
            const warnCount = diagEntries.filter(([, v]) => (v as { status: string }).status === 'warn').length;
            const critCount = diagEntries.filter(([, v]) => (v as { status: string }).status === 'crit').length;
            const isExpanded = expandedId === order.id;
            const st = sendStatus[order.id] || 'idle';
            const telegramEnabled = data.telegramSettings?.enabled && data.telegramSettings?.botToken;

            return (
              <div key={order.id} className="bg-white rounded-2xl border shadow-sm overflow-hidden">
                {/* Card header */}
                <div className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                  {/* Left info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-black text-sm text-neutral-800">#{order.id}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUS_COLORS[order.status]}`}>
                        {STATUS_LABELS[order.status]}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-neutral-600">
                      <span className="flex items-center gap-1.5">
                        <User size={13} className="text-neutral-400" />
                        {client?.name || '—'}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Car size={13} className="text-neutral-400" />
                        {client?.car
                          ? `${client.car.make} ${client.car.model} (${client.car.year}) · ${client.car.plate}`
                          : '—'}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Calendar size={13} className="text-neutral-400" />
                        {diag.date
                          ? format(new Date(diag.date), 'dd.MM.yyyy')
                          : format(new Date(order.date), 'dd.MM.yyyy')}
                      </span>
                      {master && (
                        <span className="flex items-center gap-1.5">
                          <Wrench size={13} className="text-neutral-400" />
                          {master.name}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Status badges */}
                  <div className="flex items-center gap-2 shrink-0">
                    {okCount > 0 && (
                      <span className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-lg text-xs font-bold">
                        <CheckCircle size={12} /> {okCount}
                      </span>
                    )}
                    {warnCount > 0 && (
                      <span className="flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 rounded-lg text-xs font-bold">
                        <AlertTriangle size={12} /> {warnCount}
                      </span>
                    )}
                    {critCount > 0 && (
                      <span className="flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-lg text-xs font-bold">
                        <XCircle size={12} /> {critCount}
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0 flex-wrap">
                    <button
                      onClick={() => openEditModal(order.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-lg text-xs font-bold transition-colors"
                    >
                      <Stethoscope size={13} /> Редагувати
                    </button>
                    <button
                      onClick={() => handlePrint(order)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-lg text-xs font-bold transition-colors"
                    >
                      <Printer size={13} /> Друк
                    </button>
                    {telegramEnabled && (
                      <button
                        onClick={() => openSendModal(order.id)}
                        disabled={st === 'loading'}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                          st === 'success'
                            ? 'bg-green-100 text-green-700'
                            : st === 'error'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-blue-100 hover:bg-blue-200 text-blue-700'
                        }`}
                      >
                        {st === 'loading' ? (
                          <Loader size={13} className="animate-spin" />
                        ) : (
                          <Send size={13} />
                        )}
                        {st === 'success' ? 'Надіслано' : st === 'error' ? 'Помилка' : 'Telegram'}
                      </button>
                    )}
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : order.id)}
                      className="flex items-center gap-1 px-2 py-1.5 text-neutral-400 hover:text-neutral-600 text-xs font-bold transition-colors"
                    >
                      {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                      <Eye size={13} />
                    </button>
                  </div>
                </div>

                {/* Expanded detailed view */}
                {isExpanded && (
                  <div className="border-t bg-neutral-50 p-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      {diagEntries.map(([key, value]) => {
                        const v = value as { status: 'ok' | 'warn' | 'crit'; note: string };
                        return (
                          <div
                            key={key}
                            className={`p-3 rounded-xl border-2 ${
                              v.status === 'ok'
                                ? 'border-green-200 bg-green-50'
                                : v.status === 'warn'
                                ? 'border-yellow-200 bg-yellow-50'
                                : 'border-red-200 bg-red-50'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1.5">
                              <p className="text-[11px] text-neutral-500 uppercase font-bold leading-tight">
                                {diagnosisLabels[key]}
                              </p>
                              {v.status === 'ok' && <CheckCircle size={16} className="text-green-500 shrink-0" />}
                              {v.status === 'warn' && <AlertTriangle size={16} className="text-yellow-500 shrink-0" />}
                              {v.status === 'crit' && <XCircle size={16} className="text-red-500 shrink-0" />}
                            </div>
                            <span
                              className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold mb-1.5 ${
                                v.status === 'ok'
                                  ? 'bg-green-500 text-white'
                                  : v.status === 'warn'
                                  ? 'bg-yellow-500 text-white'
                                  : 'bg-red-500 text-white'
                              }`}
                            >
                              {v.status === 'ok' ? 'НОРМА' : v.status === 'warn' ? 'УВАГА' : 'КРИТИЧНО'}
                            </span>
                            {v.note && (
                              <p className="text-xs text-neutral-600 leading-snug">{v.note}</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Edit Diagnosis Modal ── */}
      {showEditModal && editingOrderId && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-5 border-b bg-neutral-50 flex items-center justify-between shrink-0">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <Stethoscope className="text-[#ffcc00]" size={20} /> Діагностична карта
              </h3>
              <button onClick={() => setShowEditModal(false)} className="text-neutral-400 hover:text-neutral-600">
                <X size={20} />
              </button>
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
                              onClick={() =>
                                setDiagnosisForm({
                                  ...diagnosisForm,
                                  [diagKey]: { ...item, status },
                                })
                              }
                              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                                item?.status === status
                                  ? status === 'ok'
                                    ? 'bg-green-500 text-white'
                                    : status === 'warn'
                                    ? 'bg-yellow-500 text-white'
                                    : 'bg-red-500 text-white'
                                  : 'bg-neutral-100 text-neutral-400 hover:bg-neutral-200'
                              }`}
                            >
                              {status === 'ok' ? (
                                <CheckCircle size={15} />
                              ) : status === 'warn' ? (
                                <AlertTriangle size={15} />
                              ) : (
                                <XCircle size={15} />
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                      <input
                        type="text"
                        placeholder="Примітка..."
                        value={item?.note || ''}
                        onChange={e =>
                          setDiagnosisForm({
                            ...diagnosisForm,
                            [diagKey]: { ...item, note: e.target.value },
                          })
                        }
                        className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-[#ffcc00] text-sm"
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="p-5 border-t bg-neutral-50 flex gap-3 justify-end shrink-0">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-5 py-2 rounded-lg text-neutral-600 hover:bg-neutral-100 font-medium"
              >
                Скасувати
              </button>
              <button
                onClick={saveDiagnosis}
                className="bg-[#ffcc00] text-black px-6 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-[#e6b800]"
              >
                <Save size={18} /> Зберегти
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Send via Telegram Modal ── */}
      {showSendModal && sendOrderId && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-5 border-b bg-neutral-50 flex items-center justify-between">
              <h3 className="font-bold text-base flex items-center gap-2">
                <Send className="text-blue-500" size={18} /> Надіслати у Telegram
              </h3>
              <button onClick={() => setShowSendModal(false)} className="text-neutral-400 hover:text-neutral-600">
                <X size={20} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-sm text-neutral-600">
                Введіть Telegram Chat ID клієнта. Якщо залишити порожнім — карта буде надіслана у головний чат бота.
              </p>
              <div>
                <label className="block text-sm font-bold text-neutral-600 mb-1">
                  Chat ID клієнта (необов'язково)
                </label>
                <input
                  type="text"
                  placeholder="Наприклад: 123456789"
                  value={sendChatId}
                  onChange={e => setSendChatId(e.target.value)}
                  className="w-full p-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-blue-400 text-sm"
                />
              </div>
              {!data.telegramSettings?.enabled && (
                <p className="text-xs text-red-500 bg-red-50 p-2 rounded-lg">
                  Telegram не налаштований. Перейдіть до розділу «Telegram Бот».
                </p>
              )}
            </div>
            <div className="p-5 border-t bg-neutral-50 flex gap-3 justify-end">
              <button
                onClick={() => setShowSendModal(false)}
                className="px-5 py-2 rounded-lg text-neutral-600 hover:bg-neutral-100 font-medium text-sm"
              >
                Скасувати
              </button>
              <button
                onClick={handleSendTelegram}
                disabled={!data.telegramSettings?.enabled}
                className="bg-blue-600 text-white px-5 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                <Send size={15} /> Надіслати
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
