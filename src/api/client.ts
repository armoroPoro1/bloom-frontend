import type { ApiEnvelope, ApiError, AuthResponseDto } from './types';
import {trackActivity} from '../activity';

const API_BASE = ((import.meta as any).env?.VITE_API_BASE_URL as string | undefined) || '/api/v1';

const SESSION_KEY = 'bloom-api-session';
function readSession(): {accessToken?: string; refreshToken?: string} {
  try { return JSON.parse(sessionStorage.getItem(SESSION_KEY) || '{}'); } catch { return {}; }
}
const savedSession = readSession();
let currentAccessToken: string | null = savedSession.accessToken || null;
let currentRefreshToken: string | null = savedSession.refreshToken || null;
let inFlightRefresh: Promise<string | null> | null = null;

export function getAccessToken(): string | null {
  return currentAccessToken;
}

export function setSession(accessToken: string | null, refreshToken: string | null) {
  currentAccessToken = accessToken;
  currentRefreshToken = refreshToken;
  try {
    if (accessToken && refreshToken) sessionStorage.setItem(SESSION_KEY, JSON.stringify({accessToken, refreshToken}));
    else sessionStorage.removeItem(SESSION_KEY);
  } catch { /* Memory-only session when storage is unavailable. */ }
}

export function clearSession() {
  setSession(null, null);
  inFlightRefresh = null;
}

export class ApiClientError extends Error {
  code: string;
  details?: any;
  status: number;

  constructor(code: string, message: string, status: number, details?: any) {
    super(message);
    this.name = 'ApiClientError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

async function refreshAccessToken(): Promise<string | null> {
  if (!currentRefreshToken) return null;
  if (inFlightRefresh) return inFlightRefresh;

  inFlightRefresh = (async () => {
    try {
      const response = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: currentRefreshToken }),
      });

      if (!response.ok) {
        clearSession();
        return null;
      }

      const json: ApiEnvelope<AuthResponseDto> = await response.json();
      setSession(json.data.accessToken, json.data.refreshToken);
      return currentAccessToken;
    } catch {
      clearSession();
      return null;
    } finally {
      inFlightRefresh = null;
    }
  })();

  return inFlightRefresh;
}

export interface RequestOptions extends Omit<RequestInit, 'body'> {
  query?: Record<string, string | number | boolean | null | undefined>;
  body?: any;
  rawResponse?: boolean;
}

// Share concurrent reads only, scoped to the current session. Never cache writes or Response bodies.
const pendingReads=new Map<string,Promise<any>>();
export function apiRequest<T=any>(path:string,options:RequestOptions={}):Promise<T>{
 const read=(options.method||'GET').toUpperCase()==='GET';
 const request=()=>path==='/visits' ? requestOnce<T>(path,options) : trackActivity(read?'read':'action',()=>requestOnce<T>(path,options));
 if(!read||options.rawResponse||options.signal)return request();
 const key=JSON.stringify([currentAccessToken,path,options.query,Array.from(new Headers(options.headers).entries())]);
 const pending=pendingReads.get(key);if(pending)return pending;
 const tracked=request().finally(()=>{if(pendingReads.get(key)===tracked)pendingReads.delete(key);});
 pendingReads.set(key,tracked);return tracked;
}

async function requestOnce<T = any>(path: string, options: RequestOptions = {}, retryRateLimit = true): Promise<T> {
  let url = path.startsWith('http') ? path : `${API_BASE}${path.startsWith('/') ? path : '/' + path}`;

  if (options.query) {
    const params = new URLSearchParams();
    for (const [key, val] of Object.entries(options.query)) {
      if (val !== undefined && val !== null && val !== '') {
        params.append(key, String(val));
      }
    }
    const qs = params.toString();
    if (qs) url += (url.includes('?') ? '&' : '?') + qs;
  }

  const headers = new Headers(options.headers || {});
  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json');
  }

  if (currentAccessToken && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${currentAccessToken}`);
  }

  let bodyContent = options.body;
  if (bodyContent && !(bodyContent instanceof FormData) && !(bodyContent instanceof Blob)) {
    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
    bodyContent = JSON.stringify(bodyContent);
  }

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
      body: bodyContent,
    });
  } catch (err: any) {
    throw new ApiClientError('NETWORK_ERROR', 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาลองใหม่อีกครั้ง', 0, err);
  }

  // Handle 401 with refresh token rotation
  if (response.status === 401 && currentRefreshToken && !path.includes('/auth/login') && !path.includes('/auth/refresh')) {
    const newAccessToken = await refreshAccessToken();
    if (newAccessToken) {
      headers.set('Authorization', `Bearer ${newAccessToken}`);
      try {
        response = await fetch(url, {
          ...options,
          headers,
          body: bodyContent,
        });
      } catch (err: any) {
        throw new ApiClientError('NETWORK_ERROR', 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาลองใหม่อีกครั้ง', 0, err);
      }
    }
  }

  // Reads may wait for the server's rate-limit window once. Never replay writes.
  if(response.status===429 && retryRateLimit && (options.method||'GET').toUpperCase()==='GET' && !options.rawResponse){
    const retryAfter=response.headers.get('Retry-After');
    const seconds=retryAfter ? Number(retryAfter) : NaN;
    if(Number.isFinite(seconds) && seconds>=0 && seconds<=60){
      const token=currentAccessToken;
      await new Promise(resolve=>setTimeout(resolve,Math.max(1,seconds)*1000));
      if(token!==currentAccessToken)throw new ApiClientError('SESSION_CHANGED','Session changed; reload this page',401);
      return requestOnce<T>(path,options,false);
    }
  }

  if (options.rawResponse) {
    return response as unknown as T;
  }

  if (response.status === 204) {
    return null as unknown as T;
  }

  let json: any;
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try {
      json = await response.json();
    } catch {
      json = null;
    }
  }

  if (!response.ok) {
    const errorObj: ApiError = json?.error || {
      code: `HTTP_${response.status}`,
      message: response.statusText || 'เกิดข้อผิดพลาดในการประมวลผล',
    };
    throw new ApiClientError(errorObj.code, errorObj.message, response.status, errorObj.details);
  }

  return json;
}

export async function uploadFile(
  file: File | Blob,
  kind: 'product' | 'avatar' | 'proof' | 'article',
  filename = 'upload.webp',
): Promise<{ id: string; storageKey: string; mime: string; sizeBytes: number }> {
  const formData = new FormData();
  formData.append('file', file, filename);

  const envelope = await apiRequest<ApiEnvelope<{ id: string; storageKey: string; mime: string; sizeBytes: number }>>(
    `/uploads?kind=${kind}`,
    {
      method: 'POST',
      body: formData,
    },
  );
  return envelope.data;
}

export async function fetchPrivateBlob(uploadId: string): Promise<Blob> {
  return trackActivity('read', () => readPrivateBlob(uploadId));
}

async function readPrivateBlob(uploadId: string): Promise<Blob> {
  const url = `${API_BASE}/uploads/${uploadId}`;
  const headers = new Headers();
  if (currentAccessToken) {
    headers.set('Authorization', `Bearer ${currentAccessToken}`);
  }

  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new ApiClientError('FILE_NOT_FOUND', 'ไม่พบไฟล์หรือไม่มีสิทธิ์เข้าถึง', response.status);
  }
  return response.blob();
}

export async function downloadFile(path: string, filename: string): Promise<void> {
  return trackActivity('action', () => saveDownload(path, filename));
}

async function saveDownload(path: string, filename: string): Promise<void> {
  const url = path.startsWith('http') ? path : `${API_BASE}${path.startsWith('/') ? path : '/' + path}`;
  const headers = new Headers();
  if (currentAccessToken) {
    headers.set('Authorization', `Bearer ${currentAccessToken}`);
  }

  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new ApiClientError('DOWNLOAD_FAILED', 'ดาวน์โหลดไฟล์ไม่สำเร็จ', response.status);
  }

  const blob = await response.blob();
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
}
