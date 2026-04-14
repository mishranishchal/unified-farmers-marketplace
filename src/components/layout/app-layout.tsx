'use client';

import { useDeferredValue, useEffect, useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Activity,
  Bell,
  Bot,
  BriefcaseBusiness,
  CircleUserRound,
  Compass,
  FileSearch,
  FlaskConical,
  Globe2,
  LayoutGrid,
  Leaf,
  LogOut,
  Menu,
  Microscope,
  Route,
  Search,
  ShoppingCart,
  Sparkles,
  Sprout,
  Store,
  Tractor,
  TrendingUp,
  UserCog,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/auth-context';
import { useCart } from '@/hooks/use-cart';
import { useLanguage } from '@/context/language-context';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import type { GlobalSearchResult, UserNotification } from '@/lib/types';

type NavItem = {
  href: string;
  label: string;
  labelHi: string;
  icon: LucideIcon;
  section: 'Ops' | 'Trade' | 'AI' | 'Network';
  adminOnly?: boolean;
};

const nav: NavItem[] = [
  { href: '/', label: 'Dashboard', labelHi: 'डैशबोर्ड', icon: LayoutGrid, section: 'Ops' },
  { href: '/profile', label: 'My Profile', labelHi: 'मेरी प्रोफाइल', icon: UserCog, section: 'Ops' },
  { href: '/prices', label: 'Market Prices', labelHi: 'बाजार भाव', icon: TrendingUp, section: 'Trade' },
  { href: '/marketplace', label: 'Marketplace', labelHi: 'मार्केटप्लेस', icon: Store, section: 'Trade' },
  { href: '/finance', label: 'Finance Hub', labelHi: 'फाइनेंस हब', icon: Wallet, section: 'Trade' },
  { href: '/buyers', label: 'Buyers', labelHi: 'खरीदार', icon: BriefcaseBusiness, section: 'Network' },
  { href: '/agronomist', label: 'AI Agronomist', labelHi: 'एआई एग्रोनॉमिस्ट', icon: Bot, section: 'AI' },
  { href: '/crop-detection', label: 'Crop Detection', labelHi: 'फसल पहचान', icon: Search, section: 'AI' },
  { href: '/disease-detection', label: 'Disease Detection', labelHi: 'रोग पहचान', icon: Microscope, section: 'AI' },
  { href: '/soil-quality', label: 'Soil Quality', labelHi: 'मिट्टी गुणवत्ता', icon: FlaskConical, section: 'AI' },
  { href: '/ai-advisory', label: 'AI Advisory', labelHi: 'एआई सलाह', icon: Sparkles, section: 'AI' },
  { href: '/logistics-hub', label: 'Logistics', labelHi: 'लॉजिस्टिक्स', icon: Route, section: 'Ops' },
  { href: '/analytics', label: 'Analytics', labelHi: 'एनालिटिक्स', icon: Activity, section: 'Ops' },
  { href: '/community', label: 'Community', labelHi: 'समुदाय', icon: Users, section: 'Network' },
];

const adminNav: NavItem[] = [
  { href: '/admin/dashboard', label: 'Admin Command', labelHi: 'एडमिन कमांड', icon: Compass, section: 'Ops', adminOnly: true },
  { href: '/admin/farmers', label: 'Farmers', labelHi: 'किसान', icon: CircleUserRound, section: 'Network', adminOnly: true },
  { href: '/admin/suppliers', label: 'Suppliers', labelHi: 'सप्लायर', icon: Sprout, section: 'Trade', adminOnly: true },
  { href: '/admin/orders', label: 'Orders', labelHi: 'ऑर्डर', icon: Route, section: 'Trade', adminOnly: true },
  { href: '/admin/financials', label: 'Financials', labelHi: 'वित्त', icon: Wallet, section: 'Ops', adminOnly: true },
  { href: '/admin/loans', label: 'Loans', labelHi: 'ऋण', icon: BriefcaseBusiness, section: 'Ops', adminOnly: true },
  { href: '/admin/messaging', label: 'Messaging', labelHi: 'मैसेजिंग', icon: Bell, section: 'Network', adminOnly: true },
  { href: '/admin/trust', label: 'AgriTrust', labelHi: 'एग्रीट्रस्ट', icon: FileSearch, section: 'Ops', adminOnly: true },
  { href: '/admin/settings', label: 'Settings', labelHi: 'सेटिंग्स', icon: Compass, section: 'Ops', adminOnly: true },
];

const roleTheme = {
  user: {
    shell: 'from-[#10271f] via-[#173f2f] to-[#75612b]',
    header: 'bg-[#08170f]/85 border-white/10',
    sidebar: 'bg-[#0d1f17]/80 border-white/10 text-white',
    panel: 'bg-[#f4efe2]/70 border-[#d8ccb1]/60',
    active: 'bg-[#f7b955] text-[#1e1405]',
    inactive: 'text-white/70 hover:bg-white/10 hover:text-white',
    badge: 'Farmer Workspace',
    badgeHi: 'किसान वर्कस्पेस',
    tagline: 'Field operations, trust, trade, and advisory in one command surface.',
    taglineHi: 'फील्ड संचालन, भरोसा, व्यापार और सलाह एक ही कमांड सतह पर।',
  },
  buyer: {
    shell: 'from-[#0e1a27] via-[#183347] to-[#25606d]',
    header: 'bg-[#09121a]/85 border-white/10',
    sidebar: 'bg-[#0c1822]/82 border-white/10 text-white',
    panel: 'bg-[#e8f4f6]/80 border-[#b7d6dd]/60',
    active: 'bg-[#5fd3e4] text-[#062028]',
    inactive: 'text-white/70 hover:bg-white/10 hover:text-white',
    badge: 'Buyer Workspace',
    badgeHi: 'खरीदार वर्कस्पेस',
    tagline: 'Procurement, sourcing, dispatch, and settlement coordination.',
    taglineHi: 'प्रोक्योरमेंट, सोर्सिंग, डिस्पैच और सेटलमेंट समन्वय।',
  },
  admin: {
    shell: 'from-[#1b1118] via-[#2d1825] to-[#5b2b32]',
    header: 'bg-[#120b10]/88 border-white/10',
    sidebar: 'bg-[#180d14]/82 border-white/10 text-white',
    panel: 'bg-[#f5e9e8]/80 border-[#dfc0bc]/60',
    active: 'bg-[#ff8f6b] text-[#2e1206]',
    inactive: 'text-white/70 hover:bg-white/10 hover:text-white',
    badge: 'Admin Command',
    badgeHi: 'एडमिन कमांड',
    tagline: 'Governance, trust compliance, dispatch, and broadcast controls.',
    taglineHi: 'गवर्नेंस, ट्रस्ट अनुपालन, डिस्पैच और ब्रॉडकास्ट नियंत्रण।',
  },
} as const;

function CartPanel() {
  const { cart, removeFromCart, clearCart } = useCart();
  const router = useRouter();
  const subtotal = cart.reduce((acc, item) => {
    const parsed = Number(String(item.price).replace(/[^0-9.]/g, ''));
    return acc + (Number.isNaN(parsed) ? 0 : parsed);
  }, 0);

  return (
    <Sheet>
      <SheetTrigger asChild>
        <button className="relative">
          <ShoppingCart className="h-5 w-5" />
          {cart.length > 0 && <Badge className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center p-0">{cart.length}</Badge>}
        </button>
      </SheetTrigger>
      <SheetContent className="bg-background/95">
        <SheetHeader>
          <SheetTitle>Cart</SheetTitle>
        </SheetHeader>
        <div className="space-y-3 py-4">
          {cart.length === 0 && <p className="text-sm text-muted-foreground">No items selected.</p>}
          {cart.map((item, idx) => (
            <div key={`${item.name}-${idx}`} className="flex items-center justify-between gap-2 rounded-lg border p-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{item.name}</p>
                <p className="text-xs text-muted-foreground">INR {Number(item.price).toLocaleString()}</p>
              </div>
              <Button size="icon" variant="ghost" onClick={() => removeFromCart(item.name)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
        <SheetFooter className="border-t pt-4">
          <div className="w-full space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-semibold">INR {subtotal.toLocaleString()}</span>
            </div>
            <Button className="w-full" disabled={cart.length === 0} onClick={() => router.push('/payment')}>
              Proceed to Checkout
            </Button>
            <Button variant="outline" className="w-full" onClick={clearCart}>
              Clear
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function NotificationsPanel({
  notifications,
  onRead,
  tx,
}: {
  notifications: UserNotification[];
  onRead: (id: string) => void;
  tx: (english: string, hindi?: string) => string;
}) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <button className="relative">
          <Bell className="h-5 w-5" />
          {notifications.some((item) => !item.read) && <Badge className="absolute -right-2 -top-2 h-2.5 w-2.5 rounded-full p-0" />}
        </button>
      </SheetTrigger>
      <SheetContent className="bg-background/95">
        <SheetHeader>
          <SheetTitle>{tx('Notifications', 'सूचनाएं')}</SheetTitle>
        </SheetHeader>
        <div className="space-y-3 py-4">
          {notifications.length === 0 && <p className="text-sm text-muted-foreground">{tx('No alerts yet.', 'अभी कोई अलर्ट नहीं है।')}</p>}
          {notifications.map((item) => (
            <div key={item.id} className={cn('rounded-xl border p-3', !item.read && 'border-primary/60 bg-primary/5')}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{item.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{item.body}</p>
                  <p className="mt-2 text-[11px] uppercase tracking-wide text-muted-foreground">{item.category}</p>
                </div>
                {!item.read && (
                  <Button size="sm" variant="ghost" onClick={() => onRead(item.id)}>
                    {tx('Mark read', 'पढ़ा हुआ')}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { language, toggleLanguage, tx } = useLanguage();
  const items = useMemo(() => (user?.role === 'admin' ? [...nav, ...adminNav] : nav), [user?.role]);
  const sections = ['Ops', 'Trade', 'AI', 'Network'] as const;
  const mobileItems = items.slice(0, 5);
  const theme = roleTheme[user?.role ?? 'user'];
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GlobalSearchResult[]>([]);
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [isSearching, startSearchTransition] = useTransition();
  const deferredQuery = useDeferredValue(query);

  useEffect(() => {
    const uniqueRoutes = Array.from(new Set(items.map((item) => item.href)));
    const runPrefetch = () => {
      for (const href of uniqueRoutes) {
        router.prefetch(href);
      }
    };

    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      const idleId = window.requestIdleCallback(runPrefetch);
      return () => window.cancelIdleCallback(idleId);
    }

    const timeoutId = setTimeout(runPrefetch, 150);
    return () => clearTimeout(timeoutId);
  }, [items, router]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const response = await fetch('/api/notifications', { credentials: 'include' });
      const payload = await response.json();
      if (payload.success) {
        setNotifications(payload.data as UserNotification[]);
      }
    };
    void load();
  }, [user]);

  useEffect(() => {
    if (!deferredQuery.trim()) {
      setResults([]);
      return;
    }

    const controller = new AbortController();
    const load = async () => {
      try {
        const response = await fetch(`/api/global-search?q=${encodeURIComponent(deferredQuery)}`, {
          credentials: 'include',
          signal: controller.signal,
        });
        const payload = await response.json();
        if (payload.success) {
          startSearchTransition(() => {
            setResults(payload.data as GlobalSearchResult[]);
          });
        }
      } catch {
        setResults([]);
      }
    };
    void load();
    return () => controller.abort();
  }, [deferredQuery]);

  const unreadCount = notifications.filter((item) => !item.read).length;

  const roleTitle =
    user?.role === 'buyer'
      ? tx('Buyer', 'खरीदार')
      : user?.role === 'admin'
        ? tx('Admin', 'एडमिन')
        : tx('Farmer', 'किसान');

  const markRead = async (id: string) => {
    await fetch('/api/notifications', {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    setNotifications((current) => current.map((item) => (item.id === id ? { ...item, read: true } : item)));
  };

  const SearchResults = query.trim() ? (
    <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-40 overflow-hidden rounded-2xl border border-white/15 bg-[#07110d]/95 shadow-2xl backdrop-blur-md">
      <div className="border-b border-white/10 px-4 py-2 text-xs uppercase tracking-[0.2em] text-white/55">
        {isSearching ? tx('Searching', 'खोज रहे हैं') : tx('Search results', 'खोज परिणाम')}
      </div>
      <div className="max-h-80 overflow-auto p-2">
        {results.length === 0 && <div className="px-3 py-6 text-sm text-white/60">{tx('No matches found yet.', 'अभी कोई परिणाम नहीं मिला।')}</div>}
        {results.map((result) => (
          <button
            key={result.id}
            className="block w-full rounded-xl px-3 py-3 text-left transition hover:bg-white/8"
            onClick={() => {
              setQuery('');
              setResults([]);
              router.push(result.href);
            }}
          >
            <p className="text-sm font-medium text-white">{result.title}</p>
            <p className="mt-1 text-xs text-white/60">{result.subtitle}</p>
          </button>
        ))}
      </div>
    </div>
  ) : null;

  return (
    <div className={cn('min-h-screen bg-gradient-to-br text-slate-950', theme.shell)}>
      <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.14),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(255,209,102,0.16),transparent_24%)]">
        <header className={cn('sticky top-0 z-30 border-b backdrop-blur-xl', theme.header)}>
          <div className="mx-auto flex max-w-[1800px] items-center gap-3 px-4 py-3">
            <Sheet>
              <SheetTrigger asChild>
                <Button size="icon" variant="outline" className="border-white/20 bg-white/5 text-white md:hidden">
                  <Menu className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="border-white/10 bg-[#07110d] text-white">
                <SheetHeader>
                  <SheetTitle className="text-white">{tx('Workspace Menu', 'वर्कस्पेस मेनू')}</SheetTitle>
                </SheetHeader>
                <div className="mt-6 space-y-2">
                  {items.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        'flex items-center gap-2 rounded-xl px-3 py-2 text-sm',
                        pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href)) ? theme.active : theme.inactive
                      )}
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{language === 'hi' ? item.labelHi : item.label}</span>
                    </Link>
                  ))}
                </div>
              </SheetContent>
            </Sheet>

            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/12 ring-1 ring-white/10">
                <Tractor className="h-5 w-5 text-white" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">Farmer&apos;s Marketplace</p>
                <p className="truncate text-[11px] text-white/65">AgriTrust Protocol · {theme.badge}</p>
              </div>
            </div>

            <div className="relative hidden flex-1 md:block">
              <div className="relative max-w-2xl">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/55" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && results[0]) {
                      setQuery('');
                      router.push(results[0].href);
                    }
                  }}
                  className="border-white/10 bg-white/10 pl-9 text-white placeholder:text-white/45"
                  placeholder={tx('Search markets, buyers, invoices, alerts...', 'मार्केट, खरीदार, इनवॉइस, अलर्ट खोजें...')}
                />
                {SearchResults}
              </div>
            </div>

            <div className="ml-auto flex items-center gap-2 text-white">
              <Button variant="outline" className="hidden border-white/15 bg-white/5 text-white hover:bg-white/10 sm:flex" onClick={toggleLanguage}>
                <Globe2 className="mr-2 h-4 w-4" />
                {language === 'en' ? 'हिन्दी' : 'English'}
              </Button>
              <NotificationsPanel notifications={notifications} onRead={markRead} tx={tx} />
              <CartPanel />
              {user && (
                <Link href="/profile" className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-2 py-1.5">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-white/15 text-white">{user.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="hidden text-left md:block">
                    <p className="max-w-[140px] truncate text-xs font-medium">{user.name}</p>
                    <p className="text-[10px] text-white/60">
                      {roleTitle} · {unreadCount} {tx('alerts', 'अलर्ट')}
                    </p>
                  </div>
                </Link>
              )}
            </div>
          </div>
        </header>

        <div className="mx-auto grid max-w-[1800px] gap-4 px-4 py-4 md:grid-cols-[300px_minmax(0,1fr)]">
          <aside className="hidden md:block">
            <div className={cn('space-y-4 rounded-[28px] border p-4 shadow-2xl backdrop-blur-xl', theme.sidebar)}>
              <div className="space-y-3 rounded-[24px] border border-white/10 bg-white/5 p-4">
                <Badge className="bg-white/12 text-white">{language === 'hi' ? theme.badgeHi : theme.badge}</Badge>
                <div>
                  <p className="text-lg font-semibold text-white">{tx('Farmer\'s Marketplace', 'फार्मर\'स मार्केटप्लेस')}</p>
                  <p className="mt-1 text-sm text-white/65">{language === 'hi' ? theme.taglineHi : theme.tagline}</p>
                </div>
              </div>

              {sections.map((section) => (
                <div key={section}>
                  <p className="px-2 pb-1 text-[11px] uppercase tracking-[0.18em] text-white/45">{section}</p>
                  <div className="space-y-1">
                    {items
                      .filter((item) => item.section === section)
                      .map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          prefetch
                          onMouseEnter={() => router.prefetch(item.href)}
                          onFocus={() => router.prefetch(item.href)}
                          className={cn(
                            'flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm transition',
                            pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href)) ? theme.active : theme.inactive
                          )}
                        >
                          <item.icon className="h-4 w-4" />
                          <span className="truncate">{language === 'hi' ? item.labelHi : item.label}</span>
                        </Link>
                      ))}
                  </div>
                </div>
              ))}

              <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-white/45">{tx('Trust layer', 'ट्रस्ट लेयर')}</p>
                <p className="mt-2 text-sm text-white/75">
                  {tx('Profile legitimacy now runs through the Agri Trust Protocol workspace.', 'प्रोफाइल की वैधता अब एग्री ट्रस्ट प्रोटोकॉल वर्कस्पेस से चलती है।')}
                </p>
                <Button asChild className="mt-3 w-full">
                  <Link href="/profile">
                    <FileSearch className="mr-2 h-4 w-4" />
                    {tx('Open Profile Vault', 'प्रोफाइल वॉल्ट खोलें')}
                  </Link>
                </Button>
                <Button asChild variant="outline" className="mt-3 w-full border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white">
                  <Link href="/about-developer">
                    {tx('About Site Developer', 'साइट डेवलपर के बारे में')}
                  </Link>
                </Button>
              </div>

              <Button
                variant="ghost"
                className="w-full justify-start text-white hover:bg-white/10 hover:text-white"
                onClick={() => {
                  logout();
                  router.push('/login');
                }}
              >
                <LogOut className="mr-2 h-4 w-4" />
                {tx('Sign out', 'साइन आउट')}
              </Button>
            </div>
          </aside>

          <main className="min-w-0">
            <div className={cn('rounded-[30px] border p-4 shadow-2xl backdrop-blur-xl md:p-6', theme.panel)}>{children}</div>
          </main>
        </div>

        <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-[#07110d]/95 backdrop-blur md:hidden">
          <div className="grid grid-cols-5">
            {mobileItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                prefetch
                onMouseEnter={() => router.prefetch(item.href)}
                onFocus={() => router.prefetch(item.href)}
                className={cn(
                  'flex flex-col items-center gap-1 px-1 py-2 text-[10px]',
                  pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href)) ? 'text-white' : 'text-white/55'
                )}
              >
                <item.icon className="h-4 w-4" />
                <span className="truncate">{language === 'hi' ? item.labelHi : item.label}</span>
              </Link>
            ))}
          </div>
        </nav>
      </div>
    </div>
  );
}
