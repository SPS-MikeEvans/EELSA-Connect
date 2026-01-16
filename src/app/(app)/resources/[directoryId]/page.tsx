
"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { collection, onSnapshot, query, where, doc, deleteDoc, updateDoc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { useUser } from "@/providers/user-provider";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Presentation, Video, Download, Folder, ChevronRight, Home, MoreVertical, Trash2, Edit, List, LayoutGrid } from "lucide-react";
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


interface Resource {
  id: string;
  title: string;
  description: string;
  type: string;
  icon: React.ElementType;
  downloadUrl?: string;
  itemType: 'file' | 'directory';
  purpose?: string;
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
        default: return FileText;
    }
}

export default function DirectoryPage({ params }: { params: Promise<{ directoryId: string }> }) {
  const { directoryId } = use(params);
  const [directory, setDirectory] = useState<Directory | null>(null);
  const [items, setItems] = useState<Resource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
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
            const resourcesData = querySnapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    title: data.title,
                    description: data.description,
                    type: data.fileType?.split('/')[1] || data.type || 'file',
                    icon: getIconForType(data.fileType?.split('/')[1] || data.type || 'file'),
                    downloadUrl: data.downloadUrl,
                    itemType: 'file' as const,
                    purpose: data.purpose,
                };
            });

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

  const handleUpdateFile = async (resourceId: string, values: { title: string; description: string; type: string; purpose: string; }) => {
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
                <Button variant="ghost" size="icon" className="h-8 w-8">
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

        <div className="flex items-center justify-between">
            <div>
                <h1 className="text-3xl font-headline font-bold tracking-tight">{directory?.name}</h1>
                <p className="text-muted-foreground">
                    Browse resources within this directory.
                </p>
            </div>
             <div className="flex items-center gap-2">
                <Button variant={viewMode === 'grid' ? 'secondary' : 'ghost'} size="icon" onClick={() => setViewMode('grid')}>
                    <LayoutGrid className="size-5" />
                </Button>
                <Button variant={viewMode === 'list' ? 'secondary' : 'ghost'} size="icon" onClick={() => setViewMode('list')}>
                    <List className="size-5" />
                </Button>
            </div>
        </div>

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
                    ) : items.length > 0 ? (
                        items.map((item) => (
                            <Card key={item.id} className="h-full flex flex-col relative group transition-transform duration-200 hover:scale-[1.01] hover:shadow-lg">
                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                    <ItemActions item={item} />
                                </div>
                                <Tooltip delayDuration={200}>
                                    <TooltipTrigger asChild>
                                        <Link href={`/resources/file/${item.id}`} className="h-full flex flex-col">
                                            <CardHeader className="flex flex-row items-start gap-4 space-y-0">
                                                <div className="flex-shrink-0">
                                                    <item.icon className="size-8 text-primary" />
                                                </div>
                                                <div className="flex-1">
                                                    <CardTitle>{item.title}</CardTitle>
                                                </div>
                                            </CardHeader>
                                            {item.itemType === 'file' && item.downloadUrl && (
                                                <CardContent className="mt-auto">
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
                            <h3 className="mt-4 text-lg font-medium">This directory is empty</h3>
                            <p className="mt-1 text-sm text-muted-foreground">Upload a resource to get started.</p>
                        </div>
                    )}
                </div>
            </TooltipProvider>
        ) : (
            <Card>
                <Table>
                    <TableHeader>
                        <TableRow>
                        <TableHead className="w-12"></TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell><Skeleton className="size-6 rounded-sm" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                                    <TableCell className="text-right"><Skeleton className="h-8 w-8 rounded-md" /></TableCell>
                                </TableRow>
                            ))
                        ) : items.length > 0 ? (
                        
                            items.map((item) => (
                                <TableRow key={item.id} className="group">
                                    <TableCell>
                                        <item.icon className="size-6 text-primary" />
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
                                    <TableCell className="capitalize text-muted-foreground">{item.itemType}</TableCell>
                                    <TableCell className="text-right">
                                        <div className={cn("opacity-0 group-hover:opacity-100 transition-opacity", canManage ? 'block' : 'hidden')}>
                                            <ItemActions item={item} />
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        
                        ) : (
                             <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center">
                                    This directory is empty.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </Card>
        )}
    </div>
  );
}
