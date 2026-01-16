
"use client";

import { useUser } from "@/providers/user-provider";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, BookMarked, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where, orderBy, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

interface JournalEntry {
    id: string;
    title: string;
    createdAt: any;
}

export default function ELSADashboard() {
    const { userDetails } = useUser();
    const [recentEntries, setRecentEntries] = useState<JournalEntry[]>([]);
    const [loading, setLoading] = useState(true);

     useEffect(() => {
        if (!userDetails) return;
        setLoading(true);
        const q = query(
            collection(db, `users/${userDetails.uid}/journal`), 
            orderBy("createdAt", "desc"),
            limit(3)
        );
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setRecentEntries(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as JournalEntry)));
            setLoading(false);
        }, () => setLoading(false));
        return () => unsubscribe();
    }, [userDetails]);


    return (
        <main className="flex flex-1 flex-col gap-4 md:gap-8">
            {userDetails?.certificationStatus === 'pending' && (
                <Alert className="bg-blue-50 border-blue-200 text-blue-900">
                    <AlertTriangle className="h-4 w-4 !text-blue-600" />
                    <AlertTitle className="ml-2 font-bold">Certification Pending</AlertTitle>
                    <AlertDescription className="ml-2">
                        Your ELSA certificate is awaiting review by an administrator.
                    </AlertDescription>
                </Alert>
            )}

            {userDetails?.trainingStatus === 'trained' && !userDetails.supervisionGroupId && (
                <Alert className="bg-amber-50 border-amber-200 text-amber-900">
                    <AlertTriangle className="h-4 w-4 !text-amber-600" />
                    <AlertTitle className="ml-2 font-bold">Action Required</AlertTitle>
                    <AlertDescription className="ml-2 flex items-center justify-between">
                        <span>You are a Qualified ELSA but have not joined a Supervision Group. Supervision is required to maintain your status.</span>
                        <Button asChild size="sm" className="ml-4 bg-amber-900/10 text-amber-900 hover:bg-amber-900/20 border-amber-900/20 border">
                            <Link href="/supervision-groups">Join a Group</Link>
                        </Button>
                    </AlertDescription>
                </Alert>
            )}

            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <CardTitle>My Supervision Group</CardTitle>
                             <Button asChild variant="outline" size="sm">
                                <Link href={userDetails?.supervisionGroupId ? `/supervision-groups/${userDetails.supervisionGroupId}` : '/supervision-groups'}>
                                    {userDetails?.supervisionGroupId ? 'View Group' : 'Find a Group'}
                                </Link>
                            </Button>
                        </div>
                        <CardDescription>Your hub for peer supervision and support.</CardDescription>
                    </CardHeader>
                    <CardContent>
                       {userDetails?.supervisionGroupId ? (
                           <p>You are a member of a supervision group. Click above to view details.</p>
                       ) : (
                           <div className="flex items-center gap-4 text-center flex-col justify-center bg-muted/50 p-6 rounded-md">
                                <Users className="h-10 w-10 text-muted-foreground" />
                                <p className="text-sm text-muted-foreground">You haven't joined a supervision group yet.</p>
                           </div>
                       )}
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <CardTitle>My Journal</CardTitle>
                            <Button asChild variant="default" size="sm">
                                <Link href="/journal">
                                    View All
                                </Link>
                            </Button>
                        </div>
                        <CardDescription>Your recent private reflections.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                       {loading ? (
                           Array.from({length: 3}).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)
                       ) : recentEntries.length > 0 ? (
                           recentEntries.map(entry => (
                               <Link href="/journal" key={entry.id} className="block p-2 rounded-md hover:bg-muted">
                                   <p className="font-medium truncate">{entry.title}</p>
                                   <p className="text-xs text-muted-foreground">{format(entry.createdAt.toDate(), "PPP")}</p>
                               </Link>
                           ))
                       ) : (
                            <div className="flex items-center gap-4 text-center flex-col justify-center bg-muted/50 p-6 rounded-md">
                               <BookMarked className="h-10 w-10 text-muted-foreground" />
                               <p className="text-sm text-muted-foreground">No journal entries yet.</p>
                               <Button asChild size="sm"><Link href="/journal">Make your first entry</Link></Button>
                           </div>
                       )}
                    </CardContent>
                </Card>
            </div>
        </main>
    );
}
