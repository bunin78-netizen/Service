
export type Client = {
  id: string;
  name: string;
  phone: string;
  email?: string;
  car: {
    make: string;
    model: string;
    year: number;
    vin: string;
    plate: string;
  };
  createdAt: string;
};

export type Supplier = {
  id: string;
  name: string;
  contact?: string;
  phone?: string;
  email?: string;
};

export type Part = {
  id: string;
  sku: string;
  name: string;
  category: string;
  purchasePrice: number;
  salePrice: number;
  stock: number;
  minStock: number;
  location?: string;
  supplierId: string;
  lastPurchaseDate?: string;
};

export type WorkOrder = {
  id: string;
  clientId: string;
  masterId?: string;
  status: 'New' | 'InProgress' | 'PendingParts' | 'Completed' | 'Cancelled';
  date: string;
  services: {
    id: string;
    name: string;
    price: number;
    hours: number;
    masterId: string;
  }[];
  parts: {
    id: string;
    partId: string;
    quantity: number;
    price: number;
  }[];
  diagnosis?: DiagnosticCard;
  paymentType: 'Cash' | 'Card' | 'Bank';
  isPaid: boolean;
  total: number;
  approvalStatus?: 'pending' | 'approved' | 'rejected';
};

export type DiagnosticCard = {
  masterId?: string;
  date?: string;
  engine: { status: 'ok' | 'warn' | 'crit'; note: string };
  brakes: { status: 'ok' | 'warn' | 'crit'; note: string };
  suspension: { status: 'ok' | 'warn' | 'crit'; note: string };
  fluids: { status: 'ok' | 'warn' | 'crit'; note: string };
  electrical: { status: 'ok' | 'warn' | 'crit'; note: string };
  tires: { status: 'ok' | 'warn' | 'crit'; note: string };
  body: { status: 'ok' | 'warn' | 'crit'; note: string };
  exhaust: { status: 'ok' | 'warn' | 'crit'; note: string };
};

export type Employee = {
  id: string;
  name: string;
  role: 'Master' | 'Manager';
  dailyRate: number;
  bonusPercentage: number;
  address?: string;
  inn?: string;
  idDocument?: {
    series?: string;
    number?: string;
    issuedBy?: string;
    issuedDate?: string;
  };
};

export type Expense = {
  id: string;
  category: string;
  amount: number;
  date: string;
  description: string;
};

export type CompanySettings = {
  name: string;
  address: string;
  phone: string;
  email: string;
  edrpou: string;
  iban: string;
  managerName: string;
};

export type Category = {
  id: string;
  name: string;
};

export type User = {
  id: string;
  username: string;
  password: string;
  name: string;
  role: 'admin' | 'manager' | 'master';
  permissions: {
    canCreateOrders: boolean;
    canEditOrders: boolean;
    canDeleteOrders: boolean;
    canManageClients: boolean;
    canManageInventory: boolean;
    canViewReports: boolean;
    canManageUsers: boolean;
    canManageSettings: boolean;
  };
};

export type Notification = {
  id: string;
  type: 'order' | 'stock' | 'payment' | 'system';
  title: string;
  message: string;
  date: string;
  isRead: boolean;
};

export type TelegramSettings = {
  enabled: boolean;
  botToken: string;
  chatId: string;
  notifyNewOrder: boolean;
  notifyOrderCompleted: boolean;
  notifyLowStock: boolean;
  notifyPaymentReceived: boolean;
  notifyNewClient: boolean;
  notifyApproval: boolean;
  sendReceipts: boolean;
  sendFiscalReceipts: boolean;
  sendDocuments: boolean;
  welcomeMessage: string;
};

export type ViberSettings = {
  enabled: boolean;
  authToken: string;
  notifyNewOrder: boolean;
  notifyOrderCompleted: boolean;
  notifyLowStock: boolean;
  notifyPaymentReceived: boolean;
  notifyNewClient: boolean;
  sendFiscalReceipts: boolean;
  welcomeMessage: string;
};

export type WarehouseDocumentItem = {
  partId: string;
  quantity: number;
  price: number;
  id?: string;
  name?: string;
};

export type WarehouseDocument = {
  id: string;
  type: 'incoming' | 'outgoing' | 'writeoff' | 'inventory' | 'return';
  number: string;
  date: string;
  supplierId?: string;
  clientId?: string;
  note?: string;
  notes?: string;
  items: WarehouseDocumentItem[];
  status?: 'draft' | 'completed';
  createdAt?: string;
};

export type AppData = {
  clients: Client[];
  inventory: Part[];
  workOrders: WorkOrder[];
  employees: Employee[];
  expenses: Expense[];
  categories: Category[];
  suppliers: Supplier[];
  users: User[];
  notifications: Notification[];
  currentUserId?: string;
  companySettings: CompanySettings;
  settings: {
    rroEnabled: boolean;
    rroApiKey: string;
  };
  telegramSettings: TelegramSettings;
  viberSettings: ViberSettings;
  warehouseDocuments: WarehouseDocument[];
  importJobs: ImportJob[];
  receiptDrafts: ReceiptDraft[];
  supplierProductMap: SupplierProductMap[];
};

export type ImportJobStatus = 'QUEUED' | 'PROCESSING' | 'DONE' | 'FAILED';

export type ImportJob = {
  id: string;
  status: ImportJobStatus;
  sourceFilename: string;
  filePath: string;
  fileHash: string;
  supplierId?: string;
  docNumber?: string;
  docDate?: string;
  rawExtractionJson?: unknown;
  errorMessage?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  lines: ImportLine[];
};

export type ImportLine = {
  id: string;
  importJobId: string;
  nameRaw: string;
  supplierSkuRaw?: string;
  barcodeRaw?: string;
  qty: number;
  unit: string;
  priceNet: number;
  priceGross: number;
  vatRate: number;
  lineTotal: number;
  confidence: number;
  page?: number;
  bbox?: { x: number; y: number; width: number; height: number };
  matchedProductId?: string;
};

export type SupplierProductMap = {
  supplierId: string;
  supplierSku?: string;
  barcode?: string;
  productId: string;
  updatedAt: string;
};

export type ReceiptDraftStatus = 'DRAFT' | 'POSTED';

export type ReceiptDraft = {
  id: string;
  importJobId: string;
  supplierId?: string;
  warehouseId: string;
  status: ReceiptDraftStatus;
  totalNet: number;
  totalVat: number;
  totalGross: number;
  lines: ReceiptDraftLine[];
  postedDocumentId?: string;
  createdAt: string;
  updatedAt: string;
};

export type ReceiptDraftLine = {
  id: string;
  draftId: string;
  productId?: string;
  name: string;
  qty: number;
  unit: string;
  price: number;
  vatRate: number;
  lineTotal: number;
  sourceImportLineId: string;
};
