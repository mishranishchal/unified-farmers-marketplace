import { cookies } from 'next/headers';
import { platformStore } from '@/lib/server/store';
import type { SafeUser } from '@/lib/types';
import {
  backendAccessCookieName,
  fetchBackend,
  hasBackendUpstream,
  normalizeBackendUser,
} from '@/lib/server/upstream';

export function setLocalSessionCookie(user: SafeUser) {
  const token = platformStore.createSessionToken(user);
  cookies().set(platformStore.sessionCookieName, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });
}

export function clearLocalSessionCookie() {
  cookies().set(platformStore.sessionCookieName, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });
}

export async function getSessionUser(): Promise<SafeUser | null> {
  if (hasBackendUpstream()) {
    const backendToken = cookies().get(backendAccessCookieName)?.value;
    if (backendToken) {
      try {
        const response = await fetchBackend('/api/auth/me');
        if (response.ok) {
          const payload = (await response.json()) as { data?: { user?: Record<string, string> } };
          if (payload.data?.user) {
            return normalizeBackendUser(payload.data.user);
          }
        }
      } catch {
        // Fall back to local session if upstream auth is unavailable.
      }
    }
  }

  const token = cookies().get(platformStore.sessionCookieName)?.value;
  if (!token) return null;

  const session = platformStore.verifySessionToken(token);
  if (!session) return null;

  return platformStore.findUserByEmail(session.email);
}

export async function requireSessionUser(): Promise<SafeUser> {
  const user = await getSessionUser();
  if (!user) {
    throw new Error('Authentication required');
  }
  return user;
}
