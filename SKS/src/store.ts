import { AppData } from './types';

const INITIAL_DATA: AppData = {
  clients: [
    { id: '1', name: 'Іван Петренко', phone: '+380671234567', car: { make: 'Toyota', model: 'Camry', year: 2018, vin: 'JT1234567890', plate: 'AX1234AB' }, createdAt: '2023-10-01' },
    { id: '2', name: 'Олена Сидоренко', phone: '+380509876543', car: { make: 'BMW', model: 'X5', year: 2020, vin: 'WB1234567890', plate: 'AX0001CB' }, createdAt: '2023-10-05' },
    { id: '3', name: 'Микола Шевченко', phone: '+380931112233', car: { make: 'Volkswagen', model: 'Passat', year: 2019, vin: 'VW9876543210', plate: 'AX5555AA' }, createdAt: '2023-10-10' },
  ],
  inventory: [
    { id: '1', sku: 'OIL-5W30-4L', name: 'Мастило 5W30 4л', category: 'Мастила', purchasePrice: 1200, salePrice: 1800, stock: 15, minStock: 5, supplierId: 's1', lastPurchaseDate: '2023-10-01' },
    { id: '2', sku: 'FIL-102', name: 'Фільтр масляний', category: 'Фільтри', purchasePrice: 150, salePrice: 350, stock: 2, minStock: 5, supplierId: 's2', lastPurchaseDate: '2023-09-15' },
    { id: '3', sku: 'BR-PAD-F', name: 'Колодки гальмівні передні', category: 'Гальма', purchasePrice: 800, salePrice: 1400, stock: 4, minStock: 2, supplierId: 's3', lastPurchaseDate: '2023-10-05' },
    { id: '4', sku: 'COOL-5L', name: 'Антифриз G12 5л', category: 'Мастила', purchasePrice: 450, salePrice: 750, stock: 8, minStock: 3, supplierId: 's1', lastPurchaseDate: '2023-09-20' },
    { id: '5', sku: 'SPARK-NGK', name: 'Свічки NGK комплект', category: 'Двигун', purchasePrice: 320, salePrice: 580, stock: 12, minStock: 4, supplierId: 's4', lastPurchaseDate: '2023-10-08' },
  ],
  categories: [
    { id: 'c1', name: 'Мастила' },
    { id: 'c2', name: 'Фільтри' },
    { id: 'c3', name: 'Гальма' },
    { id: 'c4', name: 'Ходова' },
    { id: 'c5', name: 'Двигун' },
    { id: 'c6', name: 'Електрика' },
    { id: 'c7', name: 'Кузов' },
  ],
  suppliers: [
    { id: 's1', name: 'Омега-Автопоставка', phone: '+380571234567', email: 'omega@auto.ua', website: 'https://my.omega.page' } as any,
    { id: 's2', name: 'Inter Cars Ukraine', phone: '+380449876543', email: 'info@intercars.ua' },
    { id: 's3', name: 'ELIT Ukraine', phone: '+380441112233', email: 'sales@elit.ua' },
    { id: 's4', name: 'Автотехнікс', phone: '+380445556677', email: 'order@autotechnics.ua' },
  ],
  companySettings: {
    name: 'SmartKharkov',
    address: 'м. Харків, вул. Автомобільна, 12',
    phone: '+38 (067) 123-45-67',
    email: 'info@smart-kharkov.com',
    edrpou: '12345678',
    iban: 'UA123456789012345678901234567',
    managerName: 'Іванов І.І.',
  },
  users: [
    {
      id: 'u1',
      username: 'admin',
      password: 'admin123',
      name: 'Адміністратор',
      role: 'admin',
      permissions: {
        canCreateOrders: true,
        canEditOrders: true,
        canDeleteOrders: true,
        canManageClients: true,
        canManageInventory: true,
        canViewReports: true,
        canManageUsers: true,
        canManageSettings: true,
      }
    },
    {
      id: 'u2',
      username: 'manager',
      password: 'manager123',
      name: 'Сергій Менеджер',
      role: 'manager',
      permissions: {
        canCreateOrders: true,
        canEditOrders: true,
        canDeleteOrders: false,
        canManageClients: true,
        canManageInventory: true,
        canViewReports: true,
        canManageUsers: false,
        canManageSettings: false,
      }
    },
    {
      id: 'u3',
      username: 'master1',
      password: 'master123',
      name: 'Олександр Майстер',
      role: 'master',
      permissions: {
        canCreateOrders: false,
        canEditOrders: true,
        canDeleteOrders: false,
        canManageClients: false,
        canManageInventory: false,
        canViewReports: false,
        canManageUsers: false,
        canManageSettings: false,
      }
    },
  ],
  currentUserId: 'u1',
  notifications: [
    { id: 'n1', type: 'order', title: 'Нове замовлення', message: 'Створено наряд-замовлення WO-1002', date: '2023-10-12', isRead: false },
    { id: 'n2', type: 'stock', title: 'Критичний залишок', message: 'Фільтр масляний - залишилось 2 шт', date: '2023-10-12', isRead: false },
    { id: 'n3', type: 'payment', title: 'Оплата отримана', message: 'Замовлення WO-1001 оплачено', date: '2023-10-10', isRead: true },
  ],
  workOrders: [
    {
      id: 'WO-1001',
      clientId: '1',
      masterId: 'm1',
      status: 'Completed',
      date: '2023-10-10',
      services: [{ id: 's1', name: 'Заміна мастила', price: 400, hours: 0.5, masterId: 'm1' }],
      parts: [{ id: 'p1', partId: '1', quantity: 1, price: 1800 }],
      paymentType: 'Card',
      isPaid: true,
      total: 2200,
      diagnosis: {
        masterId: 'm1',
        date: '2023-10-10',
        engine: { status: 'ok', note: 'Працює рівно' },
        brakes: { status: 'warn', note: 'Знос 70%' },
        suspension: { status: 'ok', note: '' },
        fluids: { status: 'ok', note: '' },
        electrical: { status: 'ok', note: '' },
        tires: { status: 'crit', note: 'Потребують заміни' },
        body: { status: 'ok', note: '' },
        exhaust: { status: 'ok', note: '' },
      }
    },
    {
      id: 'WO-1002',
      clientId: '2',
      masterId: 'm2',
      status: 'InProgress',
      date: '2023-10-12',
      services: [{ id: 's2', name: 'Діагностика ходової', price: 300, hours: 1, masterId: 'm2' }],
      parts: [],
      paymentType: 'Cash',
      isPaid: false,
      total: 300,
    },
    {
      id: 'WO-1003',
      clientId: '3',
      masterId: 'm1',
      status: 'New',
      date: '2023-10-13',
      services: [],
      parts: [],
      paymentType: 'Bank',
      isPaid: false,
      total: 0,
    }
  ],
  employees: [
    { id: 'm1', name: 'Олександр Майстер', role: 'Master', dailyRate: 500, bonusPercentage: 30 },
    { id: 'm2', name: 'Дмитро Механік', role: 'Master', dailyRate: 450, bonusPercentage: 25 },
    { id: 'adm', name: 'Сергій Менеджер', role: 'Manager', dailyRate: 600, bonusPercentage: 5 },
  ],
  expenses: [
    { id: 'e1', category: 'Оренда', amount: 15000, date: '2023-10-01', description: 'Оренда приміщення жовтень' },
    { id: 'e2', category: 'Комунальні', amount: 3500, date: '2023-10-05', description: 'Електроенергія' },
    { id: 'e3', category: 'Інструменти', amount: 2500, date: '2023-10-08', description: 'Новий набір ключів' },
  ],
  settings: {
    rroEnabled: false,
    rroApiKey: '',
  },
  warehouseDocuments: [
    {
      id: 'wd1',
      type: 'incoming',
      number: 'ПН-0001',
      date: '2023-10-01',
      supplierId: 's1',
      note: 'Перше надходження',
      status: 'completed',
      createdAt: '2023-10-01',
      items: [
        { id: 'wdi1', partId: '1', name: 'Мастило 5W30 4л', quantity: 10, price: 1200 },
        { id: 'wdi2', partId: '4', name: 'Антифриз G12 5л', quantity: 5, price: 450 },
      ],
    },
    {
      id: 'wd2',
      type: 'incoming',
      number: 'ПН-0002',
      date: '2023-10-08',
      supplierId: 's4',
      note: '',
      status: 'completed',
      createdAt: '2023-10-08',
      items: [
        { id: 'wdi3', partId: '5', name: 'Свічки NGK комплект', quantity: 12, price: 320 },
      ],
    },
    {
      id: 'wd3',
      type: 'writeoff',
      number: 'СП-0001',
      date: '2023-10-10',
      note: 'Пошкоджені товари',
      status: 'completed',
      createdAt: '2023-10-10',
      items: [
        { id: 'wdi4', partId: '2', name: 'Фільтр масляний', quantity: 1, price: 150 },
      ],
    },
  ],
  telegramSettings: {
    enabled: false,
    botToken: '',
    chatId: '',
    notifyNewOrder: true,
    notifyOrderCompleted: true,
    notifyLowStock: true,
    notifyPaymentReceived: true,
    notifyNewClient: true,
    welcomeMessage: 'Вітаємо в SmartKharkov! 🚗 Ми допоможемо вам з ремонтом та обслуговуванням вашого авто.',
  }
};

export function loadData(): AppData {
  const data = localStorage.getItem('smartkharkov_data');
  if (data) {
    const parsed = JSON.parse(data);
    // Merge with initial data to add new fields
    return {
      ...INITIAL_DATA,
      ...parsed,
      users: parsed.users || INITIAL_DATA.users,
      notifications: parsed.notifications || INITIAL_DATA.notifications,
      currentUserId: parsed.currentUserId || INITIAL_DATA.currentUserId,
      warehouseDocuments: parsed.warehouseDocuments || INITIAL_DATA.warehouseDocuments,
    };
  }
  return INITIAL_DATA;
}

export function saveData(data: AppData) {
  localStorage.setItem('smartkharkov_data', JSON.stringify(data));
}

export function generateId(): string {
  return Math.random().toString(36).substr(2, 9);
}

export function generateOrderId(): string {
  const num = Math.floor(1000 + Math.random() * 9000);
  return `WO-${num}`;
}
