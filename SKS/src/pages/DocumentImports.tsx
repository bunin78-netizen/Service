import { useMemo, useState } from 'react';
import { AppData, ImportJobStatus } from '../types';
import { MockExtractor, createImportJob, createReceiptDraft, deleteImportJob, hashFile, mapImportLine, postReceiptDraft, processImportJob, validateImportLine } from '../services/imports';

const STATUS_OPTIONS: { value: '' | ImportJobStatus; label: string }[] = [
  { value: '', label: 'Всі статуси' },
  { value: 'DONE', label: 'Виконано' },
  { value: 'FAILED', label: 'Помилка' },
  { value: 'PROCESSING', label: 'Обробляється' },
  { value: 'QUEUED', label: 'В черзі' },
];

export default function DocumentImports({ data, updateData }: { data: AppData; updateData: (patch: Partial<AppData>) => void }) {
  const [selectedJobId, setSelectedJobId] = useState<string | null>(data.importJobs[0]?.id || null);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'' | ImportJobStatus>('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const extractor = useMemo(() => new MockExtractor(), []);

  const currentUser = data.users.find(u => u.id === data.currentUserId);
  const isAdmin = currentUser?.role === 'admin';

  const selectedJob = data.importJobs.find(j => j.id === selectedJobId) || null;
  const selectedDraft = selectedJob ? data.receiptDrafts.find(d => d.importJobId === selectedJob.id) : undefined;

  const filteredJobs = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data.importJobs.filter(job => {
      if (statusFilter && job.status !== statusFilter) return false;
      if (dateFrom && job.docDate && job.docDate < dateFrom) return false;
      if (dateTo && job.docDate && job.docDate > dateTo) return false;
      if (q) {
        const haystack = `${job.sourceFilename} ${job.docNumber || ''}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [data.importJobs, search, statusFilter, dateFrom, dateTo]);

  const onUpload = async (file?: File) => {
    if (!file) return;
    setBusy(true);
    try {
      const fileHash = await hashFile(file);
      const job = createImportJob(data, { filename: file.name, fileHash, filePath: file.name, createdBy: data.currentUserId || 'u1' });
      const withJob: AppData = { ...data, importJobs: [job, ...data.importJobs] };
      const processed = await processImportJob(withJob, job.id, extractor);
      updateData({ importJobs: processed.importJobs, inventory: processed.inventory, supplierProductMap: processed.supplierProductMap });
      setSelectedJobId(job.id);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Не вдалося завантажити файл');
    } finally {
      setBusy(false);
    }
  };

  const onMapLine = (lineId: string, productId: string) => {
    if (!selectedJob) return;
    const next = mapImportLine(data, selectedJob.id, lineId, productId);
    updateData({ importJobs: next.importJobs, supplierProductMap: next.supplierProductMap });
  };

  const onCreateDraft = () => {
    if (!selectedJob) return;
    const next = createReceiptDraft(data, selectedJob.id);
    updateData({ receiptDrafts: next.receiptDrafts });
  };

  const onPost = () => {
    if (!selectedDraft) return;
    try {
      const next = postReceiptDraft(data, selectedDraft.id);
      updateData({
        inventory: next.inventory,
        warehouseDocuments: next.warehouseDocuments,
        receiptDrafts: next.receiptDrafts,
      });
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Не вдалося провести документ');
    }
  };

  const onDeleteJob = (jobId: string) => {
    if (!window.confirm('Видалити цей імпорт?')) return;
    try {
      const next = deleteImportJob(data, jobId);
      updateData({ importJobs: next.importJobs, receiptDrafts: next.receiptDrafts });
      if (selectedJobId === jobId) {
        const deletedIndex = data.importJobs.findIndex(j => j.id === jobId);
        const fallback = data.importJobs[deletedIndex + 1] || data.importJobs[deletedIndex - 1];
        setSelectedJobId(fallback?.id || null);
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Не вдалося видалити');
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border shadow-sm">
        <h2 className="text-xl font-bold mb-3">Імпорт документів постачальника (PDF)</h2>
        <input type="file" accept="application/pdf" disabled={busy} onChange={(e) => onUpload(e.target.files?.[0])} className="block w-full text-sm" />
        <p className="text-xs text-neutral-500 mt-2">Для демо використайте файл з назвою: Expense_0318580_19.02.2026.pdf</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl border p-4 space-y-2">
          <h3 className="font-semibold">Імпорти</h3>
          <div className="space-y-2 mb-2">
            <input
              type="text"
              placeholder="Пошук за файлом або номером"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full border rounded-lg px-2 py-1 text-sm"
            />
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as '' | ImportJobStatus)}
              className="w-full border rounded-lg px-2 py-1 text-sm"
            >
              {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <div className="flex gap-1">
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="flex-1 border rounded-lg px-2 py-1 text-xs" title="Дата від" />
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="flex-1 border rounded-lg px-2 py-1 text-xs" title="Дата до" />
            </div>
          </div>
          {filteredJobs.length === 0 && <p className="text-xs text-neutral-400">Нічого не знайдено</p>}
          {filteredJobs.map(job => (
            <div key={job.id} className="relative group">
              <button onClick={() => setSelectedJobId(job.id)} className={`w-full text-left rounded-lg border p-3 ${selectedJobId === job.id ? 'border-blue-500 bg-blue-50' : 'border-neutral-200'}`}>
                <div className="font-medium text-sm pr-6">{job.sourceFilename}</div>
                <div className="text-xs text-neutral-500">{job.status}{job.docDate ? ` · ${job.docDate}` : ''}</div>
              </button>
              {isAdmin && (
                <button
                  onClick={(e) => { e.stopPropagation(); onDeleteJob(job.id); }}
                  className="absolute top-2 right-2 w-5 h-5 flex items-center justify-center rounded text-neutral-400 hover:bg-red-100 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity text-xs font-bold"
                  title="Видалити"
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="lg:col-span-2 bg-white rounded-2xl border p-4">
          {!selectedJob && <p className="text-sm text-neutral-500">Оберіть імпорт.</p>}
          {selectedJob && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">Документ № {selectedJob.docNumber || '—'}</h3>
                  <p className="text-xs text-neutral-500">Статус: {selectedJob.status}. Дата: {selectedJob.docDate || '—'}</p>
                </div>
                <div className="space-x-2">
                  <button onClick={onCreateDraft} disabled={selectedJob.status !== 'DONE'} className="px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm disabled:opacity-40">Створити черновик</button>
                  <button onClick={onPost} disabled={!selectedDraft || selectedDraft.status === 'POSTED'} className="px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm disabled:opacity-40">Провести</button>
                </div>
              </div>

              <div className="overflow-auto border rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-neutral-50">
                    <tr>
                      <th className="p-2 text-left">Найменування</th>
                      <th className="p-2 text-left">К-сть</th>
                      <th className="p-2 text-left">Ціна</th>
                      <th className="p-2 text-left">ПДВ</th>
                      <th className="p-2 text-left">Confidence</th>
                      <th className="p-2 text-left">Товар</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedJob.lines.map(line => {
                      const invalid = validateImportLine(line).length > 0;
                      return (
                        <tr key={line.id} className={`${line.confidence < 0.9 || invalid ? 'bg-amber-50' : ''}`}>
                          <td className="p-2">{line.nameRaw}</td>
                          <td className="p-2">{line.qty}</td>
                          <td className="p-2">{line.priceGross.toFixed(2)}</td>
                          <td className="p-2">{(line.vatRate * 100).toFixed(0)}%</td>
                          <td className="p-2">{line.confidence.toFixed(2)}</td>
                          <td className="p-2">
                            <select className="border rounded p-1" value={line.matchedProductId || ''} onChange={(e) => onMapLine(line.id, e.target.value)}>
                              <option value="">Не зіставлено</option>
                              {data.inventory.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {selectedDraft && (
                <div className="text-sm rounded-lg bg-neutral-50 border p-3">
                  Черновик: <b>{selectedDraft.status}</b>, сума: {selectedDraft.totalGross.toFixed(2)} грн
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
