import CommunityClient from './community-client';
import { platformStore } from '@/lib/server/store';

export default async function CommunityPage() {
  const posts = await platformStore.listPosts();

  return <CommunityClient initialPosts={posts} />;
}
