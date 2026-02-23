import * as XLSX from '@e965/xlsx';
import type { AppData, ImportMapping, ImportPreviewResponse, ImportRowValidationError, InternalImportDocument, MappingColumns } from '../types.ts';

const STORAGE_KEY = 'smartkharkov_import_mappings';
const HEADER_ONLY_FIELDS: Array<keyof MappingColumns> = ['document_number', 'document_date', 'currency'];
const ITEM_FIELDS: Array<keyof MappingColumns> = ['product_name', 'supplier_sku', 'quantity', 'unit', 'price_net', 'vat_rate', 'vat_amount', 'price_gross'];

function generateId(prefix = 'id') {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export function detectFileType(fileName: string): 'xlsx' | 'csv' {
  return fileName.toLowerCase().endsWith('.csv') ? 'csv' : 'xlsx';
}

export function normalizeHeader(header: string): string {
  return header.trim().toLowerCase().replace(/[№:]/g, ' ').replace(/[\(\)\[\]{}"'`]/g, ' ').replace(/[^\p{L}\p{N}%/.\-\s_]/gu, ' ').replace(/\s+/g, ' ').trim();
}

function parseNumber(value: unknown, decimalSeparator = '.'): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (value == null) return undefined;
  const raw = String(value).trim();
  if (!raw) return undefined;
  const normalized = raw.replace(new RegExp(`\\${decimalSeparator}`, 'g'), '.').replace(/\s/g, '').replace(/,/g, '.');
  const n = Number.parseFloat(normalized);
  return Number.isFinite(n) ? n : undefined;
}

function parseDateValue(value: unknown): string | undefined {
  if (typeof value === 'number') {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) return `${parsed.y}-${`${parsed.m}`.padStart(2, '0')}-${`${parsed.d}`.padStart(2, '0')}`;
  }
  if (!value) return undefined;
  const s = String(value).trim();
  const dmy = s.match(/^(\d{2})[./-](\d{2})[./-](\d{4})$/);
  if (dmy) return `${dmy[3]}-${dmy[2]}-${dmy[1]}`;
  const iso = new Date(s);
  return Number.isNaN(iso.valueOf()) ? undefined : iso.toISOString().slice(0, 10);
}

function parseCsv(text: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let cur = ''; let row: string[] = []; let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else inQuotes = false; } else cur += ch;
      continue;
    }
    if (ch === '"') { inQuotes = true; continue; }
    if (ch === delimiter) { row.push(cur.trim()); cur = ''; continue; }
    if (ch === '\n' || ch === '\r') { if (ch === '\r' && text[i + 1] === '\n') i++; row.push(cur.trim()); if (row.some(Boolean)) rows.push(row); row = []; cur = ''; continue; }
    cur += ch;
  }
  if (cur || row.length) { row.push(cur.trim()); if (row.some(Boolean)) rows.push(row); }
  return rows;
}

function detectCsvDelimiter(firstLine: string): string {
  return [',', ';', '\t'].map((sep) => ({ sep, c: firstLine.split(sep).length - 1 })).sort((a, b) => b.c - a.c)[0].sep;
}

export async function readTabularData(file: File, options?: { sheetName?: string; delimiter?: string }): Promise<{ rows: unknown[][]; detectedHeaders: string[]; normalizedHeaders: string[] }> {
  const fileType = detectFileType(file.name);
  let rows: unknown[][] = [];
  if (fileType === 'csv') {
    const text = (await file.text()).replace(/^\uFEFF/, '');
    rows = parseCsv(text, options?.delimiter || detectCsvDelimiter(text.split(/\r?\n/)[0] || ''));
  } else {
    const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' });
    const sheetName = options?.sheetName && wb.SheetNames.includes(options.sheetName) ? options.sheetName : wb.SheetNames[0];
    rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, defval: '' });
  }

  const detectedHeaders = (rows[0] || []).map((c) => String(c ?? ''));
  return { rows, detectedHeaders, normalizedHeaders: detectedHeaders.map(normalizeHeader) };
}

function findMappedIndex(headers: string[], aliases: string[]) { return headers.findIndex((h) => aliases.map(normalizeHeader).includes(h)); }

function detectSupplierId(data: AppData, rows: unknown[][], fileName: string): string | undefined {
  const haystack = `${fileName}\n${rows.slice(0, 25).flat().join(' ')}`.toLowerCase();
  return data.suppliers.find((s) => [s.name, s.id, s.edrpou, s.inn, ...(s.aliases || [])].filter(Boolean).some((v) => haystack.includes(String(v).toLowerCase())))?.id;
}

export function applyMapping(rows: unknown[][], mapping: ImportMapping) {
  const headerRowIndex = Math.max(mapping.header_row - 1, 0);
  const headerCells = (rows[headerRowIndex] || []).map((c) => String(c ?? ''));
  const normalizedHeaders = headerCells.map(normalizeHeader);
  const matchedColumns: Record<string, string> = {};
  const columnIndex: Partial<Record<keyof MappingColumns, number>> = {};

  (Object.keys(mapping.columns) as Array<keyof MappingColumns>).forEach((field) => {
    const idx = findMappedIndex(normalizedHeaders, mapping.columns[field] || []);
    if (idx >= 0) { columnIndex[field] = idx; matchedColumns[field] = headerCells[idx]; }
  });

  const doc: InternalImportDocument = { header: { supplier_id: mapping.supplier_id, document_number: '', needs_manual_header: false }, items: [] };
  const firstRow = rows[headerRowIndex + 1] || [];

  for (const field of HEADER_ONLY_FIELDS) {
    const idx = columnIndex[field]; if (idx == null) continue;
    const value = firstRow[idx];
    if (field === 'document_number') doc.header.document_number = value ? String(value).trim() : '';
    if (field === 'document_date') doc.header.document_date = parseDateValue(value);
    if (field === 'currency') doc.header.currency = value ? String(value).trim() : undefined;
  }

  for (let i = headerRowIndex + 1; i < rows.length; i++) {
    const row = rows[i] || [];
    const item = { product_name: '', quantity: 0 } as InternalImportDocument['items'][number];
    for (const field of ITEM_FIELDS) {
      const idx = columnIndex[field]; if (idx == null) continue;
      const raw = row[idx];
      if (field === 'product_name') item.product_name = String(raw ?? '').trim();
      if (field === 'supplier_sku') item.supplier_sku = raw ? String(raw).trim() : undefined;
      if (field === 'quantity') item.quantity = parseNumber(raw, mapping.options?.decimal_separator) || 0;
      if (field === 'unit') item.unit = raw ? String(raw).trim() : undefined;
      if (['price_net', 'vat_rate', 'vat_amount', 'price_gross'].includes(field)) { const n = parseNumber(raw, mapping.options?.decimal_separator); if (n != null) (item as Record<string, unknown>)[field] = n; }
    }
    if (!item.product_name && !item.supplier_sku) continue;
    doc.items.push(item);
  }

  if (!doc.header.document_number) doc.header.needs_manual_header = true;
  return { doc, matchedColumns, unmappedHeaders: headerCells.filter((_, idx) => !Object.values(columnIndex).includes(idx)), detectedHeaders: headerCells };
}

export function validateRows(doc: InternalImportDocument): ImportRowValidationError[] {
  const errors: ImportRowValidationError[] = [];
  if (!doc.items.length) return [{ row_index: 0, field: 'items', message: 'Не знайдено жодного товарного рядка' }];
  doc.items.forEach((item, i) => {
    const row = i + 1;
    if (!(item.quantity > 0)) errors.push({ row_index: row, field: 'quantity', message: 'Кількість має бути > 0' });
    ['price_net', 'price_gross', 'vat_amount'].forEach((field) => {
      const value = (item as Record<string, unknown>)[field] as number | undefined;
      if (value != null && value < 0) errors.push({ row_index: row, field, message: `${field} має бути >= 0` });
    });
  });
  return errors;
}

function mappings(data: AppData) { return data.importMappings || []; }

export async function postImportPreview(data: AppData, file: File): Promise<ImportPreviewResponse> {
  const parsed = await readTabularData(file);
  const supplierId = detectSupplierId(data, parsed.rows, file.name);
  if (!supplierId) return { ok: false, error_code: 'supplier_unknown', warnings: ['Не вдалося визначити постачальника. Потрібен ручний mapping.'], errors: [], debug: { detected_headers: parsed.detectedHeaders, matched_columns: {}, unmapped_headers: parsed.normalizedHeaders } };

  const mapping = mappings(data).filter((m) => m.supplier_id === supplierId && m.file_type === detectFileType(file.name)).sort((a, b) => b.version - a.version)[0];
  if (!mapping) return { ok: false, error_code: 'header_missing', warnings: [`Не знайдено mapping для supplier_id=${supplierId}`], errors: [], debug: { detected_headers: parsed.detectedHeaders, matched_columns: {}, unmapped_headers: parsed.normalizedHeaders } };

  const applied = applyMapping(parsed.rows, mapping);
  const errors = validateRows(applied.doc);
  return {
    ok: errors.length === 0,
    error_code: errors.length ? 'validation_failed' : undefined,
    warnings: [],
    errors,
    data: applied.doc,
    debug: {
      detected_headers: applied.detectedHeaders,
      matched_columns: applied.matchedColumns,
      unmapped_headers: applied.unmappedHeaders,
      mapping_id: mapping.id,
      mapping_version: mapping.version,
    },
  };
}

export async function postImportCommit(data: AppData, file: File, confirm: boolean) {
  if (!confirm) return { ok: false, error_code: 'confirm_required' };
  const preview = await postImportPreview(data, file);
  if (!preview.ok || !preview.data) return { ok: false, error_code: preview.error_code || 'validation_failed' };
  const documentId = generateId('wd');
  const totalGross = preview.data.items.reduce((a, i) => a + (i.price_gross ?? i.price_net ?? 0) * i.quantity, 0);
  data.warehouseDocuments = [{
    id: documentId, type: 'incoming', number: preview.data.header.document_number || `DRAFT-${documentId}`,
    date: preview.data.header.document_date || new Date().toISOString().slice(0, 10), supplierId: preview.data.header.supplier_id,
    status: 'draft', createdAt: new Date().toISOString(), note: 'Created from import/commit',
    items: preview.data.items.map((item) => ({ id: generateId('wdi'), partId: '', name: item.product_name, quantity: item.quantity, price: item.price_gross ?? item.price_net ?? 0 })),
  }, ...data.warehouseDocuments];
  return { ok: true, warehouse_document_id: documentId, summary: { items_count: preview.data.items.length, total_gross: Number(totalGross.toFixed(2)) } };
}

export function getImportMappings(data: AppData, supplierId: string, fileType: 'xlsx' | 'csv') {
  return mappings(data).filter((m) => m.supplier_id === supplierId && m.file_type === fileType).sort((a, b) => b.version - a.version);
}

export function upsertImportMapping(data: AppData, payload: Omit<ImportMapping, 'id' | 'version' | 'created_at' | 'updated_at'>): ImportMapping {
  const prev = mappings(data).filter((m) => m.supplier_id === payload.supplier_id && m.file_type === payload.file_type).sort((a, b) => b.version - a.version)[0];
  const now = new Date().toISOString();
  const next: ImportMapping = { ...payload, id: prev?.id || generateId('map'), version: (prev?.version || 0) + 1, created_at: prev?.created_at || now, updated_at: now };
  data.importMappings = [next, ...mappings(data).filter((m) => m.id !== next.id)];
  if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY, JSON.stringify(data.importMappings));
  return next;
}

export function hydrateMappingsFromStorage(data: AppData) {
  if (typeof localStorage === 'undefined') return;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;
  try { const parsed = JSON.parse(raw) as ImportMapping[]; if (Array.isArray(parsed)) data.importMappings = parsed; } catch { /* noop */ }
}
