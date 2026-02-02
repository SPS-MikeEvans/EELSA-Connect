
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { useUser } from "@/providers/user-provider";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload } from "lucide-react";
import { TagInput } from "@/components/common/tag-input";

// Thumbnail Generation Function
async function generateThumbnail(file: File): Promise<File | null> {
  return new Promise((resolve) => {
    if (file.type === 'application/pdf') {
      // Dynamically import pdf.js to avoid SSR issues
      import('pdfjs-dist').then(async (pdfjsLib) => {
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.worker.min.js';

        try {
            const url = URL.createObjectURL(file);
            const pdf = await pdfjsLib.getDocument(url).promise;
            const page = await pdf.getPage(1);
            const scale = 1.5;
            const viewport = page.getViewport({ scale });

            const canvas = document.createElement('canvas');
            canvas.width = viewport.width;
            canvas.height = viewport.height;

            await page.render({
            canvasContext: canvas.getContext('2d')!,
            viewport,
            }).promise;

            canvas.toBlob((blob) => {
            if (blob) {
                resolve(new File([blob], file.name + '.jpg', { type: 'image/jpeg' }));
            } else {
                resolve(null);
            }
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
          if (blob) {
            resolve(new File([blob], file.name + '.jpg', { type: 'image/jpeg' }));
          } else {
            resolve(null);
          }
        }, 'image/jpeg', 0.9);
      };
      img.onerror = () => resolve(null);
    } else {
      resolve(null);
    }
  });
}


// Safe check for FileList which is not defined during SSR/Build
const fileSchema = typeof window === "undefined" 
    ? z.any() 
    : z.instanceof(FileList).refine((files) => files.length > 0, "File is required.");

const formSchema = z.object({
  title: z.string().min(2, {
    message: "Title must be at least 2 characters.",
  }),
  description: z.string().min(10, {
    message: "Description must be at least 10 characters.",
  }),
  type: z.enum(["Form", "Assessment", "Activity", "Research", "Website", "Other"], {
      required_error: "Please select a resource type.",
  }),
  file: fileSchema,
  purpose: z.enum(["Excellent ELSA", "Training", "Supervision"], {
      required_error: "Please select a resource purpose.",
  }),
  tags: z.array(z.string()).optional(),
});

interface UploadResourceFormProps {
    directoryId: string | null;
    onSuccess: () => void;
}

export function UploadResourceForm({ directoryId, onSuccess }: UploadResourceFormProps) {
  const { user, userDetails } = useUser();
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [progressMessage, setProgressMessage] = useState<string>("");

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      type: undefined,
      purpose: undefined,
      tags: [],
    },
  });

  const fileRef = form.register("file");

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user) return;
    setIsUploading(true);
    setProgressMessage("Preparing upload...");

    try {
        const file = values.file[0];
        
        // 1. Generate Thumbnail
        setProgressMessage("Generating thumbnail...");
        const thumbnailFile = await generateThumbnail(file);
        
        // 2. Upload Files in Parallel
        setProgressMessage("Uploading files...");
        const timestamp = Date.now();
        const storagePath = `resources/${directoryId || 'root'}/${timestamp}_${file.name}`;
        const storageRef = ref(storage, storagePath);
        
        const uploadPromises: Promise<any>[] = [
            uploadBytes(storageRef, file).then(snap => getDownloadURL(snap.ref))
        ];

        let thumbnailStoragePath: string | null = null;
        if (thumbnailFile) {
            thumbnailStoragePath = `thumbnails/${timestamp}_${file.name}.jpg`;
            const thumbnailRef = ref(storage, thumbnailStoragePath);
            uploadPromises.push(
                uploadBytes(thumbnailRef, thumbnailFile).then(snap => getDownloadURL(snap.ref))
            );
        } else {
             uploadPromises.push(Promise.resolve(null)); // Placeholder
        }

        const [downloadUrl, thumbnailUrl] = await Promise.all(uploadPromises);

        // 3. Save to Firestore
        setProgressMessage("Saving details...");
        const uploadedByName = userDetails?.fullName || user.displayName || "Unknown";

        await addDoc(collection(db, "resources"), {
            title: values.title,
            description: values.description,
            type: values.type,
            fileType: file.type,
            purpose: values.purpose,
            downloadUrl: downloadUrl,
            storagePath: snapshot => snapshot ? storagePath : null, // Not strictly needed as we have path above
            thumbnailUrl: thumbnailUrl || null, // Fallback if generation failed
            uploadedBy: user.uid,
            uploadedByName: uploadedByName,
            directoryId: directoryId,
            tags: values.tags || [],
            createdAt: serverTimestamp(),
        });

        toast({
            title: "Resource Uploaded",
            description: "The resource has been successfully uploaded.",
        });
        onSuccess();
    } catch (error) {
        console.error("Error uploading resource:", error);
        toast({
            title: "Upload Failed",
            description: "There was an error uploading the resource.",
            variant: "destructive",
        });
    } finally {
        setIsUploading(false);
        setProgressMessage("");
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Anxiety Worksheet" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea placeholder="Describe the resource..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
         <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Type</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="Form">Form</SelectItem>
                  <SelectItem value="Assessment">Assessment</SelectItem>
                  <SelectItem value="Activity">Activity</SelectItem>
                  <SelectItem value="Research">Research</SelectItem>
                   <SelectItem value="Website">Website Link</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
          <FormField
          control={form.control}
          name="purpose"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Purpose</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a purpose" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="Excellent ELSA">Excellent ELSA</SelectItem>
                  <SelectItem value="Training">Training</SelectItem>
                  <SelectItem value="Supervision">Supervision</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
            control={form.control}
            name="tags"
            render={({ field }) => (
                <FormItem>
                    <FormLabel>Tags</FormLabel>
                    <FormControl>
                        <TagInput 
                            value={field.value || []} 
                            onChange={field.onChange} 
                            placeholder="Add tags (e.g. 'anxiety', 'KS2')..."
                        />
                    </FormControl>
                    <FormDescription>
                        Tagging helps in filtering and finding resources later.
                    </FormDescription>
                    <FormMessage />
                </FormItem>
            )}
        />
        <FormField
            control={form.control}
            name="file"
            render={({ field }) => (
                <FormItem>
                    <FormLabel>File</FormLabel>
                    <FormControl>
                        <Input type="file" {...fileRef} />
                    </FormControl>
                    <FormMessage />
                </FormItem>
            )}
        />

        <Button type="submit" disabled={isUploading} className="w-full">
            {isUploading ? (
                <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> {progressMessage || "Uploading..."}
                </>
            ) : (
                <>
                    <Upload className="mr-2 h-4 w-4" /> Upload Resource
                </>
            )}
        </Button>
      </form>
    </Form>
  );
}
