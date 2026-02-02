
"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { collection, onSnapshot, query, where, doc, deleteDoc, updateDoc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { useUser } from "@/providers/user-provider";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Presentation, Video, Download, Folder, ChevronRight, Home, MoreVertical, Trash2, Edit, List, LayoutGrid, Upload, FileStack, Tags, CheckSquare, Square, ImageIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { deleteDirectory } from "@/app/actions/resources";
import { useToast } from "@/hooks/use-toast";
import { EditResourceDialog } from "@/components/resources/edit-resource-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { UploadResourceDialog } from "@/components/resources/upload-resource-dialog";
import { BatchUploadDialog } from "@/components/resources/batch-upload-dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { BatchTagDialog } from "@/components/resources/batch-tag-dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronsUpDown, Filter } from "lucide-react";
import Image from "next/image";


interface Resource {
  id: string;
  title: string;
  description: string;
  type: string;
  icon: React.ElementType;
  downloadUrl?: string;
  thumbnailUrl?: string;
  itemType: 'file' | 'directory';
  purpose?: string;
  tags?: string[];
}

interface Directory {
    id: string;
    name: string;
}

const getIconForType = (type: string) => {
    switch (type) {
        case 'pdf': return FileText;
        case 'video': return Video;
        case 'presentation': return Presentation;
        case 'directory': return Folder;
        case 'jpeg':
        case 'png': 
        case 'image': return ImageIcon;
        default: return FileText;
    }
}

export default function DirectoryPage({ params }: { params: Promise<{ directoryId: string }> }) {
  const { directoryId } = use(params);
  const [directory, setDirectory] = useState<Directory | null>(null);
  const [items, setItems] = useState<Resource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  // Selection & Tagging State
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [isBatchTagOpen, setIsBatchTagOpen] = useState(false);
  
  // Filter State
  const [filterTags, setFilterTags] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const { user, userRole } = useUser();
  const { toast } = useToast();

  const canManage = userRole === 'Admin' || userRole === 'Trainer';

  useEffect(() => {
    if (!directoryId) return;

    const authUnsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setIsLoading(true);
        const dirDocRef = doc(db, "directories", directoryId);
        const unsubscribeDir = onSnapshot(dirDocRef, (docSnap) => {
            if (docSnap.exists()) {
                setDirectory({ id: docSnap.id, ...docSnap.data() } as Directory);
            }
        }, () => {}); // Silent catch

        const resourcesQuery = query(collection(db, "resources"), where("directoryId", "==", directoryId));
        const unsubscribeResources = onSnapshot(resourcesQuery, (querySnapshot) => {
            const allTags = new Set<string>();
            const resourcesData = querySnapshot.docs.map(doc => {
                const data = doc.data();
                if (data.tags && Array.isArray(data.tags)) {
                    data.tags.forEach((tag: string) => allTags.add(tag));
                }
                const fileType = data.fileType?.split('/')[1] || data.type || 'file';
                return {
                    id: doc.id,
                    title: data.title,
                    description: data.description,
                    type: fileType,
                    icon: getIconForType(fileType),
                    downloadUrl: data.downloadUrl,
                    thumbnailUrl: data.thumbnailUrl,
                    itemType: 'file' as const,
                    purpose: data.purpose,
                    tags: data.tags || [],
                };
            });

            setAvailableTags(Array.from(allTags).sort());
            setItems(resourcesData.sort((a, b) => a.title.localeCompare(b.title)));
            setIsLoading(false);
        }, () => { setIsLoading(false); });

        return () => {
            unsubscribeDir();
            unsubscribeResources();
        };
      } else {
        setIsLoading(false);
      }
    });

    return () => authUnsubscribe();
  }, [directoryId]);

  // Derived state for filtered items
  const filteredItems = items.filter(item => {
      if (filterTags.length === 0) return true;
      if (!item.tags) return false;
      return filterTags.every(tag => item.tags!.includes(tag));
  });

  const toggleSelection = (id: string) => {
      const newSelection = new Set(selectedItems);
      if (newSelection.has(id)) {
          newSelection.delete(id);
      } else {
          newSelection.add(id);
      }
      setSelectedItems(newSelection);
  };

  const selectAll = () => {
      if (selectedItems.size === filteredItems.length) {
          setSelectedItems(new Set());
      } else {
          setSelectedItems(new Set(filteredItems.map(i => i.id)));
      }
  };
  
  const handleDeleteDirectory = async (id: string, name: string) => {
    if (!user) return;
    try {
        const token = await user.getIdToken();
         if (!token) return;
        await deleteDirectory(id, token);
        toast({
            title: "Directory Deleted",
            description: `The directory "${name}" and all its contents have been deleted.`,
        });
    } catch (error: any) {
        toast({
            title: "Deletion Failed",
            description: "An error occurred while deleting.",
            variant: "destructive"
        });
    }
  };

  const handleDeleteFile = async (resourceId: string, title: string) => {
    try {
        await deleteDoc(doc(db, "resources", resourceId));
        toast({
            title: "File Deleted",
            description: `The file "${title}" has been deleted.`,
        });
    } catch (error) {
        toast({
            title: "Deletion Failed",
            description: "An error occurred.",
            variant: "destructive",
        });
    }
  };

  const handleUpdateFile = async (resourceId: string, values: any) => {
    const docRef = doc(db, "resources", resourceId);
    await updateDoc(docRef, values);
    toast({
        title: "Resource Updated",
        description: "Saved successfully.",
    });
  };

    const ItemActions = ({ item }: { item: Resource }) => {
    if (!canManage) return null;

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 bg-white/50 hover:bg-white/80">
                    <MoreVertical className="size-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <EditResourceDialog resource={item} onUpdate={(values) => handleUpdateFile(item.id, values)}>
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                        <Edit className="mr-2 size-4" /> Edit Details
                    </DropdownMenuItem>
                </EditResourceDialog>
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive">
                            <Trash2 className="mr-2 size-4" /> Delete
                        </DropdownMenuItem>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete "{item.title}".
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                                onClick={() => handleDeleteFile(item.id, item.title)}
                                className="bg-destructive hover:bg-destructive/90"
                            >
                                Delete
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </DropdownMenuContent>
        </DropdownMenu>
    );
  };

  return (
    <div className="space-y-6">
        <Breadcrumb>
            <BreadcrumbList>
                <BreadcrumbItem>
                <BreadcrumbLink asChild>
                    <Link href="/resources" className="flex items-center gap-2">
                        <Home className="size-4" /> Resource Center
                    </Link>
                </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator>
                    <ChevronRight />
                </BreadcrumbSeparator>
                <BreadcrumbItem>
                    <BreadcrumbPage>{directory?.name || <Skeleton className="h-5 w-24" />}</BreadcrumbPage>
                </BreadcrumbItem>
            </BreadcrumbList>
        </Breadcrumb>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
                <h1 className="text-3xl font-headline font-bold tracking-tight">{directory?.name}</h1>
                <p className="text-muted-foreground">
                    Browse resources within this directory.
                </p>
            </div>
             <div className="flex flex-wrap items-center gap-2">
                
                {/* Filter Dropdown */}
                <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
                    <PopoverTrigger asChild>
                        <Button variant="outline" className={cn("border-dashed", filterTags.length > 0 && "bg-accent/20 border-accent")}>
                            <Filter className="mr-2 h-4 w-4" />
                            Filter Tags
                            {filterTags.length > 0 && (
                                <Badge variant="secondary" className="ml-2 px-1 rounded-sm h-5 text-[10px] min-w-4 flex justify-center bg-primary text-primary-foreground">
                                    {filterTags.length}
                                </Badge>
                            )}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[200px] p-0" align="end">
                        <Command>
                            <CommandInput placeholder="Tag..." />
                            <CommandList>
                                <CommandEmpty>No tags found.</CommandEmpty>
                                <CommandGroup>
                                    {availableTags.map((tag) => (
                                        <CommandItem
                                            key={tag}
                                            value={tag}
                                            onSelect={() => {
                                                setFilterTags(prev => 
                                                    prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
                                                )
                                            }}
                                        >
                                            <div className={cn(
                                                "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                                                filterTags.includes(tag) ? "bg-primary text-primary-foreground" : "opacity-50 [&_svg]:invisible"
                                            )}>
                                                <Check className={cn("h-4 w-4")} />
                                            </div>
                                            {tag}
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                                {filterTags.length > 0 && (
                                    <>
                                        <div className="p-1">
                                            <Button 
                                                variant="ghost" 
                                                className="w-full justify-center text-xs h-8"
                                                onClick={() => setFilterTags([])}
                                            >
                                                Clear filters
                                            </Button>
                                        </div>
                                    </>
                                )}
                            </CommandList>
                        </Command>
                    </PopoverContent>
                </Popover>

                {canManage && (
                    <>
                        {selectedItems.size > 0 ? (
                            <Button onClick={() => setIsBatchTagOpen(true)} variant="secondary">
                                <Tags className="mr-2 h-4 w-4" /> Manage Tags ({selectedItems.size})
                            </Button>
                        ) : (
                            <>
                                <UploadResourceDialog directoryId={directoryId}>
                                    <Button>
                                        <Upload className="mr-2 h-4 w-4" /> Upload
                                    </Button>
                                </UploadResourceDialog>
                                <BatchUploadDialog directoryId={directoryId}>
                                    <Button variant="outline">
                                        <FileStack className="mr-2 h-4 w-4" /> Batch Upload
                                    </Button>
                                </BatchUploadDialog>
                            </>
                        )}
                    </>
                )}
                
                <div className="flex border rounded-md ml-2">
                    <Button variant={viewMode === 'grid' ? 'secondary' : 'ghost'} size="icon" className="h-9 w-9 rounded-none rounded-l-md" onClick={() => setViewMode('grid')}>
                        <LayoutGrid className="size-4" />
                    </Button>
                    <Button variant={viewMode === 'list' ? 'secondary' : 'ghost'} size="icon" className="h-9 w-9 rounded-none rounded-r-md" onClick={() => setViewMode('list')}>
                        <List className="size-4" />
                    </Button>
                </div>
            </div>
        </div>

        {canManage && (
             <div className="flex items-center space-x-2">
                <Checkbox 
                    id="select-all" 
                    checked={filteredItems.length > 0 && selectedItems.size === filteredItems.length}
                    onCheckedChange={selectAll}
                />
                <label
                    htmlFor="select-all"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                    Select All
                </label>
            </div>
        )}

        {viewMode === 'grid' ? (
             <TooltipProvider>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {isLoading ? (
                        Array.from({ length: 3 }).map((_, i) => (
                            <Card key={i} className="h-full flex flex-col">
                                <CardHeader className="flex flex-row items-start gap-4 space-y-0">
                                    <Skeleton className="size-8 rounded" />
                                    <div className="flex-1 space-y-2">
                                        <Skeleton className="h-5 w-3/4" />
                                        <Skeleton className="h-4 w-full" />
                                    </div>
                                </CardHeader>
                                <CardContent className="mt-auto">
                                    <div className="flex justify-end">
                                        <Skeleton className="h-9 w-28" />
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    ) : filteredItems.length > 0 ? (
                        filteredItems.map((item) => (
                            <Card 
                                key={item.id} 
                                className={cn(
                                    "h-full flex flex-col relative group transition-all duration-200 hover:shadow-lg overflow-hidden",
                                    selectedItems.has(item.id) && "border-primary bg-primary/5"
                                )}
                            >
                                {item.thumbnailUrl && (
                                     <div className="h-32 w-full bg-muted overflow-hidden relative border-b">
                                        <Image 
                                            src={item.thumbnailUrl} 
                                            alt={item.title} 
                                            fill 
                                            className="object-cover transition-transform group-hover:scale-105"
                                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                        />
                                    </div>
                                )}

                                {canManage && (
                                    <div className="absolute top-2 left-2 z-20">
                                         <Checkbox 
                                            className="bg-white/80 backdrop-blur-sm"
                                            checked={selectedItems.has(item.id)}
                                            onCheckedChange={() => toggleSelection(item.id)}
                                        />
                                    </div>
                                )}
                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                    <ItemActions item={item} />
                                </div>
                                <Tooltip delayDuration={200}>
                                    <TooltipTrigger asChild>
                                        <Link href={`/resources/file/${item.id}`} className="h-full flex flex-col pt-4">
                                            <CardHeader className="flex flex-row items-start gap-4 space-y-0 pb-2">
                                                {!item.thumbnailUrl && (
                                                    <div className="flex-shrink-0 mt-1">
                                                        <item.icon className="size-8 text-primary" />
                                                    </div>
                                                )}
                                                <div className="flex-1 min-w-0">
                                                    <CardTitle className="truncate text-base">{item.title}</CardTitle>
                                                     {item.tags && item.tags.length > 0 && (
                                                        <div className="flex flex-wrap gap-1 mt-2">
                                                            {item.tags.slice(0, 3).map(tag => (
                                                                <Badge key={tag} variant="secondary" className="text-[10px] px-1 py-0 h-4">{tag}</Badge>
                                                            ))}
                                                            {item.tags.length > 3 && (
                                                                <span className="text-[10px] text-muted-foreground">+{item.tags.length - 3}</span>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </CardHeader>
                                            {item.itemType === 'file' && item.downloadUrl && (
                                                <CardContent className="mt-auto pt-2">
                                                    <div className="flex justify-end">
                                                        <Button variant="outline" size="sm" onClick={(e) => { e.preventDefault(); window.open(item.downloadUrl, '_blank'); }}>
                                                            <Download className="mr-2 size-4" /> Download
                                                        </Button>
                                                    </div>
                                                </CardContent>
                                            )}
                                        </Link>
                                    </TooltipTrigger>
                                    <TooltipContent side="top" align="center" className="max-w-xs">
                                        <p className="text-sm">{item.description}</p>
                                    </TooltipContent>
                                </Tooltip>
                            </Card>
                        ))
                    ) : (
                        <div className="col-span-full text-center py-12">
                            <Folder className="mx-auto size-16 text-muted-foreground/50" />
                            <h3 className="mt-4 text-lg font-medium">No resources found</h3>
                            <p className="mt-1 text-sm text-muted-foreground">Try adjusting your filters or upload a new resource.</p>
                        </div>
                    )}
                </div>
            </TooltipProvider>
        ) : (
            <Card>
                <Table>
                    <TableHeader>
                        <TableRow>
                            {canManage && <TableHead className="w-8"></TableHead>}
                            <TableHead className="w-16">Preview</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Tags</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <TableRow key={i}>
                                    {canManage && <TableCell><Skeleton className="size-4 rounded-sm" /></TableCell>}
                                    <TableCell><Skeleton className="size-8 rounded-sm" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                                    <TableCell className="text-right"><Skeleton className="h-8 w-8 rounded-md" /></TableCell>
                                </TableRow>
                            ))
                        ) : filteredItems.length > 0 ? (
                        
                            filteredItems.map((item) => (
                                <TableRow key={item.id} className={cn("group", selectedItems.has(item.id) && "bg-muted/50")}>
                                     {canManage && (
                                        <TableCell>
                                             <Checkbox 
                                                checked={selectedItems.has(item.id)}
                                                onCheckedChange={() => toggleSelection(item.id)}
                                            />
                                        </TableCell>
                                    )}
                                    <TableCell>
                                        {item.thumbnailUrl ? (
                                            <div className="relative size-10 rounded overflow-hidden border">
                                                <Image src={item.thumbnailUrl} alt="" fill className="object-cover" />
                                            </div>
                                        ) : (
                                            <item.icon className="size-8 text-primary/50" />
                                        )}
                                    </TableCell>
                                    <TableCell className="font-medium">
                                        <TooltipProvider>
                                        <Tooltip delayDuration={200}>
                                            <TooltipTrigger asChild>
                                                <Link href={`/resources/file/${item.id}`} className="hover:underline">
                                                    {item.title}
                                                </Link>
                                            </TooltipTrigger>
                                            <TooltipContent side="bottom" align="start">
                                                <p className="max-w-sm text-sm">{item.description}</p>
                                            </TooltipContent>
                                        </Tooltip>
                                        </TooltipProvider>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-wrap gap-1">
                                            {item.tags?.slice(0, 3).map(tag => (
                                                <Badge key={tag} variant="outline" className="text-[10px] px-1 h-5">{tag}</Badge>
                                            ))}
                                            {item.tags && item.tags.length > 3 && (
                                                <Badge variant="outline" className="text-[10px] px-1 h-5">+{item.tags.length - 3}</Badge>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="capitalize text-muted-foreground">{item.type}</TableCell>
                                    <TableCell className="text-right">
                                        <div className={cn("opacity-0 group-hover:opacity-100 transition-opacity", canManage ? 'block' : 'hidden')}>
                                            <ItemActions item={item} />
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        
                        ) : (
                             <TableRow>
                                <TableCell colSpan={canManage ? 7 : 6} className="h-24 text-center">
                                    No resources match your criteria.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </Card>
        )}
        
        {/* Batch Tag Dialog */}
        <BatchTagDialog 
            open={isBatchTagOpen} 
            onOpenChange={setIsBatchTagOpen}
            selectedIds={Array.from(selectedItems)}
            currentTagsMap={items.reduce((acc, item) => ({ ...acc, [item.id]: item.tags || [] }), {})}
            onSuccess={() => setSelectedItems(new Set())}
        />
    </div>
  );
}
