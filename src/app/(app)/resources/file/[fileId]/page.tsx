
"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { useUser } from "@/providers/user-provider";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { FileText, Presentation, Video, Download, Folder, ChevronRight, Home, Calendar, User, Tag, Edit, Image as ImageIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import Image from "next/image";
import { EditResourceDialog } from "@/components/resources/edit-resource-dialog";
import { useToast } from "@/hooks/use-toast";


interface Resource {
  id: string;
  title: string;
  description: string;
  type: string;
  icon: React.ElementType;
  downloadUrl?: string;
  thumbnailUrl?: string;
  createdAt: any;
  contributorName: string;
  purpose: string;
  fileType: string;
}

const getIconForType = (type: string) => {
    const fileType = type?.split('/')[1] || type;
    switch (fileType) {
        case 'pdf': return FileText;
        case 'mp4':
        case 'quicktime':
        case 'video': return Video;
        case 'presentation':
        case 'vnd.ms-powerpoint':
        case 'vnd.openxmlformats-officedocument.presentationml.presentation': return Presentation;
        case 'directory': return Folder;
        case 'jpeg':
        case 'png':
        case 'gif':
        case 'jpg': return ImageIcon;
        default: return FileText;
    }
}

export default function FilePage({ params }: { params: Promise<{ fileId: string }> }) {
  const { fileId } = use(params);
  const [resource, setResource] = useState<Resource | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { userRole } = useUser();
  const { toast } = useToast();

  const canManage = userRole === 'Admin' || userRole === 'Trainer';

  useEffect(() => {
    if (!fileId) return;

    const authUnsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setIsLoading(true);
        const docRef = doc(db, "resources", fileId);
        const unsubscribe = onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setResource({
                    id: docSnap.id,
                    title: data.title,
                    description: data.description,
                    type: data.type,
                    icon: getIconForType(data.fileType || data.type),
                    downloadUrl: data.downloadUrl,
                    thumbnailUrl: data.thumbnailUrl,
                    createdAt: data.createdAt?.toDate(),
                    contributorName: data.contributorName,
                    purpose: data.purpose,
                    fileType: data.fileType,
                });
            } else {
                console.error("Resource not found");
            }
            setIsLoading(false);
        }, (error) => {
            console.error("File snapshot error:", error);
            setIsLoading(false);
        });

        return () => unsubscribe();
      } else {
        setIsLoading(false);
      }
    });

    return () => authUnsubscribe();
  }, [fileId]);

  const handleUpdate = async (values: { title: string; description: string; type: string; purpose: string; }) => {
    if (!resource) return;
    const docRef = doc(db, "resources", resource.id);
    await updateDoc(docRef, values);
    toast({
        title: "Resource Updated",
        description: "The resource details have been successfully updated.",
    });
  };

  const isImage = resource?.fileType?.startsWith('image/');

  if (isLoading) {
      return (
          <div className="space-y-6">
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-10 w-3/4" />
            <div className="grid grid-cols-3 gap-8 pt-6">
                <div className="col-span-2 space-y-4">
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-64 w-full" />
                </div>
                <div className="space-y-4">
                    <Skeleton className="h-32 w-full" />
                </div>
            </div>
          </div>
      )
  }

  if (!resource) {
      return <div>Resource not found.</div>
  }

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
                <BreadcrumbSeparator><ChevronRight /></BreadcrumbSeparator>
                <BreadcrumbItem>
                    <BreadcrumbPage>{resource.title}</BreadcrumbPage>
                </BreadcrumbItem>
            </BreadcrumbList>
        </Breadcrumb>
        
        <div className="flex items-center justify-between">
            <div>
                <h1 className="text-3xl font-headline font-bold tracking-tight">{resource.title}</h1>
                <p className="text-muted-foreground mt-1">
                    Detailed view of the resource.
                </p>
            </div>
             {canManage && resource && (
                <EditResourceDialog resource={resource} onUpdate={handleUpdate}>
                    <Button variant="outline">
                        <Edit className="mr-2 size-4" />
                        Edit Details
                    </Button>
                </EditResourceDialog>
            )}
        </div>
        
        <div className="grid md:grid-cols-3 gap-8 pt-4">
            <div className="md:col-span-2">
                <Card>
                    <CardHeader className="flex flex-row items-start gap-4 space-y-0">
                         <div className="flex-shrink-0">
                            <resource.icon className="size-10 text-primary" />
                        </div>
                        <div className="flex-1">
                            <CardTitle className="text-2xl">{resource.title}</CardTitle>
                            <CardDescription>{resource.description}</CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent>
                       {(isImage && resource.downloadUrl) || resource.thumbnailUrl ? (
                         <div className="relative aspect-video w-full rounded-md overflow-hidden border bg-muted/20">
                            <Image
                                src={resource.thumbnailUrl || resource.downloadUrl!}
                                alt={resource.title}
                                fill
                                className="object-contain" // Ensures full preview is visible without cropping
                            />
                         </div>
                       ) : (
                         <div className="flex flex-col items-center justify-center bg-muted/50 aspect-video w-full rounded-md">
                            <FileText className="size-16 text-muted-foreground" />
                            <p className="mt-2 text-sm text-muted-foreground">No preview available</p>
                         </div>
                       )}
                    </CardContent>
                    <CardFooter>
                         <Button asChild>
                            <a href={resource.downloadUrl} target="_blank" rel="noopener noreferrer">
                                <Download className="mr-2 size-4" />
                                Download File
                            </a>
                        </Button>
                    </CardFooter>
                </Card>
            </div>

            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="font-headline text-lg">Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 text-sm">
                        <div className="flex items-center">
                            <Calendar className="size-4 mr-3 text-muted-foreground" />
                            <span className="font-medium mr-2">Date Added:</span>
                            <span className="text-muted-foreground">{resource.createdAt ? new Date(resource.createdAt).toLocaleDateString() : 'N/A'}</span>
                        </div>
                        <Separator />
                        <div className="flex items-center">
                            <User className="size-4 mr-3 text-muted-foreground" />
                            <span className="font-medium mr-2">Contributor:</span>
                            <span className="text-muted-foreground">{resource.contributorName}</span>
                        </div>
                        <Separator />
                         <div className="flex items-center">
                            <Tag className="size-4 mr-3 text-muted-foreground" />
                            <span className="font-medium mr-2">Purpose:</span>
                            <span className="text-muted-foreground">{resource.purpose}</span>
                        </div>
                         <Separator />
                          <div className="flex items-center">
                            <FileText className="size-4 mr-3 text-muted-foreground" />
                            <span className="font-medium mr-2">File Type:</span>
                            <span className="text-muted-foreground">{resource.fileType}</span>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>

    </div>
  );
}
