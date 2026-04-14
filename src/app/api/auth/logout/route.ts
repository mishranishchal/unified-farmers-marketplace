import { cookies } from 'next/headers';
import { clearLocalSessionCookie } from '@/lib/server/auth';
import { ok } from '@/lib/server/http';
import {
  backendRefreshCookieName,
  clearBackendAuthCookies,
  fetchBackend,
  hasBackendUpstream,
} from '@/lib/server/upstream';

export async function POST() {
  if (hasBackendUpstream()) {
    const refreshToken = cookies().get(backendRefreshCookieName)?.value;
    try {
      await fetchBackend('/api/auth/logout', {
        method: 'POST',
        body: JSON.stringify(refreshToken ? { refreshToken } : {}),
      });
    } catch {
      // Ignore upstream logout failure and clear proxy cookies anyway.
    }

    clearBackendAuthCookies();
    clearLocalSessionCookie();
    return ok({ loggedOut: true });
  }

  clearLocalSessionCookie();
  clearBackendAuthCookies();
  return ok({ loggedOut: true });
}
