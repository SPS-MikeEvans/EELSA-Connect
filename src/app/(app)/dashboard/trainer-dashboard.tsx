
"use client";

import { useUser } from "@/providers/user-provider";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where, getCountFromServer } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, Users, GraduationCap, Star } from "lucide-react";

interface Group {
    id: string;
    name: string;
    memberIds?: string[];
    participantIds?: string[];
    type: 'Training' | 'Supervision';
}

export default function TrainerDashboard() {
    const { userDetails } = useUser();
    const [groups, setGroups] = useState<Group[]>([]);
    const [feedbackCount, setFeedbackCount] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!userDetails) return;
        setLoading(true);

        const trainingQuery = query(collection(db, "trainingCourses"), where("trainerEmail", "==", userDetails.email));
        const supervisionQuery = query(collection(db, "supervisionGroups"), where("supervisorEmail", "==", userDetails.email));

        const unsubTraining = onSnapshot(trainingQuery, (snapshot) => {
            const trainingGroups = snapshot.docs.map(doc => ({ id: doc.id, type: 'Training', ...doc.data() } as Group));
            setGroups(prev => [...prev.filter(g => g.type !== 'Training'), ...trainingGroups]);
        });
        
        const unsubSupervision = onSnapshot(supervisionQuery, (snapshot) => {
            const supervisionGroups = snapshot.docs.map(doc => ({ id: doc.id, type: 'Supervision', ...doc.data() } as Group));
            setGroups(prev => [...prev.filter(g => g.type !== 'Supervision'), ...supervisionGroups]);
        });
        
        // This is a simplified feedback count. A real implementation might be more complex.
        const feedbackQuery = query(collection(db, "feedbacks"));
        getCountFromServer(feedbackQuery).then(snap => setFeedbackCount(snap.data().count));

        // Let's assume loading is done after a short period, as merging snapshots can be tricky for a loading state.
        setTimeout(() => setLoading(false), 1500);

        return () => {
            unsubTraining();
            unsubSupervision();
        };
    }, [userDetails]);
    

    return (
        <main className="flex flex-1 flex-col gap-4 md:gap-8">
            <h1 className="text-2xl font-bold">Trainer Dashboard</h1>
            <div className="grid gap-4 md:grid-cols-3">
                 <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Star className="text-amber-500"/> Recent Feedback</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold">{feedbackCount}</p>
                        <p className="text-sm text-muted-foreground">Total feedback submissions received.</p>
                    </CardContent>
                 </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><GraduationCap className="text-blue-500"/> Training Courses</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold">{groups.filter(g => g.type === 'Training').length}</p>
                        <p className="text-sm text-muted-foreground">Active training cohorts.</p>
                    </CardContent>
                 </Card>
                  <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Users className="text-green-500"/> Supervision Groups</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold">{groups.filter(g => g.type === 'Supervision').length}</p>
                        <p className="text-sm text-muted-foreground">Active supervision groups.</p>
                    </CardContent>
                 </Card>
            </div>
            
            <Card>
                <CardHeader>
                    <CardTitle>My Groups</CardTitle>
                    <CardDescription>An overview of the groups you are leading.</CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="space-y-4">
                            <Skeleton className="h-16 w-full" />
                            <Skeleton className="h-16 w-full" />
                        </div>
                    ) : groups.length > 0 ? (
                         <div className="space-y-4">
                            {groups.sort((a,b) => a.name.localeCompare(b.name)).map(group => (
                                <div key={group.id} className="flex items-center justify-between p-4 border rounded-lg">
                                    <div>
                                        <p className="font-semibold">{group.name}</p>
                                        <p className="text-sm text-muted-foreground flex items-center gap-2">
                                            {group.type === 'Training' ? <GraduationCap className="h-4 w-4" /> : <Users className="h-4 w-4" />}
                                            {group.type} Course / {group.participantIds?.length || group.memberIds?.length || 0} Members
                                        </p>
                                    </div>
                                    <Button asChild variant="outline" size="sm">
                                        <Link href={group.type === 'Training' ? `/trainings/${group.id}` : `/supervision-groups/${group.id}`}>
                                            Manage <ArrowRight className="ml-2 h-4 w-4" />
                                        </Link>
                                    </Button>
                                </div>
                            ))}
                         </div>
                    ) : (
                        <p className="text-center text-muted-foreground py-8">You are not assigned to any groups yet.</p>
                    )}
                </CardContent>
            </Card>

        </main>
    );
}
