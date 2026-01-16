
"use client";

import { useUser } from "@/providers/user-provider";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, BookOpen, Check, Clock, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function TraineeDashboard() {
    const { userDetails } = useUser();
    const [course, setCourse] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!userDetails || !userDetails.enrolledCourseId) {
            setLoading(false);
            return;
        }
        setLoading(true);
        const unsub = onSnapshot(doc(db, "trainingCourses", userDetails.enrolledCourseId), (doc) => {
            if (doc.exists()) {
                setCourse({ id: doc.id, ...doc.data() });
            }
            setLoading(false);
        });
        return () => unsub();
    }, [userDetails]);
    
    const allDates = course ? [
        ...(course.dates?.core || []),
        ...(course.dates?.specialist || []),
        ...(course.dates?.supervision || [])
    ] : [];
    
    const attendedCount = course ? Object.values(course.attendance || {}).reduce((acc: number, userIds: any) => {
        if (userIds.includes(userDetails?.uid)) {
            return acc + 1;
        }
        return acc;
    }, 0) : 0;
    
    const progress = allDates.length > 0 ? Math.round((attendedCount / allDates.length) * 100) : 0;

    return (
        <main className="flex flex-1 flex-col gap-4 md:gap-8">
            {userDetails?.trainingStatus === 'in-training' && !userDetails.enrolledCourseId && (
                <Alert variant="destructive" className="bg-red-50 border-red-200 text-red-900">
                    <AlertTriangle className="h-4 w-4 !text-red-600" />
                    <AlertTitle className="ml-2 font-bold">Action Required</AlertTitle>
                    <AlertDescription className="ml-2 flex items-center justify-between">
                        <span>You are an ELSA In-Training but have not joined a Training Course yet.</span>
                        <Button asChild size="sm" variant="destructive" className="ml-4">
                            <Link href="/trainings">Browse Courses</Link>
                        </Button>
                    </AlertDescription>
                </Alert>
            )}

            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <CardTitle>My Training Course</CardTitle>
                            {course && (
                                <Button asChild variant="outline" size="sm">
                                    <Link href={`/trainings/${course.id}`}>View Course Details</Link>
                                </Button>
                            )}
                        </div>
                        <CardDescription>{loading ? "Loading course..." : course?.name || "No course joined"}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                             <div className="space-y-2">
                                <Progress value={0} />
                                <p className="text-sm text-muted-foreground">Calculating progress...</p>
                            </div>
                        ) : course ? (
                            <div className="space-y-2">
                                <Progress value={progress} />
                                <p className="text-sm text-muted-foreground">You've completed {attendedCount} of {allDates.length} sessions ({progress}%).</p>
                            </div>
                        ) : (
                            <div className="flex items-center gap-4 text-center flex-col justify-center bg-muted/50 p-6 rounded-md">
                                <BookOpen className="h-10 w-10 text-muted-foreground" />
                                <p className="text-sm text-muted-foreground">You haven't enrolled in a course yet.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
                
                 <Card>
                    <CardHeader>
                        <CardTitle>Next Steps</CardTitle>
                        <CardDescription>What to focus on right now.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-start gap-3">
                           <div className={`mt-1 flex h-5 w-5 items-center justify-center rounded-full ${userDetails?.enrolledCourseId ? 'bg-green-500' : 'bg-muted-foreground'}`}><Check className="h-3 w-3 text-white" /></div>
                            <div>
                                <p className="font-medium">1. Join a Training Course</p>
                                <p className="text-sm text-muted-foreground">Enroll in a cohort to begin your official training.</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                           <div className={`mt-1 flex h-5 w-5 items-center justify-center rounded-full ${progress === 100 ? 'bg-green-500' : 'bg-muted-foreground'}`}><Clock className="h-3 w-3 text-white" /></div>
                            <div>
                                <p className="font-medium">2. Complete Training</p>
                                <p className="text-sm text-muted-foreground">Attend all core, specialist, and supervision sessions.</p>
                            </div>
                        </div>
                         <div className="flex items-start gap-3">
                           <div className="mt-1 flex h-5 w-5 items-center justify-center rounded-full bg-muted-foreground"><Users className="h-3 w-3 text-white" /></div>
                            <div>
                                <p className="font-medium">3. Graduate & Join Supervision</p>
                                <p className="text-sm text-muted-foreground">Once graduated to an ELSA, join a supervision group.</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

        </main>
    );
}
