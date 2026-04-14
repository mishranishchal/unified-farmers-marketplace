import BuyersClient from './buyers-client';
import { platformStore } from '@/lib/server/store';

export default async function BuyersPage() {
  const buyers = await platformStore.listBuyers();

  return <BuyersClient initialBuyers={buyers} />;
}
