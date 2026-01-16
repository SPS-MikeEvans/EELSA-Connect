
"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import { SubmitResourceForm } from "./submit-resource-form";

export function SubmitResourceDialog() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
            <Upload className="mr-2 h-4 w-4" />
            Submit Resource
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Submit a Resource</DialogTitle>
          <DialogDescription>
            Share a resource with the community. It will be reviewed by an admin or trainer before being published.
          </DialogDescription>
        </DialogHeader>
        <SubmitResourceForm onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
