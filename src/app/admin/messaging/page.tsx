'use client';

import { useEffect, useState } from 'react';
import { Bell, Inbox, Send } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import type { BuyerInteraction, CommunicationGroup, UserNotification } from '@/lib/types';

export default function MessagingPage() {
  const { toast } = useToast();
  const [message, setMessage] = useState('');
  const [title, setTitle] = useState('Platform update');
  const [audience, setAudience] = useState<'all' | 'farmers' | 'buyers' | 'admins'>('all');
  const [formTargetEmail, setFormTargetEmail] = useState('');
  const [formTargetName, setFormTargetName] = useState('');
  const [formPrompt, setFormPrompt] = useState('');
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [interactions, setInteractions] = useState<BuyerInteraction[]>([]);
  const [users, setUsers] = useState<Array<{ email: string; name: string; role: 'user' | 'buyer' | 'admin' }>>([]);
  const [groups, setGroups] = useState<CommunicationGroup[]>([]);
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [groupMembers, setGroupMembers] = useState<string[]>([]);

  useEffect(() => {
    const load = async () => {
      const [notificationsRes, interactionsRes, usersRes, groupsRes] = await Promise.all([
        fetch('/api/notifications', { credentials: 'include' }),
        fetch('/api/buyer-interactions', { credentials: 'include' }),
        fetch('/api/users', { credentials: 'include' }),
        fetch('/api/communication-groups', { credentials: 'include' }),
      ]);
      const [notificationsPayload, interactionsPayload, usersPayload, groupsPayload] = await Promise.all([
        notificationsRes.json(),
        interactionsRes.json(),
        usersRes.json(),
        groupsRes.json(),
      ]);
      if (notificationsPayload.success) setNotifications(notificationsPayload.data as UserNotification[]);
      if (interactionsPayload.success) setInteractions(interactionsPayload.data as BuyerInteraction[]);
      if (usersPayload.success) setUsers(usersPayload.data as Array<{ email: string; name: string; role: 'user' | 'buyer' | 'admin' }>);
      if (groupsPayload.success) setGroups(groupsPayload.data as CommunicationGroup[]);
    };
    void load();
  }, []);

  const sendBroadcast = async () => {
    const response = await fetch('/api/notifications', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        body: message,
        audience,
        category: 'system',
        actionHref: '/profile',
      }),
    });
    const payload = await response.json();
    if (!response.ok || !payload.success) {
      toast({ variant: 'destructive', title: 'Broadcast failed', description: payload.error || 'Unable to send broadcast.' });
      return;
    }
    toast({ title: 'Broadcast sent', description: `${payload.data.count} recipients notified.` });
    setMessage('');
    setTitle('Platform update');
    const latestRes = await fetch('/api/notifications', { credentials: 'include' });
    const latestPayload = await latestRes.json();
    if (latestPayload.success) setNotifications(latestPayload.data as UserNotification[]);
  };

  const sendFormRequest = async () => {
    const response = await fetch('/api/negotiations', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        targetName: formTargetName || formTargetEmail,
        targetEmail: formTargetEmail,
        targetRole: 'audience',
        commodity: 'Information Request',
        quantity: 1,
        proposedPrice: 0,
        terms: formPrompt,
        mode: 'form',
      }),
    });
    const payload = await response.json();
    if (!response.ok || !payload.success) {
      toast({ variant: 'destructive', title: 'Form request failed', description: payload.error || 'Unable to send form request.' });
      return;
    }
    toast({ title: 'Form request sent', description: `Request sent to ${formTargetEmail}.` });
    setFormTargetEmail('');
    setFormTargetName('');
    setFormPrompt('');
  };

  const createGroup = async () => {
    const response = await fetch('/api/communication-groups', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: groupName,
        description: groupDescription,
        memberEmails: groupMembers,
      }),
    });
    const payload = await response.json();
    if (!response.ok || !payload.success) {
      toast({ variant: 'destructive', title: 'Group creation failed', description: payload.error || 'Unable to create communication group.' });
      return;
    }
    setGroups((current) => [payload.data as CommunicationGroup, ...current]);
    setGroupName('');
    setGroupDescription('');
    setGroupMembers([]);
    toast({ title: 'Group created', description: 'New communication channel is now active.' });
  };

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-3xl font-bold font-headline">Messaging & Notifications</h1>
        <p className="text-muted-foreground">Broadcast platform alerts, inspect inbox traffic, and monitor live buyer communications.</p>
      </header>

      <Tabs defaultValue="broadcast">
        <TabsList>
          <TabsTrigger value="broadcast"><Send className="mr-2 h-4 w-4" />Broadcast</TabsTrigger>
          <TabsTrigger value="groups"><Inbox className="mr-2 h-4 w-4" />Groups</TabsTrigger>
          <TabsTrigger value="support"><Inbox className="mr-2 h-4 w-4" />Interaction Inbox</TabsTrigger>
        </TabsList>

        <TabsContent value="broadcast" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Compose New Broadcast</CardTitle>
              <CardDescription>Send a real in-app notification to farmers, buyers, admins, or the whole platform.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input value={title} onChange={(event) => setTitle(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Message</Label>
                <Textarea value={message} onChange={(event) => setMessage(event.target.value)} rows={5} />
              </div>
              <div className="space-y-2">
                <Label>Audience</Label>
                <Select value={audience} onValueChange={(value) => setAudience(value as typeof audience)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All users</SelectItem>
                    <SelectItem value="farmers">Farmers only</SelectItem>
                    <SelectItem value="buyers">Buyers only</SelectItem>
                    <SelectItem value="admins">Admins only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={sendBroadcast}>
                <Send className="mr-2 h-4 w-4" />
                Send Broadcast
              </Button>
            </CardFooter>
          </Card>

          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Recent Notifications</CardTitle>
              <CardDescription>Latest persisted notifications generated across platform workflows and broadcasts.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {notifications.slice(0, 10).map((notification) => (
                <div key={notification.id} className="rounded-xl border p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium">{notification.title}</p>
                    <Badge variant={notification.read ? 'outline' : 'default'}>{notification.category}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{notification.body}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Request Details Form</CardTitle>
              <CardDescription>Send a structured information request to any specific user for verification or negotiation follow-up.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Target name</Label>
                <Input value={formTargetName} onChange={(event) => setFormTargetName(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Target email</Label>
                <Input value={formTargetEmail} onChange={(event) => setFormTargetEmail(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Form prompt</Label>
                <Textarea value={formPrompt} onChange={(event) => setFormPrompt(event.target.value)} rows={4} placeholder="Ask for GST proof, Aadhaar confirmation, dispatch details, moisture report, etc." />
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={sendFormRequest}>Send Form Request</Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="groups" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Create Communication Group</CardTitle>
              <CardDescription>Create buyer-farmer groups for negotiation, support, and instant channel-style updates.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Group name</Label>
                <Input value={groupName} onChange={(event) => setGroupName(event.target.value)} placeholder="Example: Pune Maize Procurement Channel" />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={groupDescription} onChange={(event) => setGroupDescription(event.target.value)} rows={3} />
              </div>
              <div className="space-y-2">
                <Label>Select members</Label>
                <div className="grid gap-2 md:grid-cols-2">
                  {users.filter((user) => user.role !== 'admin').map((user) => (
                    <button
                      key={user.email}
                      type="button"
                      className={`rounded-xl border p-3 text-left ${groupMembers.includes(user.email) ? 'border-primary bg-primary/5' : 'bg-white'}`}
                      onClick={() =>
                        setGroupMembers((current) =>
                          current.includes(user.email) ? current.filter((email) => email !== user.email) : [...current, user.email]
                        )
                      }
                    >
                      <p className="font-medium">{user.name}</p>
                      <p className="text-xs text-muted-foreground">{user.email} · {user.role}</p>
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={createGroup}>Create Group</Button>
            </CardFooter>
          </Card>

          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Active Groups</CardTitle>
              <CardDescription>Admin-managed channels currently available to members.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {groups.map((group) => (
                <div key={group.id} className="rounded-xl border p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="font-medium">{group.name}</p>
                      <p className="text-sm text-muted-foreground">{group.description}</p>
                    </div>
                    <Badge variant="secondary">{group.memberEmails.length} members</Badge>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">{group.memberEmails.join(', ')}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="support" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Interaction Inbox</CardTitle>
              <CardDescription>Buyer calls and messages are now visible as live communication records.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {interactions.map((ticket) => (
                <div key={ticket.id} className="flex items-center justify-between rounded-xl border p-4">
                  <div>
                    <p className="font-semibold">{ticket.buyerName}</p>
                    <p className="text-sm text-muted-foreground">{ticket.message || ticket.lotDetails}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={ticket.status === 'pending' ? 'destructive' : 'secondary'}>{ticket.mode} · {ticket.status}</Badge>
                    <Button variant="outline" size="sm"><Bell className="mr-2 h-4 w-4" />Review</Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
