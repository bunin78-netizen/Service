import { AppData, ImportMapping } from '../types';
import { getImportMappings, postImportCommit, postImportPreview, upsertImportMapping } from './importMapping';

export async function postApiImportPreview(data: AppData, file: File) {
  return postImportPreview(data, file);
}

export async function postApiImportCommit(data: AppData, file: File, confirm: boolean) {
  return postImportCommit(data, file, confirm);
}

export function getApiImportMappings(data: AppData, supplierId: string, fileType: 'xlsx' | 'csv') {
  return getImportMappings(data, supplierId, fileType);
}

export function postApiImportMappings(data: AppData, mapping: Omit<ImportMapping, 'id' | 'version' | 'created_at' | 'updated_at'>) {
  return upsertImportMapping(data, mapping);
}
