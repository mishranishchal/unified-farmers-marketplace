
'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Plus, MoreHorizontal, Video, FileText, Bot, X } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const contentItems = [
    { id: 'VID001', title: 'Proper Fertilizer Application for Maize', type: 'Video', category: 'Crop Management', views: 12800, lang: 'LIndia, English' },
    { id: 'GUIDE002', title: 'Identifying Fall Armyworm in India', type: 'PDF Guide', category: 'Pest Control', views: 25000, lang: 'English' },
    { id: 'AUDIO003', title: 'Post-Harvest Handling for Coffee', type: 'Audio', category: 'Post-Harvest', views: 7500, lang: 'Runyankole' },
    { id: 'BOT001', title: 'Pest Diagnosis: Maize Streak Virus', type: 'Chatbot Knowledge', category: 'Pest Control', views: 0, lang: 'N/A' },
];

type ContentItem = (typeof contentItems)[number];

export default function ContentManagementPage() {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedContent, setSelectedContent] = useState<ContentItem | null>(null);

    const openModal = (content: ContentItem | null = null) => {
        setSelectedContent(content);
        setIsModalOpen(true);
    };

    return (
        <div className="flex flex-col gap-8">
            <header>
                <h1 className="text-3xl font-bold font-headline">Content & Learning Hub</h1>
                <p className="text-muted-foreground">Add/edit the agronomy content shown in the app.</p>
            </header>

            <Tabs defaultValue="all-content">
                <div className="flex items-center justify-between">
                    <TabsList>
                        <TabsTrigger value="all-content">All Content</TabsTrigger>
                        <TabsTrigger value="videos">Videos</TabsTrigger>
                        <TabsTrigger value="guides">Guides & PDFs</TabsTrigger>
                        <TabsTrigger value="chatbot">Chatbot Knowledge</TabsTrigger>
                    </TabsList>
                     <div className="flex gap-2">
                        <div className="relative w-full max-w-sm">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                          <Input placeholder="Search content..." className="pl-10" />
                        </div>
                        <Button onClick={() => openModal()}><Plus className="mr-2"/> Add New Content</Button>
                    </div>
                </div>

                <TabsContent value="all-content" className="mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Content Library</CardTitle>
                            <CardDescription>Manage all educational content available to farmers.</CardDescription>
                        </CardHeader>
                        <CardContent>
                             <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Title</TableHead>
                                        <TableHead>Type</TableHead>
                                        <TableHead>Category</TableHead>
                                        <TableHead>Views</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {contentItems.map(item => (
                                        <TableRow key={item.id}>
                                            <TableCell className="font-medium">{item.title}</TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    {item.type === 'Video' && <Video size={16} className="text-red-500"/>}
                                                    {item.type.includes('PDF') && <FileText size={16} className="text-blue-500"/>}
                                                    {item.type.includes('Chatbot') && <Bot size={16} className="text-primary"/>}
                                                    {item.type}
                                                </div>
                                            </TableCell>
                                            <TableCell>{item.category}</TableCell>
                                            <TableCell>{item.views.toLocaleString()}</TableCell>
                                            <TableCell className="text-right">
                                                 <Button variant="outline" size="sm" onClick={() => openModal(item)}>Edit</Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
                 <TabsContent value="chatbot" className="mt-4">
                     <Card className="flex flex-col items-center justify-center min-h-[400px]">
                        <CardHeader>
                            <CardTitle>Ask Synth Knowledge Base</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground">Chatbot knowledge management UI coming soon.</p>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>{selectedContent ? 'Edit Content' : 'Add New Content'}</DialogTitle>
                        <DialogDescription>
                            {selectedContent ? `Editing "${selectedContent.title}"` : 'Upload and configure a new piece of content.'}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="title">Title</Label>
                            <Input id="title" defaultValue={selectedContent?.title || ''} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="category">Category</Label>
                            <Input id="category" defaultValue={selectedContent?.category || ''} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="type">Content Type</Label>
                             <Select defaultValue={selectedContent?.type}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select content type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Video">Video</SelectItem>
                                    <SelectItem value="PDF Guide">PDF Guide</SelectItem>
                                    <SelectItem value="Audio">Audio</SelectItem>
                                    <SelectItem value="Chatbot Knowledge">Chatbot Knowledge</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="content-body">Content Body / URL / Text</Label>
                            <Textarea id="content-body" placeholder="For videos, enter a URL. For text, type here." rows={5} />
                        </div>
                    </div>
                    <DialogFooter>
                        {selectedContent && <Button variant="destructive" onClick={() => setIsModalOpen(false)}>Delete</Button>}
                        <Button type="submit" onClick={() => setIsModalOpen(false)}>Save Content</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
