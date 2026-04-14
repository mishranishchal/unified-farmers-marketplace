'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useCart } from '@/hooks/use-cart';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle2, Loader2 } from 'lucide-react';

export default function PaymentPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { cart, clearCart } = useCart();
  const { toast } = useToast();
  const [address, setAddress] = useState('Pune, Maharashtra');
  const [method, setMethod] = useState<'upi' | 'card' | 'netbanking' | 'cod'>('upi');
  const [loading, setLoading] = useState(false);

  const total = useMemo(
    () => cart.reduce((sum, item) => sum + Number(String(item.price).replace(/[^0-9.]/g, '') || 0), 0),
    [cart]
  );

  const checkout = async () => {
    if (!user || cart.length === 0 || !address.trim()) return;
    setLoading(true);
    try {
      const orderRes = await fetch('/api/orders', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shippingAddress: address,
          items: cart.map((item) => ({
            name: item.name,
            price: Number(String(item.price).replace(/[^0-9.]/g, '') || 0),
            quantity: 1,
          })),
        }),
      });
      const orderPayload = await orderRes.json();
      if (!orderRes.ok || !orderPayload.success) {
        throw new Error(orderPayload.error || 'Order creation failed');
      }

      const payRes = await fetch('/api/payments/checkout', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: orderPayload.data.id,
          method,
        }),
      });
      const payPayload = await payRes.json();
      if (!payRes.ok || !payPayload.success) {
        throw new Error(payPayload.error || 'Payment failed');
      }

      clearCart();
      toast({
        title: 'Payment successful',
        description: `Order ${orderPayload.data.id} is now confirmed.`,
      });
      router.push('/marketplace');
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Checkout failed',
        description: (error as Error).message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-8 items-center justify-center min-h-[calc(100vh-10rem)]">
      <Card className="w-full max-w-2xl brand-panel">
        <CardHeader>
          <CardTitle className="text-3xl">Secure Checkout</CardTitle>
          <CardDescription>
            Create an order record, capture payment locally, and persist it to the platform database.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">Buyer</p>
            <p className="font-semibold">{user?.name}</p>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Shipping Address</Label>
            <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>

          <div className="space-y-3">
            <Label>Payment Method</Label>
            <RadioGroup value={method} onValueChange={(value) => setMethod(value as typeof method)}>
              {[
                { value: 'upi', label: 'UPI' },
                { value: 'card', label: 'Card' },
                { value: 'netbanking', label: 'Net Banking' },
                { value: 'cod', label: 'Cash on Delivery' },
              ].map((item) => (
                <div key={item.value} className="flex items-center space-x-2 rounded-lg border p-3">
                  <RadioGroupItem value={item.value} id={item.value} />
                  <Label htmlFor={item.value}>{item.label}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div className="rounded-lg border p-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Items</span>
              <span>{cart.length}</span>
            </div>
            {cart.map((item, index) => (
              <div key={`${item.name}-${index}`} className="flex items-center justify-between text-sm">
                <span>{item.name}</span>
                <span>INR {Number(item.price).toLocaleString()}</span>
              </div>
            ))}
            <div className="flex items-center justify-between font-semibold pt-2 border-t">
              <span>Total</span>
              <span>INR {total.toLocaleString()}</span>
            </div>
          </div>

          {cart.length === 0 && (
            <div className="flex items-center gap-3 text-primary rounded-lg border p-4">
              <CheckCircle2 className="h-6 w-6" />
              <span className="font-medium">Your cart is empty. Add products from the marketplace first.</span>
            </div>
          )}
        </CardContent>
        <CardFooter className="justify-between gap-3">
          <Button variant="outline" asChild>
            <Link href="/">Back to Dashboard</Link>
          </Button>
          <Button onClick={checkout} disabled={loading || cart.length === 0 || !user}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Pay Now
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
