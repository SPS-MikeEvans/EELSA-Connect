
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
});

interface UploadResourceFormProps {
    directoryId: string | null;
    onSuccess: () => void;
}

export function UploadResourceForm({ directoryId, onSuccess }: UploadResourceFormProps) {
  const { user, userDetails } = useUser();
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      type: undefined,
      purpose: undefined,
    },
  });

  const fileRef = form.register("file");

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user) return;
    setIsUploading(true);

    try {
        const file = values.file[0];
        const storageRef = ref(storage, `resources/${directoryId || 'root'}/${Date.now()}_${file.name}`);
        const snapshot = await uploadBytes(storageRef, file);
        const downloadUrl = await getDownloadURL(snapshot.ref);

        await addDoc(collection(db, "resources"), {
            title: values.title,
            description: values.description,
            type: values.type,
            fileType: file.type,
            purpose: values.purpose,
            downloadUrl: downloadUrl,
            storagePath: snapshot.ref.fullPath,
            uploadedBy: user.uid,
            uploadedByName: userDetails?.fullName || "Unknown",
            directoryId: directoryId,
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
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Uploading...
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
