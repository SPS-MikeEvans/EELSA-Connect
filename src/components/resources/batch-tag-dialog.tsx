
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { doc, writeBatch, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { TagInput } from "@/components/common/tag-input";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const formSchema = z.object({
  mode: z.enum(["append", "replace"], {
    required_error: "Please select an update mode.",
  }),
  tags: z.array(z.string()).min(1, "Please select at least one tag."),
});

interface BatchTagDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedIds: string[];
  currentTagsMap: Record<string, string[]>; // Map resourceId -> current tags
  onSuccess: () => void;
}

export function BatchTagDialog({ 
  open, 
  onOpenChange, 
  selectedIds, 
  currentTagsMap,
  onSuccess 
}: BatchTagDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      mode: "append",
      tags: [],
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (selectedIds.length === 0) return;
    setIsSubmitting(true);

    try {
      const batch = writeBatch(db);

      selectedIds.forEach((id) => {
        const docRef = doc(db, "resources", id);
        let newTags: string[] = [];

        if (values.mode === "replace") {
          newTags = values.tags;
        } else {
          // Append mode: merge existing with new, removing duplicates
          const currentTags = currentTagsMap[id] || [];
          newTags = Array.from(new Set([...currentTags, ...values.tags]));
        }

        batch.update(docRef, { 
          tags: newTags,
          updatedAt: serverTimestamp() 
        });
      });

      await batch.commit();

      toast({
        title: "Tags Updated",
        description: `Successfully updated tags for ${selectedIds.length} items.`,
      });
      
      form.reset();
      onSuccess();
      onOpenChange(false);

    } catch (error) {
      console.error("Error updating tags:", error);
      toast({
        title: "Update Failed",
        description: "An error occurred while updating tags.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Manage Tags</DialogTitle>
          <DialogDescription>
            Update tags for {selectedIds.length} selected items.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            
            <FormField
              control={form.control}
              name="mode"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Update Mode</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex flex-col space-y-1"
                    >
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="append" />
                        </FormControl>
                        <FormLabel className="font-normal">
                          Add to existing tags
                        </FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="replace" />
                        </FormControl>
                        <FormLabel className="font-normal">
                          Replace all existing tags
                        </FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
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
                      value={field.value} 
                      onChange={field.onChange}
                      placeholder="Select tags to apply..." 
                    />
                  </FormControl>
                  <FormDescription>
                    {form.watch("mode") === "append" 
                      ? "These tags will be added to the selected items." 
                      : "These will become the only tags for the selected items."}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Update Tags
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
