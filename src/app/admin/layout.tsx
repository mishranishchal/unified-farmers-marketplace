
import AppLayout from '@/components/layout/app-layout';
import { ProStatusProvider } from '@/context/pro-status-context';
import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/server/auth';


export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();
  if (!user) {
    redirect('/login');
  }
  if (user.role !== 'admin') {
    redirect('/');
  }

  return (
    <ProStatusProvider>
      <AppLayout>{children}</AppLayout>
    </ProStatusProvider>
  );
}
