import PricesClient from './prices-client';
import { platformStore } from '@/lib/server/store';
import { fetchBackend, hasBackendUpstream, normalizeBackendPrices } from '@/lib/server/upstream';

export const dynamic = 'force-dynamic';

export default async function PricesPage() {
  const [rows, locations, config] = await Promise.all([
    hasBackendUpstream()
    ? await (async () => {
        try {
          const response = await fetchBackend('/api/prices');
          if (!response.ok) {
            return platformStore.listPrices();
          }
          const payload = (await response.json()) as { data?: { prices?: Array<Record<string, unknown>> } };
          return normalizeBackendPrices(payload.data?.prices ?? []);
        } catch {
          return platformStore.listPrices();
        }
      })()
    : await platformStore.listPrices(),
    platformStore.listLocations(),
    platformStore.getConfig(),
  ]);

  return <PricesClient initialRows={rows} locationOptions={locations} commodityOptions={config.categories.crops} />;
}
