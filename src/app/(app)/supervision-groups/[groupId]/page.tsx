
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
import { CalendarIcon, MapPin, Users, CheckCircle, MessageSquare } from "lucide-react";
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


export default function SupervisionGroupDetailsPage() {
  const params = useParams();
  const groupId = params.groupId as string;
  const { user, userDetails, userRole } = useUser();
  const [group, setGroup] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    if (!groupId) return;
    const docRef = doc(db, "supervisionGroups", groupId);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
            setGroup(docSnap.data());
        } else {
            setGroup(null);
        }
        setLoading(false);
    });
    return () => unsubscribe();
  }, [groupId]);

  const handleJoin = async () => {
    if (!user) return;
    
    try {
      const groupRef = doc(db, 'supervisionGroups', groupId);
      const userRef = doc(db, 'users', user.uid);

      await updateDoc(groupRef, {
          memberIds: arrayUnion(user.uid)
      });
      
      await updateDoc(userRef, {
          supervisionGroupId: groupId
      });

      toast({ title: "Success!", description: "You have joined the supervision group." });
    } catch (e: any) {
      console.error(e);
      toast({ title: "Join Failed", description: "Could not join group.", variant: "destructive" });
    }
  };

  if (loading) {
      return <div className="container mx-auto p-6"><Skeleton className="h-[400px] w-full" /></div>;
  }

  if (!group) {
      return <div className="container mx-auto p-6">Group not found.</div>;
  }

  const isJoined = group.memberIds?.includes(user?.uid);
  const isFull = (group.memberIds?.length || 0) >= (group.maxCapacity || 8);
  const role = userDetails?.role;
  const userHasGroup = !!userDetails?.supervisionGroupId;
  const canAccessChat = isJoined || userRole === 'Admin' || userRole === 'Trainer';

  return (
    <div className="container mx-auto py-8">
      <Tabs defaultValue="details" className="max-w-4xl mx-auto">
        <TabsList className="grid w-full grid-cols-2 mb-8 h-12">
            <TabsTrigger value="details" className="text-base">Group Details</TabsTrigger>
            <TabsTrigger value="chat" disabled={!canAccessChat} className="text-base flex items-center gap-2">
                <MessageSquare className="h-4 w-4" /> Group Chat {!canAccessChat && "(Members Only)"}
            </TabsTrigger>
        </TabsList>

        <TabsContent value="details">
            <Card>
                <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle className="text-3xl font-headline text-primary mb-2">{group.name}</CardTitle>
                        <CardDescription className="flex items-center gap-2">
                            <MapPin className="h-4 w-4" /> {group.venueName}, {group.region}
                        </CardDescription>
                    </div>
                    <Badge variant={isJoined ? "default" : (isFull ? "destructive" : "secondary")}>
                        {isJoined ? "Joined" : (isFull ? "Full" : "Open")}
                    </Badge>
                </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <Users className="h-5 w-5 text-muted-foreground" />
                                <div>
                                    <p className="font-medium">Supervisor</p>
                                    <p className="text-sm text-muted-foreground">{group.supervisorName}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <CalendarIcon className="h-5 w-5 text-muted-foreground" />
                                <div>
                                    <p className="font-medium">Schedule</p>
                                    <p className="text-sm text-muted-foreground">Starts at {group.startTime}</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-muted/30 p-4 rounded-lg">
                            <h3 className="font-semibold mb-2">Session Dates</h3>
                            <ul className="space-y-2 text-sm">
                                {group.dates?.map((date: any, i: number) => (
                                    <li key={i} className="flex items-center gap-2">
                                        <span className="h-1.5 w-1.5 rounded-full bg-primary/60" />
                                        {format(date.toDate(), "PPP")}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    {/* Capacity Indicator */}
                    <div className="mt-6">
                        <div className="flex justify-between text-sm mb-1">
                            <span>Capacity</span>
                            <span>{group.memberIds?.length || 0} / {group.maxCapacity} ELSAs</span>
                        </div>
                        <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                            <div 
                                className={cn("h-full bg-primary transition-all duration-500", isFull && "bg-destructive")} 
                                style={{ width: `${Math.min(100, ((group.memberIds?.length || 0) / group.maxCapacity) * 100)}%` }}
                            />
                        </div>
                    </div>

                </CardContent>
                <CardFooter className="flex justify-end pt-4 border-t">
                    {isJoined ? (
                        <Button disabled className="w-full md:w-auto">
                            <CheckCircle className="mr-2 h-4 w-4" /> You have joined this group
                        </Button>
                    ) : (
                        <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button 
                                disabled={isFull || (userHasGroup && role !== 'Admin')} // Disable if full or already in another group (unless admin)
                                className="w-full md:w-auto"
                            >
                                {userHasGroup && role !== 'Admin' ? "Already in a Group" : (isFull ? "Group Full" : "Join Group")}
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                            <AlertDialogTitle>Join Supervision Group</AlertDialogTitle>
                            <AlertDialogDescription>
                                Are you sure you want to join <strong>{group.name}</strong>?
                                This will be your assigned supervision cohort.
                            </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleJoin}>Confirm Join</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                        </AlertDialog>
                    )}
                </CardFooter>
            </Card>
        </TabsContent>

        <TabsContent value="chat">
            {canAccessChat && <ChatWindow chatId={groupId} title={`Chat: ${group.name}`} />}
        </TabsContent>
      </Tabs>
    </div>
  );
}
