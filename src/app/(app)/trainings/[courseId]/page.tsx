
"use client";

import { useUser } from "@/providers/user-provider";
import { useEffect, useState } from "react";
import { doc, updateDoc, arrayUnion, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useRouter, useParams } from "next/navigation";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { CalendarIcon, MapPin, User, CheckCircle, AlertTriangle, MessageSquare } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChatWindow } from "@/components/chat/chat-window";
import { cn } from "@/lib/utils";

export default function TrainingDetailsPage() {
  const params = useParams();
  const courseId = params.courseId as string;
  const { user, userDetails, userRole } = useUser();
  const [course, setCourse] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    if (!courseId) return;
    const docRef = doc(db, "trainingCourses", courseId);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
            setCourse(docSnap.data());
        } else {
            setCourse(null);
        }
        setLoading(false);
    });
    return () => unsubscribe();
  }, [courseId]);

  const handleJoin = async () => {
    if (!user) return;
    
    if (userDetails?.enrolledCourseId) {
        toast({ 
            title: "Already Enrolled", 
            description: "You are already enrolled in a training course. You cannot join multiple courses.",
            variant: "destructive" 
        });
        return;
    }

    try {
      const courseRef = doc(db, 'trainingCourses', courseId);
      const userRef = doc(db, 'users', user.uid);

      await updateDoc(courseRef, {
          participantIds: arrayUnion(user.uid)
      });
      
      await updateDoc(userRef, {
          enrolledCourseId: courseId,
          trainingStatus: 'in-training'
      });

      toast({ title: "Success!", description: "You have successfully joined the training course." });
    } catch (e: any) {
      console.error(e);
      toast({ title: "Join Failed", description: typeof e === 'string' ? e : "Could not join the course.", variant: "destructive" });
    }
  };

  if (loading) {
      return <div className="container mx-auto p-6"><Skeleton className="h-[400px] w-full" /></div>;
  }

  if (!course) {
      return <div className="container mx-auto p-6">Course not found.</div>;
  }

  const isJoined = course.participantIds?.includes(user?.uid);
  const isFull = (course.participantIds?.length || 0) >= (course.maxCapacity || 20);
  const canAccessChat = isJoined || userRole === 'Admin' || userRole === 'Trainer';

  return (
    <div className="container mx-auto py-8">
      <Tabs defaultValue="details" className="max-w-4xl mx-auto">
        <TabsList className="grid w-full grid-cols-2 mb-8 h-12">
            <TabsTrigger value="details" className="text-base">Course Details</TabsTrigger>
            <TabsTrigger value="chat" disabled={!canAccessChat} className="text-base flex items-center gap-2">
                <MessageSquare className="h-4 w-4" /> Group Chat {!canAccessChat && "(Enrolled Only)"}
            </TabsTrigger>
        </TabsList>
        
        <TabsContent value="details">
            <Card className="border-2 shadow-sm">
                <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle className="text-3xl font-headline text-primary mb-2">{course.name}</CardTitle>
                        <CardDescription className="flex items-center gap-2 text-base">
                            <MapPin className="h-4 w-4" /> {course.venueName}
                        </CardDescription>
                    </div>
                    <Badge variant={isJoined ? "default" : (isFull ? "destructive" : "secondary")} className="text-sm px-3 py-1">
                        {isJoined ? "Enrolled" : (isFull ? "Full" : "Open for Registration")}
                    </Badge>
                </div>
                </CardHeader>
                <CardContent className="space-y-8">
                    {/* Warning for existing ELSAs */}
                    {userDetails?.trainingStatus !== 'in-training' && userDetails?.role === 'ELSA' && (
                        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-3 rounded-md text-sm flex gap-2">
                            <AlertTriangle className="h-5 w-5 shrink-0" />
                            <p>Only ELSAs with &quot;In-Training&quot; status can join courses. Update your profile if this is incorrect.</p>
                        </div>
                    )}

                    <div className="grid md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                            <div className="flex items-start gap-4">
                                <div className="bg-primary/10 p-2 rounded-full"><User className="h-6 w-6 text-primary" /></div>
                                <div>
                                    <p className="font-semibold">Lead Trainer</p>
                                    <p className="text-muted-foreground">{course.trainerName}</p>
                                    <p className="text-sm text-muted-foreground">{course.trainerEmail}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-4">
                                <div className="bg-primary/10 p-2 rounded-full"><CalendarIcon className="h-6 w-6 text-primary" /></div>
                                <div>
                                    <p className="font-semibold">Schedule</p>
                                    <p className="text-muted-foreground">{course.startTime} - {course.endTime}</p>
                                </div>
                            </div>
                        </div>
                        
                        <div className="bg-muted/20 p-6 rounded-xl border">
                            <h3 className="font-semibold mb-4 text-lg">Course Modules</h3>
                            {course.datesTbc ? (
                                <p className="text-muted-foreground italic">Dates to be confirmed.</p>
                            ) : (
                                <div className="space-y-4">
                                    <div>
                                        <span className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Core Training</span>
                                        <ul className="mt-1 space-y-1 text-sm">
                                            {course.coreDates?.map((d: any, i: number) => (
                                                <li key={i} className="flex items-center gap-2"><div className="h-1.5 w-1.5 rounded-full bg-blue-500"/> {format(d.toDate(), "PPP")}</li>
                                            ))}
                                        </ul>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <span className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Specialist</span>
                                            <ul className="mt-1 space-y-1 text-sm">
                                                {course.specialistDates?.map((d: any, i: number) => (
                                                    <li key={i} className="flex items-center gap-2"><div className="h-1.5 w-1.5 rounded-full bg-purple-500"/> {format(d.toDate(), "PPP")}</li>
                                                ))}
                                            </ul>
                                        </div>
                                        <div>
                                            <span className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Supervision</span>
                                            <ul className="mt-1 space-y-1 text-sm">
                                                {course.supervisionDates?.map((d: any, i: number) => (
                                                    <li key={i} className="flex items-center gap-2"><div className="h-1.5 w-1.5 rounded-full bg-green-500"/> {format(d.toDate(), "PPP")}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Capacity Bar */}
                    <div>
                        <div className="flex justify-between text-sm mb-2 font-medium">
                            <span>Course Capacity</span>
                            <span>{course.participantIds?.length || 0} / {course.maxCapacity} Seats Taken</span>
                        </div>
                        <div className="h-3 w-full bg-secondary rounded-full overflow-hidden">
                            <div 
                                className={cn("h-full bg-primary transition-all duration-500", isFull && "bg-destructive")} 
                                style={{ width: `${Math.min(100, ((course.participantIds?.length || 0) / course.maxCapacity) * 100)}%` }}
                            />
                        </div>
                    </div>

                </CardContent>
                <CardFooter className="flex justify-end pt-6 border-t bg-muted/10">
                    {isJoined ? (
                        <Button disabled size="lg" className="w-full md:w-auto">
                            <CheckCircle className="mr-2 h-5 w-5" /> Enrollment Confirmed
                        </Button>
                    ) : (
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button 
                                    size="lg" 
                                    className="w-full md:w-auto font-headline text-lg"
                                    disabled={isFull || !!userDetails?.enrolledCourseId} // Check logic
                                >
                                    {isFull ? "Course Full" : "Register for Course"}
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Confirm Registration</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Are you sure you want to join <strong>{course.name}</strong>?
                                        <br/><br/>
                                        By joining, you confirm that you can attend the scheduled dates.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleJoin}>Confirm Registration</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    )}
                </CardFooter>
            </Card>
        </TabsContent>
        
        <TabsContent value="chat">
            {canAccessChat && <ChatWindow chatId={courseId} title={`Chat: ${course.name}`} />}
        </TabsContent>
      </Tabs>
    </div>
  );
}
