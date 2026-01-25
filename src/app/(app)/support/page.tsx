"use client";

import { useState } from "react";
import { useUser } from "@/providers/user-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import {
    Loader2,
    Mail,
    BookOpen,
    GraduationCap,
    Users,
    BookMarked,
    Award,
    MessageSquare,
    Building,
    LayoutDashboard,
    Send,
    HelpCircle,
} from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const contactSchema = z.object({
    name: z.string().min(2, { message: "Name must be at least 2 characters." }),
    email: z.string().email({ message: "Please enter a valid email address." }),
    category: z.enum(["general", "technical", "feature", "bug", "account"], {
        required_error: "Please select a category.",
    }),
    subject: z.string().min(5, { message: "Subject must be at least 5 characters." }),
    message: z.string().min(20, { message: "Message must be at least 20 characters." }),
});

type ContactFormValues = z.infer<typeof contactSchema>;

export default function SupportPage() {
    const { user, userDetails, isLoading } = useUser();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<ContactFormValues>({
        resolver: zodResolver(contactSchema),
        defaultValues: {
            name: "",
            email: "",
            category: undefined,
            subject: "",
            message: "",
        },
        values: {
            name: userDetails?.fullName || "",
            email: userDetails?.email || "",
            category: undefined as unknown as ContactFormValues["category"],
            subject: "",
            message: "",
        },
    });

    async function onSubmit(values: ContactFormValues) {
        if (!user) return;
        setIsSubmitting(true);
        try {
            await addDoc(collection(db, "support_tickets"), {
                ...values,
                userId: user.uid,
                userRole: userDetails?.role || "User",
                status: "pending",
                createdAt: serverTimestamp(),
            });

            toast({
                title: "Message Sent",
                description: "Your support request has been submitted. We'll get back to you soon at the email address provided.",
            });
            form.reset({
                name: userDetails?.fullName || "",
                email: userDetails?.email || "",
                category: undefined,
                subject: "",
                message: "",
            });
        } catch (error) {
            console.error("Error submitting support ticket:", error);
            toast({
                title: "Submission Failed",
                description: "There was an error sending your message. Please try again or email us directly.",
                variant: "destructive",
            });
        } finally {
            setIsSubmitting(false);
        }
    }

    if (isLoading) {
        return (
            <div className="container py-10 space-y-6 max-w-5xl">
                <div>
                    <Skeleton className="h-10 w-48 mb-2" />
                    <Skeleton className="h-5 w-96" />
                </div>
                <div className="grid gap-6 md:grid-cols-2">
                    <Skeleton className="h-96" />
                    <Skeleton className="h-96" />
                </div>
            </div>
        );
    }

    return (
        <div className="container py-10 space-y-8 max-w-5xl">
            <div>
                <h1 className="text-3xl font-bold tracking-tight font-headline">Support Center</h1>
                <p className="text-muted-foreground">
                    Learn how to use EELSA Connect or get in touch with our support team.
                </p>
            </div>

            {/* Features by User Type */}
            <div className="space-y-6">
                <div>
                    <h2 className="text-2xl font-semibold font-headline mb-4">Platform Features Guide</h2>
                    <p className="text-muted-foreground mb-4">
                        EELSA Connect provides different features based on your role. Find the guide relevant to you below.
                    </p>
                </div>

                <Accordion type="multiple" className="space-y-4">
                    {/* All Users */}
                    <AccordionItem value="all-users" className="border rounded-lg px-4">
                        <AccordionTrigger className="hover:no-underline">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-primary/10 rounded-lg">
                                    <LayoutDashboard className="h-5 w-5 text-primary" />
                                </div>
                                <div className="text-left">
                                    <h3 className="font-semibold">All Users</h3>
                                    <p className="text-sm text-muted-foreground font-normal">Core features available to everyone</p>
                                </div>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="pt-4 pb-6">
                            <div className="space-y-4 pl-12">
                                <div className="flex gap-3">
                                    <LayoutDashboard className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                                    <div>
                                        <h4 className="font-medium">Dashboard</h4>
                                        <p className="text-sm text-muted-foreground">Your central hub showing an overview of your activity, upcoming events, and quick access to key features.</p>
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <BookOpen className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                                    <div>
                                        <h4 className="font-medium">Resource Center</h4>
                                        <p className="text-sm text-muted-foreground">Access a library of ELSA resources including forms, assessments, activities, research papers, and helpful websites. You can also submit your own resources for approval.</p>
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <GraduationCap className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                                    <div>
                                        <h4 className="font-medium">Training Courses</h4>
                                        <p className="text-sm text-muted-foreground">Browse available training courses and view course details. Trainees can access their enrolled course materials here.</p>
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <Users className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                                    <div>
                                        <h4 className="font-medium">Supervision Groups</h4>
                                        <p className="text-sm text-muted-foreground">View and join supervision groups for ongoing professional support and development with other ELSAs.</p>
                                    </div>
                                </div>
                            </div>
                        </AccordionContent>
                    </AccordionItem>

                    {/* ELSA */}
                    <AccordionItem value="elsa" className="border rounded-lg px-4">
                        <AccordionTrigger className="hover:no-underline">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-green-100 rounded-lg">
                                    <BookMarked className="h-5 w-5 text-green-700" />
                                </div>
                                <div className="text-left">
                                    <h3 className="font-semibold">ELSA (Emotional Literacy Support Assistant)</h3>
                                    <p className="text-sm text-muted-foreground font-normal">Features for qualified ELSAs</p>
                                </div>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="pt-4 pb-6">
                            <div className="space-y-4 pl-12">
                                <div className="flex gap-3">
                                    <BookMarked className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                                    <div>
                                        <h4 className="font-medium">My Journal</h4>
                                        <p className="text-sm text-muted-foreground">Keep a private reflective journal to record your ELSA sessions, thoughts, and professional reflections. Entries are private and only visible to you.</p>
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <Award className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                                    <div>
                                        <h4 className="font-medium">Certificates</h4>
                                        <p className="text-sm text-muted-foreground">View and download your ELSA training certificates and any specialist certifications you&apos;ve earned.</p>
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <MessageSquare className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                                    <div>
                                        <h4 className="font-medium">Messaging</h4>
                                        <p className="text-sm text-muted-foreground">Communicate with trainers, other ELSAs, and support staff through the built-in messaging system.</p>
                                    </div>
                                </div>
                            </div>
                        </AccordionContent>
                    </AccordionItem>

                    {/* Trainee */}
                    <AccordionItem value="trainee" className="border rounded-lg px-4">
                        <AccordionTrigger className="hover:no-underline">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-100 rounded-lg">
                                    <GraduationCap className="h-5 w-5 text-blue-700" />
                                </div>
                                <div className="text-left">
                                    <h3 className="font-semibold">Trainee</h3>
                                    <p className="text-sm text-muted-foreground font-normal">Features for users currently in ELSA training</p>
                                </div>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="pt-4 pb-6">
                            <div className="space-y-4 pl-12">
                                <div className="flex gap-3">
                                    <GraduationCap className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                                    <div>
                                        <h4 className="font-medium">Course Materials</h4>
                                        <p className="text-sm text-muted-foreground">Access your enrolled training course materials, including session content, handouts, and supplementary resources.</p>
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <Award className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                                    <div>
                                        <h4 className="font-medium">Certificates</h4>
                                        <p className="text-sm text-muted-foreground">Upon completion of your training, access and download your ELSA qualification certificate.</p>
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <MessageSquare className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                                    <div>
                                        <h4 className="font-medium">Messaging</h4>
                                        <p className="text-sm text-muted-foreground">Contact your trainer directly with questions about the course or your training progress.</p>
                                    </div>
                                </div>
                            </div>
                        </AccordionContent>
                    </AccordionItem>

                    {/* Trainer */}
                    <AccordionItem value="trainer" className="border rounded-lg px-4">
                        <AccordionTrigger className="hover:no-underline">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-purple-100 rounded-lg">
                                    <Users className="h-5 w-5 text-purple-700" />
                                </div>
                                <div className="text-left">
                                    <h3 className="font-semibold">Trainer</h3>
                                    <p className="text-sm text-muted-foreground font-normal">Features for ELSA trainers delivering courses</p>
                                </div>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="pt-4 pb-6">
                            <div className="space-y-4 pl-12">
                                <div className="flex gap-3">
                                    <GraduationCap className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                                    <div>
                                        <h4 className="font-medium">Course Management</h4>
                                        <p className="text-sm text-muted-foreground">Create and manage training courses, upload course materials, and track trainee progress through the programme.</p>
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <Users className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                                    <div>
                                        <h4 className="font-medium">Trainee Management</h4>
                                        <p className="text-sm text-muted-foreground">View enrolled trainees, monitor their engagement, and manage their progression through the course.</p>
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <Award className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                                    <div>
                                        <h4 className="font-medium">Certificates</h4>
                                        <p className="text-sm text-muted-foreground">Issue completion certificates to trainees who have successfully completed their ELSA training.</p>
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <MessageSquare className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                                    <div>
                                        <h4 className="font-medium">Messaging</h4>
                                        <p className="text-sm text-muted-foreground">Communicate with your trainees, send announcements, and provide support throughout their training journey.</p>
                                    </div>
                                </div>
                            </div>
                        </AccordionContent>
                    </AccordionItem>

                    {/* Line Manager */}
                    <AccordionItem value="line-manager" className="border rounded-lg px-4">
                        <AccordionTrigger className="hover:no-underline">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-orange-100 rounded-lg">
                                    <Building className="h-5 w-5 text-orange-700" />
                                </div>
                                <div className="text-left">
                                    <h3 className="font-semibold">Line Manager</h3>
                                    <p className="text-sm text-muted-foreground font-normal">Features for managers overseeing ELSAs</p>
                                </div>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="pt-4 pb-6">
                            <div className="space-y-4 pl-12">
                                <div className="flex gap-3">
                                    <Building className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                                    <div>
                                        <h4 className="font-medium">Manager Dashboard</h4>
                                        <p className="text-sm text-muted-foreground">Access a dedicated dashboard to oversee your linked staff members, view their activity, and monitor their professional development.</p>
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <Users className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                                    <div>
                                        <h4 className="font-medium">Staff Overview</h4>
                                        <p className="text-sm text-muted-foreground">View a list of ELSAs under your supervision, including their training status and certification details.</p>
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <Award className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                                    <div>
                                        <h4 className="font-medium">Certificates</h4>
                                        <p className="text-sm text-muted-foreground">View certificates earned by staff members you manage to track their qualifications and professional development.</p>
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <MessageSquare className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                                    <div>
                                        <h4 className="font-medium">Messaging</h4>
                                        <p className="text-sm text-muted-foreground">Communicate with your staff members and coordinate with trainers regarding training and supervision.</p>
                                    </div>
                                </div>
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            </div>

            {/* Contact Support */}
            <div className="grid gap-6 lg:grid-cols-5">
                <Card className="lg:col-span-3">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Send className="h-5 w-5" />
                            Contact Support
                        </CardTitle>
                        <CardDescription>
                            Have a question or need help? Send us a message and we&apos;ll get back to you as soon as possible.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <FormField
                                        control={form.control}
                                        name="name"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Name</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="Your name" {...field} />
                                                </FormControl>
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
                                                <FormControl>
                                                    <Input placeholder="your@email.com" type="email" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                                <FormField
                                    control={form.control}
                                    name="category"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Category</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select a category" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="general">General Enquiry</SelectItem>
                                                    <SelectItem value="technical">Technical Issue</SelectItem>
                                                    <SelectItem value="feature">Feature Request</SelectItem>
                                                    <SelectItem value="bug">Bug Report</SelectItem>
                                                    <SelectItem value="account">Account Issue</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="subject"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Subject</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Brief description of your enquiry" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="message"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Message</FormLabel>
                                            <FormControl>
                                                <Textarea
                                                    placeholder="Please describe your question or issue in detail..."
                                                    className="min-h-[120px] resize-none"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <Button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full bg-accent hover:bg-accent/90"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Sending...
                                        </>
                                    ) : (
                                        <>
                                            <Send className="mr-2 h-4 w-4" />
                                            Send Message
                                        </>
                                    )}
                                </Button>
                            </form>
                        </Form>
                    </CardContent>
                </Card>

                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <HelpCircle className="h-5 w-5" />
                            Need Help?
                        </CardTitle>
                        <CardDescription>
                            Other ways to get support
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex items-start gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg shrink-0">
                                <Mail className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                                <h4 className="font-medium">Email Us Directly</h4>
                                <p className="text-sm text-muted-foreground mb-2">
                                    For urgent matters or if you prefer email:
                                </p>
                                <a
                                    href="mailto:support@summitpsychologyservices.co.uk"
                                    className="text-sm text-primary hover:underline font-medium"
                                >
                                    support@summitpsychologyservices.co.uk
                                </a>
                            </div>
                        </div>

                        <div className="border-t pt-6">
                            <h4 className="font-medium mb-3">Common Questions</h4>
                            <div className="space-y-3">
                                <div className="text-sm">
                                    <p className="font-medium text-foreground">How do I reset my password?</p>
                                    <p className="text-muted-foreground">Click &quot;Forgot Password&quot; on the login page to receive a reset link via email.</p>
                                </div>
                                <div className="text-sm">
                                    <p className="font-medium text-foreground">How do I access course materials?</p>
                                    <p className="text-muted-foreground">Navigate to Training Courses and select your enrolled course to view all materials.</p>
                                </div>
                                <div className="text-sm">
                                    <p className="font-medium text-foreground">How do I download my certificate?</p>
                                    <p className="text-muted-foreground">Go to Certificates in the sidebar menu and click the download button next to your certificate.</p>
                                </div>
                            </div>
                        </div>

                        <div className="border-t pt-6">
                            <p className="text-xs text-muted-foreground">
                                We aim to respond to all support requests within 1-2 working days.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
