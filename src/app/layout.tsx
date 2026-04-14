import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster"
import { AuthProvider } from '@/context/auth-context';
import { LanguageProvider } from '@/context/language-context';
import { Merriweather, Sora } from 'next/font/google';
import { getSessionUser } from '@/lib/server/auth';

const sora = Sora({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-sora' });
const merriweather = Merriweather({ subsets: ['latin'], weight: ['400', '700', '900'], variable: '--font-merriweather' });

export const metadata: Metadata = {
  title: "Farmer's Marketplace - Direct Market Access Web Application",
  description: "Farmer's Marketplace - Direct Market Access Web Application for farmers, buyers, and administrators.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const initialUser = await getSessionUser();

  return (
    <html lang="en" suppressHydrationWarning className={`${sora.variable} ${merriweather.variable}`}>
      <head/>
      <body className="font-body antialiased" suppressHydrationWarning>
        <LanguageProvider>
          <AuthProvider initialUser={initialUser} sessionResolved>
              {children}
              <Toaster />
          </AuthProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
