
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import Link from "next/link";
import { sendPasswordResetEmail } from "firebase/auth";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Icon } from "../icons/icon";
import { auth } from "@/lib/firebase";
import { useState } from "react";
import { Loader2, ArrowLeft } from "lucide-react";

const formSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
});

export function ForgotPasswordForm() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    try {
      await sendPasswordResetEmail(auth, values.email);
      toast({
        title: "Check Your Email",
        description: `A password reset link has been sent to ${values.email}.`,
      });
      setEmailSent(true);
    } catch (error: any) {
      console.error("Password Reset Error:", error);
      let description = "An unexpected error occurred. Please try again.";
      if (error.code === 'auth/user-not-found') {
        // To prevent user enumeration, we show a generic success message even if the user doesn't exist.
        // This is a common security practice.
         toast({
            title: "Check Your Email",
            description: `If an account exists for ${values.email}, a password reset link has been sent.`,
        });
        setEmailSent(true);
      } else {
         toast({
            title: "Error",
            description,
            variant: "destructive",
        });
      }
    } finally {
        setIsSubmitting(false);
    }
  }

  return (
    <Card className="w-full max-w-sm border-2 border-primary shadow-lg">
      <CardHeader className="items-center text-center">
        <Icon className="size-16 mb-2" src="/EEConnect_Logo.png" alt="EEConnect Logo" />
        <CardTitle className="text-2xl font-headline text-primary">Reset Password</CardTitle>
        <CardDescription>Enter your email to receive a reset link</CardDescription>
      </CardHeader>
      <CardContent>
        {emailSent ? (
            <div className="text-center">
                <p className="text-sm text-muted-foreground">
                    Please check your inbox (and spam folder) for the password reset link. You can now close this window.
                </p>
            </div>
        ) : (
            <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                        <Input placeholder="name@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <Button type="submit" className="w-full !mt-6 font-headline bg-accent hover:bg-accent/90 text-accent-foreground" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Send Reset Link
                </Button>
            </form>
            </Form>
        )}
      </CardContent>
       <CardFooter className="flex flex-col items-center justify-center text-sm">
         <Link href="/login" className="inline-flex items-center gap-2 font-medium text-primary hover:underline font-headline">
            <ArrowLeft className="size-4" />
            Back to Sign In
          </Link>
      </CardFooter>
    </Card>
  );
}
