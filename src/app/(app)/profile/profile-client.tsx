'use client';

import { useEffect, useMemo, useState } from 'react';
import { Bell, CheckCircle2, FileText, ShieldCheck, Truck, UserCog, Wallet } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useLanguage } from '@/context/language-context';
import { useToast } from '@/hooks/use-toast';
import type {
  AgriTrustForm,
  AgriTrustFormSubmission,
  BuyerInteraction,
  CommunicationGroup,
  CommunicationGroupMessage,
  FinanceTransaction,
  FarmerFieldReport,
  InvoiceRecord,
  LoanApplication,
  PlatformOrder,
  SafeUser,
  ShipmentRecord,
  UserNotification,
  UserWorkspaceProfile,
} from '@/lib/types';

type ProfileClientProps = {
  user: SafeUser;
  initialProfile: UserWorkspaceProfile | null;
  orders: PlatformOrder[];
  invoices: InvoiceRecord[];
  shipments: ShipmentRecord[];
  notifications: UserNotification[];
  interactions: BuyerInteraction[];
  transactions: FinanceTransaction[];
  loans: LoanApplication[];
  locationOptions: string[];
};

function downloadTextFile(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function ProfileClient({
  user,
  initialProfile,
  orders,
  invoices,
  shipments,
  notifications,
  interactions,
  transactions,
  loans,
  locationOptions,
}: ProfileClientProps) {
  const { tx } = useLanguage();
  const { toast } = useToast();
  const [profile, setProfile] = useState<UserWorkspaceProfile | null>(initialProfile);
  const [saving, setSaving] = useState(false);
  const [trustForms, setTrustForms] = useState<AgriTrustForm[]>([]);
  const [trustSubmissions, setTrustSubmissions] = useState<AgriTrustFormSubmission[]>([]);
  const [fieldReports, setFieldReports] = useState<FarmerFieldReport[]>([]);
  const [farmerProfiles, setFarmerProfiles] = useState<Array<{ userEmail: string; displayName: string; trustScore: number; trustLabel: string; verification: UserWorkspaceProfile['verification']; city: string; state: string }>>([]);
  const [groups, setGroups] = useState<CommunicationGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [groupMessages, setGroupMessages] = useState<CommunicationGroupMessage[]>([]);
  const [groupMessageDraft, setGroupMessageDraft] = useState('');
  const [fieldReportDraft, setFieldReportDraft] = useState({
    reportType: 'mandi-price' as FarmerFieldReport['reportType'],
    commodity: '',
    mandi: '',
    reportedPrice: '',
    weatherCondition: '',
    rainfallMm: '',
    summary: '',
    proofNote: '',
  });
  const [formResponses, setFormResponses] = useState<Record<string, Record<string, string>>>({});

  const roleLabel =
    user.role === 'buyer' ? tx('Buyer', 'खरीदार') : user.role === 'admin' ? tx('Admin', 'एडमिन') : tx('Farmer', 'किसान');

  const recordCards = useMemo(
    () => [
      { title: tx('Orders', 'ऑर्डर'), value: orders.length, icon: FileText },
      { title: tx('Shipments', 'शिपमेंट'), value: shipments.length, icon: Truck },
      { title: tx('Notifications', 'सूचनाएं'), value: notifications.length, icon: Bell },
      { title: tx('Ledger entries', 'लेजर एंट्री'), value: transactions.length, icon: Wallet },
    ],
    [notifications.length, orders.length, shipments.length, transactions.length, tx]
  );

  useEffect(() => {
    const loadAgriTrust = async () => {
      try {
        if (user.role !== 'admin') {
          const [formsRes, submissionsRes, reportsRes] = await Promise.all([
            fetch('/api/agri-trust/forms', { credentials: 'include' }),
            fetch('/api/agri-trust/submissions', { credentials: 'include' }),
            fetch('/api/field-reports', { credentials: 'include' }),
          ]);
          const [formsPayload, submissionsPayload, reportsPayload] = await Promise.all([formsRes.json(), submissionsRes.json(), reportsRes.json()]);
          if (formsPayload.success) setTrustForms(formsPayload.data as AgriTrustForm[]);
          if (submissionsPayload.success) setTrustSubmissions(submissionsPayload.data as AgriTrustFormSubmission[]);
          if (reportsPayload.success) setFieldReports(reportsPayload.data as FarmerFieldReport[]);
        } else {
          setTrustForms([]);
          setTrustSubmissions([]);
          setFieldReports([]);
        }
        if (user.role === 'buyer') {
          const profilesRes = await fetch('/api/agri-trust/profiles', { credentials: 'include' });
          const profilesPayload = await profilesRes.json();
          if (profilesPayload.success) {
            setFarmerProfiles(profilesPayload.data as Array<{ userEmail: string; displayName: string; trustScore: number; trustLabel: string; verification: UserWorkspaceProfile['verification']; city: string; state: string }>);
          }
        }
        const groupsRes = await fetch('/api/communication-groups', { credentials: 'include' });
        const groupsPayload = await groupsRes.json();
        if (groupsPayload.success) {
          const nextGroups = groupsPayload.data as CommunicationGroup[];
          setGroups(nextGroups);
          if (!selectedGroupId && nextGroups[0]?.id) {
            setSelectedGroupId(nextGroups[0].id);
          }
        }
      } catch {
        // Keep existing server-rendered sections if live trust fetch fails.
      }
    };
    void loadAgriTrust();
  }, [selectedGroupId, user.role]);

  useEffect(() => {
    const loadGroupMessages = async () => {
      if (!selectedGroupId) {
        setGroupMessages([]);
        return;
      }
      try {
        const response = await fetch(`/api/communication-groups/messages?groupId=${encodeURIComponent(selectedGroupId)}`, {
          credentials: 'include',
        });
        const payload = await response.json();
        if (payload.success) {
          setGroupMessages(payload.data as CommunicationGroupMessage[]);
        }
      } catch {
        setGroupMessages([]);
      }
    };
    void loadGroupMessages();
  }, [selectedGroupId]);

  if (!profile) {
    return <div className="text-sm text-muted-foreground">{tx('Profile unavailable.', 'प्रोफाइल उपलब्ध नहीं है।')}</div>;
  }

  const saveProfile = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/profile', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.error || 'Profile update failed');
      }
      setProfile(payload.data as UserWorkspaceProfile);
      toast({
        title: tx('Saved', 'सहेजा गया'),
        description:
          user.role === 'admin'
            ? tx('Administrator workspace updated successfully.', 'एडमिन वर्कस्पेस सफलतापूर्वक अपडेट हो गया।')
            : tx('Agri Trust profile updated successfully.', 'एग्री ट्रस्ट प्रोफाइल सफलतापूर्वक अपडेट हो गई।'),
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: tx('Update failed', 'अपडेट विफल'),
        description: (error as Error).message,
      });
    } finally {
      setSaving(false);
    }
  };

  const submitTrustForm = async (form: AgriTrustForm) => {
    const responseMap = formResponses[form.id] ?? {};
    const responses = form.fields
      .map((field) => ({
        fieldId: field.id,
        label: field.label,
        value: responseMap[field.id]?.trim() ?? '',
      }))
      .filter((field) => field.value);
    if (!responses.length) {
      toast({ variant: 'destructive', title: tx('Response required', 'उत्तर आवश्यक है'), description: tx('Fill at least one field before submitting.', 'सबमिट करने से पहले कम से कम एक फ़ील्ड भरें।') });
      return;
    }
    try {
      const response = await fetch('/api/agri-trust/submissions', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ formId: form.id, responses, proofNote: profile?.about || undefined }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.error || 'Submission failed');
      setTrustSubmissions((current) => [payload.data as AgriTrustFormSubmission, ...current.filter((item) => item.formId !== form.id)]);
      toast({ title: tx('Submitted', 'सबमिट किया गया'), description: tx('AgriTrust form submitted for admin review.', 'एग्रीट्रस्ट फॉर्म एडमिन रिव्यू के लिए सबमिट हो गया।') });
    } catch (error) {
      toast({ variant: 'destructive', title: tx('Submission failed', 'सबमिशन विफल'), description: (error as Error).message });
    }
  };

  const submitFieldReport = async () => {
    try {
      const response = await fetch('/api/field-reports', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...fieldReportDraft,
          reportedPrice: fieldReportDraft.reportedPrice ? Number(fieldReportDraft.reportedPrice) : undefined,
          rainfallMm: fieldReportDraft.rainfallMm ? Number(fieldReportDraft.rainfallMm) : undefined,
        }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.error || 'Report submission failed');
      setFieldReports((current) => [payload.data as FarmerFieldReport, ...current]);
      setFieldReportDraft({
        reportType: 'mandi-price',
        commodity: '',
        mandi: '',
        reportedPrice: '',
        weatherCondition: '',
        rainfallMm: '',
        summary: '',
        proofNote: '',
      });
      toast({ title: tx('Report submitted', 'रिपोर्ट सबमिट'), description: tx('Your field intelligence report is now in admin review.', 'आपकी फील्ड इंटेलिजेंस रिपोर्ट अब एडमिन रिव्यू में है।') });
    } catch (error) {
      toast({ variant: 'destructive', title: tx('Submission failed', 'सबमिशन विफल'), description: (error as Error).message });
    }
  };

  const acknowledgeShipment = async (shipmentId: string) => {
    try {
      const response = await fetch('/api/shipments/acknowledge', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: shipmentId }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.error || 'Acknowledgement failed');
      toast({ title: tx('Shipment acknowledged', 'शिपमेंट स्वीकार'), description: tx('Delivery has been marked as received by a verified customer.', 'डिलीवरी को सत्यापित ग्राहक द्वारा प्राप्त के रूप में मार्क किया गया है।') });
    } catch (error) {
      toast({ variant: 'destructive', title: tx('Action failed', 'क्रिया विफल'), description: (error as Error).message });
    }
  };

  const validateFarmerProfile = async (farmerEmail: string) => {
    try {
      const response = await fetch('/api/agri-trust/profiles', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userEmail: farmerEmail,
          role: 'user',
          label: 'Validated by marketplace buyer',
        }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.error || 'Validation failed');
      setFarmerProfiles((current) =>
        current.map((profileRow) =>
          profileRow.userEmail === farmerEmail
            ? {
                ...profileRow,
                trustScore: (payload.data as UserWorkspaceProfile).trustScore,
                trustLabel: (payload.data as UserWorkspaceProfile).trustLabel,
                verification: (payload.data as UserWorkspaceProfile).verification,
              }
            : profileRow
        )
      );
      toast({ title: tx('Farmer validated', 'किसान सत्यापित'), description: tx('Buyer validation has been recorded for this farmer.', 'इस किसान के लिए खरीदार सत्यापन रिकॉर्ड हो गया है।') });
    } catch (error) {
      toast({ variant: 'destructive', title: tx('Validation failed', 'सत्यापन विफल'), description: (error as Error).message });
    }
  };

  const sendGroupMessage = async () => {
    if (!selectedGroupId || !groupMessageDraft.trim()) return;
    try {
      const response = await fetch('/api/communication-groups/messages', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId: selectedGroupId, body: groupMessageDraft.trim() }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.error || 'Message failed');
      setGroupMessages((current) => [...current, payload.data as CommunicationGroupMessage]);
      setGroupMessageDraft('');
    } catch (error) {
      toast({ variant: 'destructive', title: tx('Message failed', 'मैसेज विफल'), description: (error as Error).message });
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-black/10 bg-gradient-to-r from-slate-950 via-emerald-950 to-amber-900 p-6 text-white">
        <Badge className="mb-3 bg-white/12 text-white">{tx('Agri Trust Protocol', 'एग्री ट्रस्ट प्रोटोकॉल')}</Badge>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold">{tx('Personal Profile Vault', 'पर्सनल प्रोफाइल वॉल्ट')}</h1>
            <p className="mt-2 max-w-3xl text-sm text-white/75">
              {tx(
                'This workspace holds your verified identity, communications, invoice trail, shipments, and role-specific compliance records.',
                'इस वर्कस्पेस में आपकी सत्यापित पहचान, कम्युनिकेशन, इनवॉइस ट्रेल, शिपमेंट और भूमिका आधारित अनुपालन रिकॉर्ड रखे जाते हैं।'
              )}
            </p>
          </div>
          <div className="grid gap-2 rounded-2xl border border-white/10 bg-white/8 p-4 text-sm">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-300" />
              <span>{roleLabel}</span>
            </div>
            {user.role === 'admin' ? (
              <>
                <div>
                  {tx('Mode', 'मोड')}: <span className="font-semibold">{tx('Validation authority', 'वैलिडेशन अथॉरिटी')}</span>
                </div>
                <div>
                  {tx('Scope', 'स्कोप')}: <span className="font-semibold">{tx('Approves buyer and farmer records', 'खरीदार और किसान रिकॉर्ड को अनुमोदित करता है')}</span>
                </div>
              </>
            ) : (
              <>
                <div>
                  {tx('Trust score', 'ट्रस्ट स्कोर')}: <span className="font-semibold">{profile.trustScore}/100</span>
                </div>
                <div>
                  {tx('Status', 'स्थिति')}: <span className="font-semibold">{profile.trustLabel}</span>
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        {recordCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.title} className="border-black/5 bg-white/55">
              <CardContent className="p-4">
                <Icon className="h-5 w-5 text-primary" />
                <p className="mt-3 text-sm text-muted-foreground">{card.title}</p>
                <p className="text-2xl font-semibold">{card.value}</p>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <Tabs defaultValue="trust" className="space-y-4">
        <TabsList className="flex h-auto flex-wrap gap-2 bg-transparent p-0">
          <TabsTrigger value="trust">{tx('Trust Profile', 'ट्रस्ट प्रोफाइल')}</TabsTrigger>
          <TabsTrigger value="commerce">{tx('Commerce Records', 'कॉमर्स रिकॉर्ड')}</TabsTrigger>
          <TabsTrigger value="communication">{tx('Communication', 'कम्युनिकेशन')}</TabsTrigger>
          {user.role === 'user' && <TabsTrigger value="intel">{tx('Agri Intel', 'एग्री इंटेल')}</TabsTrigger>}
        </TabsList>

        <TabsContent value="trust" className="space-y-4">
          <Card className="bg-white/55">
            <CardHeader>
              <CardTitle>{tx('Identity and workspace details', 'पहचान और वर्कस्पेस विवरण')}</CardTitle>
              <CardDescription>
                {user.role === 'admin'
                  ? tx(
                      'Admin workspace details are operational only. Admin accounts review and approve AgriTrust records for other roles.',
                      'एडमिन वर्कस्पेस विवरण केवल ऑपरेशनल हैं। एडमिन अकाउंट अन्य भूमिकाओं के एग्रीट्रस्ट रिकॉर्ड की समीक्षा और अनुमोदन करते हैं।'
                    )
                  : tx(
                      'Role identity details are reviewed before the workspace is treated as legitimate.',
                      'वर्कस्पेस को वैध मानने से पहले भूमिका पहचान विवरण की समीक्षा की जाती है।'
                    )}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>{tx('Display name', 'डिस्प्ले नाम')}</Label>
                  <Input value={profile.displayName} onChange={(event) => setProfile({ ...profile, displayName: event.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>{tx('Phone', 'फोन')}</Label>
                  <Input value={profile.phone} onChange={(event) => setProfile({ ...profile, phone: event.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>{tx('City', 'शहर')}</Label>
                  <Select value={profile.city} onValueChange={(value) => setProfile({ ...profile, city: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {locationOptions.map((location) => (
                        <SelectItem key={location} value={location}>
                          {location}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{tx('State', 'राज्य')}</Label>
                  <Input value={profile.state} onChange={(event) => setProfile({ ...profile, state: event.target.value })} />
                </div>
              </div>

              <div className="space-y-2">
                <Label>{tx('Address', 'पता')}</Label>
                <Input value={profile.address} onChange={(event) => setProfile({ ...profile, address: event.target.value })} />
              </div>

              <div className="space-y-2">
                <Label>{tx('About', 'परिचय')}</Label>
                <Textarea value={profile.about} onChange={(event) => setProfile({ ...profile, about: event.target.value })} rows={4} />
              </div>

              <Separator />

              {user.role === 'user' && profile.farmerProfile && (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>{tx('Aadhaar number', 'आधार नंबर')}</Label>
                    <Input
                      value={profile.farmerProfile.aadhaarNumber}
                      onChange={(event) =>
                        setProfile({
                          ...profile,
                          farmerProfile: { ...profile.farmerProfile!, aadhaarNumber: event.target.value.replace(/\D/g, '').slice(0, 12) },
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{tx('Farm size (acres)', 'खेती का आकार (एकड़)')}</Label>
                    <Input
                      type="number"
                      value={profile.farmerProfile.farmSizeAcres}
                      onChange={(event) =>
                        setProfile({
                          ...profile,
                          farmerProfile: { ...profile.farmerProfile!, farmSizeAcres: Number(event.target.value || 0) },
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{tx('Primary crops', 'मुख्य फसलें')}</Label>
                    <Input
                      value={profile.farmerProfile.primaryCrops.join(', ')}
                      onChange={(event) =>
                        setProfile({
                          ...profile,
                          farmerProfile: {
                            ...profile.farmerProfile!,
                            primaryCrops: event.target.value.split(',').map((item) => item.trim()).filter(Boolean),
                          },
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{tx('Preferred mandi', 'पसंदीदा मंडी')}</Label>
                    <Input
                      value={profile.farmerProfile.mandiPreference}
                      onChange={(event) =>
                        setProfile({
                          ...profile,
                          farmerProfile: { ...profile.farmerProfile!, mandiPreference: event.target.value },
                        })
                      }
                    />
                  </div>
                </div>
              )}

              {user.role === 'buyer' && profile.buyerProfile && (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>{tx('GSTIN', 'जीएसटीआईएन')}</Label>
                    <Input
                      value={profile.buyerProfile.gstin}
                      onChange={(event) =>
                        setProfile({
                          ...profile,
                          buyerProfile: { ...profile.buyerProfile!, gstin: event.target.value.toUpperCase() },
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{tx('Business name', 'व्यवसाय नाम')}</Label>
                    <Input
                      value={profile.buyerProfile.businessName}
                      onChange={(event) =>
                        setProfile({
                          ...profile,
                          buyerProfile: { ...profile.buyerProfile!, businessName: event.target.value },
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{tx('Procurement capacity', 'प्रोक्योरमेंट क्षमता')}</Label>
                    <Input
                      value={profile.buyerProfile.procurementCapacity}
                      onChange={(event) =>
                        setProfile({
                          ...profile,
                          buyerProfile: { ...profile.buyerProfile!, procurementCapacity: event.target.value },
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{tx('Preferred commodities', 'पसंदीदा कमोडिटी')}</Label>
                    <Input
                      value={profile.buyerProfile.preferredCommodities.join(', ')}
                      onChange={(event) =>
                        setProfile({
                          ...profile,
                          buyerProfile: {
                            ...profile.buyerProfile!,
                            preferredCommodities: event.target.value.split(',').map((item) => item.trim()).filter(Boolean),
                          },
                        })
                      }
                    />
                  </div>
                </div>
              )}

              {user.role === 'admin' && (
                <div className="rounded-xl border bg-white/45 p-4 text-sm text-muted-foreground">
                  {tx(
                    'Administrator accounts do not go through AgriTrust verification. Admins govern, review, and approve AgriTrust records for other roles.',
                    'एडमिन अकाउंट एग्रीट्रस्ट वेरिफिकेशन से नहीं गुजरते। एडमिन अन्य भूमिकाओं के एग्रीट्रस्ट रिकॉर्ड को नियंत्रित, समीक्षा और अनुमोदित करते हैं।'
                  )}
                </div>
              )}

              <Separator />

              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium">{tx('Notification controls', 'नोटिफिकेशन नियंत्रण')}</p>
                  <p className="text-sm text-muted-foreground">
                    {tx('These controls decide which workflows notify you first.', 'ये कंट्रोल तय करते हैं कि कौन-से वर्कफ़्लो आपको पहले सूचित करें।')}
                  </p>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  {[
                    ['priceAlerts', tx('Price alerts', 'प्राइस अलर्ट')],
                    ['marketplace', tx('Marketplace updates', 'मार्केटप्लेस अपडेट')],
                    ['community', tx('Community replies', 'कम्युनिटी रिप्लाई')],
                    ['operations', tx('Operational alerts', 'ऑपरेशनल अलर्ट')],
                  ].map(([key, label]) => (
                    <div key={key} className="flex items-center justify-between rounded-xl border bg-white/45 p-3">
                      <span className="text-sm">{label}</span>
                      <Switch
                        checked={profile.notificationPreferences[key as keyof UserWorkspaceProfile['notificationPreferences']]}
                        onCheckedChange={(checked) =>
                          setProfile({
                            ...profile,
                            notificationPreferences: { ...profile.notificationPreferences, [key]: checked },
                          })
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {user.role !== 'admin' && (
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium">{tx('Assigned AgriTrust forms', 'सौंपे गए एग्रीट्रस्ट फॉर्म')}</p>
                    <p className="text-sm text-muted-foreground">
                      {tx('Admin-issued forms appear here for authenticity, verification, and compliance review.', 'प्रामाणिकता, वेरिफिकेशन और कंप्लायंस रिव्यू के लिए एडमिन द्वारा जारी फॉर्म यहाँ दिखाई देंगे।')}
                    </p>
                  </div>
                  <div className="space-y-3">
                    {trustForms.map((form) => {
                      const existingSubmission = trustSubmissions.find((submission) => submission.formId === form.id);
                      return (
                        <div key={form.id} className="rounded-xl border bg-white/45 p-4">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="font-medium">{form.title}</p>
                              <p className="text-sm text-muted-foreground">{form.description}</p>
                            </div>
                            <Badge variant={existingSubmission?.status === 'verified' ? 'default' : 'secondary'}>
                              {existingSubmission?.status ?? form.status}
                            </Badge>
                          </div>
                          <div className="mt-4 grid gap-3 md:grid-cols-2">
                            {form.fields.map((field) => (
                              <div key={field.id} className="space-y-2">
                                <Label>{field.label}</Label>
                                <Input
                                  value={formResponses[form.id]?.[field.id] ?? ''}
                                  placeholder={field.placeholder || field.label}
                                  onChange={(event) =>
                                    setFormResponses((current) => ({
                                      ...current,
                                      [form.id]: {
                                        ...(current[form.id] ?? {}),
                                        [field.id]: event.target.value,
                                      },
                                    }))
                                  }
                                />
                              </div>
                            ))}
                          </div>
                          <div className="mt-4 flex justify-end">
                            <Button onClick={() => submitTrustForm(form)} disabled={existingSubmission?.status === 'verified'}>
                              {existingSubmission?.status === 'verified' ? tx('Verified', 'सत्यापित') : tx('Submit form', 'फॉर्म सबमिट करें')}
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                    {trustForms.length === 0 && (
                      <div className="rounded-xl border bg-white/45 p-4 text-sm text-muted-foreground">
                        {tx('No AgriTrust forms are pending for this account.', 'इस अकाउंट के लिए कोई एग्रीट्रस्ट फॉर्म लंबित नहीं है।')}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {user.role === 'buyer' && (
                <>
                  <Separator />
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-medium">{tx('Farmer validation desk', 'किसान सत्यापन डेस्क')}</p>
                      <p className="text-sm text-muted-foreground">
                        {tx('Buyers can validate farmer profiles directly after reviewing credibility and trade readiness.', 'खरीदार विश्वसनीयता और व्यापार तत्परता की समीक्षा के बाद सीधे किसान प्रोफाइल को सत्यापित कर सकते हैं।')}
                      </p>
                    </div>
                    <div className="space-y-3">
                      {farmerProfiles.map((farmer) => (
                        <div key={farmer.userEmail} className="rounded-xl border bg-white/45 p-4">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <p className="font-medium">{farmer.displayName}</p>
                              <p className="text-sm text-muted-foreground">{farmer.city}, {farmer.state} · {farmer.userEmail}</p>
                              <p className="mt-1 text-xs text-muted-foreground">{farmer.trustLabel} · {farmer.trustScore}/100</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant={farmer.verification.farmer?.status === 'verified' ? 'default' : 'secondary'}>
                                {farmer.verification.farmer?.status ?? 'pending'}
                              </Badge>
                              <Button
                                size="sm"
                                onClick={() => validateFarmerProfile(farmer.userEmail)}
                                disabled={farmer.verification.farmer?.status === 'verified'}
                              >
                                {farmer.verification.farmer?.status === 'verified' ? tx('Validated', 'सत्यापित') : tx('Validate farmer', 'किसान सत्यापित करें')}
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={saveProfile} disabled={saving}>
              <UserCog className="mr-2 h-4 w-4" />
              {saving
                ? tx('Saving...', 'सहेजा जा रहा है...')
                : user.role === 'admin'
                  ? tx('Save Admin Workspace', 'एडमिन वर्कस्पेस सहेजें')
                  : tx('Save Agri Trust Profile', 'एग्री ट्रस्ट प्रोफाइल सहेजें')}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="commerce" className="space-y-4">
          <Card className="bg-white/55">
            <CardHeader>
              <CardTitle>{tx('Orders, invoices, and shipment tracking', 'ऑर्डर, इनवॉइस और शिपमेंट ट्रैकिंग')}</CardTitle>
              <CardDescription>
                {tx('These records are now persisted and can be reused across logistics, finance, and admin modules.', 'ये रिकॉर्ड अब सेव रहते हैं और लॉजिस्टिक्स, फाइनेंस और एडमिन मॉड्यूल में दोबारा इस्तेमाल होते हैं।')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <p className="mb-2 text-sm font-medium">{tx('Orders', 'ऑर्डर')}</p>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>{tx('Status', 'स्थिति')}</TableHead>
                      <TableHead>{tx('Payment', 'भुगतान')}</TableHead>
                      <TableHead>{tx('Total', 'कुल')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell>{order.id}</TableCell>
                        <TableCell>{order.status}</TableCell>
                        <TableCell>{order.paymentStatus}</TableCell>
                        <TableCell>INR {order.totalAmount.toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div>
                <p className="mb-2 text-sm font-medium">{tx('Shipments', 'शिपमेंट')}</p>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>{tx('Courier', 'कूरियर')}</TableHead>
                      <TableHead>{tx('Checkpoint', 'चेकपॉइंट')}</TableHead>
                      <TableHead>{tx('ETA', 'ईटीए')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {shipments.map((shipment) => (
                      <TableRow key={shipment.id}>
                        <TableCell>{shipment.id}</TableCell>
                        <TableCell>{shipment.courier}</TableCell>
                        <TableCell>{shipment.lastCheckpoint}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span>{shipment.etaHours}h</span>
                            {shipment.status === 'delivered' && !shipment.deliveryVerified && (
                              <Button size="sm" variant="outline" onClick={() => acknowledgeShipment(shipment.id)}>
                                {tx('Acknowledge', 'प्राप्त करें')}
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div>
                <p className="mb-2 text-sm font-medium">{tx('Invoices', 'इनवॉइस')}</p>
                <div className="space-y-2">
                  {invoices.map((invoice) => (
                    <div key={invoice.id} className="flex flex-col gap-3 rounded-xl border bg-white/45 p-4 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="font-medium">{invoice.id}</p>
                        <p className="text-sm text-muted-foreground">
                          {invoice.orderId} · INR {invoice.totalAmount.toLocaleString()}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        onClick={() =>
                          downloadTextFile(
                            `${invoice.id}.txt`,
                            [
                              `Invoice: ${invoice.id}`,
                              `Order: ${invoice.orderId}`,
                              `Issued to: ${invoice.issuedTo}`,
                              `Amount: INR ${invoice.totalAmount.toLocaleString()}`,
                              '',
                              ...invoice.lineItems.map((item) => `${item.name} x${item.quantity} = INR ${(item.price * item.quantity).toLocaleString()}`),
                            ].join('\n')
                          )
                        }
                      >
                        <FileText className="mr-2 h-4 w-4" />
                        {tx('Download invoice', 'इनवॉइस डाउनलोड')}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="communication" className="space-y-4">
          <Card className="bg-white/55">
            <CardHeader>
              <CardTitle>{tx('Alerts, calls, and messages', 'अलर्ट, कॉल और मैसेज')}</CardTitle>
              <CardDescription>
                {tx('Communication history now comes from persisted notifications and buyer interaction records.', 'कम्युनिकेशन हिस्ट्री अब सेव की गई नोटिफिकेशन और खरीदार इंटरैक्शन रिकॉर्ड से आती है।')}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6 lg:grid-cols-2">
              <div className="space-y-3">
                <p className="text-sm font-medium">{tx('Latest notifications', 'नवीनतम सूचनाएं')}</p>
                {notifications.map((notification) => (
                  <div key={notification.id} className="rounded-xl border bg-white/45 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium">{notification.title}</p>
                      <Badge variant={notification.read ? 'outline' : 'default'}>{notification.read ? tx('Read', 'पढ़ा गया') : tx('New', 'नया')}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{notification.body}</p>
                  </div>
                ))}
              </div>

              <div className="space-y-3">
                <p className="text-sm font-medium">{tx('Conversation log', 'कन्वर्सेशन लॉग')}</p>
                {interactions.map((interaction) => (
                  <div key={interaction.id} className="rounded-xl border bg-white/45 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium">{interaction.buyerName}</p>
                      <Badge variant="outline">{interaction.mode}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{interaction.message || interaction.lotDetails}</p>
                    <p className="mt-2 flex items-center gap-2 text-xs text-emerald-700">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {interaction.status}
                    </p>
                  </div>
                ))}
              </div>

              <div className="space-y-3 lg:col-span-2">
                <p className="text-sm font-medium">{tx('Communication groups', 'कम्युनिकेशन ग्रुप')}</p>
                {groups.length === 0 && <p className="text-sm text-muted-foreground">{tx('No admin-created groups available yet.', 'अभी कोई एडमिन-निर्मित ग्रुप उपलब्ध नहीं है।')}</p>}
                {groups.length > 0 && (
                  <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
                    <div className="space-y-2">
                      {groups.map((group) => (
                        <button
                          key={group.id}
                          className={`w-full rounded-xl border p-3 text-left ${selectedGroupId === group.id ? 'border-primary bg-primary/5' : 'bg-white/45'}`}
                          onClick={() => setSelectedGroupId(group.id)}
                        >
                          <p className="font-medium">{group.name}</p>
                          <p className="text-xs text-muted-foreground">{group.description}</p>
                        </button>
                      ))}
                    </div>
                    <div className="space-y-3 rounded-xl border bg-white/45 p-4">
                      <div className="space-y-2">
                        {groupMessages.map((messageRow) => (
                          <div key={messageRow.id} className="rounded-lg border bg-white p-3">
                            <div className="flex items-center justify-between gap-2">
                              <p className="font-medium">{messageRow.senderName}</p>
                              <p className="text-xs text-muted-foreground">{new Date(messageRow.createdAt).toLocaleString()}</p>
                            </div>
                            <p className="mt-1 text-sm text-muted-foreground">{messageRow.body}</p>
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Input value={groupMessageDraft} onChange={(event) => setGroupMessageDraft(event.target.value)} placeholder={tx('Type a message to the group', 'ग्रुप के लिए मैसेज लिखें')} />
                        <Button onClick={sendGroupMessage}>{tx('Send', 'भेजें')}</Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-3 lg:col-span-2">
                <p className="text-sm font-medium">{tx('Finance and credit log', 'फाइनेंस और क्रेडिट लॉग')}</p>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{tx('Type', 'प्रकार')}</TableHead>
                      <TableHead>{tx('Direction', 'दिशा')}</TableHead>
                      <TableHead>{tx('Amount', 'राशि')}</TableHead>
                      <TableHead>{tx('Status', 'स्थिति')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.slice(0, 6).map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell>{transaction.type}</TableCell>
                        <TableCell>{transaction.direction}</TableCell>
                        <TableCell>INR {transaction.amount.toLocaleString()}</TableCell>
                        <TableCell>{transaction.status}</TableCell>
                      </TableRow>
                    ))}
                    {loans.slice(0, 3).map((loan) => (
                      <TableRow key={loan.id}>
                        <TableCell>{loan.purpose}</TableCell>
                        <TableCell>{tx('Credit', 'क्रेडिट')}</TableCell>
                        <TableCell>INR {loan.amount.toLocaleString()}</TableCell>
                        <TableCell>{loan.status}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {user.role === 'user' && (
          <TabsContent value="intel" className="space-y-4">
            <Card className="bg-white/55">
              <CardHeader>
                <CardTitle>{tx('Farmer intelligence contribution', 'किसान इंटेलिजेंस योगदान')}</CardTitle>
                <CardDescription>
                  {tx('Share mandi price, weather, or crop-status data. Verified reports improve analytics and earn wallet and credit rewards.', 'मंडी भाव, मौसम या फसल-स्थिति डेटा साझा करें। सत्यापित रिपोर्ट एनालिटिक्स सुधारती हैं और वॉलेट तथा क्रेडिट रिवॉर्ड देती हैं।')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>{tx('Report type', 'रिपोर्ट प्रकार')}</Label>
                    <Select value={fieldReportDraft.reportType} onValueChange={(value) => setFieldReportDraft((current) => ({ ...current, reportType: value as FarmerFieldReport['reportType'] }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mandi-price">{tx('Mandi price', 'मंडी भाव')}</SelectItem>
                        <SelectItem value="weather">{tx('Weather', 'मौसम')}</SelectItem>
                        <SelectItem value="crop-status">{tx('Crop status', 'फसल स्थिति')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{tx('Commodity', 'कमोडिटी')}</Label>
                    <Input value={fieldReportDraft.commodity} onChange={(event) => setFieldReportDraft((current) => ({ ...current, commodity: event.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>{tx('Mandi', 'मंडी')}</Label>
                    <Input value={fieldReportDraft.mandi} onChange={(event) => setFieldReportDraft((current) => ({ ...current, mandi: event.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>{tx('Reported price', 'रिपोर्टेड भाव')}</Label>
                    <Input type="number" value={fieldReportDraft.reportedPrice} onChange={(event) => setFieldReportDraft((current) => ({ ...current, reportedPrice: event.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>{tx('Weather condition', 'मौसम स्थिति')}</Label>
                    <Input value={fieldReportDraft.weatherCondition} onChange={(event) => setFieldReportDraft((current) => ({ ...current, weatherCondition: event.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>{tx('Rainfall (mm)', 'वर्षा (मिमी)')}</Label>
                    <Input type="number" value={fieldReportDraft.rainfallMm} onChange={(event) => setFieldReportDraft((current) => ({ ...current, rainfallMm: event.target.value }))} />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>{tx('Summary', 'सार')}</Label>
                    <Textarea value={fieldReportDraft.summary} onChange={(event) => setFieldReportDraft((current) => ({ ...current, summary: event.target.value }))} rows={4} />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>{tx('Proof note', 'प्रूफ नोट')}</Label>
                    <Textarea value={fieldReportDraft.proofNote} onChange={(event) => setFieldReportDraft((current) => ({ ...current, proofNote: event.target.value }))} rows={3} />
                  </div>
                </div>
                <Button onClick={submitFieldReport}>{tx('Submit field report', 'फील्ड रिपोर्ट सबमिट करें')}</Button>

                <Separator />

                <div className="space-y-3">
                  <p className="text-sm font-medium">{tx('Submitted field reports', 'सबमिट की गई फील्ड रिपोर्ट')}</p>
                  {fieldReports.map((report) => (
                    <div key={report.id} className="rounded-xl border bg-white/45 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-medium">{report.reportType} · {report.city}</p>
                          <p className="text-sm text-muted-foreground">{report.summary}</p>
                        </div>
                        <Badge variant={report.status === 'verified' ? 'default' : 'secondary'}>{report.status}</Badge>
                      </div>
                      <p className="mt-2 text-xs text-emerald-700">
                        {tx('Reward value', 'रिवॉर्ड वैल्यू')}: INR {report.rewardAmount} · {tx('points', 'पॉइंट्स')} {report.rewardPoints}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
