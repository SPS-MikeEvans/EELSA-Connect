"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useUser } from "@/providers/user-provider";
import { db, storage } from "@/lib/firebase";
import { collection, addDoc, doc, getDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Bug, Lightbulb, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { 
    Tooltip, 
    TooltipContent, 
    TooltipProvider, 
    TooltipTrigger 
} from "@/components/ui/tooltip";

export function FeedbackWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [type, setType] = useState<"bug" | "suggestion">("bug");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useUser();
  const pathname = usePathname();
  const { toast } = useToast();

  useEffect(() => {
    // Check if feedback is enabled globally
    const checkStatus = async () => {
      try {
        const docRef = doc(db, "settings", "global");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && docSnap.data().bugReportingEnabled) {
          setIsEnabled(true);
        } else {
            // Default to enabled if setting document doesn't exist yet, 
            // or handle as per preference (false). 
            // Assuming false for safety, but admins can toggle it.
            // If you want it enabled by default, change to true.
            if (!docSnap.exists()) setIsEnabled(false); 
        }
      } catch (error) {
        console.error("Failed to fetch feedback settings", error);
      }
    };
    checkStatus();
  }, []);

  const handleSubmit = async () => {
    if (!description.trim()) {
      toast({
        title: "Description required",
        description: "Please describe the bug or suggestion.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      let screenshotUrl = "";

      if (file) {
        const storageRef = ref(storage, `feedback/${Date.now()}_${file.name}`);
        const snapshot = await uploadBytes(storageRef, file);
        screenshotUrl = await getDownloadURL(snapshot.ref);
      }

      await addDoc(collection(db, "feedback"), {
        type: type === "bug" ? "Bug" : "Suggestion",
        pageUrl: window.location.origin + pathname,
        description,
        userId: user?.uid || "anonymous",
        userEmail: user?.email || "anonymous",
        timestamp: serverTimestamp(),
        status: "New",
        screenshotUrl,
      });

      toast({
        title: "Feedback submitted",
        description: "Thank you! Your feedback has been sent to the team.",
      });

      setIsOpen(false);
      setDescription("");
      setFile(null);
      setType("bug");
    } catch (error) {
      console.error("Error submitting feedback:", error);
      toast({
        title: "Error",
        description: "Failed to submit feedback. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isEnabled) return null;

  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              className="fixed bottom-4 right-4 z-50 rounded-full h-12 w-12 shadow-lg"
              size="icon"
              onClick={() => setIsOpen(true)}
            >
              <Bug className="h-6 w-6" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Report a Bug or Suggestion</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Submit Feedback</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="type" className="text-right">
                Type
              </Label>
              <Select
                value={type}
                onValueChange={(val: "bug" | "suggestion") => setType(val)}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bug">
                    <div className="flex items-center">
                      <Bug className="mr-2 h-4 w-4" /> Bug
                    </div>
                  </SelectItem>
                  <SelectItem value="suggestion">
                    <div className="flex items-center">
                      <Lightbulb className="mr-2 h-4 w-4" /> Suggestion
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="url" className="text-right">
                URL
              </Label>
              <Input
                id="url"
                value={pathname}
                disabled
                className="col-span-3 bg-muted"
              />
            </div>
            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="description" className="text-right mt-2">
                Details
              </Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what happened or your idea..."
                className="col-span-3 min-h-[100px]"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="screenshot" className="text-right">
                Screenshot
              </Label>
              <Input
                id="screenshot"
                type="file"
                accept="image/*"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
