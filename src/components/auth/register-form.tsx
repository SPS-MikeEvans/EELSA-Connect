
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, setDoc, serverTimestamp, getDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

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
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Icon } from "../icons/icon";
import { auth, db, storage } from "@/lib/firebase";
import { useState, useEffect } from "react";
import { Loader2, Search } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverTrigger, PopoverContent } from "../ui/popover";
import { Command, CommandInput, CommandEmpty, CommandGroup, CommandItem } from "../ui/command";
import { useSearchParams } from "next/navigation";


// Simplified file schema to prevent validation blocking
const fileSchema = z.any();

const formSchema = z.object({
  fullName: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
  confirmPassword: z.string().min(6, { message: "Password must be at least 6 characters." }),
  role: z.enum(["Trainee", "ELSA", "LineManager", "Trainer"], {
    required_error: "You need to select a role.",
  }),
  // ELSA specific
  schoolSetting: z.string().optional(),
  certificationWhereTrained: z.string().optional(),
  certificationYear: z.string().optional(),
  lineManagerEmail: z.string().email({ message: "Please enter a valid email for the line manager." }).optional().or(z.literal("")),
  linkedLineManagerId: z.string().optional(), // Now stores the UID of the selected manager
  certificateFile: fileSchema.optional(),
  // LineManager/Trainer specific
  organization: z.string().optional(),
  acceptPolicy: z.boolean().default(false).refine(value => value === true, {
    message: "You must accept the privacy policy to continue.",
  }),
})
.refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})
.refine((data) => {
  if (data.role === 'ELSA') {
    // Check required fields for ELSA
    const hasSchool = data.schoolSetting && data.schoolSetting.trim() !== '';
    const hasWhere = data.certificationWhereTrained && data.certificationWhereTrained.trim() !== '';
    const hasYear = data.certificationYear && data.certificationYear.trim() !== '';
    const hasEmail = data.lineManagerEmail && data.lineManagerEmail.trim() !== '';
    const hasFile = data.certificateFile && data.certificateFile.length > 0;
    
    return hasSchool && hasWhere && hasYear && hasEmail && hasFile;
  }
  return true;
}, {
  message: "All ELSA-specific fields are required.",
  path: ["certificateFile"], // Show error on the last field in the group
}).refine((data) => {
    if (data.role === 'LineManager' || data.role === 'Trainer') {
        return data.organization && data.organization.trim() !== '';
    }
    return true;
}, {
    message: "Organization is required for this role.",
    path: ["organization"]
});


export function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inviteDetails, setInviteDetails] = useState<{fromName: string, schoolSetting: string, fromId: string} | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      confirmPassword: "",
      role: "Trainee",
      organization: "",
      schoolSetting: "",
      certificationWhereTrained: "",
      certificationYear: "",
      lineManagerEmail: "",
      linkedLineManagerId: "",
      acceptPolicy: false,
    },
  });
  
  // Debug: Log errors when they change
  useEffect(() => {
    if (Object.keys(form.formState.errors).length > 0) {
      console.log("Form Validation Errors:", form.formState.errors);
    }
  }, [form.formState.errors]);
  
  useEffect(() => {
    const inviteId = searchParams.get('inviteId');
    if (inviteId) {
      const fetchInvite = async () => {
        try {
          const inviteRef = doc(db, 'invites', inviteId);
          const inviteSnap = await getDoc(inviteRef);
          if (inviteSnap.exists()) {
            const data = inviteSnap.data();
            setInviteDetails({
              fromName: data.fromName,
              schoolSetting: data.schoolSetting,
              fromId: data.fromId
            });
            // Pre-fill form fields
            form.setValue('organization', data.schoolSetting);
            form.setValue('linkedLineManagerId', data.fromId);
          } else {
            toast({
              title: "Invalid Invite",
              description: "The invite link is invalid or has expired.",
              variant: "destructive",
            });
          }
        } catch (error) {
          console.error("Error fetching invite:", error);
          toast({
            title: "Error",
            description: "Could not fetch invite details. Please check your connection and try again.",
            variant: "destructive",
          });
        }
      };
      fetchInvite();
    }
  }, [searchParams, form, toast]);

  const selectedRole = form.watch("role");

  async function onSubmit(values: z.infer<typeof formSchema>) {
    console.log("Submitting form...", values);
    setIsSubmitting(true);
    const inviteId = searchParams.get('inviteId');

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
      const user = userCredential.user;

      await updateProfile(user, { displayName: values.fullName });

      const isPendingApproval = values.role === 'Trainer' || values.role === 'LineManager';
      let certificationUploadPath = null;
      
      // Handle certificate upload for ELSAs
      if (values.role === 'ELSA' && values.certificateFile && values.certificateFile.length > 0) {
          const file = values.certificateFile[0];
          const storageRef = ref(storage, `certificates/${user.uid}/${file.name}`);
          const snapshot = await uploadBytes(storageRef, file);
          certificationUploadPath = snapshot.ref.fullPath;
      }
      
      const trainingStatus = values.role === 'Trainee' ? 'in-training' : (values.role === 'ELSA' ? 'trained' : null);

      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        fullName: values.fullName,
        email: values.email,
        
        role: values.role,
        additionalRoles: [],
        lastRoleUpdate: serverTimestamp(),
        
        approvalStatus: isPendingApproval ? "pending" : "approved",
        
        certificationStatus: values.role === 'ELSA' ? "pending" : null,
        certificationUploadPath: certificationUploadPath,
        certificationWhereTrained: values.certificationWhereTrained || null,
        certificationYear: values.certificationYear || null,
        schoolSetting: values.schoolSetting || null,
        lineManagerEmail: values.lineManagerEmail || null,
        
        linkedLineManagerId: values.linkedLineManagerId || null,
        linkedStaffIds: [],
        inviteId: inviteId || null,

        createdAt: serverTimestamp(),
        lastSeen: serverTimestamp(),
        
        organization: values.organization || values.schoolSetting || null,
        trainingStatus: trainingStatus,
        enrolledCourseId: null,
        supervisionGroupId: null,
      });


      toast({
        title: "Registration Submitted",
        description: isPendingApproval 
            ? `Your ${values.role} account is pending admin approval.`
            : "Your account has been created.",
      });
      router.push("/dashboard");

    } catch (error: any) {
      console.error("Registration Error:", error);
      let description = "An unexpected error occurred. Please try again.";
      if (error.code === 'auth/email-already-in-use') {
        description = "This email is already registered. Please try logging in.";
      }
      toast({
        title: "Registration Failed",
        description,
        variant: "destructive",
      });
    } finally {
        setIsSubmitting(false);
    }
  }

  return (
    <Card className="w-full max-w-md border-2 border-primary shadow-lg my-8">
      <CardHeader className="items-center text-center">
        <Icon className="size-16 mb-2" src="/EEConnect_Logo.png" alt="EEConnect Logo" />
        <CardTitle className="text-2xl font-headline text-primary">Create an Account</CardTitle>
        <CardDescription>Join the ELSA Training Hub today</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {inviteDetails && (
              <div className="rounded-md border border-input bg-background/50 p-3 text-center text-sm">
                Invited by <strong>{inviteDetails.fromName}</strong> to join <strong>{inviteDetails.schoolSetting}</strong>.
              </div>
            )}
             <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>I am a...</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select your role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Trainee">ELSA In-Training</SelectItem>
                      <SelectItem value="ELSA">Qualified ELSA</SelectItem>
                      <SelectItem value="LineManager">ELSA Line Manager</SelectItem>
                      <SelectItem value="Trainer">ELSA Trainer/Supervisor</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl><Input placeholder="John Doe" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl><Input placeholder="name@example.com" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl><Input type="password" placeholder="••••••••" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm Password</FormLabel>
                  <FormControl><Input type="password" placeholder="••••••••" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {selectedRole === 'ELSA' && (
                <>
                    <FormField control={form.control} name="schoolSetting" render={({ field }) => (<FormItem><FormLabel>School / Setting</FormLabel><FormControl><Input placeholder="e.g., Summit High School" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="certificationWhereTrained" render={({ field }) => (<FormItem><FormLabel>Where did you train?</FormLabel><FormControl><Input placeholder="e.g., Hampshire Services" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="certificationYear" render={({ field }) => (<FormItem><FormLabel>Year of Training</FormLabel><FormControl><Input placeholder="e.g., 2023" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="lineManagerEmail" render={({ field }) => (<FormItem><FormLabel>Line Manager's Email</FormLabel><FormControl><Input placeholder="manager@school.com" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField
                      control={form.control}
                      name="certificateFile"
                      render={({ field: { value, onChange, ...fieldProps } }) => (
                        <FormItem>
                          <FormLabel>ELSA Certificate</FormLabel>
                          <FormControl>
                            <Input
                              {...fieldProps}
                              type="file"
                              accept="application/pdf,image/*"
                              onChange={(event) => {
                                onChange(event.target.files);
                              }}
                            />
                          </FormControl>
                          <FormDescription>Upload a copy of your certificate (PDF or image).</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                </>
            )}

            {(selectedRole === 'LineManager' || selectedRole === 'Trainer') && (
                <FormField control={form.control} name="organization" render={({ field }) => (<FormItem><FormLabel>Organisation / Service</FormLabel><FormControl><Input placeholder="e.g., Summit Psychology" {...field} /></FormControl><FormMessage /></FormItem>)}/>
            )}
            
            <FormField
              control={form.control}
              name="acceptPolicy"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Accept our terms and privacy policy</FormLabel>
                    <FormDescription>You agree to our <Link href="/privacy-policy" className="font-medium text-primary hover:underline" target="_blank">Privacy Policy</Link>.</FormDescription>
                    <FormMessage />
                  </div>
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full !mt-6 font-headline bg-accent hover:bg-accent/90 text-accent-foreground" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Account
            </Button>
          </form>
        </Form>
      </CardContent>
      <CardFooter className="flex items-center justify-center text-sm">
         <p>Already have an account? <Link href="/login" className="font-medium text-primary hover:underline font-headline">Sign In</Link></p>
      </CardFooter>
    </Card>
  );
}
