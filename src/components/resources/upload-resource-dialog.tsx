
"use client";

import { useState, type ReactNode } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { UploadResourceForm } from './upload-resource-form';
import { ScrollArea } from '../ui/scroll-area';

interface UploadResourceDialogProps {
    children: ReactNode;
    directoryId?: string | null;
}

export function UploadResourceDialog({ children, directoryId = null }: UploadResourceDialogProps) {
    const [open, setOpen] = useState(false);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {children}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="font-headline">Upload Resource</DialogTitle>
                    <DialogDescription>
                        Share a new file with the community. Fill out the details below.
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="max-h-[70vh] pr-4">
                  <UploadResourceForm directoryId={directoryId} onSuccess={() => setOpen(false)} />
                </ScrollArea>
            </DialogContent>
        </Dialog>
    )
}
