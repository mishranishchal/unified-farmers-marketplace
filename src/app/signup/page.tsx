'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { AuthOtpDispatch, UserRole } from '@/lib/types';
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
import { Loader2, ShieldCheck, Tractor } from 'lucide-react';

const roleLabels: Record<UserRole, string> = {
  user: 'Farmer',
  buyer: 'Buyer',
  admin: 'Admin',
};

function getInitialRole(value: string | null): UserRole {
  if (value === 'buyer' || value === 'admin') return value;
  return 'user';
}

export default function SignupPage() {
  const [role, setRole] = useState<UserRole>('user');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [challenge, setChallenge] = useState<AuthOtpDispatch | null>(null);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [clock, setClock] = useState(() => Date.now());
  const router = useRouter();
  const { requestSignupOtp, verifySignupOtp } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setRole(getInitialRole(new URLSearchParams(window.location.search).get('role')));
  }, []);

  useEffect(() => {
    if (!challenge) return;
    const timer = window.setInterval(() => setClock(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [challenge]);

  const resendCountdown = useMemo(() => {
    if (!challenge) return 0;
    return Math.max(0, Math.ceil((new Date(challenge.resendAvailableAt).getTime() - clock) / 1000));
  }, [challenge, clock]);

  const resetChallenge = () => {
    setChallenge(null);
    setOtp('');
  };

  const handleRequestOtp = async () => {
    setSendingOtp(true);
    try {
      const nextChallenge = await requestSignupOtp(name, email, password, role);
      setChallenge(nextChallenge);
      setOtp('');
      toast({
        title: challenge ? 'OTP Resent' : 'OTP Generated',
        description: `Check your inbox for the ${roleLabels[role].toLowerCase()} verification code.`,
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'OTP Request Failed',
        description: (error as Error).message,
      });
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!challenge) return;
    setVerifyingOtp(true);
    try {
      const user = await verifySignupOtp(challenge.requestToken, otp);
      toast({
        title: 'Account Verified',
        description: `${roleLabels[user.role]} account created successfully.`,
      });
      if (user.role === 'admin') {
        router.push('/admin/dashboard');
      } else {
        router.push(user.role === 'buyer' ? '/buyers' : '/');
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'OTP Verification Failed',
        description: (error as Error).message,
      });
    } finally {
      setVerifyingOtp(false);
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
          <CardTitle className="text-2xl font-headline">Create Verified Account</CardTitle>
          <CardDescription>Register as farmer or buyer with role selection and one-time OTP verification.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select
              value={role}
              onValueChange={(value) => {
                setRole(value as UserRole);
                resetChallenge();
              }}
            >
              <SelectTrigger id="role">
                <SelectValue placeholder="Select your role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">Farmer</SelectItem>
                <SelectItem value="buyer">Buyer</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">Full Name / Business Name</Label>
            <Input
              id="name"
              placeholder="John Doe"
              required
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                resetChallenge();
              }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="farmer@farmersmarketplace.app"
              required
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                resetChallenge();
              }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              required
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                resetChallenge();
              }}
            />
          </div>

          {challenge ? (
            <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <ShieldCheck className="h-4 w-4 text-accent" />
                {challenge.deliveryMode === 'preview' ? 'OTP generated for local preview' : `OTP sent to ${challenge.destination}`}
              </div>
              <p className="text-xs text-muted-foreground">
                Complete verification within 10 minutes to create the account. Resend {challenge.sendCount} of {challenge.maxSendCount} used.
                {resendCountdown > 0 ? ` New resend available in ${resendCountdown}s.` : ' You can request a fresh code now.'}
              </p>
              {challenge.deliveryMode === 'preview' && challenge.debugCode && (
                <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900">
                  OTP preview: <span className="font-mono">{challenge.debugCode}</span>
                </p>
              )}
              <div className="space-y-2">
                <Label htmlFor="otp">One-Time Password</Label>
                <Input
                  id="otp"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="Enter 6-digit OTP"
                  value={otp}
                  onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))}
                />
              </div>
            </div>
          ) : (
            <p className="rounded-lg border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              {`${roleLabels[role]} signup now creates the account only after OTP verification.`}
            </p>
          )}
        </CardContent>
        <CardFooter className="flex-col gap-4">
          <Button
            className="w-full"
            onClick={handleRequestOtp}
            disabled={sendingOtp || verifyingOtp || !name || !email || !password || resendCountdown > 0}
          >
            {sendingOtp && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {challenge ? (resendCountdown > 0 ? `Resend OTP in ${resendCountdown}s` : 'Resend OTP') : 'Send OTP'}
          </Button>
          <Button
            className="w-full"
            variant="secondary"
            onClick={handleVerifyOtp}
            disabled={sendingOtp || verifyingOtp || !challenge || otp.length !== 6}
          >
            {verifyingOtp && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Verify OTP and Create Account
          </Button>
          <p className="pt-4 text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link href="/login" className="font-medium text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
