import { cookies } from 'next/headers';
import type { CommodityPrice, SafeUser, UserRole } from '@/lib/types';

const BACKEND_API_URL = process.env.BACKEND_API_URL?.replace(/\/$/, '') || '';
const AI_SERVICE_URL = process.env.AI_SERVICE_URL?.replace(/\/$/, '') || '';

export const backendAccessCookieName = 'backend_access_token';
export const backendRefreshCookieName = 'backend_refresh_token';

export function hasBackendUpstream() {
  return Boolean(BACKEND_API_URL);
}

export function hasAiUpstream() {
  return Boolean(AI_SERVICE_URL);
}

export function mapRoleFromBackend(role: string | undefined): UserRole {
  if (role === 'buyer' || role === 'admin') return role;
  return 'user';
}

export function mapRoleToBackend(role: UserRole | undefined): 'farmer' | 'buyer' | 'admin' {
  if (role === 'buyer' || role === 'admin') return role;
  return 'farmer';
}

export function normalizeBackendUser(user: {
  id?: string;
  _id?: string;
  name?: string;
  email?: string;
  role?: string;
}): SafeUser {
  const timestamp = new Date().toISOString();
  return {
    id: user.id || user._id || 'remote-user',
    name: user.name || 'User',
    email: user.email || '',
    role: mapRoleFromBackend(user.role),
    status: 'active',
    isPro: true,
    aiCredits: 9999,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function parseSetCookieValue(setCookie: string | null, cookieName: string): string | null {
  if (!setCookie) return null;
  const escaped = cookieName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = setCookie.match(new RegExp(`${escaped}=([^;]+)`));
  return match?.[1] ?? null;
}

export async function setBackendAuthCookiesFromResponse(response: Response, accessToken?: string | null) {
  const cookieStore = cookies();
  const setCookies = typeof (response.headers as Headers & { getSetCookie?: () => string[] }).getSetCookie === 'function'
    ? (response.headers as Headers & { getSetCookie: () => string[] }).getSetCookie()
    : [];
  const joined = setCookies.join('; ');
  const refreshToken = parseSetCookieValue(joined, 'refreshToken');
  const upstreamAccessToken = accessToken || parseSetCookieValue(joined, 'accessToken');

  if (upstreamAccessToken) {
    cookieStore.set(backendAccessCookieName, upstreamAccessToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 15,
    });
  }

  if (refreshToken) {
    cookieStore.set(backendRefreshCookieName, refreshToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });
  }
}

export function clearBackendAuthCookies() {
  const cookieStore = cookies();
  for (const name of [backendAccessCookieName, backendRefreshCookieName]) {
    cookieStore.set(name, '', {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 0,
    });
  }
}

export async function fetchBackend(path: string, init?: RequestInit) {
  const accessToken = cookies().get(backendAccessCookieName)?.value;
  const headers = new Headers(init?.headers);
  if (!headers.has('Content-Type') && init?.body) headers.set('Content-Type', 'application/json');
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);

  return fetch(`${BACKEND_API_URL}${path}`, {
    ...init,
    headers,
    cache: 'no-store',
  });
}

export async function fetchAi<T>(path: string, body: Record<string, unknown>): Promise<T | null> {
  if (!hasAiUpstream()) return null;
  const response = await fetch(`${AI_SERVICE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
  });
  if (!response.ok) return null;
  return (await response.json()) as T;
}

export function normalizeBackendPrices(prices: Array<Record<string, unknown>>): CommodityPrice[] {
  return prices.map((price, index) => {
    const value = Number(price.currentPrice ?? price.price ?? 0);
    const previous = Number(price.previousPrice ?? value);
    const changePct = previous ? Number((((value - previous) / previous) * 100).toFixed(2)) : 0;
    return {
      id: String(price._id ?? price.id ?? `remote-price-${index}`),
      commodity: String(price.commodity ?? 'Commodity'),
      market: String(price.market ?? 'Market'),
      price: value,
      unit: 'INR/quintal',
      changePct,
      trend: changePct > 0 ? 'up' : changePct < 0 ? 'down' : 'stable',
      timestamp: String(price.updatedAt ?? price.createdAt ?? new Date().toISOString()),
    };
  });
}
