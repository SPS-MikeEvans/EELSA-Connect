
"use client";

import { useUser } from "@/providers/user-provider";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where, getCountFromServer } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, Users, GraduationCap, Star, MessageSquare, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Group {
    id: string;
    name: string;
    memberIds?: string[];
    participantIds?: string[];
    type: 'Training' | 'Supervision';
}

interface Chat {
    id: string;
    name: string;
    lastMessageAt?: any;
    type?: string;
    linkedEntityId?: string;
}

export default function TrainerDashboard() {
    const { userDetails } = useUser();
    const [groups, setGroups] = useState<Group[]>([]);
    const [recentChats, setRecentChats] = useState<Chat[]>([]);
    const [feedbackCount, setFeedbackCount] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!userDetails) return;
        setLoading(true);

        const trainingQuery = query(collection(db, "trainingCourses"), where("trainerEmail", "==", userDetails.email));
        const supervisionQuery = query(collection(db, "supervisionGroups"), where("supervisorEmail", "==", userDetails.email));

        const unsubTraining = onSnapshot(trainingQuery, (snapshot) => {
            const trainingGroups = snapshot.docs.map(doc => ({ id: doc.id, type: 'Training', ...doc.data() } as Group));
            setGroups(prev => {
                // Merge and dedupe based on ID
                const current = prev.filter(g => g.type !== 'Training');
                return [...current, ...trainingGroups];
            });
        });
        
        const unsubSupervision = onSnapshot(supervisionQuery, (snapshot) => {
            const supervisionGroups = snapshot.docs.map(doc => ({ id: doc.id, type: 'Supervision', ...doc.data() } as Group));
            setGroups(prev => {
                 // Merge and dedupe based on ID
                 const current = prev.filter(g => g.type !== 'Supervision');
                 return [...current, ...supervisionGroups];
            });
        });

        // Chats Query - Client side sort to avoid index requirements for now
        const uid = auth.currentUser?.uid;
        let unsubChats = () => {};
        if (uid) {
            const chatsQuery = query(collection(db, "chats"), where("memberIds", "array-contains", uid));
            unsubChats = onSnapshot(chatsQuery, (snapshot) => {
                const chats = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Chat));
                // Sort by lastMessageAt descending
                chats.sort((a, b) => {
                    const timeA = a.lastMessageAt?.seconds || 0;
                    const timeB = b.lastMessageAt?.seconds || 0;
                    return timeB - timeA;
                });
                setRecentChats(chats.slice(0, 5)); // Keep top 5
            });
        }
        
        // This is a simplified feedback count. A real implementation might be more complex.
        const feedbackQuery = query(collection(db, "feedbacks"));
        getCountFromServer(feedbackQuery).then(snap => setFeedbackCount(snap.data().count));

        // Let's assume loading is done after a short period
        setTimeout(() => setLoading(false), 1500);

        return () => {
            unsubTraining();
            unsubSupervision();
            unsubChats();
        };
    }, [userDetails]);
    

    return (
        <main className="flex flex-1 flex-col gap-4 md:gap-8">
            <h1 className="text-2xl font-bold">Trainer Dashboard</h1>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                 <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2"><Star className="h-4 w-4 text-amber-500"/> Recent Feedback</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-bold">{feedbackCount}</p>
                        <p className="text-xs text-muted-foreground">Submissions received</p>
                    </CardContent>
                 </Card>
                 <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2"><GraduationCap className="h-4 w-4 text-blue-500"/> Training Courses</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-bold">{groups.filter(g => g.type === 'Training').length}</p>
                        <p className="text-xs text-muted-foreground">Active cohorts</p>
                    </CardContent>
                 </Card>
                  <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2"><Users className="h-4 w-4 text-green-500"/> Supervision Groups</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-bold">{groups.filter(g => g.type === 'Supervision').length}</p>
                        <p className="text-xs text-muted-foreground">Active groups</p>
                    </CardContent>
                 </Card>
                 <Card className="bg-slate-50 border-slate-200">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2"><MessageSquare className="h-4 w-4 text-purple-500"/> Recent Activity</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {recentChats.slice(0, 2).map(chat => (
                                <Link 
                                    key={chat.id} 
                                    href={chat.type === 'training' ? `/trainings/${chat.linkedEntityId || chat.id}` : `/supervision-groups/${chat.linkedEntityId || chat.id}`}
                                    className="block group"
                                >
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="font-medium truncate max-w-[120px] group-hover:underline text-purple-700">{chat.name.split('(')[0]}</span>
                                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                                            {chat.lastMessageAt ? formatDistanceToNow(new Date(chat.lastMessageAt.seconds * 1000), { addSuffix: true }) : 'New'}
                                        </span>
                                    </div>
                                </Link>
                            ))}
                            {recentChats.length === 0 && <p className="text-xs text-muted-foreground">No recent messages.</p>}
                             {recentChats.length > 2 && (
                                <p className="text-[10px] text-muted-foreground mt-1 pt-1 border-t text-right">
                                    + {recentChats.length - 2} more
                                </p>
                            )}
                        </div>
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
