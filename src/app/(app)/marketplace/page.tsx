import MarketplaceClient from './marketplace-client';
import { platformStore } from '@/lib/server/store';

export default async function MarketplacePage() {
  const [products, listings, locations] = await Promise.all([
    platformStore.listProducts(),
    platformStore.listListings(),
    platformStore.listLocations(),
  ]);

  return <MarketplaceClient initialProducts={products} initialListings={listings} locationOptions={locations} />;
}
