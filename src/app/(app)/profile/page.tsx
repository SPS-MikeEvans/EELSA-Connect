
"use client";

import { useUser } from "@/providers/user-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { updateProfile } from "firebase/auth";
import { auth, db, storage } from "@/lib/firebase";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { Loader2, Camera, Award, GraduationCap } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useRef, useState, useEffect } from "react";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { Badge } from "@/components/ui/badge";
import { DataPrivacySettings } from "@/components/auth/data-privacy-settings";

const profileSchema = z.object({
  fullName: z.string().min(2, { message: "Name must be at least 2 characters." }),
});

export default function ProfilePage() {
    const { user, userDetails, isLoading } = useUser();
    const { toast } = useToast();
    const [isUploading, setIsUploading] = useState(false);
    const [courseName, setCourseName] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const form = useForm<z.infer<typeof profileSchema>>({
        resolver: zodResolver(profileSchema),
        values: {
            fullName: userDetails?.fullName || "",
        },
    });
    
    // Fetch enrolled course name if applicable
    useEffect(() => {
        if (userDetails?.enrolledCourseId) {
            const fetchCourse = async () => {
                const docSnap = await getDoc(doc(db, "trainingCourses", userDetails.enrolledCourseId!));
                if (docSnap.exists()) {
                    setCourseName(docSnap.data().name);
                }
            };
            fetchCourse();
        }
    }, [userDetails?.enrolledCourseId]);
    
    const getInitials = (name: string | null | undefined) => {
        if (!name) return "";
        return name.split(' ').map(n => n[0]).join('');
    }

    const handleAvatarClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !user || !auth.currentUser) return;

        setIsUploading(true);
        try {
            const storageRef = ref(storage, `profile_pictures/${user.uid}/${file.name}`);
            const snapshot = await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(snapshot.ref);

            // Update Auth profile
            await updateProfile(auth.currentUser, { photoURL: downloadURL });
            // Update Firestore document
            await updateDoc(doc(db, "users", user.uid), { photoURL: downloadURL });

            toast({
                title: "Profile Picture Updated",
                description: "Your new picture has been saved.",
            });
        } catch (error) {
            console.error("Error uploading profile picture:", error);
            toast({
                title: "Upload Failed",
                description: "Could not upload your profile picture.",
                variant: "destructive",
            });
        } finally {
            setIsUploading(false);
        }
    };


    if (isLoading) {
        return (
             <div className="mx-auto grid w-full max-w-6xl gap-2">
                <h1 className="text-3xl font-semibold font-headline">Settings</h1>
                <div className="grid gap-6">
                    <Card>
                        <CardHeader>
                            <CardTitle><Skeleton className="h-8 w-24" /></CardTitle>
                            <CardDescription><Skeleton className="h-4 w-48" /></CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Full Name</Label>
                                <Skeleton className="h-10 w-full" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Skeleton className="h-10 w-full" />
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        )
    }

    async function onSubmit(values: z.infer<typeof profileSchema>) {
        if (!user || !auth.currentUser) return;
        try {
            // Update displayName in Firebase Auth
            await updateProfile(auth.currentUser, {
                displayName: values.fullName,
            });

            // Update fullName in Firestore
            const userDocRef = doc(db, "users", user.uid);
            await updateDoc(userDocRef, {
                fullName: values.fullName,
            });

            toast({
                title: "Profile Updated",
                description: "Your changes have been saved successfully.",
            });
        } catch (error) {
             toast({
                title: "Update Failed",
                description: "An error occurred while updating your profile.",
                variant: "destructive",
            });
            console.error("Profile update error:", error);
        }
    }


    return (
        <div className="mx-auto grid w-full max-w-6xl gap-2">
            <h1 className="text-3xl font-semibold font-headline">Settings</h1>
            <div className="grid gap-6">
                
                {userDetails?.enrolledCourseId && (
                    <Card className="border-l-4 border-l-primary">
                        <CardHeader className="pb-3">
                            <div className="flex justify-between items-start">
                                <div>
                                    <CardTitle className="text-lg flex items-center">
                                        <GraduationCap className="mr-2 h-5 w-5 text-primary" />
                                        Current Enrollment
                                    </CardTitle>
                                    <CardDescription>{courseName || "Loading..."}</CardDescription>
                                </div>
                                <div className="flex gap-2">
                                    <Badge variant="outline" className="text-sm">{userDetails.trainingStatus === 'in-training' ? 'In Training' : 'Completed'}</Badge>
                                    {userDetails.hasSpecialistAccess && (
                                        <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-200 border-amber-200 gap-1">
                                            <Award className="h-3 w-3" /> Specialist Included
                                        </Badge>
                                    )}
                                </div>
                            </div>
                        </CardHeader>
                    </Card>
                )}

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)}>
                        <Card>
                            <CardHeader>
                                <CardTitle>Profile</CardTitle>
                                <CardDescription>
                                    This is how others will see you on the site.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center space-x-4">
                                    <div className="relative">
                                        <Avatar className="h-20 w-20 cursor-pointer" onClick={handleAvatarClick}>
                                            <AvatarImage src={userDetails?.photoURL || user?.photoURL || `https://picsum.photos/seed/${user?.uid}/100/100`} alt={userDetails?.fullName || ""} />
                                            <AvatarFallback>{getInitials(userDetails?.fullName)}</AvatarFallback>
                                        </Avatar>
                                        <div 
                                            className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 hover:opacity-100 transition-opacity rounded-full cursor-pointer"
                                            onClick={handleAvatarClick}
                                        >
                                            {isUploading ? <Loader2 className="h-6 w-6 animate-spin text-white" /> : <Camera className="h-6 w-6 text-white" />}
                                        </div>
                                        <Input 
                                            ref={fileInputRef}
                                            type="file"
                                            accept="image/png, image/jpeg"
                                            className="hidden"
                                            onChange={handleFileChange}
                                            disabled={isUploading}
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <FormField
                                            control={form.control}
                                            name="fullName"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Full Name</FormLabel>
                                                    <FormControl>
                                                        <Input {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email</Label>
                                    <Input id="email" type="email" defaultValue={userDetails?.email} disabled />
                                </div>
                            </CardContent>
                            <CardHeader>
                                <CardTitle>Change Password</CardTitle>
                                <CardDescription>
                                    Update your password here. Leave blank to keep the current one.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="current-password">Current Password</Label>
                                    <Input id="current-password" type="password" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="new-password">New Password</Label>
                                    <Input id="new-password" type="password" />
                                </div>
                            </CardContent>
                            <CardHeader>
                                <CardTitle>Notification Settings</CardTitle>
                                <CardDescription>
                                    Manage how you receive notifications.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center justify-between rounded-lg border p-4">
                                    <div>
                                        <h3 className="font-medium">New Messages</h3>
                                        <p className="text-sm text-muted-foreground">Receive an email when you get a new message.</p>
                                    </div>
                                    <Switch defaultChecked/>
                                </div>
                                <div className="flex items-center justify-between rounded-lg border p-4">
                                    <div>
                                        <h3 className="font-medium">Resource Updates</h3>
                                        <p className="text-sm text-muted-foreground">Get notified when new resources are added.</p>
                                    </div>
                                    <Switch defaultChecked/>
                                </div>
                            </CardContent>
                            <CardFooter>
                                <Button type="submit" disabled={form.formState.isSubmitting} className="bg-accent hover:bg-accent/90">
                                     {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Update Profile
                                </Button>
                            </CardFooter>
                        </Card>
                    </form>
                </Form>

                <DataPrivacySettings />
            </div>
        </div>
    )
}
