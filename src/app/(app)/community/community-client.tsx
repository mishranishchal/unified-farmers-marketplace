'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageSquare, Rss, Search, MoreHorizontal, ThumbsUp, MessageCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import type { CommunicationGroup, CommunityPost } from '@/lib/types';

const forums = [
  { name: 'Maize Growers', members: 12500, newPosts: 45 },
  { name: 'Coffee Farmers India', members: 8700, newPosts: 23 },
  { name: 'Pune Urban Farmers', members: 3400, newPosts: 12 },
  { name: 'Jaipur Agri-preneurs', members: 5600, newPosts: 31 },
];

type CommunityClientProps = {
  initialPosts: CommunityPost[];
};

export default function CommunityClient({ initialPosts }: CommunityClientProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [query, setQuery] = useState('');
  const [joinedForums, setJoinedForums] = useState<string[]>([]);
  const [posts, setPosts] = useState<CommunityPost[]>(initialPosts);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<CommunityPost | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [groups, setGroups] = useState<CommunicationGroup[]>([]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const raw = window.localStorage.getItem('community-joined-forums');
    if (raw) {
      try {
        setJoinedForums(JSON.parse(raw) as string[]);
      } catch {
        setJoinedForums([]);
      }
    }
  }, []);

  useEffect(() => {
    const loadGroups = async () => {
      if (!user) return;
      try {
        const response = await fetch('/api/communication-groups', { credentials: 'include' });
        const payload = await response.json();
        if (payload.success) {
          setGroups(payload.data as CommunicationGroup[]);
        }
      } catch {
        setGroups([]);
      }
    };
    void loadGroups();
  }, [user]);

  const toggleJoinForum = (forumName: string) => {
    setJoinedForums((prev) => {
      const next = prev.includes(forumName) ? prev.filter((item) => item !== forumName) : [...prev, forumName];
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('community-joined-forums', JSON.stringify(next));
      }
      toast({
        title: prev.includes(forumName) ? 'Forum left' : 'Forum joined',
        description: prev.includes(forumName) ? `You left ${forumName}.` : `You joined ${forumName}.`,
      });
      return next;
    });
  };

  const filteredPosts = useMemo(() => {
    if (!query.trim()) return posts;
    const lowerQuery = query.toLowerCase();
    return posts.filter(
      (post) =>
        post.title.toLowerCase().includes(lowerQuery) ||
        post.content.toLowerCase().includes(lowerQuery) ||
        post.category?.toLowerCase().includes(lowerQuery) ||
        post.region?.toLowerCase().includes(lowerQuery)
    );
  }, [posts, query]);

  const openEditModal = (post: CommunityPost) => {
    setSelectedPost(post);
    setEditTitle(post.title);
    setEditContent(post.content);
    setIsEditModalOpen(true);
  };

  const openDeleteModal = (post: CommunityPost) => {
    setSelectedPost(post);
    setIsDeleteModalOpen(true);
  };

  const createPost = async () => {
    const response = await fetch('/api/community/posts', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, content }),
    });
    const payload = await response.json();
    if (!response.ok || !payload.success) {
      toast({ variant: 'destructive', title: 'Failed', description: payload.error || 'Unable to create post.' });
      return;
    }
    setPosts((prev) => [payload.data as CommunityPost, ...prev]);
    setTitle('');
    setContent('');
    setIsCreateModalOpen(false);
    toast({ title: 'Posted', description: 'Your community post is now live.' });
  };

  const saveEdit = async () => {
    if (!selectedPost) return;
    const response = await fetch('/api/community/posts', {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: selectedPost.id, title: editTitle, content: editContent }),
    });
    const payload = await response.json();
    if (!response.ok || !payload.success) {
      toast({ variant: 'destructive', title: 'Failed', description: payload.error || 'Unable to save changes.' });
      return;
    }
    setPosts((prev) => prev.map((post) => (post.id === selectedPost.id ? (payload.data as CommunityPost) : post)));
    setIsEditModalOpen(false);
    toast({ title: 'Updated', description: 'Post changes saved.' });
  };

  const deletePost = async () => {
    if (!selectedPost) return;
    const response = await fetch('/api/community/posts', {
      method: 'DELETE',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: selectedPost.id }),
    });
    const payload = await response.json();
    if (!response.ok || !payload.success) {
      toast({ variant: 'destructive', title: 'Failed', description: payload.error || 'Unable to delete post.' });
      return;
    }
    setPosts((prev) => prev.filter((post) => post.id !== selectedPost.id));
    setIsDeleteModalOpen(false);
    toast({ title: 'Deleted', description: 'Post removed from community.' });
  };

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="font-headline text-3xl font-bold">Farmer Community</h1>
        <p className="text-muted-foreground">Connect, learn, and share with fellow farmers.</p>
      </header>

      <div className="flex flex-col gap-4 md:flex-row">
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search forums or posts..." className="pl-10" />
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <MessageSquare className="mr-2 h-4 w-4" />
          Create New Post
        </Button>
      </div>

      <Tabs defaultValue="forums">
        <TabsList>
          <TabsTrigger value="forums">Forums</TabsTrigger>
          <TabsTrigger value="my-posts">Community Feed</TabsTrigger>
        </TabsList>
        <TabsContent value="forums" className="mt-4">
          <div className="grid gap-4 md:grid-cols-2">
            {forums.map((forum) => (
              <Card key={forum.name}>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="rounded-full bg-primary/10 p-3">
                      <Rss className="h-5 w-5 text-amber-500" />
                    </div>
                    <CardTitle className="font-headline text-xl">{forum.name}</CardTitle>
                  </div>
                  <Button variant={joinedForums.includes(forum.name) ? 'secondary' : 'outline'} size="sm" onClick={() => toggleJoinForum(forum.name)}>
                    {joinedForums.includes(forum.name) ? 'Joined' : 'Join'}
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>{forum.members.toLocaleString()} members</span>
                    <span>{forum.newPosts} new posts today</span>
                  </div>
                </CardContent>
              </Card>
            ))}
            {groups.map((group) => (
              <Card key={group.id}>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="rounded-full bg-primary/10 p-3">
                      <MessageSquare className="h-5 w-5 text-emerald-600" />
                    </div>
                    <CardTitle className="font-headline text-xl">{group.name}</CardTitle>
                  </div>
                  <Button variant="secondary" size="sm">Channel</Button>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{group.description}</p>
                  <div className="mt-3 flex justify-between text-sm text-muted-foreground">
                    <span>{group.memberEmails.length.toLocaleString()} members</span>
                    <span>Admin managed</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
        <TabsContent value="my-posts" className="mt-4">
          <div className="space-y-4">
            {filteredPosts.map((post) => (
              <Card key={post.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="font-headline text-2xl">{post.title}</CardTitle>
                      <p className="text-sm text-muted-foreground">{new Date(post.createdAt).toLocaleString()}</p>
                    </div>
                    <DropdownMenu>
                      {(user?.role === 'admin' || post.authorEmail?.toLowerCase() === user?.email?.toLowerCase()) && (
                        <>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditModal(post)}>Edit Post</DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive" onClick={() => openDeleteModal(post)}>
                              Delete Post
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </>
                      )}
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="mb-3 flex flex-wrap gap-2">
                    {post.category && <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-medium text-slate-700">{post.category}</span>}
                    {post.region && <span className="rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-medium text-emerald-700">{post.region}</span>}
                    <span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-medium text-amber-700">{post.authorName}</span>
                  </div>
                  <p className="text-muted-foreground">{post.content}</p>
                </CardContent>
                <CardFooter className="flex gap-4 text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <ThumbsUp className="h-4 w-4" /> {post.likes}
                  </div>
                  <div className="flex items-center gap-1">
                    <MessageCircle className="h-4 w-4" /> {post.comments}
                  </div>
                </CardFooter>
              </Card>
            ))}
            {filteredPosts.length === 0 && <p className="text-sm text-muted-foreground">No posts found for the current filter.</p>}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create a New Post</DialogTitle>
            <DialogDescription>Share your knowledge or ask a question to the community.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="post-title">Title</Label>
              <Input id="post-title" value={title} onChange={(event) => setTitle(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="post-content">Content</Label>
              <Textarea id="post-content" value={content} onChange={(event) => setContent(event.target.value)} rows={5} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={createPost} disabled={!title.trim() || !content.trim()}>
              Post to Community
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Post</DialogTitle>
            <DialogDescription>Make changes to your post.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-post-title">Title</Label>
              <Input id="edit-post-title" value={editTitle} onChange={(event) => setEditTitle(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-post-content">Content</Label>
              <Textarea id="edit-post-content" value={editContent} onChange={(event) => setEditContent(event.target.value)} rows={5} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveEdit} disabled={!editTitle.trim() || !editContent.trim()}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you sure you want to delete this post?</DialogTitle>
            <DialogDescription>This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={deletePost}>
              Yes, Delete Post
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
