
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Video, FileText, Mic, PlayCircle, Leaf } from 'lucide-react';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';

const guides = [
  { title: 'Video: Proper Fertilizer Application for Maize', type: 'Video', category: 'Crop Management', image: null, hint: 'farmer fertilizer' },
  { title: 'Guide: Identifying Fall Armyworm in India', type: 'PDF', category: 'Pest Control', image: null, hint: 'maize pest' },
  { title: 'Audio: Post-Harvest Handling for Coffee Beans', type: 'Audio', category: 'Post-Harvest', image: null, hint: 'coffee beans' },
  { title: 'Video: Setting Up Drip Irrigation Systems', type: 'Video', category: 'Water Management', image: null, hint: 'drip irrigation' },
  { title: 'Guide: Soil Testing and Health Management', type: 'PDF', category: 'Soil Health', image: null, hint: 'soil sample' },
  { title: 'Audio: Market Negotiation Tactics for Smallholders', type: 'Audio', category: 'Business Skills', image: null, hint: 'market negotiation' },
];

const GuideIcon = ({ type }: { type: string }) => {
    if (type === 'Video') return <Video className="h-4 w-4" />;
    if (type === 'PDF') return <FileText className="h-4 w-4" />;
    if (type === 'Audio') return <Mic className="h-4 w-4" />;
    return null;
}

const GuidePlaceholder = () => (
    <div className="w-full h-48 bg-secondary flex items-center justify-center">
        <Leaf className="w-16 h-16 text-muted-foreground" />
    </div>
);


export default function GuidesPage() {
  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-3xl font-bold font-headline">Knowledge Hub</h1>
        <p className="text-muted-foreground">Expert guides, tutorials, and tips to grow smarter.</p>
      </header>

       <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input placeholder="Search for guides..." className="pl-10" />
        </div>
        <Select>
          <SelectTrigger className="w-full md:w-[200px]">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="crop-management">Crop Management</SelectItem>
            <SelectItem value="pest-control">Pest Control</SelectItem>
            <SelectItem value="water-management">Water Management</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {guides.map((guide) => (
          <Card key={guide.title} className="flex flex-col overflow-hidden group">
            <div className="relative">
              <GuidePlaceholder />
              <div className="absolute inset-0 bg-black/30 group-hover:bg-black/50 transition-colors" />
               <Badge className="absolute top-3 right-3 bg-black/50 text-white border-white/20">
                <GuideIcon type={guide.type} /> <span className="ml-1.5">{guide.type}</span>
              </Badge>
              {guide.type === 'Video' && (
                <div className="absolute inset-0 flex items-center justify-center">
                    <PlayCircle className="w-16 h-16 text-white/70 group-hover:text-white transition-colors" />
                </div>
              )}
            </div>
            <CardContent className="pt-4 flex-grow flex flex-col">
              <p className="text-xs text-primary font-semibold uppercase">{guide.category}</p>
              <h3 className="font-semibold font-headline text-xl mt-1 flex-grow">{guide.title}</h3>
            </CardContent>
            <CardFooter>
              <Button variant="secondary" className="w-full">
                {guide.type === 'Video' && 'Watch Now'}
                {guide.type === 'PDF' && 'Read Guide'}
                {guide.type === 'Audio' && 'Listen Now'}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
