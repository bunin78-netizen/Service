import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { applyMapping, normalizeHeader, postImportPreview, upsertImportMapping, validateRows } from '../src/services/importMapping.ts';

const baseData = {
  suppliers: [
    { id: 's1', name: 'Omega Supplier', aliases: ['omega'] },
    { id: 's2', name: 'Inter Cars' },
    { id: 's3', name: 'Elit' },
    { id: 's4', name: 'AutoTechnics' },
  ],
  warehouseDocuments: [],
  importMappings: [],
};

test('normalizeHeader trims/lowercases and strips symbols', () => {
  assert.equal(normalizeHeader('  № Артикул: Товар  '), 'артикул товар');
});

test('applyMapping maps rows to internal dto', () => {
  const mapping = {
    id: 'm1', supplier_id: 's1', file_type: 'xlsx', header_row: 1, version: 1, created_at: '', updated_at: '',
    columns: { document_number: ['doc no'], product_name: ['name'], quantity: ['qty'], price_gross: ['total'] },
  };
  const rows = [['Doc No', 'Name', 'Qty', 'Total'], ['INV-1', 'Oil', '2', '100']];
  const out = applyMapping(rows, mapping);
  assert.equal(out.doc.header.document_number, 'INV-1');
  assert.equal(out.doc.items[0].product_name, 'Oil');
  assert.equal(out.doc.items[0].quantity, 2);
});

test('validateRows catches invalid numbers', () => {
  const errors = validateRows({ header: { supplier_id: 's1', document_number: 'D1' }, items: [{ product_name: 'a', quantity: 0, price_gross: -1 }] });
  assert.equal(errors.length, 2);
});

test('integration preview on provided sample files (if available)', async (t) => {
  const files = [
    '/mnt/data/Expense_0140718_22.01.2026.xlsx',
    '/mnt/data/lines_2026-02-01_-_2026-02-28.xlsx',
    '/mnt/data/KH26F010331.xlsx',
    '/mnt/data/invoice-UA_UU1_SIP_26007959 (3).csv',
  ];

  if (!files.every((f) => fs.existsSync(f))) {
    t.skip('sample files are not available in current environment');
    return;
  }

  const data = JSON.parse(JSON.stringify(baseData));
  const mappingsBySupplier = {
    s1: { header_row: 1, file_type: 'xlsx' },
    s2: { header_row: 1, file_type: 'xlsx' },
    s3: { header_row: 1, file_type: 'xlsx' },
    s4: { header_row: 1, file_type: 'csv' },
  };
  Object.entries(mappingsBySupplier).forEach(([supplierId, meta]) => {
    upsertImportMapping(data, {
      supplier_id: supplierId,
      file_type: meta.file_type,
      header_row: meta.header_row,
      columns: {
        document_number: ['номер', 'doc no', 'invoice'],
        document_date: ['дата', 'date'],
        product_name: ['найменування', 'name', 'description', 'товар', 'item'],
        supplier_sku: ['артикул', 'sku', 'код'],
        quantity: ['кількість', 'qty', 'кол-во', 'quantity'],
        price_gross: ['сума', 'total', 'line total', 'ціна з пдв'],
      },
    });
  });

  for (const filePath of files) {
    const blob = fs.readFileSync(filePath);
    const f = new File([blob], filePath.split('/').pop());
    const preview = await postImportPreview(data, f);
    assert.ok(preview.debug.detected_headers.length > 0);
  }
});
