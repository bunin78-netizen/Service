import { AppData, ImportJob, ImportLine, ReceiptDraft, SupplierProductMap } from '../types';
import { generateId } from '../store';

export type ExtractedDocument = {
  supplier?: { name?: string; supplierId?: string };
  docNumber?: string;
  docDate?: string;
  totals?: { net?: number; vat?: number; gross?: number };
  lines: Array<{
    name: string;
    supplierSku?: string;
    barcode?: string;
    qty: number;
    unit?: string;
    priceNet: number;
    vatRate?: number;
    lineTotal?: number;
    confidence?: number;
  }>;
};

export interface DocumentExtractor {
  extract(fileName: string): Promise<ExtractedDocument>;
}

/** Parse filenames like Expense_0318580_19.02.2026.pdf → { docNumber, docDate } */
function parseExpenseFilename(fileName: string): { docNumber: string; docDate: string } | null {
  const base = fileName.replace(/\.pdf$/i, '');
  const parts = base.split('_');
  if (parts.length < 3 || parts[0].toLowerCase() !== 'expense') return null;
  const docNumber = parts[1];
  if (!docNumber) return null;
  const rawDate = parts[parts.length - 1]; // Last segment: DD.MM.YYYY (handles extra segments in filename)
  const dateParts = rawDate.split('.');
  if (dateParts.length !== 3) return null;
  const [dd, mm, yyyy] = dateParts;
  const day = Number(dd);
  const month = Number(mm);
  const year = Number(yyyy);
  if (!dd || !mm || !yyyy || yyyy.length !== 4 || day < 1 || day > 31 || month < 1 || month > 12 || year < 1000) return null;
  return { docNumber, docDate: `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}` };
}

export class MockExtractor implements DocumentExtractor {
  async extract(fileName: string): Promise<ExtractedDocument> {
    // Full demo data for the fixture file
    if (fileName.includes('Expense_0318580_19.02.2026.pdf')) {
      return {
        supplier: { name: 'Омега-Автопоставка', supplierId: 's1' },
        docNumber: '0318580',
        docDate: '2026-02-19',
        totals: { net: 2850, vat: 570, gross: 3420 },
        lines: [
          { name: 'Мастило 5W30 4л', supplierSku: 'OIL-5W30-4L', barcode: '482000000001', qty: 2, unit: 'шт', priceNet: 1000, vatRate: 0.2, lineTotal: 2400, confidence: 0.98 },
          { name: 'Антифриз G12 5л', supplierSku: 'COOL-5L', barcode: '482000000004', qty: 1, unit: 'шт', priceNet: 850, vatRate: 0.2, lineTotal: 1020, confidence: 0.89 },
        ],
      };
    }

    // Try to extract docNumber and docDate from Expense_<num>_<DD.MM.YYYY>.pdf pattern
    const parsed = parseExpenseFilename(fileName);
    if (parsed) {
      return {
        docNumber: parsed.docNumber,
        docDate: parsed.docDate,
        lines: [
          { name: 'Мастило 5W30 4л', supplierSku: 'OIL-5W30-4L', barcode: '482000000001', qty: 2, unit: 'шт', priceNet: 1000, vatRate: 0.2, lineTotal: 2400, confidence: 0.98 },
          { name: 'Антифриз G12 5л', supplierSku: 'COOL-5L', barcode: '482000000004', qty: 1, unit: 'шт', priceNet: 850, vatRate: 0.2, lineTotal: 1020, confidence: 0.89 },
        ],
      };
    }

    return {
      docNumber: 'UNKNOWN',
      docDate: new Date().toISOString().split('T')[0],
      lines: [],
    };
  }
}

export const hashFile = async (file: File): Promise<string> => {
  const data = await file.arrayBuffer();
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
};

export function createImportJob(data: AppData, payload: { filename: string; fileHash: string; filePath: string; createdBy: string }): ImportJob {
  const postedForHash = data.importJobs.find(j => j.fileHash === payload.fileHash)
    && data.receiptDrafts.some(d => d.importJobId === data.importJobs.find(j => j.fileHash === payload.fileHash)?.id && d.status === 'POSTED');

  if (postedForHash) {
    throw new Error('Цей PDF вже був проведений раніше. Повторний імпорт заборонений.');
  }

  const now = new Date().toISOString();
  return {
    id: generateId(),
    status: 'QUEUED',
    sourceFilename: payload.filename,
    filePath: payload.filePath,
    fileHash: payload.fileHash,
    createdBy: payload.createdBy,
    createdAt: now,
    updatedAt: now,
    lines: [],
  };
}

function parseNum(v: unknown, fallback = 0): number {
  if (v == null) return fallback;
  if (typeof v === 'number') return isNaN(v) ? fallback : v;
  const n = Number(String(v).trim().replace(/,/g, '.'));
  return isNaN(n) ? fallback : n;
}

export function normalizeLine(importJobId: string, line: ExtractedDocument['lines'][0]): ImportLine {
  const qty = parseNum(line.qty);
  const priceNet = parseNum(line.priceNet);
  const vatRate = line.vatRate != null ? parseNum(line.vatRate) : 0.2;
  const priceGross = Number((priceNet * (1 + vatRate)).toFixed(2));
  const lineTotal = line.lineTotal != null ? parseNum(line.lineTotal) : Number((qty * priceGross).toFixed(2));

  return {
    id: generateId(),
    importJobId,
    nameRaw: line.name,
    supplierSkuRaw: line.supplierSku,
    barcodeRaw: line.barcode,
    qty,
    unit: line.unit || 'шт',
    priceNet,
    priceGross,
    vatRate,
    lineTotal,
    confidence: line.confidence ?? 0.6,
  };
}

function findMappedProduct(data: AppData, supplierId: string | undefined, line: ImportLine): string | undefined {
  if (supplierId) {
    const mapped = data.supplierProductMap.find((m: SupplierProductMap) => m.supplierId === supplierId && (
      (line.supplierSkuRaw && m.supplierSku === line.supplierSkuRaw) || (line.barcodeRaw && m.barcode === line.barcodeRaw)
    ));
    if (mapped) return mapped.productId;
  }

  if (line.supplierSkuRaw) {
    const bySupplierSku = data.inventory.find(p => p.sku === line.supplierSkuRaw);
    if (bySupplierSku) return bySupplierSku.id;
  }

  if (line.barcodeRaw) {
    const byBarcode = data.inventory.find(p => p.sku === line.barcodeRaw);
    if (byBarcode) return byBarcode.id;
  }

  const exactByName = data.inventory.find(p => p.name.toLowerCase() === line.nameRaw.toLowerCase());
  return exactByName?.id;
}

export async function processImportJob(data: AppData, jobId: string, extractor: DocumentExtractor): Promise<AppData> {
  const jobIndex = data.importJobs.findIndex(j => j.id === jobId);
  if (jobIndex === -1) throw new Error('Import job not found');
  const job = data.importJobs[jobIndex];

  let updatedJob: ImportJob;
  try {
    const extracted = await extractor.extract(job.sourceFilename);
    const lines = extracted.lines.map(line => normalizeLine(job.id, line)).map(l => ({
      ...l,
      matchedProductId: findMappedProduct(data, extracted.supplier?.supplierId, l),
    }));

    updatedJob = {
      ...job,
      status: 'DONE',
      supplierId: extracted.supplier?.supplierId,
      docNumber: extracted.docNumber,
      docDate: extracted.docDate,
      rawExtractionJson: extracted,
      lines,
      updatedAt: new Date().toISOString(),
    };
  } catch (e) {
    updatedJob = {
      ...job,
      status: 'FAILED',
      errorMessage: e instanceof Error ? e.message : 'Unknown extraction error',
      updatedAt: new Date().toISOString(),
    };
  }

  const importJobs = [...data.importJobs];
  importJobs[jobIndex] = updatedJob;
  return { ...data, importJobs };
}

export function mapImportLine(data: AppData, jobId: string, importLineId: string, productId: string): AppData {
  const importJobs = data.importJobs.map(job => {
    if (job.id !== jobId) return job;
    return {
      ...job,
      lines: job.lines.map(line => line.id === importLineId ? { ...line, matchedProductId: productId } : line),
    };
  });

  const job = importJobs.find(j => j.id === jobId);
  const line = job?.lines.find(l => l.id === importLineId);
  let supplierProductMap = [...data.supplierProductMap];
  if (job?.supplierId && line && (line.supplierSkuRaw || line.barcodeRaw)) {
    supplierProductMap = supplierProductMap.filter(m => !(m.supplierId === job.supplierId && ((line.supplierSkuRaw && m.supplierSku === line.supplierSkuRaw) || (line.barcodeRaw && m.barcode === line.barcodeRaw))));
    supplierProductMap.push({
      supplierId: job.supplierId,
      supplierSku: line.supplierSkuRaw,
      barcode: line.barcodeRaw,
      productId,
      updatedAt: new Date().toISOString(),
    });
  }

  return { ...data, importJobs, supplierProductMap };
}

export function createReceiptDraft(data: AppData, jobId: string): AppData {
  const existing = data.receiptDrafts.find(d => d.importJobId === jobId);
  if (existing) return data;

  const job = data.importJobs.find(j => j.id === jobId);
  if (!job || job.status !== 'DONE') throw new Error('Import is not completed');

  const now = new Date().toISOString();
  const lines = job.lines.map(line => ({
    id: generateId(),
    draftId: '',
    productId: line.matchedProductId,
    name: line.nameRaw,
    qty: line.qty,
    unit: line.unit,
    price: line.priceGross,
    vatRate: line.vatRate,
    lineTotal: line.lineTotal,
    sourceImportLineId: line.id,
  }));

  const draft: ReceiptDraft = {
    id: generateId(),
    importJobId: jobId,
    supplierId: job.supplierId,
    warehouseId: 'main',
    status: 'DRAFT',
    totalNet: Number(lines.reduce((s, l) => s + (l.price / (1 + l.vatRate)) * l.qty, 0).toFixed(2)),
    totalVat: Number(lines.reduce((s, l) => s + (l.price - l.price / (1 + l.vatRate)) * l.qty, 0).toFixed(2)),
    totalGross: Number(lines.reduce((s, l) => s + l.lineTotal, 0).toFixed(2)),
    lines: [],
    createdAt: now,
    updatedAt: now,
  };
  draft.lines = lines.map(l => ({ ...l, draftId: draft.id }));

  return { ...data, receiptDrafts: [...data.receiptDrafts, draft] };
}

export function postReceiptDraft(data: AppData, draftId: string): AppData {
  const draft = data.receiptDrafts.find(d => d.id === draftId);
  if (!draft) throw new Error('Draft not found');
  if (draft.status === 'POSTED') return data;

  if (draft.lines.some(l => !l.productId)) {
    throw new Error('Неможливо провести документ: не всі рядки зіставлені з товарами.');
  }

  const documentId = generateId();
  const warehouseDocument = {
    id: documentId,
    type: 'incoming' as const,
    number: `ІМП-${new Date().getFullYear()}-${Math.floor(Math.random() * 9000 + 1000)}`,
    date: new Date().toISOString().split('T')[0],
    supplierId: draft.supplierId,
    note: `Імпорт PDF (job ${draft.importJobId})`,
    status: 'completed' as const,
    createdAt: new Date().toISOString().split('T')[0],
    items: draft.lines.map(l => ({ id: generateId(), partId: l.productId!, name: l.name, quantity: l.qty, price: l.price })),
  };

  const inventory = data.inventory.map(part => {
    const incoming = warehouseDocument.items.find(i => i.partId === part.id);
    return incoming ? { ...part, stock: part.stock + incoming.quantity, purchasePrice: incoming.price, lastPurchaseDate: warehouseDocument.date } : part;
  });

  const receiptDrafts = data.receiptDrafts.map(d => d.id === draft.id ? { ...d, status: 'POSTED' as const, postedDocumentId: documentId, updatedAt: new Date().toISOString() } : d);

  return {
    ...data,
    inventory,
    receiptDrafts,
    warehouseDocuments: [warehouseDocument, ...data.warehouseDocuments],
  };
}

export function validateImportLine(line: ImportLine): string[] {
  const errors: string[] = [];
  if (line.qty <= 0) errors.push('qty > 0');
  if (line.priceNet < 0) errors.push('price_net >= 0');
  if (Math.abs(line.lineTotal - line.qty * line.priceGross) > 0.05) errors.push('line_total must match qty * price');
  return errors;
}

export function deleteImportJob(data: AppData, jobId: string): AppData {
  const draft = data.receiptDrafts.find(d => d.importJobId === jobId);
  if (draft?.status === 'POSTED') {
    throw new Error('Неможливо видалити: документ вже проведений.');
  }
  return {
    ...data,
    importJobs: data.importJobs.filter(j => j.id !== jobId),
    receiptDrafts: data.receiptDrafts.filter(d => d.importJobId !== jobId),
  };
}
