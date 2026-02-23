import { useState, useEffect, useCallback } from 'react';
import { AppData } from '../types';
import {
  Printer, CheckCircle, AlertCircle, Loader2, Receipt, Settings,
  Wifi, WifiOff, DollarSign, CreditCard, Building, X,
  FileText, Clock, TrendingUp, Hash, ShieldCheck, Zap, Eye,
  Download, ChevronDown, ChevronUp, RefreshCw, Send, Loader
} from 'lucide-react';
import { format } from 'date-fns';
import { sendTelegramFiscalReceipt } from './Telegram';

// ─── Types ─────────────────────────────────────────────────────────────────────
type RROProvider = {
  id: string;
  name: string;
  displayName: string;
  logo: string;
  color: string;
  website: string;
  description: string;
  apiEndpoint: string;
  features: string[];
};

type FiscalReceipt = {
  id: string;
  orderId: string;
  clientName: string;
  amount: number;
  paymentType: 'Cash' | 'Card' | 'Bank';
  fiscalNumber: string;
  checkNumber: string;
  qrCode: string;
  dateTime: string;
  status: 'success' | 'error' | 'pending';
  provider: string;
  cashier: string;
  items: { name: string; qty: number; price: number }[];
};

type RROSettings = {
  enabled: boolean;
  providerId: string;
  licenseKey: string;
  deviceId: string;
  cashierId: string;
  cashierName: string;
  offlineMode: boolean;
  autoFiscalize: boolean;
  printReceipt: boolean;
  sendSMS: boolean;
  sendEmail: boolean;
};

// Persistent shift state stored in localStorage
type ShiftState = {
  isOpen: boolean;
  startTime: string | null;
  openedBy: string;
};

const PROVIDERS: RROProvider[] = [
  {
    id: 'privatbank',
    name: 'privatbank',
    displayName: 'ПриватБанк Еквайринг',
    logo: '🏦',
    color: '#16a34a',
    website: 'https://privatbank.ua/business/ekvajryng',
    description: 'Інтеграція з еквайрингом ПриватБанку для прийому карткових оплат та безготівкових платежів у звʼязці з ПРРО.',
    apiEndpoint: 'https://api.privatbank.ua/p24api',
    features: ['Оплата карткою', 'Підтвердження транзакцій', 'Платежі за QR', 'API інтеграція', 'Підтримка бізнес-рахунків'],
  },
  {
    id: 'monobank',
    name: 'monobank',
    displayName: 'Monobank Еквайринг',
    logo: '🖤',
    color: '#111827',
    website: 'https://monobank.ua/acquiring',
    description: 'Інтеграція з Monobank для онлайн/офлайн прийому оплат, роботи з інвойсами та перевірки статусів платежів.',
    apiEndpoint: 'https://api.monobank.ua',
    features: ['Інвойси mono', 'Webhooks подій', 'Швидкі виплати', 'Оплата через QR', 'API для автоматизації'],
  },
  {
    id: 'checkbox',
    name: 'checkbox',
    displayName: 'Checkbox',
    logo: '☑️',
    color: '#10b981',
    website: 'https://checkbox.ua',
    description: 'Checkbox — провідний ПРРО в Україні. Простий у використанні, підтримує офлайн-режим та всі типи розрахунків.',
    apiEndpoint: 'https://api.checkbox.ua/api/v1',
    features: ['Офлайн режим', 'QR-код чек', 'SMS/Email чек', 'API інтеграція', 'Мобільний додаток'],
  },
  {
    id: 'vchasno',
    name: 'vchasno',
    displayName: 'Вчасно Каса',
    logo: '🕐',
    color: '#2563eb',
    website: 'https://vchasno.ua',
    description: 'Вчасно Каса — зручний ПРРО від команди Вчасно. Повна інтеграція з ДПС, хмарне рішення.',
    apiEndpoint: 'https://api.vchasno.ua/rro/v1',
    features: ['Хмарний ПРРО', 'Інтеграція 1C', 'Мультикасир', 'Звіти ДПС', 'Зручний інтерфейс'],
  },
  {
    id: 'taxer',
    name: 'taxer',
    displayName: 'Taxer',
    logo: '💼',
    color: '#7c3aed',
    website: 'https://taxer.ua',
    description: 'Taxer — комплексне рішення для бухгалтерії та фіскалізації. Підходить для автосервісів.',
    apiEndpoint: 'https://api.taxer.ua/v2/rro',
    features: ['Бухоблік + РРО', 'Звітність ДПС', 'Кілька кас', 'Хмарне рішення', 'Підтримка 24/7'],
  },
  {
    id: 'dps',
    name: 'dps',
    displayName: 'Каса ДПС',
    logo: '🏛️',
    color: '#f59e0b',
    website: 'https://cabinet.tax.gov.ua',
    description: 'Офіційне безкоштовне ПРРО від Державної податкової служби України.',
    apiEndpoint: 'https://api-rro.tax.gov.ua/api/v1',
    features: ['Безкоштовно', 'Від ДПС', 'Гарантія легальності', 'Підтримка ДПС', 'Пряма інтеграція'],
  },
];

// ─── Storage Keys ──────────────────────────────────────────────────────────────
const RRO_KEY = 'smartkharkov_rro';
const RECEIPTS_KEY = 'smartkharkov_fiscal_receipts';
const SHIFT_KEY = 'smartkharkov_rro_shift';
const CONNECTION_KEY = 'smartkharkov_rro_connection';

// ─── Helpers ───────────────────────────────────────────────────────────────────
function loadRROSettings(): RROSettings {
  const saved = localStorage.getItem(RRO_KEY);
  if (saved) {
    try { return JSON.parse(saved); } catch { /* fall through */ }
  }
  return {
    enabled: false,
    providerId: 'checkbox',
    licenseKey: '',
    deviceId: '',
    cashierId: '',
    cashierName: '',
    offlineMode: false,
    autoFiscalize: true,
    printReceipt: true,
    sendSMS: false,
    sendEmail: false,
  };
}

function saveRROSettings(s: RROSettings) {
  localStorage.setItem(RRO_KEY, JSON.stringify(s));
}

function loadReceipts(): FiscalReceipt[] {
  const saved = localStorage.getItem(RECEIPTS_KEY);
  if (saved) { try { return JSON.parse(saved); } catch { return []; } }
  return [];
}

function saveReceipts(receipts: FiscalReceipt[]) {
  localStorage.setItem(RECEIPTS_KEY, JSON.stringify(receipts));
}

function loadShiftState(): ShiftState {
  const saved = localStorage.getItem(SHIFT_KEY);
  if (saved) { try { return JSON.parse(saved); } catch { /* fall */ } }
  return { isOpen: false, startTime: null, openedBy: '' };
}

function saveShiftState(state: ShiftState) {
  localStorage.setItem(SHIFT_KEY, JSON.stringify(state));
}

function loadConnectionStatus(): 'idle' | 'online' | 'offline' {
  const saved = localStorage.getItem(CONNECTION_KEY);
  if (saved === 'online' || saved === 'offline') return saved;
  return 'idle';
}

function saveConnectionStatus(status: string) {
  localStorage.setItem(CONNECTION_KEY, status);
}

function generateFiscalNumber(): string {
  const date = format(new Date(), 'yyyyMMdd');
  const rand = Math.floor(Math.random() * 999999).toString().padStart(6, '0');
  return `${date}${rand}`;
}

function generateCheckNumber(): string {
  return Math.floor(Math.random() * 9999999).toString().padStart(7, '0');
}

// ─── Main Component ─────────────────────────────────────────────────────────
interface Props {
  data: AppData;
  updateData: (d: Partial<AppData>) => void;
}

type ViewTab = 'dashboard' | 'receipts' | 'settings' | 'shift';

export default function RROPage({ data, updateData }: Props) {
  const [activeTab, setActiveTab] = useState<ViewTab>('dashboard');

  // ── All persistent state loaded from localStorage ────────────────────────
  const [settings, setSettings] = useState<RROSettings>(() => loadRROSettings());
  const [receipts, setReceipts] = useState<FiscalReceipt[]>(() => loadReceipts());
  const [shiftState, setShiftState] = useState<ShiftState>(() => loadShiftState());
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'checking' | 'online' | 'offline'>(
    () => loadConnectionStatus()
  );

  // ── UI-only state (not persisted) ─────────────────────────────────────────
  const [saved, setSaved] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<FiscalReceipt | null>(null);
  const [fiscalizingId, setFiscalizingId] = useState<string | null>(null);
  const [expandedProvider, setExpandedProvider] = useState<string | null>(null);
  const [xReportLoading, setXReportLoading] = useState(false);
  const [filterPayment, setFilterPayment] = useState<'all' | 'Cash' | 'Card' | 'Bank'>('all');
  const [fiscalTgStatus, setFiscalTgStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [manualPayment, setManualPayment] = useState({
    description: '',
    amount: 0,
    paymentType: 'Cash' as 'Cash' | 'Card' | 'Bank',
    clientName: '',
  });

  // ── Persist settings whenever they change ────────────────────────────────
  useEffect(() => {
    saveRROSettings(settings);
  }, [settings]);

  // ── Persist receipts whenever they change ────────────────────────────────
  useEffect(() => {
    saveReceipts(receipts);
  }, [receipts]);

  // ── Persist shift state whenever it changes ──────────────────────────────
  useEffect(() => {
    saveShiftState(shiftState);
  }, [shiftState]);

  // ── Persist connection status whenever it changes ────────────────────────
  useEffect(() => {
    if (connectionStatus !== 'checking') {
      saveConnectionStatus(connectionStatus);
    }
  }, [connectionStatus]);

  const currentProvider = PROVIDERS.find(p => p.id === settings.providerId) || PROVIDERS[0];

  const handleSaveSettings = () => {
    saveRROSettings(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  // ── Connection check ──────────────────────────────────────────────────────
  const checkConnection = useCallback(async () => {
    setConnectionStatus('checking');
    await new Promise(r => setTimeout(r, 1500));
    const connected = !!(settings.licenseKey || settings.deviceId);
    const newStatus = connected ? 'online' : 'offline';
    setConnectionStatus(newStatus);
    saveConnectionStatus(newStatus);
  }, [settings.licenseKey, settings.deviceId]);

  // ── Shift management ──────────────────────────────────────────────────────
  const openShift = () => {
    const newState: ShiftState = {
      isOpen: true,
      startTime: new Date().toISOString(),
      openedBy: data.companySettings.managerName || 'Касир',
    };
    setShiftState(newState);
    saveShiftState(newState);
  };

  const closeShift = () => {
    if (!confirm('Закрити зміну? Буде сформований Z-звіт.')) return;

    // Receipts within this shift
    const shiftStart = shiftState.startTime;
    const shiftReceipts = shiftStart
      ? receipts.filter(r => r.dateTime >= shiftStart && r.orderId !== 'Z-ЗВІТ')
      : receipts.filter(r => r.orderId !== 'Z-ЗВІТ');

    const shiftTotal = shiftReceipts.reduce((acc, r) => acc + r.amount, 0);

    const zReport: FiscalReceipt = {
      id: Math.random().toString(36).substr(2, 9),
      orderId: 'Z-ЗВІТ',
      clientName: 'Закриття зміни',
      amount: shiftTotal,
      paymentType: 'Cash',
      fiscalNumber: generateFiscalNumber(),
      checkNumber: generateCheckNumber(),
      qrCode: `https://cabinet.tax.gov.ua/cashregs/check?fn=${generateFiscalNumber()}`,
      dateTime: new Date().toISOString(),
      status: 'success',
      provider: currentProvider.displayName,
      cashier: settings.cashierName || shiftState.openedBy || 'Касир',
      items: [
        { name: `Z-ЗВІТ. Загальна сума за зміну (${shiftReceipts.length} чеків)`, qty: 1, price: shiftTotal },
      ],
    };

    const updated = [zReport, ...receipts];
    setReceipts(updated);

    const closedState: ShiftState = { isOpen: false, startTime: null, openedBy: '' };
    setShiftState(closedState);
  };

  // ── Fiscalize from queue ──────────────────────────────────────────────────
  const fiscalizeOrder = async (orderId: string) => {
    if (!settings.enabled) {
      alert('Увімкніть ПРРО у налаштуваннях!');
      return;
    }
    const order = data.workOrders.find(o => o.id === orderId);
    if (!order) return;
    const client = data.clients.find(c => c.id === order.clientId);

    setFiscalizingId(orderId);
    await new Promise(r => setTimeout(r, 1800));

    const fiscalNum = generateFiscalNumber();
    const receipt: FiscalReceipt = {
      id: Math.random().toString(36).substr(2, 9),
      orderId,
      clientName: client?.name || 'Клієнт',
      amount: order.total,
      paymentType: order.paymentType,
      fiscalNumber: fiscalNum,
      checkNumber: generateCheckNumber(),
      qrCode: `https://cabinet.tax.gov.ua/cashregs/check?fn=${fiscalNum}`,
      dateTime: new Date().toISOString(),
      status: 'success',
      provider: currentProvider.displayName,
      cashier: settings.cashierName || 'Касир',
      items: [
        ...order.services.map(s => ({ name: s.name, qty: 1, price: s.price })),
        ...order.parts.map(p => {
          const part = data.inventory.find(i => i.id === p.partId);
          return { name: part?.name || 'Запчастина', qty: p.quantity, price: p.price };
        }),
      ],
    };

    const updated = [receipt, ...receipts];
    setReceipts(updated);
    setFiscalizingId(null);

    // Mark order as paid
    const updatedOrders = data.workOrders.map(o =>
      o.id === orderId ? { ...o, isPaid: true } : o
    );
    updateData({ workOrders: updatedOrders });

    // Auto-send fiscal receipt via Telegram if enabled
    if (data.telegramSettings?.sendFiscalReceipts) {
      const cs = data.companySettings;
      sendTelegramFiscalReceipt(data.telegramSettings, {
        orderId: receipt.orderId,
        clientName: receipt.clientName,
        amount: receipt.amount,
        paymentType: receipt.paymentType,
        fiscalNumber: receipt.fiscalNumber,
        checkNumber: receipt.checkNumber,
        qrCode: receipt.qrCode,
        dateTime: receipt.dateTime,
        provider: receipt.provider,
        cashier: receipt.cashier,
        companyName: cs.name,
        companyAddress: cs.address,
        edrpou: cs.edrpou,
        items: receipt.items,
      });
    }

    setSelectedReceipt(receipt);
    setShowReceiptModal(true);
  };

  // ── Manual receipt ────────────────────────────────────────────────────────
  const handleManualFiscalize = async () => {
    if (!settings.enabled) { alert('Увімкніть ПРРО у налаштуваннях!'); return; }
    if (!manualPayment.description || manualPayment.amount <= 0) return;

    const fiscalNum = generateFiscalNumber();
    const receipt: FiscalReceipt = {
      id: Math.random().toString(36).substr(2, 9),
      orderId: 'РУЧНИЙ ЧЕК',
      clientName: manualPayment.clientName || 'Клієнт',
      amount: manualPayment.amount,
      paymentType: manualPayment.paymentType,
      fiscalNumber: fiscalNum,
      checkNumber: generateCheckNumber(),
      qrCode: `https://cabinet.tax.gov.ua/cashregs/check?fn=${fiscalNum}`,
      dateTime: new Date().toISOString(),
      status: 'success',
      provider: currentProvider.displayName,
      cashier: settings.cashierName || 'Касир',
      items: [{ name: manualPayment.description, qty: 1, price: manualPayment.amount }],
    };

    const updated = [receipt, ...receipts];
    setReceipts(updated);
    setManualPayment({ description: '', amount: 0, paymentType: 'Cash', clientName: '' });
    setSelectedReceipt(receipt);
    setShowReceiptModal(true);
  };

  // ── Send fiscal receipt to Telegram ──────────────────────────────────────
  const handleSendFiscalReceiptToTelegram = async (receipt: FiscalReceipt) => {
    const tg = data.telegramSettings;
    if (!tg?.enabled || !tg.botToken || !tg.chatId) return;
    const cs = data.companySettings;
    setFiscalTgStatus('loading');
    const ok = await sendTelegramFiscalReceipt(
      tg,
      {
        orderId: receipt.orderId,
        clientName: receipt.clientName,
        amount: receipt.amount,
        paymentType: receipt.paymentType,
        fiscalNumber: receipt.fiscalNumber,
        checkNumber: receipt.checkNumber,
        qrCode: receipt.qrCode,
        dateTime: receipt.dateTime,
        provider: receipt.provider,
        cashier: receipt.cashier,
        companyName: cs.name,
        companyAddress: cs.address,
        edrpou: cs.edrpou,
        items: receipt.items,
      }
    );
    setFiscalTgStatus(ok ? 'success' : 'error');
    setTimeout(() => setFiscalTgStatus('idle'), 4000);
  };

  // ── Print receipt ─────────────────────────────────────────────────────────
  const handlePrintReceipt = (receipt: FiscalReceipt) => {
    const cs = data.companySettings;
    const w = window.open('', '_blank');
    if (!w) return;

    const payLabel = receipt.paymentType === 'Cash' ? 'ГОТІВКА' : receipt.paymentType === 'Card' ? 'КАРТКА' : 'БЕЗГОТІВКОВИЙ';
    const dt = new Date(receipt.dateTime);

    w.document.write(`
      <html>
        <head>
          <title>Чек ${receipt.fiscalNumber}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Courier New', monospace; font-size: 12px; width: 280px; margin: 0 auto; padding: 10px; color: #000; }
            .center { text-align: center; }
            .bold { font-weight: bold; }
            .line { border-top: 1px dashed #000; margin: 8px 0; }
            .row { display: flex; justify-content: space-between; margin: 2px 0; }
            .big { font-size: 16px; font-weight: bold; }
            .small { font-size: 10px; }
            .qr { width: 100px; height: 100px; border: 1px solid #000; margin: 8px auto; display: flex; align-items: center; justify-content: center; font-size: 9px; text-align: center; }
          </style>
        </head>
        <body>
          <div class="center bold" style="font-size:14px">${cs.name}</div>
          <div class="center small">${cs.address}</div>
          <div class="center small">Тел: ${cs.phone}</div>
          <div class="center small">ЄДРПОУ: ${cs.edrpou}</div>
          <div class="line"></div>
          <div class="center bold">ФІСКАЛЬНИЙ ЧЕК</div>
          <div class="center small">${receipt.provider}</div>
          <div class="line"></div>
          <div class="row small"><span>Дата:</span><span>${format(dt, 'dd.MM.yyyy')}</span></div>
          <div class="row small"><span>Час:</span><span>${format(dt, 'HH:mm:ss')}</span></div>
          <div class="row small"><span>Касир:</span><span>${receipt.cashier}</span></div>
          <div class="row small"><span>Замовлення:</span><span>${receipt.orderId}</span></div>
          <div class="row small"><span>Клієнт:</span><span>${receipt.clientName}</span></div>
          <div class="line"></div>
          ${receipt.items.map(item => `
            <div class="small">${item.name}</div>
            <div class="row small">
              <span>${item.qty} шт × ${item.price.toLocaleString()} ₴</span>
              <span>${(item.qty * item.price).toLocaleString()} ₴</span>
            </div>
          `).join('')}
          <div class="line"></div>
          <div class="row big"><span>СУМА:</span><span>${receipt.amount.toLocaleString()} ₴</span></div>
          <div class="row bold"><span>${payLabel}:</span><span>${receipt.amount.toLocaleString()} ₴</span></div>
          <div class="line"></div>
          <div class="row small"><span>ФН чеку:</span><span class="bold">${receipt.fiscalNumber}</span></div>
          <div class="row small"><span>№ чеку:</span><span>${receipt.checkNumber}</span></div>
          <div class="line"></div>
          <div class="center">
            <div class="qr">QR КОД<br/>перевірки<br/>чеку</div>
            <div class="small" style="word-break:break-all;">${receipt.qrCode}</div>
          </div>
          <div class="line"></div>
          <div class="center small">ПЕРЕВІРТЕ ЧЕК НА САЙТІ ДПС</div>
          <div class="center small">cabinet.tax.gov.ua/cashregs</div>
          <div class="center small" style="margin-top:8px">Дякуємо за звернення!</div>
        </body>
      </html>
    `);
    w.document.close();
    w.print();
  };

  // ── X-Report print ─────────────────────────────────────────────────────────
  const printXReport = async () => {
    setXReportLoading(true);
    await new Promise(r => setTimeout(r, 500));

    const cs = data.companySettings;
    const shiftStart = shiftState.startTime;
    const shiftReceipts = shiftStart
      ? receipts.filter(r => r.dateTime >= shiftStart && r.status === 'success' && r.orderId !== 'Z-ЗВІТ')
      : receipts.filter(r => r.status === 'success' && r.orderId !== 'Z-ЗВІТ');

    const cashTotal = shiftReceipts.filter(r => r.paymentType === 'Cash').reduce((a, r) => a + r.amount, 0);
    const cardTotal = shiftReceipts.filter(r => r.paymentType === 'Card').reduce((a, r) => a + r.amount, 0);
    const bankTotal = shiftReceipts.filter(r => r.paymentType === 'Bank').reduce((a, r) => a + r.amount, 0);
    const total = cashTotal + cardTotal + bankTotal;

    const w = window.open('', '_blank');
    if (!w) { setXReportLoading(false); return; }

    w.document.write(`
      <html><head><title>X-Звіт</title>
      <style>
        * { margin:0;padding:0;box-sizing:border-box; }
        body { font-family:'Courier New',monospace;font-size:12px;width:280px;margin:0 auto;padding:10px;color:#000; }
        .center{text-align:center}.bold{font-weight:bold}.line{border-top:1px dashed #000;margin:8px 0}.row{display:flex;justify-content:space-between;margin:2px 0}.big{font-size:16px;font-weight:bold}
      </style></head><body>
        <div class="center bold" style="font-size:14px">${cs.name}</div>
        <div class="center" style="font-size:10px">ЄДРПОУ: ${cs.edrpou}</div>
        <div class="line"></div>
        <div class="center bold">X-ЗВІТ (ПРОМІЖНИЙ)</div>
        <div class="center" style="font-size:10px">${format(new Date(), 'dd.MM.yyyy HH:mm:ss')}</div>
        <div class="line"></div>
        <div class="row"><span>Відкрито:</span><span>${shiftState.startTime ? format(new Date(shiftState.startTime), 'dd.MM HH:mm') : '—'}</span></div>
        <div class="row"><span>Касир:</span><span>${settings.cashierName || shiftState.openedBy || 'Адмін'}</span></div>
        <div class="row"><span>ПРРО:</span><span>${currentProvider.displayName}</span></div>
        <div class="line"></div>
        <div class="row"><span>Чеків:</span><span>${shiftReceipts.length}</span></div>
        <div class="row"><span>Готівка:</span><span>${cashTotal.toLocaleString()} ₴</span></div>
        <div class="row"><span>Карта:</span><span>${cardTotal.toLocaleString()} ₴</span></div>
        <div class="row"><span>Б/Н:</span><span>${bankTotal.toLocaleString()} ₴</span></div>
        <div class="line"></div>
        <div class="row big"><span>РАЗОМ:</span><span>${total.toLocaleString()} ₴</span></div>
        <div class="line"></div>
        <div class="center" style="font-size:10px">Зміна відкрита. Чек не є фіскальним.</div>
      </body></html>
    `);
    w.document.close();
    w.print();
    setXReportLoading(false);
  };

  // ── Stats ──────────────────────────────────────────────────────────────────
  const todayStr = new Date().toISOString().split('T')[0];
  const todayReceipts = receipts.filter(r => r.dateTime.startsWith(todayStr) && r.status === 'success' && r.orderId !== 'Z-ЗВІТ');
  const todayTotal = todayReceipts.reduce((acc, r) => acc + r.amount, 0);
  const monthStr = format(new Date(), 'yyyy-MM');
  const monthReceipts = receipts.filter(r => r.dateTime.startsWith(monthStr) && r.status === 'success' && r.orderId !== 'Z-ЗВІТ');
  const monthTotal = monthReceipts.reduce((acc, r) => acc + r.amount, 0);

  // Shift receipts (since shift opened)
  const shiftStart = shiftState.startTime;
  const shiftReceipts = shiftStart
    ? receipts.filter(r => r.dateTime >= shiftStart && r.status === 'success' && r.orderId !== 'Z-ЗВІТ')
    : [];
  const shiftTotal = shiftReceipts.reduce((acc, r) => acc + r.amount, 0);

  const unpaidOrders = data.workOrders.filter(o => o.status === 'Completed' && !o.isPaid);

  const filteredReceipts = receipts.filter(r =>
    filterPayment === 'all' || r.paymentType === filterPayment
  );

  const paymentIcon = (type: string) => {
    if (type === 'Cash') return <DollarSign size={14} className="text-green-600" />;
    if (type === 'Card') return <CreditCard size={14} className="text-blue-600" />;
    return <Building size={14} className="text-purple-600" />;
  };

  const statusBadge = (s: FiscalReceipt['status']) => {
    if (s === 'success') return 'bg-green-100 text-green-700';
    if (s === 'error') return 'bg-red-100 text-red-700';
    return 'bg-yellow-100 text-yellow-700';
  };

  return (
    <div className="space-y-6">
      {/* Header Tabs */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="flex overflow-x-auto border-b">
          {([
            { id: 'dashboard' as ViewTab, label: 'Каса', icon: <Receipt size={16} /> },
            { id: 'receipts' as ViewTab, label: `Чеки (${receipts.filter(r => r.orderId !== 'Z-ЗВІТ').length})`, icon: <FileText size={16} /> },
            { id: 'shift' as ViewTab, label: 'Зміна', icon: <Clock size={16} /> },
            { id: 'settings' as ViewTab, label: 'Налаштування', icon: <Settings size={16} /> },
          ] as const).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-4 font-semibold text-sm whitespace-nowrap border-b-2 transition-all ${
                activeTab === tab.id
                  ? 'border-[#ffcc00] text-neutral-900 bg-[#ffcc00]/10'
                  : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:bg-neutral-50'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Persistent status bar — always visible regardless of active tab */}
        <div className="px-5 py-3 bg-neutral-50 flex items-center justify-between flex-wrap gap-3 border-b">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm font-medium text-neutral-600">ПРРО:</span>
            <span className="flex items-center gap-2 font-bold text-sm">
              <span>{currentProvider.logo}</span>
              {currentProvider.displayName}
            </span>

            {/* Enabled/Disabled badge */}
            {settings.enabled ? (
              <span className="flex items-center gap-1 text-green-600 bg-green-100 px-2 py-0.5 rounded-full text-xs font-bold">
                <CheckCircle size={10} /> Активний
              </span>
            ) : (
              <span className="flex items-center gap-1 text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded-full text-xs font-bold">
                <WifiOff size={10} /> Вимкнений
              </span>
            )}

            {/* Connection status — persists across tab switches */}
            {connectionStatus === 'online' && (
              <span className="flex items-center gap-1 text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full text-xs font-bold">
                <Wifi size={10} /> Онлайн
              </span>
            )}
            {connectionStatus === 'offline' && (
              <span className="flex items-center gap-1 text-red-600 bg-red-100 px-2 py-0.5 rounded-full text-xs font-bold">
                <WifiOff size={10} /> Офлайн
              </span>
            )}
            {connectionStatus === 'checking' && (
              <span className="flex items-center gap-1 text-yellow-600 bg-yellow-100 px-2 py-0.5 rounded-full text-xs font-bold">
                <Loader2 size={10} className="animate-spin" /> Перевірка...
              </span>
            )}
          </div>

          {/* Shift control — persists across tab switches */}
          <div className="flex items-center gap-2">
            <span className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${
              shiftState.isOpen ? 'bg-green-100 text-green-700' : 'bg-neutral-100 text-neutral-500'
            }`}>
              <Clock size={10} />
              Зміна: {shiftState.isOpen
                ? `Відкрита (${shiftState.startTime ? format(new Date(shiftState.startTime), 'HH:mm') : ''})`
                : 'Закрита'}
            </span>
            {!shiftState.isOpen ? (
              <button
                onClick={openShift}
                disabled={!settings.enabled}
                className="bg-green-500 text-white px-3 py-1 rounded-lg text-xs font-bold hover:bg-green-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Відкрити зміну
              </button>
            ) : (
              <button
                onClick={closeShift}
                className="bg-red-500 text-white px-3 py-1 rounded-lg text-xs font-bold hover:bg-red-600 transition-colors"
              >
                Закрити / Z-звіт
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ─── DASHBOARD ─────────────────────────────────────────────────────────── */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Сьогодні', value: `${todayTotal.toLocaleString()} ₴`, sub: `${todayReceipts.length} чеків`, icon: <TrendingUp size={18} />, color: 'text-green-600' },
              { label: 'Місяць', value: `${monthTotal.toLocaleString()} ₴`, sub: `${monthReceipts.length} чеків`, icon: <Receipt size={18} />, color: 'text-blue-600' },
              { label: 'Чеків (зміна)', value: String(shiftReceipts.length), sub: `${shiftTotal.toLocaleString()} ₴`, icon: <FileText size={18} />, color: 'text-purple-600' },
              { label: 'Не фіскалізовано', value: String(unpaidOrders.length), sub: 'завершених замовлень', icon: <AlertCircle size={18} />, color: 'text-orange-600' },
            ].map((s, i) => (
              <div key={i} className="bg-white p-5 rounded-xl border shadow-sm">
                <div className={`${s.color} mb-1`}>{s.icon}</div>
                <p className="text-neutral-500 text-xs font-medium">{s.label}</p>
                <h3 className={`text-2xl font-bold ${s.color}`}>{s.value}</h3>
                <p className="text-xs text-neutral-400 mt-0.5">{s.sub}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pending fiscalization queue */}
            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
              <div className="p-4 border-b bg-neutral-50 flex items-center justify-between">
                <h3 className="font-bold flex items-center gap-2">
                  <AlertCircle size={18} className="text-orange-500" />
                  Черга фіскалізації ({unpaidOrders.length})
                </h3>
                {!settings.enabled && (
                  <span className="text-xs text-red-500 font-bold">ПРРО вимкнено</span>
                )}
              </div>
              <div className="divide-y max-h-96 overflow-y-auto">
                {unpaidOrders.length === 0 ? (
                  <div className="p-8 text-center text-neutral-400">
                    <CheckCircle size={32} className="mx-auto mb-2 text-green-400" />
                    <p>Всі завершені замовлення фіскалізовано</p>
                  </div>
                ) : unpaidOrders.map(order => {
                  const client = data.clients.find(c => c.id === order.clientId);
                  const isLoading = fiscalizingId === order.id;
                  return (
                    <div key={order.id} className="p-4 flex items-center justify-between hover:bg-neutral-50">
                      <div className="min-w-0 mr-3">
                        <p className="font-bold text-sm truncate">{client?.name || 'Клієнт'}</p>
                        <p className="text-xs text-neutral-500">{order.id} · {client?.car.make} {client?.car.model}</p>
                        <p className="text-xs text-neutral-400">{order.date}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-bold">{order.total.toLocaleString()} ₴</span>
                        <button
                          onClick={() => fiscalizeOrder(order.id)}
                          disabled={isLoading || !settings.enabled || !shiftState.isOpen}
                          className="bg-[#ffcc00] text-black px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1 hover:bg-[#e6b800] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                          title={!shiftState.isOpen ? 'Спочатку відкрийте зміну' : !settings.enabled ? 'Увімкніть ПРРО' : 'Видати чек'}
                        >
                          {isLoading ? (
                            <><Loader2 size={11} className="animate-spin" /> Фіск...</>
                          ) : (
                            <><Receipt size={11} /> Чек</>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
              {!shiftState.isOpen && unpaidOrders.length > 0 && (
                <div className="p-3 bg-yellow-50 border-t border-yellow-200 text-xs text-yellow-700 font-bold text-center">
                  ⚠️ Відкрийте зміну для фіскалізації
                </div>
              )}
            </div>

            {/* Manual receipt */}
            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
              <div className="p-4 border-b bg-neutral-50">
                <h3 className="font-bold flex items-center gap-2">
                  <Zap size={18} className="text-[#ffcc00]" />
                  Ручний розрахунковий документ
                </h3>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-600 mb-1">Опис послуги / товару</label>
                  <input
                    type="text"
                    value={manualPayment.description}
                    onChange={e => setManualPayment({ ...manualPayment, description: e.target.value })}
                    className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-[#ffcc00] text-sm"
                    placeholder="Назва послуги або товару..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-neutral-600 mb-1">Сума (₴)</label>
                    <input
                      type="number"
                      value={manualPayment.amount || ''}
                      onChange={e => setManualPayment({ ...manualPayment, amount: Number(e.target.value) })}
                      className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-[#ffcc00] text-sm"
                      placeholder="0.00"
                      min={0}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-neutral-600 mb-1">Клієнт</label>
                    <input
                      type="text"
                      value={manualPayment.clientName}
                      onChange={e => setManualPayment({ ...manualPayment, clientName: e.target.value })}
                      className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-[#ffcc00] text-sm"
                      placeholder="Ім'я клієнта"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-neutral-600 mb-1">Форма оплати</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['Cash', 'Card', 'Bank'] as const).map(pt => (
                      <button
                        key={pt}
                        onClick={() => setManualPayment({ ...manualPayment, paymentType: pt })}
                        className={`py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-colors ${
                          manualPayment.paymentType === pt
                            ? 'bg-[#ffcc00] text-black'
                            : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                        }`}
                      >
                        {pt === 'Cash' ? <><DollarSign size={12} /> Готівка</> :
                         pt === 'Card' ? <><CreditCard size={12} /> Карта</> :
                         <><Building size={12} /> Б/Н</>}
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  onClick={handleManualFiscalize}
                  disabled={!settings.enabled || !shiftState.isOpen || !manualPayment.description || manualPayment.amount <= 0}
                  className="w-full bg-neutral-900 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-neutral-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <Receipt size={18} /> Сформувати чек
                </button>
                {!settings.enabled && <p className="text-xs text-center text-red-500">Увімкніть ПРРО у Налаштуваннях</p>}
                {settings.enabled && !shiftState.isOpen && <p className="text-xs text-center text-orange-500">Відкрийте зміну для формування чеків</p>}
              </div>
            </div>
          </div>

          {/* Recent receipts */}
          <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
            <div className="p-4 border-b bg-neutral-50 flex items-center justify-between">
              <h3 className="font-bold flex items-center gap-2">
                <Receipt size={18} className="text-[#ffcc00]" /> Останні чеки
              </h3>
              <button onClick={() => setActiveTab('receipts')} className="text-sm text-blue-600 hover:underline">
                Всі чеки →
              </button>
            </div>
            <div className="divide-y">
              {receipts.filter(r => r.orderId !== 'Z-ЗВІТ').slice(0, 6).map(receipt => (
                <div key={receipt.id} className="p-4 flex items-center justify-between hover:bg-neutral-50">
                  <div className="flex items-center gap-3">
                    {paymentIcon(receipt.paymentType)}
                    <div>
                      <p className="font-bold text-sm">{receipt.clientName}</p>
                      <p className="text-xs text-neutral-500 font-mono">ФН: {receipt.fiscalNumber}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="font-bold">{receipt.amount.toLocaleString()} ₴</p>
                      <p className="text-xs text-neutral-400">{format(new Date(receipt.dateTime), 'dd.MM HH:mm')}</p>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => { setSelectedReceipt(receipt); setShowReceiptModal(true); }} className="p-1.5 text-neutral-400 hover:text-blue-600 rounded">
                        <Eye size={14} />
                      </button>
                      <button onClick={() => handlePrintReceipt(receipt)} className="p-1.5 text-neutral-400 hover:text-neutral-700 rounded">
                        <Printer size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {receipts.filter(r => r.orderId !== 'Z-ЗВІТ').length === 0 && (
                <div className="p-8 text-center text-neutral-400">Чеків ще немає</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── RECEIPTS ──────────────────────────────────────────────────────────── */}
      {activeTab === 'receipts' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-neutral-500">Фільтр:</span>
              {(['all', 'Cash', 'Card', 'Bank'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilterPayment(f)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                    filterPayment === f ? 'bg-neutral-900 text-white' : 'bg-neutral-100 hover:bg-neutral-200'
                  }`}
                >
                  {f === 'all' ? 'Всі' : f === 'Cash' ? '💵 Готівка' : f === 'Card' ? '💳 Карта' : '🏦 Б/Н'}
                </button>
              ))}
            </div>
            <button
              onClick={() => {
                const csv = filteredReceipts.map(r =>
                  `${format(new Date(r.dateTime), 'dd.MM.yyyy HH:mm')},${r.orderId},${r.clientName},${r.amount},${r.paymentType},${r.fiscalNumber},${r.status}`
                ).join('\n');
                const blob = new Blob(['\ufeff' + 'Дата,Замовлення,Клієнт,Сума,Оплата,Фіск.номер,Статус\n' + csv], { type: 'text/csv;charset=utf-8' });
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = `fiscal_receipts_${format(new Date(), 'yyyyMMdd')}.csv`;
                link.click();
              }}
              className="bg-neutral-100 hover:bg-neutral-200 px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2"
            >
              <Download size={16} /> Експорт CSV
            </button>
          </div>

          <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-neutral-50 border-b text-[10px] uppercase font-bold text-neutral-500">
                  <tr>
                    <th className="px-4 py-3 text-left">Дата/Час</th>
                    <th className="px-4 py-3 text-left">Замовлення</th>
                    <th className="px-4 py-3 text-left">Клієнт</th>
                    <th className="px-4 py-3 text-center">Оплата</th>
                    <th className="px-4 py-3 text-right">Сума</th>
                    <th className="px-4 py-3 text-left">Фіскальний №</th>
                    <th className="px-4 py-3 text-center">Статус</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredReceipts.map(receipt => (
                    <tr key={receipt.id} className={`hover:bg-neutral-50 ${receipt.orderId === 'Z-ЗВІТ' ? 'bg-red-50' : ''}`}>
                      <td className="px-4 py-3 text-neutral-500 text-xs">
                        {format(new Date(receipt.dateTime), 'dd.MM.yyyy HH:mm')}
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-xs">{receipt.orderId}</td>
                      <td className="px-4 py-3 font-medium">{receipt.clientName}</td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {paymentIcon(receipt.paymentType)}
                          <span className="text-xs">
                            {receipt.paymentType === 'Cash' ? 'Готівка' : receipt.paymentType === 'Card' ? 'Карта' : 'Б/Н'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-bold">{receipt.amount.toLocaleString()} ₴</td>
                      <td className="px-4 py-3 font-mono text-xs text-neutral-600">{receipt.fiscalNumber}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${statusBadge(receipt.status)}`}>
                          {receipt.status === 'success' ? '✓ ОК' : receipt.status === 'error' ? '✗ Помилка' : '⏳ Очікує'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1 justify-end">
                          <button onClick={() => { setSelectedReceipt(receipt); setShowReceiptModal(true); }} className="p-1.5 text-neutral-400 hover:text-blue-600 rounded">
                            <Eye size={14} />
                          </button>
                          <button onClick={() => handlePrintReceipt(receipt)} className="p-1.5 text-neutral-400 hover:text-neutral-700 rounded">
                            <Printer size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredReceipts.length === 0 && (
                <div className="p-12 text-center text-neutral-400">Фіскальних чеків ще немає</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── SHIFT ─────────────────────────────────────────────────────────────── */}
      {activeTab === 'shift' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-6 rounded-xl border shadow-sm">
              <p className="text-neutral-500 text-sm">Статус зміни</p>
              <div className={`mt-3 px-4 py-3 rounded-xl text-center font-bold text-lg ${shiftState.isOpen ? 'bg-green-100 text-green-700' : 'bg-neutral-100 text-neutral-600'}`}>
                {shiftState.isOpen ? '🟢 Відкрита' : '🔴 Закрита'}
              </div>
              {shiftState.startTime && shiftState.isOpen && (
                <p className="text-xs text-neutral-400 text-center mt-2">
                  Відкрита о {format(new Date(shiftState.startTime), 'HH:mm dd.MM.yyyy')}
                </p>
              )}
            </div>
            <div className="bg-white p-6 rounded-xl border shadow-sm">
              <p className="text-neutral-500 text-sm">Чеків за зміну</p>
              <h3 className="text-3xl font-bold mt-2 text-blue-600">{shiftReceipts.length}</h3>
              <p className="text-xs text-neutral-400 mt-1">фіскальних документів</p>
            </div>
            <div className="bg-white p-6 rounded-xl border shadow-sm">
              <p className="text-neutral-500 text-sm">Сума за зміну</p>
              <h3 className="text-3xl font-bold text-green-600 mt-2">{shiftTotal.toLocaleString()} ₴</h3>
              <p className="text-xs text-neutral-400 mt-1">виторг за зміну</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-xl border shadow-sm">
              <h3 className="font-bold mb-4">Управління зміною</h3>
              <div className="space-y-3">
                <button
                  onClick={shiftState.isOpen ? closeShift : openShift}
                  disabled={!settings.enabled && !shiftState.isOpen}
                  className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors ${
                    shiftState.isOpen
                      ? 'bg-red-500 text-white hover:bg-red-600'
                      : 'bg-green-500 text-white hover:bg-green-600 disabled:opacity-40 disabled:cursor-not-allowed'
                  }`}
                >
                  <Clock size={20} />
                  {shiftState.isOpen ? 'Закрити зміну (Z-звіт)' : 'Відкрити зміну'}
                </button>
                <button
                  onClick={printXReport}
                  disabled={!shiftState.isOpen || xReportLoading}
                  className="w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 bg-neutral-100 hover:bg-neutral-200 transition-colors disabled:opacity-40"
                >
                  {xReportLoading ? <Loader2 size={18} className="animate-spin" /> : <FileText size={18} />}
                  X-Звіт (проміжний)
                </button>
              </div>
              {!settings.enabled && !shiftState.isOpen && (
                <p className="text-xs text-center text-orange-500 mt-3">Увімкніть ПРРО для відкриття зміни</p>
              )}
            </div>

            <div className="bg-white p-6 rounded-xl border shadow-sm">
              <h3 className="font-bold mb-4">Структура виручки за зміну</h3>
              {shiftReceipts.length > 0 ? (
                <div className="space-y-3">
                  {[
                    { label: 'Готівка', type: 'Cash', color: 'bg-green-500', icon: <DollarSign size={14} /> },
                    { label: 'Карта', type: 'Card', color: 'bg-blue-500', icon: <CreditCard size={14} /> },
                    { label: 'Безготівковий', type: 'Bank', color: 'bg-purple-500', icon: <Building size={14} /> },
                  ].map(pt => {
                    const ptTotal = shiftReceipts.filter(r => r.paymentType === pt.type).reduce((a, r) => a + r.amount, 0);
                    const count = shiftReceipts.filter(r => r.paymentType === pt.type).length;
                    const pct = shiftTotal > 0 ? (ptTotal / shiftTotal) * 100 : 0;
                    return (
                      <div key={pt.type}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="flex items-center gap-2 font-medium">{pt.icon} {pt.label} ({count})</span>
                          <span className="font-bold">{ptTotal.toLocaleString()} ₴</span>
                        </div>
                        <div className="bg-neutral-100 rounded-full h-2">
                          <div className={`${pt.color} h-2 rounded-full transition-all`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center text-neutral-400 py-8">
                  {shiftState.isOpen ? 'Немає операцій за зміну' : 'Зміна не відкрита'}
                </div>
              )}
            </div>
          </div>

          {/* Z-reports history */}
          {receipts.filter(r => r.orderId === 'Z-ЗВІТ').length > 0 && (
            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
              <div className="p-4 border-b bg-neutral-50">
                <h3 className="font-bold">Журнал Z-звітів</h3>
              </div>
              <div className="divide-y">
                {receipts.filter(r => r.orderId === 'Z-ЗВІТ').map(r => (
                  <div key={r.id} className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-sm">Z-звіт від {format(new Date(r.dateTime), 'dd.MM.yyyy HH:mm')}</p>
                      <p className="text-xs text-neutral-500">Касир: {r.cashier} · ФН: {r.fiscalNumber}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-lg">{r.amount.toLocaleString()} ₴</span>
                      <button onClick={() => handlePrintReceipt(r)} className="p-1.5 text-neutral-400 hover:text-neutral-700 rounded">
                        <Printer size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── SETTINGS ──────────────────────────────────────────────────────────── */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          {/* Provider Selection */}
          <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
            <div className="p-5 border-b bg-neutral-50">
              <h3 className="font-bold text-lg">Оберіть провайдера ПРРО</h3>
            </div>
            <div className="p-5 space-y-3">
              {PROVIDERS.map(provider => (
                <div key={provider.id} className={`rounded-xl border-2 overflow-hidden transition-all ${settings.providerId === provider.id ? 'border-[#ffcc00]' : 'border-neutral-200'}`}>
                  <div
                    className="p-4 flex items-center justify-between cursor-pointer hover:bg-neutral-50"
                    onClick={() => setExpandedProvider(expandedProvider === provider.id ? null : provider.id)}
                  >
                    <div className="flex items-center gap-4">
                      <input
                        type="radio"
                        checked={settings.providerId === provider.id}
                        onChange={() => setSettings({ ...settings, providerId: provider.id })}
                        className="w-4 h-4"
                        onClick={e => e.stopPropagation()}
                      />
                      <span className="text-2xl">{provider.logo}</span>
                      <div>
                        <h4 className="font-bold">{provider.displayName}</h4>
                        <p className="text-xs text-neutral-500">{provider.apiEndpoint}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <a href={provider.website} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline" onClick={e => e.stopPropagation()}>
                        {provider.website}
                      </a>
                      {expandedProvider === provider.id ? <ChevronUp size={16} className="text-neutral-400" /> : <ChevronDown size={16} className="text-neutral-400" />}
                    </div>
                  </div>
                  {expandedProvider === provider.id && (
                    <div className="px-4 pb-4 bg-neutral-50 border-t">
                      <p className="text-sm text-neutral-600 mb-3 mt-3">{provider.description}</p>
                      <div className="flex flex-wrap gap-2">
                        {provider.features.map(f => (
                          <span key={f} className="px-2 py-1 bg-white border rounded-full text-xs font-medium flex items-center gap-1">
                            <CheckCircle size={10} className="text-green-500" /> {f}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* RRO Config */}
          <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
            <div className="p-5 border-b bg-neutral-50 flex items-center justify-between">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <Settings size={18} className="text-[#ffcc00]" /> Конфігурація ПРРО
              </h3>
              <div className="flex items-center gap-3">
                <span className="text-sm text-neutral-500">Статус:</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.enabled}
                    onChange={e => setSettings({ ...settings, enabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#ffcc00]"></div>
                </label>
                <span className={`text-sm font-bold ${settings.enabled ? 'text-green-600' : 'text-neutral-400'}`}>
                  {settings.enabled ? 'Увімкнено' : 'Вимкнено'}
                </span>
              </div>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold text-neutral-600 mb-1 flex items-center gap-1">
                  <Hash size={12} /> Ліцензійний ключ / API Token
                </label>
                <input
                  type="password"
                  value={settings.licenseKey}
                  onChange={e => setSettings({ ...settings, licenseKey: e.target.value })}
                  placeholder="Введіть ключ ліцензії..."
                  className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-[#ffcc00] font-mono text-sm"
                />
                <p className="text-xs text-neutral-400 mt-1">Отримати в кабінеті {currentProvider.displayName}</p>
              </div>
              <div>
                <label className="block text-xs font-bold text-neutral-600 mb-1 flex items-center gap-1">
                  <Hash size={12} /> ID фіскального пристрою (ФСКО)
                </label>
                <input
                  type="text"
                  value={settings.deviceId}
                  onChange={e => setSettings({ ...settings, deviceId: e.target.value })}
                  placeholder="Напр.: 4000000001"
                  className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-[#ffcc00] font-mono text-sm"
                />
                <p className="text-xs text-neutral-400 mt-1">Фіскальний номер реєстратора (10 цифр)</p>
              </div>
              <div>
                <label className="block text-xs font-bold text-neutral-600 mb-1">ID касира</label>
                <input
                  type="text"
                  value={settings.cashierId}
                  onChange={e => setSettings({ ...settings, cashierId: e.target.value })}
                  placeholder="cashier_001"
                  className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-[#ffcc00] text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-neutral-600 mb-1">Ім'я касира (для чека)</label>
                <input
                  type="text"
                  value={settings.cashierName}
                  onChange={e => setSettings({ ...settings, cashierName: e.target.value })}
                  placeholder="Іванов І.І."
                  className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-[#ffcc00] text-sm"
                />
              </div>
            </div>

            <div className="px-6 pb-6">
              <h4 className="font-bold text-sm text-neutral-600 mb-3">Параметри чеків</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {[
                  { key: 'offlineMode', label: 'Офлайн режим', desc: 'Черга при відсутності інтернету' },
                  { key: 'autoFiscalize', label: 'Авто-фіскалізація', desc: 'Автоматично при позначенні оплати' },
                  { key: 'printReceipt', label: 'Друк чека', desc: 'Відкривати діалог друку' },
                  { key: 'sendSMS', label: 'SMS клієнту', desc: 'Посилання на чек через SMS' },
                  { key: 'sendEmail', label: 'Email клієнту', desc: 'Надсилати чек на пошту' },
                ].map(opt => (
                  <label key={opt.key} className="flex items-start gap-3 p-3 bg-neutral-50 rounded-lg cursor-pointer hover:bg-neutral-100 transition-colors">
                    <input
                      type="checkbox"
                      checked={settings[opt.key as keyof RROSettings] as boolean}
                      onChange={e => setSettings({ ...settings, [opt.key]: e.target.checked })}
                      className="w-4 h-4 mt-0.5"
                    />
                    <div>
                      <p className="text-sm font-bold">{opt.label}</p>
                      <p className="text-xs text-neutral-500">{opt.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="px-6 pb-6 flex gap-3 flex-wrap">
              <button
                onClick={checkConnection}
                disabled={connectionStatus === 'checking'}
                className="flex items-center gap-2 px-5 py-2.5 border rounded-xl font-bold text-sm hover:bg-neutral-50 transition-colors disabled:opacity-50"
              >
                {connectionStatus === 'checking' ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                {connectionStatus === 'checking' ? 'Перевірка...' : 'Перевірити з\'єднання'}
              </button>
              {connectionStatus === 'online' && (
                <div className="flex items-center gap-2 text-green-600 bg-green-100 px-4 py-2.5 rounded-xl font-bold text-sm">
                  <CheckCircle size={16} /> З'єднання встановлено!
                </div>
              )}
              {connectionStatus === 'offline' && (
                <div className="flex items-center gap-2 text-red-600 bg-red-100 px-4 py-2.5 rounded-xl font-bold text-sm">
                  <AlertCircle size={16} /> Не вдалося підключитися
                </div>
              )}
              <div className="flex-1" />
              <button
                onClick={handleSaveSettings}
                className="bg-[#ffcc00] text-black px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-[#e6b800] transition-colors"
              >
                <ShieldCheck size={18} />
                {saved ? '✓ Збережено!' : 'Зберегти налаштування'}
              </button>
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
            <div className="p-5 border-b bg-neutral-50">
              <h3 className="font-bold text-lg">📋 Інструкція підключення ПРРО</h3>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-bold mb-3 text-neutral-700">Покрокова інструкція:</h4>
                <ol className="space-y-3">
                  {[
                    'Зареєструйтесь на сайті обраного ПРРО-провайдера',
                    'Зареєструйте програмний РРО в ДПС через Е-кабінет платника',
                    'Отримайте ліцензійний ключ та ID пристрою від провайдера',
                    'Введіть отримані дані у форму вище та перевірте з\'єднання',
                    'Відкрийте першу зміну та почніть фіскалізацію чеків',
                  ].map((text, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="w-7 h-7 bg-[#ffcc00] text-black rounded-full flex items-center justify-center font-bold text-sm shrink-0">
                        {i + 1}
                      </span>
                      <p className="text-sm text-neutral-600 mt-0.5">{text}</p>
                    </li>
                  ))}
                </ol>
              </div>
              <div className="space-y-3">
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    <strong>⚠️ Законодавство:</strong> Відповідно до Закону України №128-IX, всі суб'єкти господарювання зобов'язані застосовувати РРО або ПРРО.
                  </p>
                </div>
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>ℹ️ Офлайн режим:</strong> При відсутності інтернету чеки зберігаються локально та надсилаються до ДПС після відновлення з'єднання (до 36 годин).
                  </p>
                </div>
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-800">
                    <strong>✅ Зміна зберігається:</strong> Статус зміни, чеки та налаштування зберігаються при переключенні між вкладками системи.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Receipt Modal ──────────────────────────────────────────────────────── */}
      {showReceiptModal && selectedReceipt && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
            <div className="p-4 border-b bg-neutral-50 flex items-center justify-between">
              <h3 className="font-bold flex items-center gap-2">
                <Receipt className="text-[#ffcc00]" size={18} /> Фіскальний чек
              </h3>
              <button onClick={() => setShowReceiptModal(false)}>
                <X size={20} className="text-neutral-400" />
              </button>
            </div>

            <div className="p-5 font-mono text-xs space-y-2 bg-white max-h-[60vh] overflow-y-auto">
              <div className="text-center font-bold text-base">{data.companySettings.name}</div>
              <div className="text-center text-neutral-500">{data.companySettings.address}</div>
              <div className="text-center text-neutral-500">ЄДРПОУ: {data.companySettings.edrpou}</div>
              <div className="border-t border-dashed my-2" />
              <div className="text-center font-bold">ФІСКАЛЬНИЙ ЧЕК</div>
              <div className="text-center text-neutral-500">{selectedReceipt.provider}</div>
              <div className="border-t border-dashed my-2" />
              <div className="flex justify-between"><span>Дата:</span><span>{format(new Date(selectedReceipt.dateTime), 'dd.MM.yyyy')}</span></div>
              <div className="flex justify-between"><span>Час:</span><span>{format(new Date(selectedReceipt.dateTime), 'HH:mm:ss')}</span></div>
              <div className="flex justify-between"><span>Касир:</span><span>{selectedReceipt.cashier}</span></div>
              <div className="flex justify-between"><span>Клієнт:</span><span>{selectedReceipt.clientName}</span></div>
              <div className="border-t border-dashed my-2" />
              {selectedReceipt.items.map((item, i) => (
                <div key={i}>
                  <div className="font-medium">{item.name}</div>
                  <div className="flex justify-between text-neutral-600">
                    <span>{item.qty} × {item.price.toLocaleString()} ₴</span>
                    <span>{(item.qty * item.price).toLocaleString()} ₴</span>
                  </div>
                </div>
              ))}
              <div className="border-t border-dashed my-2" />
              <div className="flex justify-between font-bold text-base">
                <span>СУМА:</span>
                <span>{selectedReceipt.amount.toLocaleString()} ₴</span>
              </div>
              <div className="flex justify-between font-bold">
                <span>{selectedReceipt.paymentType === 'Cash' ? 'ГОТІВКА' : selectedReceipt.paymentType === 'Card' ? 'КАРТКА' : 'БЕЗГОТІВКОВИЙ'}:</span>
                <span>{selectedReceipt.amount.toLocaleString()} ₴</span>
              </div>
              <div className="border-t border-dashed my-2" />
              <div className="flex justify-between"><span>ФН чеку:</span><span className="font-bold">{selectedReceipt.fiscalNumber}</span></div>
              <div className="flex justify-between"><span>№ чеку:</span><span>{selectedReceipt.checkNumber}</span></div>
              <div className="border-t border-dashed my-2" />
              <div className="text-center">
                <div className="w-24 h-24 border mx-auto flex items-center justify-center text-neutral-300 text-[10px] text-center">
                  QR КОД
                </div>
                <div className="mt-1 text-[9px] text-neutral-400 break-all">{selectedReceipt.qrCode}</div>
              </div>
              <div className="border-t border-dashed my-2" />
              <div className="text-center text-neutral-500">ПЕРЕВІРТЕ НА cabinet.tax.gov.ua</div>
              <div className="text-center text-neutral-500">Дякуємо за звернення!</div>
            </div>

            <div className="p-4 border-t bg-neutral-50 flex gap-3 flex-wrap">
              <button
                onClick={() => handlePrintReceipt(selectedReceipt)}
                className="flex-1 bg-neutral-900 text-white py-2.5 rounded-xl font-bold flex items-center justify-center gap-2"
              >
                <Printer size={16} /> Друк
              </button>
              {data.telegramSettings?.enabled && data.telegramSettings?.sendFiscalReceipts && (
                <button
                  onClick={() => handleSendFiscalReceiptToTelegram(selectedReceipt)}
                  disabled={fiscalTgStatus === 'loading'}
                  className={`flex-1 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors ${
                    fiscalTgStatus === 'success'
                      ? 'bg-green-100 text-green-700'
                      : fiscalTgStatus === 'error'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-blue-500 text-white hover:bg-blue-600'
                  } disabled:opacity-50`}
                >
                  {fiscalTgStatus === 'loading' ? (
                    <><Loader size={16} className="animate-spin" /> Відправка...</>
                  ) : fiscalTgStatus === 'success' ? (
                    <><CheckCircle size={16} /> Відправлено!</>
                  ) : fiscalTgStatus === 'error' ? (
                    <><AlertCircle size={16} /> Помилка</>
                  ) : (
                    <><Send size={16} /> Telegram</>
                  )}
                </button>
              )}
              <button
                onClick={() => setShowReceiptModal(false)}
                className="px-5 py-2.5 border rounded-xl font-medium text-neutral-600 hover:bg-neutral-100"
              >
                Закрити
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Warning badge when ПРРО disabled */}
      {!settings.enabled && activeTab === 'dashboard' && (
        <div className="fixed bottom-6 right-6 bg-orange-500 text-white px-5 py-3 rounded-xl shadow-lg flex items-center gap-3 z-40">
          <AlertCircle size={20} />
          <div>
            <p className="font-bold text-sm">ПРРО вимкнений</p>
            <p className="text-xs opacity-90">Перейдіть до Налаштувань для активації</p>
          </div>
          <button
            onClick={() => setActiveTab('settings')}
            className="bg-white text-orange-600 px-3 py-1 rounded-lg font-bold text-xs ml-2"
          >
            Налаштувати
          </button>
        </div>
      )}
    </div>
  );
}
