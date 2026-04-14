'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { UserRole } from '@/lib/types';
import { useAuth } from '@/context/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Tractor } from 'lucide-react';

const roleLabels: Record<UserRole, string> = {
  user: 'Farmer',
  buyer: 'Buyer',
  admin: 'Admin',
};

export default function LoginPage() {
  const [role, setRole] = useState<UserRole>('user');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();
  const { login } = useAuth();
  const { toast } = useToast();

  const handleLogin = async () => {
    setSubmitting(true);
    try {
      const user = await login(email, password, role);
      toast({
        title: 'Login Successful',
        description: `Welcome back, ${user.name.split(' ')[0]}!`,
      });
      if (user.role === 'admin') {
        router.push('/admin/dashboard');
      } else {
        router.push(user.role === 'buyer' ? '/buyers' : '/');
      }
    } catch (error) {
        toast({
        variant: 'destructive',
        title: 'Login Failed',
        description: (error as Error).message,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm brand-panel">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex items-center justify-center gap-2">
            <Tractor className="h-10 w-10 text-accent" />
            <h1 className="text-2xl font-bold font-headline">Farmer&apos;s Marketplace</h1>
          </div>
          <CardTitle className="text-2xl font-headline">Verified Login</CardTitle>
          <CardDescription>Choose your role and sign in directly with your password. OTP stays on signup only.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select
              value={role}
              onValueChange={(value) => setRole(value as UserRole)}
            >
              <SelectTrigger id="role">
                <SelectValue placeholder="Select your role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">Farmer</SelectItem>
                <SelectItem value="buyer">Buyer</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="farmer@farmersmarketplace.app"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>
          <p className="rounded-lg border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            {roleLabels[role]} sessions are restored from the secure app cookie, so returning users stay recognizable after signing in again.
          </p>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button className="w-full" onClick={handleLogin} disabled={submitting || !email || !password}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Sign In
          </Button>
          <div className="text-center text-[11px] leading-relaxed text-muted-foreground">
            <p>Developers: Nishchal Mishra (2200970130075), Prakhar Barsainya (2200970130083), Priyanshu Maurya (2200970130094)</p>
            <p>Mentor: Mr. Vineet Kumar Chauhan</p>
          </div>
          <p className="pt-4 text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="font-medium text-primary hover:underline">
              Sign up
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
