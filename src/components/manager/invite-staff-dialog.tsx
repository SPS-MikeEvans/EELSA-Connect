
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { sendInviteAction } from "@/app/actions/invites";
import { useUser } from "@/providers/user-provider";

const formSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
});

interface InviteStaffDialogProps {
  children: React.ReactNode;
}

export function InviteStaffDialog({ children }: InviteStaffDialogProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const { user, userDetails } = useUser();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user || !userDetails) {
      toast({ title: "Error", description: "You must be logged in.", variant: "destructive" });
      return;
    }

    try {
        const result = await sendInviteAction({
            toEmail: values.email,
            fromId: user.uid,
            fromName: userDetails.fullName,
            schoolSetting: userDetails.organization || ""
        });

        if (result.success) {
            toast({
                title: "Invite Sent!",
                description: `An invitation has been sent to ${values.email}.`,
            });
            setOpen(false);
            form.reset();
        } else {
             toast({ title: "Failed to Send Invite", description: result.error, variant: "destructive" });
        }
    } catch (error) {
        toast({ title: "Error", description: "An unexpected error occurred.", variant: "destructive" });
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite Staff Member</DialogTitle>
          <DialogDescription>
            Send an invitation to a staff member to join the platform. They will be linked to your account as their line manager.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Staff Email</FormLabel>
                  <FormControl>
                    <Input placeholder="staff.member@school.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Send Invite
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
