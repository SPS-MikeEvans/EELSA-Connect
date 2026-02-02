
"use client";

import { useState, useRef } from "react";
import { useUser } from "@/providers/user-provider";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, File as FileIcon, X, Plus, Copy } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";

// Thumbnail Generation (Reused logic)
async function generateThumbnail(file: File): Promise<File | null> {
  return new Promise((resolve) => {
    if (file.type === 'application/pdf') {
      import('pdfjs-dist').then(async (pdfjsLib) => {
        pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.mjs';
        try {
            const url = URL.createObjectURL(file);
            const pdf = await pdfjsLib.getDocument(url).promise;
            const page = await pdf.getPage(1);
            const scale = 1.5;
            const viewport = page.getViewport({ scale });
            const canvas = document.createElement('canvas');
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            await page.render({ canvasContext: canvas.getContext('2d')!, viewport }).promise;
            canvas.toBlob((blob) => {
                if (blob) resolve(new File([blob], file.name + '.jpg', { type: 'image/jpeg' }));
                else resolve(null);
            }, 'image/jpeg', 0.9);
        } catch (error) {
            console.error("Error generating PDF thumbnail:", error);
            resolve(null);
        }
      });
    } else if (file.type.startsWith('image/')) {
      const img = new Image();
      img.src = URL.createObjectURL(file);
      img.onload = () => {
        const maxSize = 400;
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxSize) { height *= maxSize / width; width = maxSize; }
        } else {
          if (height > maxSize) { width *= maxSize / height; height = maxSize; }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => {
          if (blob) resolve(new File([blob], file.name + '.jpg', { type: 'image/jpeg' }));
          else resolve(null);
        }, 'image/jpeg', 0.9);
      };
      img.onerror = () => resolve(null);
    } else {
      resolve(null);
    }
  });
}

interface BatchUploadDialogProps {
  children: React.ReactNode;
  directoryId?: string | null;
}

interface FileMetadata {
  id: string; // local temp id
  file: File;
  title: string;
  description: string;
  type: string;
  purpose: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
}

const RESOURCE_TYPES = ["Form", "Assessment", "Activity", "Research", "Website", "Other"];
const PURPOSES = ["Excellent ELSA", "Training", "Supervision"];

export function BatchUploadDialog({ children, directoryId = null }: BatchUploadDialogProps) {
  const { user, userDetails } = useUser();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [files, setFiles] = useState<FileMetadata[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Bulk Edit State
  const [bulkDesc, setBulkDesc] = useState("");
  const [bulkType, setBulkType] = useState<string>("");
  const [bulkPurpose, setBulkPurpose] = useState<string>("");

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles: FileMetadata[] = Array.from(e.target.files).map((file) => ({
        id: Math.random().toString(36).substr(2, 9),
        file,
        title: file.name.split('.').slice(0, -1).join('.') || file.name,
        description: "",
        type: inferType(file.type),
        purpose: "Excellent ELSA", // Default
        status: 'pending',
        progress: 0
      }));

      // Limit total files to 20
      const combined = [...files, ...newFiles].slice(0, 20);
      if (combined.length < files.length + newFiles.length) {
          toast({ title: "Limit Reached", description: "Max 20 files allowed per batch.", variant: "default" });
      }
      setFiles(combined);
    }
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const inferType = (mimeType: string): string => {
      if (mimeType.includes('pdf')) return 'Form'; // Default PDF to Form? Or Other
      if (mimeType.includes('image')) return 'Activity';
      return 'Other';
  }

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const updateFile = (id: string, field: keyof FileMetadata, value: any) => {
    setFiles(prev => prev.map(f => f.id === id ? { ...f, [field]: value } : f));
  };

  const applyBulk = () => {
      setFiles(prev => prev.map(f => {
          if (f.status !== 'pending') return f; // Don't touch processing files
          return {
              ...f,
              description: bulkDesc || f.description,
              type: bulkType || f.type,
              purpose: bulkPurpose || f.purpose
          }
      }));
      toast({ title: "Applied", description: "Bulk settings applied to all pending files." });
  }

  const handleUpload = async () => {
    if (!user) return;
    setIsUploading(true);

    const pendingFiles = files.filter(f => f.status === 'pending');
    
    // Validate
    const invalid = pendingFiles.find(f => !f.title || !f.type || !f.purpose);
    if (invalid) {
        toast({ title: "Missing Info", description: "Please ensure all files have a Title, Type, and Purpose.", variant: "destructive" });
        setIsUploading(false);
        return;
    }

    // Process concurrently
    await Promise.all(pendingFiles.map(async (fileData) => {
        try {
            updateFile(fileData.id, 'status', 'uploading');
            updateFile(fileData.id, 'progress', 5);

            // 1. Generate Thumbnail
            const thumbnailFile = await generateThumbnail(fileData.file);
            updateFile(fileData.id, 'progress', 20);

            // 2. Upload Files
            const timestamp = Date.now();
            const storagePath = `resources/${directoryId || 'root'}/${timestamp}_${fileData.file.name}`;
            const storageRef = ref(storage, storagePath);
            
            const uploadPromises: Promise<any>[] = [
                uploadBytes(storageRef, fileData.file).then(snap => getDownloadURL(snap.ref))
            ];

            let thumbnailStoragePath: string | null = null;
            if (thumbnailFile) {
                thumbnailStoragePath = `thumbnails/${timestamp}_${fileData.file.name}.jpg`;
                const thumbnailRef = ref(storage, thumbnailStoragePath);
                uploadPromises.push(
                    uploadBytes(thumbnailRef, thumbnailFile).then(snap => getDownloadURL(snap.ref))
                );
            } else {
                uploadPromises.push(Promise.resolve(null));
            }

            const [downloadUrl, thumbnailUrl] = await Promise.all(uploadPromises);
            updateFile(fileData.id, 'progress', 80);

            // 3. Create Firestore Doc
            await addDoc(collection(db, "resources"), {
                title: fileData.title,
                description: fileData.description,
                type: fileData.type,
                fileType: fileData.file.type,
                purpose: fileData.purpose,
                downloadUrl: downloadUrl,
                storagePath: storagePath,
                thumbnailUrl: thumbnailUrl || null,
                uploadedBy: user.uid,
                uploadedByName: userDetails?.fullName || user.displayName || "Unknown",
                directoryId: directoryId,
                createdAt: serverTimestamp(),
            });

            updateFile(fileData.id, 'progress', 100);
            updateFile(fileData.id, 'status', 'success');

        } catch (error: any) {
            console.error(error);
            updateFile(fileData.id, 'status', 'error');
            updateFile(fileData.id, 'error', error.message);
        }
    }));

    setIsUploading(false);
    
    // Check results
    const errors = files.filter(f => f.status === 'error');
    if (errors.length === 0) {
        toast({ title: "Success", description: "All files uploaded successfully." });
        setTimeout(() => {
            setOpen(false);
            setFiles([]);
        }, 1500);
    } else {
        toast({ title: "Partial Success", description: `${errors.length} files failed to upload.`, variant: "destructive" });
    }
  };

  const pendingCount = files.filter(f => f.status === 'pending').length;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[900px] h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Batch Upload Resources</DialogTitle>
          <DialogDescription>
            Upload multiple files at once. Max 20 files per batch.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex flex-col gap-4 overflow-hidden py-4">
            
            {/* Top Controls */}
            <div className="flex flex-col gap-4 p-4 border rounded-md bg-muted/20">
                <div className="flex items-end gap-2">
                     <div className="grid grid-cols-3 gap-2 flex-1">
                        <div>
                            <Label className="text-xs">Default Description</Label>
                            <Input 
                                placeholder="Apply to all..." 
                                value={bulkDesc} 
                                onChange={e => setBulkDesc(e.target.value)} 
                                className="h-8 text-sm"
                            />
                        </div>
                        <div>
                            <Label className="text-xs">Default Type</Label>
                            <Select value={bulkType} onValueChange={setBulkType}>
                                <SelectTrigger className="h-8 text-sm">
                                    <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                                <SelectContent>
                                    {RESOURCE_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label className="text-xs">Default Purpose</Label>
                             <Select value={bulkPurpose} onValueChange={setBulkPurpose}>
                                <SelectTrigger className="h-8 text-sm">
                                    <SelectValue placeholder="Select purpose" />
                                </SelectTrigger>
                                <SelectContent>
                                    {PURPOSES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                     </div>
                     <Button size="sm" variant="secondary" onClick={applyBulk} disabled={isUploading || files.length === 0}>
                         <Copy className="mr-2 h-3 w-3" /> Apply All
                     </Button>
                </div>
                
                <div className="flex items-center gap-2">
                     <Input 
                        type="file" 
                        multiple 
                        className="hidden" 
                        ref={fileInputRef} 
                        onChange={handleFileSelect}
                        accept="*" 
                     />
                     <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading || files.length >= 20}
                     >
                         <Plus className="mr-2 h-4 w-4" /> Add Files
                     </Button>
                     <span className="text-xs text-muted-foreground">{files.length} / 20 files selected</span>
                </div>
            </div>

            {/* File List */}
            <ScrollArea className="flex-1 border rounded-md">
                <Table>
                    <TableHeader className="bg-muted/50 sticky top-0">
                        <TableRow>
                            <TableHead className="w-[30px]"></TableHead>
                            <TableHead className="min-w-[150px]">Title</TableHead>
                            <TableHead className="min-w-[150px]">Description</TableHead>
                            <TableHead className="w-[120px]">Type</TableHead>
                            <TableHead className="w-[140px]">Purpose</TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {files.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                                    No files selected. Click "Add Files" to start.
                                </TableCell>
                            </TableRow>
                        ) : (
                            files.map((f) => (
                                <TableRow key={f.id} className={f.status === 'error' ? "bg-red-50" : f.status === 'success' ? "bg-green-50" : ""}>
                                    <TableCell>
                                        <FileIcon className="h-4 w-4 text-muted-foreground" />
                                    </TableCell>
                                    <TableCell>
                                        <Input 
                                            value={f.title} 
                                            onChange={(e) => updateFile(f.id, 'title', e.target.value)}
                                            className="h-8 text-sm"
                                            disabled={f.status !== 'pending'}
                                        />
                                        {f.status === 'uploading' && <Progress value={f.progress} className="h-1 mt-1" />}
                                    </TableCell>
                                    <TableCell>
                                        <Input 
                                            value={f.description} 
                                            onChange={(e) => updateFile(f.id, 'description', e.target.value)}
                                            placeholder="Description"
                                            className="h-8 text-sm"
                                            disabled={f.status !== 'pending'}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Select value={f.type} onValueChange={(v) => updateFile(f.id, 'type', v)} disabled={f.status !== 'pending'}>
                                            <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                {RESOURCE_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </TableCell>
                                    <TableCell>
                                        <Select value={f.purpose} onValueChange={(v) => updateFile(f.id, 'purpose', v)} disabled={f.status !== 'pending'}>
                                            <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                {PURPOSES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </TableCell>
                                    <TableCell>
                                        {f.status === 'pending' && (
                                            <Button variant="ghost" size="icon" onClick={() => removeFile(f.id)} className="h-6 w-6 text-muted-foreground hover:text-destructive">
                                                <X className="h-3 w-3" />
                                            </Button>
                                        )}
                                        {f.status === 'error' && (
                                             <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" title={f.error}>
                                                <X className="h-3 w-3" />
                                            </Button>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </ScrollArea>

        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isUploading}>Cancel</Button>
          <Button onClick={handleUpload} disabled={isUploading || pendingCount === 0}>
             {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
             Upload {pendingCount > 0 && `${pendingCount} Files`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
