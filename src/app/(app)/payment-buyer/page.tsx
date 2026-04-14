'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ShieldCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function PaymentBuyerPage() {
  const { user, updateUser } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const activateBuyerRole = async () => {
    if (!user) return;
    setLoading(true);
    try {
      await updateUser({ ...user, role: 'buyer', isPro: true, aiCredits: 9999 });
      toast({
        title: 'Buyer role activated',
        description: 'Your account can now access buyer workflows.',
      });
      router.push('/buyers');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-8 items-center justify-center min-h-[calc(100vh-10rem)]">
      <Card className="w-full max-w-2xl brand-panel">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl">Buyer Account Activation</CardTitle>
          <CardDescription>Upgrade the current authenticated user to the buyer role and persist the change in the local database.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-center gap-3 text-primary">
            <ShieldCheck className="h-6 w-6" />
            <span className="font-medium">Role changes now go through the authenticated profile update API.</span>
          </div>
        </CardContent>
        <CardFooter className="flex justify-center gap-3">
          <Button variant="outline" asChild>
            <Link href="/">Back</Link>
          </Button>
          <Button onClick={activateBuyerRole} disabled={loading || !user}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Activate Buyer Role
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
