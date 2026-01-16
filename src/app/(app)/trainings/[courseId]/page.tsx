
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc, runTransaction, DocumentData, Timestamp, collection, addDoc, onSnapshot, arrayRemove } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useUser } from "@/providers/user-provider";
import { useToast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, MapPin, CheckCircle2, AlertTriangle, Loader2, ArrowLeft, ClipboardList, CreditCard, Trash2, User } from "lucide-react";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";


interface TrainingCourse {
  name: string;
  trainerName: string;
  venueName: string;
  venueAddress: string;
  maxCapacity: number;
  participantIds: string[];
  dates: {
    core: Timestamp[];
    specialist: Timestamp[];
    supervision: Timestamp[];
  };
  price?: number;
  stripePriceId?: string;
  specialistPrice?: number;
  stripeFullPriceId?: string;
  datesTbc?: boolean;
}

interface ParticipantProfile {
    uid: string;
    fullName: string;
    email: string;
}

export default function TrainingDetailsPage() {
  const { courseId } = useParams();
  const router = useRouter();
  const { user, userDetails, userRole } = useUser();
  const { toast } = useToast();
  
  const [course, setCourse] = useState<(TrainingCourse & { id: string }) | null>(null);
  const [participants, setParticipants] = useState<ParticipantProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [selectedOption, setSelectedOption] = useState<"core" | "full">("core");

   const fetchParticipants = async (participantIds: string[]) => {
      if (!participantIds || participantIds.length === 0) {
          setParticipants([]);
          return;
      }
      const promises = participantIds.map(uid => getDoc(doc(db, "users", uid)));
      const snapshots = await Promise.all(promises);
      const profiles = snapshots
        .filter(snap => snap.exists())
        .map(snap => ({
            uid: snap.id,
            fullName: snap.data()?.fullName || "Unknown User",
            email: snap.data()?.email || ""
        }));
      setParticipants(profiles);
  };

  useEffect(() => {
    if (!courseId) return;
    setLoading(true);
    const docRef = doc(db, "trainingCourses", courseId as string);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data() as TrainingCourse;
          setCourse({ id: docSnap.id, ...data });
          fetchParticipants(data.participantIds || []);
        } else {
            toast({ title: "Not Found", description: "Course not found", variant: "destructive" });
            router.push("/trainings");
        }
        setLoading(false);
    }, (error) => {
        console.error("Error fetching course:", error);
        setLoading(false);
    });
    
    return () => unsubscribe();
  }, [courseId, router, toast]);

  const handleJoin = async (e: React.MouseEvent) => {
    e.preventDefault();

    if (!user || !course) return;

    setIsJoining(true);

    try {
        const isPaid = course.price && course.price > 0;
        
        if (isPaid) {
            // Determine which price ID to use
            let targetPriceId = course.stripePriceId;
            let hasSpecialistAccess = false;

            if (selectedOption === "full" && course.stripeFullPriceId) {
                targetPriceId = course.stripeFullPriceId;
                hasSpecialistAccess = true;
            }

            if (targetPriceId) {
                await handlePayment(targetPriceId, hasSpecialistAccess);
            } else {
                toast({ title: "Configuration Error", description: "Payment system not ready for this option. Please contact admin.", variant: "destructive" });
                setIsJoining(false);
            }
        } else {
            await handleFreeJoin();
            setIsJoining(false);
        }
    } catch (error) {
        console.error("Join error:", error);
        setIsJoining(false);
    }
  };

  const handlePayment = async (priceId: string, hasSpecialistAccess: boolean) => {
      if (!user || !course) return;

      toast({ title: "Redirecting to payment...", description: "Please wait while we create your secure checkout session." });

      const checkoutSessionRef = collection(db, "users", user.uid, "checkout_sessions");

      const sessionDocRef = await addDoc(checkoutSessionRef, {
          price: priceId,
          success_url: window.location.href + "?payment=success",
          cancel_url: window.location.href + "?payment=cancelled",
          mode: 'payment',
          metadata: {
              userId: user.uid,
              courseId: course.id,
              itemType: 'trainingCourse',
              hasSpecialistAccess: hasSpecialistAccess ? 'true' : 'false'
          }
      });
      
      const unsubscribe = onSnapshot(sessionDocRef, (snap) => {
          const { error, url } = snap.data() || {};
          if (error) {
              console.error(`An error occurred: ${error.message}`);
              toast({ title: "Payment Error", description: error.message, variant: "destructive" });
              unsubscribe();
              setIsJoining(false);
          }
          if (url) {
              window.location.assign(url);
              unsubscribe();
          }
      });
  };

  const handleFreeJoin = async () => {
    if (!user || !course) return;

    if (userDetails?.enrolledCourseId) {
        toast({
            title: "Already Enrolled",
            description: "You are already enrolled in a training course. You cannot join multiple courses.",
            variant: "destructive"
        });
        return;
    }

    try {
      await runTransaction(db, async (transaction) => {
        const courseRef = doc(db, "trainingCourses", course.id);
        const userRef = doc(db, "users", user.uid);

        const courseDoc = await transaction.get(courseRef);
        if (!courseDoc.exists()) throw "Course does not exist!";
        const courseData = courseDoc.data();
        const currentParticipants = courseData.participantIds || [];

        if (currentParticipants.length >= courseData.maxCapacity) throw "Course is full!";
        if (currentParticipants.includes(user.uid)) throw "You are already in this course.";

        transaction.update(courseRef, { participantIds: [...currentParticipants, user.uid] });
        transaction.update(userRef, { enrolledCourseId: course.id, trainingStatus: 'in-training' });
      });

      toast({ title: "Success!", description: "You have successfully joined the training course." });

    } catch (e) {
      console.error("Transaction failed: ", e);
      toast({ title: "Join Failed", description: typeof e === 'string' ? e : "Could not join the course.", variant: "destructive" });
    }
  };

  const handleRemoveParticipant = async (participantId: string, participantName: string) => {
    if (!course) return;
    try {
        await runTransaction(db, async (transaction) => {
            const courseRef = doc(db, "trainingCourses", course.id);
            const userRef = doc(db, "users", participantId);

            transaction.update(courseRef, { participantIds: arrayRemove(participantId) });
            transaction.update(userRef, { enrolledCourseId: null });
        });
        toast({ title: "Participant Removed", description: `${participantName} has been removed from the course.` });
    } catch (error) {
        console.error(error);
        toast({ title: "Removal Failed", description: "Could not remove participant.", variant: "destructive" });
    }
  };

  if (loading) return <div className="container py-10"><Skeleton className="h-[400px] w-full" /></div>;
  if (!course) return null;

  const isEnrolled = userDetails?.enrolledCourseId === course.id;
  const isEnrolledElsewhere = userDetails?.enrolledCourseId && !isEnrolled;
  const isFull = course.participantIds.length >= course.maxCapacity;
  const canJoin = !isEnrolled && !isEnrolledElsewhere && !isFull && userDetails?.trainingStatus === 'in-training';
  const isAdminOrTrainer = userRole === 'Admin' || userRole === 'Trainer';
  const isPaid = course.price && course.price > 0;
  const hasSpecialistOption = course.specialistPrice && course.specialistPrice > 0 && course.stripeFullPriceId;

  const DateList = ({ title, dates }: { title: string, dates: Timestamp[] }) => (
      <div className="mb-6">
          <h3 className="font-semibold mb-2 text-primary">{title}</h3>
          {dates.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">Dates to be confirmed.</p>
          ) : (
            <ul className="space-y-1">
                {dates.map((ts, i) => (
                    <li key={i} className="text-sm flex items-center">
                        <CalendarIcon className="mr-2 h-3 w-3 text-muted-foreground" />
                        {format(ts.toDate(), "PPP")}
                    </li>
                ))}
            </ul>
          )}
      </div>
  );

  return (
    <div className="container max-w-5xl py-10">
      <div className="flex justify-between items-center mb-4">
        <Button variant="ghost" asChild className="pl-0 hover:bg-transparent hover:text-primary">
            <Link href="/trainings" className="flex items-center"><ArrowLeft className="mr-2 h-4 w-4"/> Back to Courses</Link>
        </Button>
        {isAdminOrTrainer && (
             <Button asChild variant="outline" className="gap-2">
                 <Link href={`/trainings/${course.id}/attendance`}>
                     <ClipboardList className="h-4 w-4" /> Attendance Tracker
                 </Link>
             </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
            <div>
                <h1 className="text-3xl font-bold font-headline mb-2">{course.name}</h1>
                <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="text-base py-1 px-3">Lead Trainer: {course.trainerName}</Badge>
                     {isEnrolled && <Badge className="bg-green-600 text-base py-1 px-3">You are enrolled</Badge>}
                     {isFull && !isEnrolled && <Badge variant="destructive" className="text-base py-1 px-3">Course Full</Badge>}
                     {isPaid && course.price && <Badge variant="secondary" className="text-base py-1 px-3 border-accent text-accent-foreground">£{course.price.toFixed(2)}</Badge>}
                </div>
            </div>

            <Card><CardHeader><CardTitle>Venue Details</CardTitle></CardHeader><CardContent className="space-y-2"><div className="flex items-center font-medium"><MapPin className="mr-2 h-5 w-5 text-primary" />{course.venueName}</div><p className="text-muted-foreground ml-7">{course.venueAddress}</p></CardContent></Card>
            <Card><CardHeader><CardTitle>Course Schedule</CardTitle><CardDescription>Comprehensive training timeline including all mandatory sessions.</CardDescription></CardHeader><CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <DateList title="Core Training" dates={course.datesTbc ? [] : course.dates.core} />
                <DateList title="Specialist Days" dates={course.datesTbc ? [] : course.dates.specialist} />
                <DateList title="Supervision" dates={course.datesTbc ? [] : course.dates.supervision} />
            </CardContent></Card>

            {(isEnrolled || isAdminOrTrainer) && (<Card><CardHeader><CardTitle>Participants ({participants.length})</CardTitle></CardHeader><CardContent><div className="space-y-4">{participants.map(p => (<div key={p.uid} className="flex items-center justify-between"><div className="flex items-center space-x-3"><Avatar><AvatarFallback>{p.fullName.charAt(0)}</AvatarFallback></Avatar><div><p className="text-sm font-medium leading-none">{p.fullName}</p><p className="text-xs text-muted-foreground">{p.email}</p></div></div>{isAdminOrTrainer && (<AlertDialog><AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><Trash2 className="h-4 w-4 text-destructive"/></Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Remove Participant?</AlertDialogTitle><AlertDialogDescription>Are you sure you want to remove <strong>{p.fullName}</strong> from this course? This action cannot be undone.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleRemoveParticipant(p.uid, p.fullName)} className="bg-destructive hover:bg-destructive/90">Remove</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>)}</div>))}</div></CardContent></Card>)}
        </div>

        <div>
            <Card className="sticky top-6 border-t-4 border-t-accent shadow-lg">
                <CardHeader><CardTitle>Registration</CardTitle><CardDescription>Secure your spot in this cohort.</CardDescription></CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex justify-between items-center text-sm font-medium"><span>Capacity</span><span>{course.participantIds.length} / {course.maxCapacity}</span></div>
                    <div className="w-full bg-secondary h-2 rounded-full overflow-hidden"><div className="bg-primary h-full transition-all duration-500" style={{ width: `${(course.participantIds.length / course.maxCapacity) * 100}%` }}/></div>
                    {userDetails?.trainingStatus !== 'in-training' && userDetails?.role === 'ELSA' && (<div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-3 rounded-md text-sm flex gap-2"><AlertTriangle className="h-5 w-5 shrink-0" /><p>Only ELSAs with &quot;In-Training&quot; status can join courses. Update your profile if this is incorrect.</p></div>)}
                    {isEnrolledElsewhere && (<div className="bg-blue-50 border border-blue-200 text-blue-800 p-3 rounded-md text-sm flex gap-2"><CheckCircle2 className="h-5 w-5 shrink-0" /><p>You are already enrolled in another course.</p></div>)}
                </CardContent>
                <CardFooter>
                    {isEnrolled ? (
                        <Button className="w-full bg-green-600 hover:bg-green-700" disabled><CheckCircle2 className="mr-2 h-4 w-4" /> Enrolled</Button>
                    ) : (
                         <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button className="w-full" disabled={!canJoin || isJoining}>{isJoining ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : isPaid ? <><CreditCard className="mr-2 h-4 w-4"/>Proceed to Payment</> : "Join Course"}</Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>{isPaid ? "Select Enrollment Option" : "Confirm Registration"}</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        {isPaid ? "Choose your preferred training package:" : `Are you sure you want to join <strong>${course.name}</strong>?`}
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                
                                {isPaid && hasSpecialistOption && (
                                    <div className="py-4">
                                        <RadioGroup value={selectedOption} onValueChange={(val: "core" | "full") => setSelectedOption(val)}>
                                            <div className="flex items-center space-x-2 border p-3 rounded-md cursor-pointer hover:bg-accent/10" onClick={() => setSelectedOption("core")}>
                                                <RadioGroupItem value="core" id="core" />
                                                <Label htmlFor="core" className="cursor-pointer flex-1">
                                                    <div className="font-semibold">Core ELSA Training</div>
                                                    <div className="text-sm text-muted-foreground">6 Days - £{course.price?.toFixed(2)}</div>
                                                </Label>
                                            </div>
                                            <div className="flex items-center space-x-2 border p-3 rounded-md cursor-pointer hover:bg-accent/10" onClick={() => setSelectedOption("full")}>
                                                <RadioGroupItem value="full" id="full" />
                                                <Label htmlFor="full" className="cursor-pointer flex-1">
                                                    <div className="font-semibold">Core + Specialist Training</div>
                                                    <div className="text-sm text-muted-foreground">8 Days - £{((course.price || 0) + (course.specialistPrice || 0)).toFixed(2)}</div>
                                                </Label>
                                            </div>
                                        </RadioGroup>
                                    </div>
                                )}
                                
                                {isPaid && !hasSpecialistOption && course.price && (
                                    <div className="py-2 text-sm text-muted-foreground">
                                        You will be redirected to Stripe to complete the payment of <strong>£{course.price.toFixed(2)}</strong>.
                                    </div>
                                )}

                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleJoin} disabled={isJoining}>{isJoining ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : (isPaid ? "Continue to Stripe" : "Confirm & Join")}</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    )}
                </CardFooter>
            </Card>
        </div>
      </div>
    </div>
  );
}
