import * as XLSX from '@e965/xlsx';
import { AppData, ImportJob, ImportLine, Part, ReceiptDraft, SupplierProductMap } from '../types';
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
  extract(fileName: string, file?: File): Promise<ExtractedDocument>;
}

/** Detect CSV separator from first line */
function detectSeparator(firstLine: string): string {
  const counts: Record<string, number> = { ',': 0, ';': 0, '\t': 0 };
  for (const ch of firstLine) if (ch in counts) counts[ch]++;
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}

/** Parse a single CSV line into cells, handling RFC 4180 quoted fields */
function parseCsvLine(line: string, sep: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') { current += '"'; i++; }
        else inQuotes = false;
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') { inQuotes = true; }
      else if (ch === sep) { result.push(current.trim()); current = ''; }
      else { current += ch; }
    }
  }
  result.push(current.trim());
  return result;
}

/** Map a header name to a canonical field key */
function mapHeader(h: string): string {
  const s = h.trim().toLowerCase();
  if (/^(назва|найменування|товар|name|опис|description)/.test(s)) return 'name';
  if (/^(артикул|sku|код постачальника|supplier[._\s-]?sku|part[._\s-]?no)/.test(s)) return 'sku';
  if (/^(штрихкод|barcode|ean|upc)/.test(s)) return 'barcode';
  if (/^(кіл|кількість|qty|quantity|кол)/.test(s)) return 'qty';
  if (/^(од|одиниця|unit|уп|упак)/.test(s)) return 'unit';
  if (/^(ціна\s*(без|нетто|net)|price[._\s-]?(net|excl)|нетто)/.test(s)) return 'priceNet';
  if (/^(ціна|price|вартість|cost)/.test(s)) return 'price';
  if (/^(пдв\s*%|vat\s*%|vat[._\s-]?rate|ставка пдв)/.test(s)) return 'vatRate';
  if (/^(сума|разом|total|line[._\s-]?total|підсумок)/.test(s)) return 'lineTotal';
  return s;
}

/** Parse rows from an array-of-rows (from XLSX or CSV) into ExtractedDocument lines */
function rowsToLines(rows: unknown[][]): ExtractedDocument['lines'] {
  if (rows.length < 2) return [];
  const headerRow = rows[0] as string[];
  const keyMap: Record<number, string> = {};
  headerRow.forEach((h, i) => { if (h != null) keyMap[i] = mapHeader(String(h)); });

  const lines: ExtractedDocument['lines'] = [];
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r] as unknown[];
    const get = (key: string): string => {
      const idx = Object.entries(keyMap).find(([, v]) => v === key)?.[0];
      return idx != null ? String(row[Number(idx)] ?? '').trim() : '';
    };

    const name = get('name');
    if (!name) continue;

    const qtyRaw = get('qty');
    const qty = parseNum(qtyRaw || '1');
    if (qty <= 0) continue;

    const vatRateRaw = get('vatRate');
    const vatNum = parseNum(vatRateRaw);
    const vatRate = vatRateRaw ? vatNum / (vatNum > 1 ? 100 : 1) : 0.2;

    let priceNet = parseNum(get('priceNet'));
    if (!priceNet) {
      const priceRaw = get('price');
      const priceGross = parseNum(priceRaw);
      priceNet = priceGross > 0 ? Number((priceGross / (1 + vatRate)).toFixed(4)) : 0;
    }

    const lineTotalRaw = get('lineTotal');
    const lineTotal = lineTotalRaw ? parseNum(lineTotalRaw) : undefined;

    lines.push({
      name,
      supplierSku: get('sku') || undefined,
      barcode: get('barcode') || undefined,
      qty,
      unit: get('unit') || 'шт',
      priceNet,
      vatRate,
      lineTotal,
      confidence: 0.85,
    });
  }
  return lines;
}

/** Extractor for Excel (.xlsx/.xls) and CSV files */
export class ExcelCsvExtractor implements DocumentExtractor {
  async extract(_fileName: string, file?: File): Promise<ExtractedDocument> {
    if (!file) throw new Error('File object is required for Excel/CSV extraction');

    const arrayBuffer = await file.arrayBuffer();
    let rows: unknown[][];

    if (file.name.toLowerCase().endsWith('.csv')) {
      // Strip UTF-8 BOM if present so header field matching is not broken
      const text = new TextDecoder('utf-8').decode(arrayBuffer).replace(/^\uFEFF/, '');
      const allRows = text.split(/\r?\n/).filter(l => l.trim());
      const sep = detectSeparator(allRows[0] || '');
      rows = allRows.map(line => parseCsvLine(line, sep));
    } else {
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '' });
    }

    const lines = rowsToLines(rows);
    return {
      docNumber: undefined,
      docDate: new Date().toISOString().split('T')[0],
      lines,
    };
  }
}

/** Get the trimmed text content of the first element matching any of the given tag names */
function xmlText(parent: Element | Document, ...names: string[]): string {
  for (const name of names) {
    const el = parent.querySelector(name)
      ?? Array.from((parent as Element).children ?? []).find(c => c.tagName.toLowerCase() === name.toLowerCase());
    if (el?.textContent?.trim()) return el.textContent.trim();
  }
  return '';
}

/** Find repeated item elements within an XML document */
function findXmlItems(doc: Document): Element[] {
  const containers = ['items', 'lines', 'rows', 'products', 'body', 'Товари', 'Рядки', 'Позиції', 'InvoiceLines', 'cac:InvoiceLine'];
  const itemTags = ['item', 'line', 'row', 'product', 'Товар', 'Рядок', 'Позиція', 'InvoiceLine', 'cac:InvoiceLine'];
  for (const cname of containers) {
    const container = doc.querySelector(cname);
    if (container) {
      for (const itag of itemTags) {
        const found = Array.from(container.querySelectorAll(itag));
        if (found.length) return found;
      }
      if (container.children.length) return Array.from(container.children);
    }
  }
  for (const itag of itemTags) {
    const found = Array.from(doc.querySelectorAll(itag));
    if (found.length) return found;
  }
  return [];
}

/** Extractor for XML supplier invoice files */
export class XmlExtractor implements DocumentExtractor {
  async extract(_fileName: string, file?: File): Promise<ExtractedDocument> {
    if (!file) throw new Error('File object is required for XML extraction');

    const text = await file.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(text, 'application/xml');
    const parseError = doc.querySelector('parsererror');
    if (parseError) throw new Error('Невірний XML-файл: ' + (parseError.textContent?.slice(0, 120) ?? '') + ((parseError.textContent?.length ?? 0) > 120 ? '...' : ''));

    const root = doc.documentElement;

    const docNumber = xmlText(root, 'Number', 'DocNumber', 'Номер', 'InvoiceID', 'ID', 'id') || undefined;

    const rawDate = xmlText(root, 'Date', 'Дата', 'InvoiceDate', 'IssueDate', 'date');
    let docDate: string | undefined;
    if (rawDate) {
      // Accept ISO (YYYY-MM-DD) or DD.MM.YYYY
      if (/^\d{4}-\d{2}-\d{2}/.test(rawDate)) {
        docDate = rawDate.slice(0, 10);
      } else if (/^\d{2}\.\d{2}\.\d{4}$/.test(rawDate)) {
        const [dd, mm, yyyy] = rawDate.split('.');
        docDate = `${yyyy}-${mm}-${dd}`;
      }
    }

    const supplierName = xmlText(root,
      'SellerName', 'Постачальник', 'SupplierName', 'Seller', 'AccountingSupplierParty',
      'cac:AccountingSupplierParty', 'supplier', 'Supplier',
    ) || undefined;

    const items = findXmlItems(doc);
    const lines: ExtractedDocument['lines'] = [];
    for (const el of items) {
      const name = xmlText(el, 'Name', 'Назва', 'Найменування', 'Description', 'cbc:Name', 'cbc:Description', 'Item', 'Товар');
      if (!name) continue;
      const qty = parseNum(xmlText(el, 'Qty', 'Quantity', 'Кількість', 'Amount', 'cbc:InvoicedQuantity') || '1');
      if (qty <= 0) continue;
      const vatRateRaw = parseNum(xmlText(el, 'VAT', 'VATRate', 'ПДВ', 'VatRate', 'TaxRate', 'cbc:Percent'));
      const vatRate = vatRateRaw > 1 ? vatRateRaw / 100 : vatRateRaw || 0.2;
      const priceNetRaw = parseNum(xmlText(el, 'PriceNet', 'PriceExcl', 'ЦінаБезПДВ', 'NetPrice', 'cbc:PriceAmount'));
      const priceGrossRaw = parseNum(xmlText(el, 'Price', 'Ціна', 'UnitPrice', 'cbc:LineExtensionAmount'));
      const priceNet = priceNetRaw || (priceGrossRaw ? Number((priceGrossRaw / (1 + vatRate)).toFixed(4)) : 0);
      const lineTotalRaw = xmlText(el, 'Total', 'Сума', 'LineTotal', 'Amount', 'cbc:LineExtensionAmount');
      const lineTotal = lineTotalRaw ? parseNum(lineTotalRaw) : undefined;
      lines.push({
        name,
        supplierSku: xmlText(el, 'Article', 'Артикул', 'SKU', 'Code', 'cac:SellersItemIdentification') || undefined,
        barcode: xmlText(el, 'Barcode', 'Штрихкод', 'EAN', 'UPC') || undefined,
        qty,
        unit: xmlText(el, 'Unit', 'Одиниця', 'UOM', 'cbc:unitCode') || 'шт',
        priceNet,
        vatRate,
        lineTotal,
        confidence: 0.9,
      });
    }

    return {
      supplier: supplierName ? { name: supplierName } : undefined,
      docNumber,
      docDate: docDate ?? new Date().toISOString().split('T')[0],
      lines,
    };
  }
}

/** Parse filenames like Expense_0318580_19.02.2026.pdf/.xlsx/.csv/.xml → { docNumber, docDate } */
function parseExpenseFilename(fileName: string): { docNumber: string; docDate: string } | null {
  const base = fileName.replace(/\.(pdf|xlsx?|csv|xml)$/i, '');
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
  async extract(fileName: string, _file?: File): Promise<ExtractedDocument> {
    // Full demo data for the fixture file
    if (fileName.includes('Expense_0318580_19.02.2026')) {
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
    throw new Error('Цей файл вже був проведений раніше. Повторний імпорт заборонений.');
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

export async function processImportJob(data: AppData, jobId: string, extractor: DocumentExtractor, file?: File): Promise<AppData> {
  const jobIndex = data.importJobs.findIndex(j => j.id === jobId);
  if (jobIndex === -1) throw new Error('Import job not found');
  const job = data.importJobs[jobIndex];

  let updatedJob: ImportJob;
  const newParts: Part[] = [];
  const newMappings: SupplierProductMap[] = [];
  try {
    const extracted = await extractor.extract(job.sourceFilename, file);
    const supplierId = extracted.supplier?.supplierId;
    const now = new Date().toISOString();
    const lines = extracted.lines.map(line => normalizeLine(job.id, line)).map(l => {
      const matchedProductId = findMappedProduct(data, supplierId, l);
      if (!matchedProductId) {
        const newPart: Part = {
          id: generateId(),
          sku: l.supplierSkuRaw || l.barcodeRaw || `AUTO-${generateId()}`,
          name: l.nameRaw || 'Новий товар',
          category: '',
          purchasePrice: l.priceNet,
          salePrice: l.priceGross,
          stock: 0,
          minStock: 0,
          supplierId: supplierId || '',
        };
        newParts.push(newPart);
        if (supplierId && (l.supplierSkuRaw || l.barcodeRaw)) {
          newMappings.push({ supplierId, supplierSku: l.supplierSkuRaw, barcode: l.barcodeRaw, productId: newPart.id, updatedAt: now });
        }
        return { ...l, matchedProductId: newPart.id };
      }
      return { ...l, matchedProductId };
    });

    updatedJob = {
      ...job,
      status: 'DONE',
      supplierId,
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
  return {
    ...data,
    importJobs,
    inventory: [...data.inventory, ...newParts],
    supplierProductMap: [...data.supplierProductMap, ...newMappings],
  };
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
    note: `Імпорт (job ${draft.importJobId})`,
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
    importJobs: data.importJobs.filter(j => j.id !== draft.importJobId),
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
