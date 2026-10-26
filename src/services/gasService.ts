import { FieldDefinition, FieldType, GasEndpointConfig, GasRecord } from '../types/gas';

export async function fetchGasData(config: GasEndpointConfig): Promise<{
  records: GasRecord[];
  headers: string[];
  rawResponse: any;
}> {
  if (!config.url || !config.url.trim()) {
    throw new Error('กรุณาระบุ URL ของ Google Apps Script Web App');
  }

  const endpointUrl = config.url.trim();
  let fetchUrl = endpointUrl;

  // Append action param or sheetName if specified
  const urlObj = new URL(endpointUrl);
  if (config.sheetName) {
    urlObj.searchParams.set('sheet', config.sheetName);
  }
  if (config.actionParam) {
    urlObj.searchParams.set('action', config.actionParam);
  }

  if (config.useProxy) {
    fetchUrl = `/api/gas-proxy?url=${encodeURIComponent(urlObj.toString())}`;
  } else {
    fetchUrl = urlObj.toString();
  }

  const response = await fetch(fetchUrl, {
    method: 'GET',
    headers: {
      'Accept': 'application/json, text/plain, */*',
      ...(config.headers || {})
    },
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(`HTTP Error ${response.status}: ${errText || response.statusText}`);
  }

  const textData = await response.text();
  let parsed: any;
  try {
    parsed = JSON.parse(textData);
  } catch {
    throw new Error('ไม่สามารถแปลงข้อมูลที่ได้รับเป็น JSON ได้ ตรวจสอบว่า Apps Script ส่งค่าผ่าน ContentService.createTextOutput().setMimeType(JSON)');
  }

  let records: GasRecord[] = [];
  let headers: string[] = [];

  if (Array.isArray(parsed)) {
    records = parsed;
  } else if (parsed && Array.isArray(parsed.data)) {
    records = parsed.data;
    if (Array.isArray(parsed.headers)) {
      headers = parsed.headers;
    }
  } else if (parsed && Array.isArray(parsed.records)) {
    records = parsed.records;
  } else if (parsed && Array.isArray(parsed.values)) {
    // 2D Array format like Google Sheets API
    if (parsed.values.length > 0) {
      headers = parsed.values[0].map((h: any) => String(h).trim());
      for (let i = 1; i < parsed.values.length; i++) {
        const row = parsed.values[i];
        const item: any = { _rowIndex: i + 1 };
        headers.forEach((h, idx) => {
          item[h] = row[idx] !== undefined ? row[idx] : '';
        });
        records.push(item);
      }
    }
  } else if (typeof parsed === 'object' && parsed !== null) {
    // Single object returned
    records = [parsed];
  }

  // Auto detect headers if not provided
  if (headers.length === 0 && records.length > 0) {
    const keySet = new Set<string>();
    records.forEach(r => {
      Object.keys(r).forEach(k => {
        if (!k.startsWith('_')) {
          keySet.add(k);
        }
      });
    });
    headers = Array.from(keySet);
  }

  // Ensure every record has an id property
  const normalizedRecords = records.map((r, idx) => {
    const idKey = Object.keys(r).find(k => k.toLowerCase() === 'id' || k.toLowerCase().endsWith('id')) || headers[0] || 'id';
    return {
      ...r,
      id: r.id !== undefined ? r.id : (r[idKey] !== undefined ? r[idKey] : `row-${idx + 1}`),
    };
  });

  return {
    records: normalizedRecords,
    headers,
    rawResponse: parsed,
  };
}

export async function sendGasPostAction(
  config: GasEndpointConfig,
  payload: {
    action: 'create' | 'insert' | 'update' | 'delete' | string;
    data?: any;
    id?: any;
    primaryKey?: string;
    [key: string]: any;
  }
): Promise<any> {
  if (!config.url || !config.url.trim()) {
    throw new Error('กรุณาระบุ URL ของ Google Apps Script');
  }

  const endpointUrl = config.url.trim();
  let fetchUrl = endpointUrl;
  let bodyPayload: any = payload;

  if (config.useProxy) {
    fetchUrl = '/api/gas-proxy';
    bodyPayload = {
      ...payload,
      _targetUrl: endpointUrl,
    };
  }

  const response = await fetch(fetchUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/plain, */*',
    },
    body: JSON.stringify(bodyPayload),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(`คำขอ POST ล้มเหลว (${response.status}): ${errText || response.statusText}`);
  }

  const resText = await response.text();
  try {
    return JSON.parse(resText);
  } catch {
    return { success: true, message: resText };
  }
}

export function inferSchemaFromRecords(records: GasRecord[], headers: string[], primaryKey?: string): FieldDefinition[] {
  if (records.length === 0 && headers.length === 0) {
    return [
      { key: 'id', label: 'ID', type: 'string', isPrimaryKey: true, isRequired: true },
      { key: 'name', label: 'Name', type: 'string', isRequired: true },
    ];
  }

  const keys = headers.length > 0 ? headers : Array.from(new Set(records.flatMap(r => Object.keys(r))));
  const cleanKeys = keys.filter(k => !k.startsWith('_'));

  const determinedPrimaryKey = primaryKey || 
    cleanKeys.find(k => k.toLowerCase() === 'id' || k.toLowerCase().endsWith('id')) || 
    cleanKeys[0] || 'id';

  return cleanKeys.map(key => {
    const lower = key.toLowerCase();
    let type: FieldType = 'string';
    let options: string[] | undefined = undefined;

    // Check sample values across records
    const sampleValues = records.map(r => r[key]).filter(v => v !== undefined && v !== null && v !== '');

    if (sampleValues.length > 0) {
      const allNumbers = sampleValues.every(v => !isNaN(Number(v)) && typeof v !== 'boolean');
      const allBooleans = sampleValues.every(v => typeof v === 'boolean' || v === 'true' || v === 'false');
      const allDates = sampleValues.every(v => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v) && !isNaN(Date.parse(v)));
      const allEmails = sampleValues.every(v => typeof v === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v));

      if (allBooleans) {
        type = 'boolean';
      } else if (allNumbers && !lower.includes('phone') && !lower.includes('id') && !lower.includes('code') && !lower.includes('zip')) {
        type = 'number';
      } else if (allDates || lower.includes('date') || lower.includes('created') || lower.includes('updated')) {
        type = 'date';
      } else if (allEmails || lower.includes('email') || lower.includes('mail')) {
        type = 'email';
      } else if (lower.includes('phone') || lower.includes('tel') || lower.includes('mobile')) {
        type = 'phone';
      } else if (lower.includes('status') || lower.includes('state') || lower.includes('สถานะ')) {
        type = 'status';
        const distinct = Array.from(new Set(sampleValues.map(v => String(v))));
        if (distinct.length <= 8) {
          options = distinct;
        }
      } else {
        const distinct = Array.from(new Set(sampleValues.map(v => String(v))));
        if (distinct.length >= 2 && distinct.length <= 6 && records.length >= 4) {
          type = 'select';
          options = distinct;
        }
      }
    }

    return {
      key,
      label: formatLabel(key),
      type,
      options,
      isPrimaryKey: key === determinedPrimaryKey,
      isRequired: key === determinedPrimaryKey || lower.includes('name') || lower.includes('title'),
    };
  });
}

function formatLabel(key: string): string {
  // If already contains Thai or spaces
  if (/[\u0E00-\u0E7F]/.test(key) || key.includes(' ')) {
    return key;
  }
  // Convert camelCase to Title Case
  const formatted = key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ');
  return formatted.charAt(0).toUpperCase() + formatted.slice(1).trim();
}
