import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { platformStore } from '@/lib/server/store';
import { buildMonogramImage } from '@/lib/image-utils';

export const dynamic = 'force-dynamic';

export default async function AboutDeveloperPage() {
  const config = await platformStore.getConfig();
  const developer = config.developer;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-emerald-950 to-amber-900 px-4 py-10 text-white">
      <div className="mx-auto max-w-5xl space-y-6">
        <section className="rounded-3xl border border-white/10 bg-white/8 p-6 backdrop-blur">
          <h1 className="text-3xl font-bold">About Site Developer</h1>
          <p className="mt-2 max-w-2xl text-sm text-white/75">
            Public information section configured by platform admins for project presentation and viewer reference.
          </p>
        </section>

        <Card className="overflow-hidden border-white/10 bg-white/90 text-slate-950">
          <CardHeader>
            <CardTitle>{developer.name || 'Developer profile pending'}</CardTitle>
            <CardDescription>{developer.bio || 'Admin can add developer biography, contact, and institutional details from admin settings.'}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-[220px_1fr]">
            <div className="overflow-hidden rounded-3xl border bg-slate-100">
              <img
                src={developer.photoUrl || buildMonogramImage(developer.name || 'Developer', 'Site Developer')}
                alt={developer.name || 'Developer'}
                className="aspect-[4/5] h-full w-full object-cover"
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border p-4">
                <p className="text-xs text-muted-foreground">College</p>
                <p className="mt-1 font-semibold">{developer.college || 'Not added'}</p>
              </div>
              <div className="rounded-2xl border p-4">
                <p className="text-xs text-muted-foreground">Roll No.</p>
                <p className="mt-1 font-semibold">{developer.rollNo || 'Not added'}</p>
              </div>
              <div className="rounded-2xl border p-4">
                <p className="text-xs text-muted-foreground">Contact</p>
                <p className="mt-1 font-semibold">{developer.contact || 'Not added'}</p>
              </div>
              <div className="rounded-2xl border p-4">
                <p className="text-xs text-muted-foreground">Address</p>
                <p className="mt-1 font-semibold">{developer.address || 'Not added'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
