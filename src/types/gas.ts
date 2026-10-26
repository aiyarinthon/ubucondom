export interface GasEndpointConfig {
  url: string;
  useProxy: boolean;
  autoRefreshInterval: number; // in seconds, 0 = off
  sheetName?: string;
  actionParam?: string; // e.g. 'read', 'getAll', 'list'
  headers?: Record<string, string>;
  isConnected: boolean;
  lastSyncedAt?: string;
}

export type FieldType = 'string' | 'number' | 'date' | 'boolean' | 'email' | 'phone' | 'select' | 'status' | 'image';

export interface FieldDefinition {
  key: string;
  label: string;
  type: FieldType;
  options?: string[]; // for select/status
  isPrimaryKey?: boolean;
  isRequired?: boolean;
}

export interface GasRecord {
  id?: string | number;
  [key: string]: any;
}

export interface DatasetPreset {
  id: string;
  name: string;
  nameTh: string;
  description: string;
  descriptionTh: string;
  icon: string;
  primaryKey: string;
  statusField?: string;
  fields: FieldDefinition[];
  data: GasRecord[];
  recommendedScript: string;
}

export interface GasApiResponse<T = any> {
  success?: boolean;
  status?: string | number;
  data?: T;
  records?: T;
  values?: any[][];
  message?: string;
  error?: string;
  [key: string]: any;
}

export interface ApiLogEntry {
  id: string;
  timestamp: string;
  method: 'GET' | 'POST';
  url: string;
  payload?: any;
  responseStatus: number;
  durationMs: number;
  success: boolean;
  responseBody: any;
  error?: string;
}
