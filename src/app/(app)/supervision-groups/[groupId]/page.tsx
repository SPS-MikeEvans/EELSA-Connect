
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc, runTransaction, DocumentData, Timestamp, collection, addDoc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useUser } from "@/providers/user-provider";
import { useToast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, MapPin, CheckCircle2, AlertTriangle, Loader2, ArrowLeft, Clock, User, ClipboardList, CreditCard } from "lucide-react";
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
import { TransferUserDialog } from "@/components/supervision/transfer-user-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface SupervisionGroup {
  name: string;
  supervisorName: string;
  venueName: string;
  venueAddress: string;
  region: string;
  startTime: string;
  maxCapacity: number;
  memberIds: string[];
  dates: Timestamp[];
  price?: number;
  stripePriceId?: string;
}

interface MemberProfile {
    uid: string;
    fullName: string;
    email: string;
}

export default function SupervisionGroupDetailPage() {
  const { groupId } = useParams();
  const router = useRouter();
  const { user, userDetails, userRole } = useUser();
  const { toast } = useToast();
  
  const [group, setGroup] = useState<(SupervisionGroup & { id: string }) | null>(null);
  const [members, setMembers] = useState<MemberProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);

  const fetchMembers = async (memberIds: string[]) => {
      if (!memberIds || memberIds.length === 0) {
          setMembers([]);
          return;
      }
      const promises = memberIds.map(uid => getDoc(doc(db, "users", uid)));
      const snapshots = await Promise.all(promises);
      const profiles = snapshots.map(snap => ({
          uid: snap.id,
          fullName: snap.data()?.fullName || "Unknown User",
          email: snap.data()?.email || ""
      }));
      setMembers(profiles);
  };

  useEffect(() => {
    if (!groupId) return;
    setLoading(true);
    const docRef = doc(db, "supervisionGroups", groupId as string);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data() as SupervisionGroup;
          setGroup({ id: docSnap.id, ...data });
          fetchMembers(data.memberIds || []);
        } else {
            toast({ title: "Not Found", description: "Group not found", variant: "destructive" });
            router.push("/supervision-groups");
        }
        setLoading(false);
    }, (error) => {
        console.error("Error fetching group:", error);
        setLoading(false);
    });

    return () => unsubscribe();
  }, [groupId, router, toast]);

  const handleJoin = async (e: React.MouseEvent) => {
      // Prevent default to stop the dialog from closing immediately if we want to keep the spinner
      e.preventDefault(); 
      
      if (!user || !group) return;
      setIsJoining(true);
      
      try {
        if (group.price && group.price > 0) {
            if (group.stripePriceId) {
               await handlePayment();
               // Note: handlePayment initiates a redirect, so we don't necessarily need to stop loading
               // but we keep isJoining true to prevent double clicks.
            } else {
               toast({ title: "Configuration Error", description: "Payment system not ready for this group. Please contact admin.", variant: "destructive" });
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

  const handlePayment = async () => {
      if (!user || !group || !group.stripePriceId) {
          toast({ title: "Error", description: "Payment information is missing for this group.", variant: "destructive"});
          return;
      }
      toast({ title: "Redirecting to payment...", description: "Please wait while we create your secure checkout session." });

      const checkoutSessionRef = collection(db, "users", user.uid, "checkout_sessions");
      const sessionDocRef = await addDoc(checkoutSessionRef, {
          price: group.stripePriceId,
          success_url: window.location.href + "?payment=success",
          cancel_url: window.location.href + "?payment=cancelled",
          mode: 'payment',
          metadata: {
              userId: user.uid,
              groupId: group.id,
              itemType: 'supervisionGroup',
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
    if (!user || !group) return;

    if (userDetails?.supervisionGroupId) {
        toast({ title: "Already Assigned", description: "You are already in a supervision group.", variant: "destructive" });
        return;
    }

    try {
      await runTransaction(db, async (transaction) => {
        const groupRef = doc(db, "supervisionGroups", group.id);
        const userRef = doc(db, "users", user.uid);
        const groupDoc = await transaction.get(groupRef);
        if (!groupDoc.exists()) throw "Group does not exist!";
        const groupData = groupDoc.data();
        const currentMembers = groupData.memberIds || [];
        if (currentMembers.includes(user.uid)) throw "You are already in this group.";
        transaction.update(groupRef, { memberIds: [...currentMembers, user.uid] });
        transaction.update(userRef, { supervisionGroupId: group.id });
      });

      toast({ title: "Success!", description: "You have joined the supervision group." });

    } catch (e) {
      console.error(e);
      toast({ title: "Join Failed", description: "Could not join group.", variant: "destructive" });
    }
  };

  if (loading) return <div className="container py-10"><Skeleton className="h-[400px] w-full" /></div>;
  if (!group) return null;

  const isMember = userDetails?.supervisionGroupId === group.id;
  const canJoin = !userDetails?.supervisionGroupId && userRole === 'ELSA';
  const isAdminOrTrainer = userRole === 'Admin' || userRole === 'Trainer';
  const memberCount = group.memberIds.length;
  const extraMembers = Math.max(0, memberCount - 8);
  const extraTime = extraMembers * 15;
  const isPaid = group.price && group.price > 0;

  return (
    <div className="container max-w-5xl py-10">
      <div className="flex justify-between items-center mb-4">
        <Button variant="ghost" asChild className="pl-0 hover:bg-transparent hover:text-primary"><Link href="/supervision-groups" className="flex items-center"><ArrowLeft className="mr-2 h-4 w-4"/> Back to Groups</Link></Button>
        {isAdminOrTrainer && (<Button asChild variant="outline" className="gap-2"><Link href={`/supervision-groups/${group.id}/attendance`}><ClipboardList className="h-4 w-4" /> Attendance Tracker</Link></Button>)}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
            <div>
                <h1 className="text-3xl font-bold font-headline mb-2">{group.name}</h1>
                <div className="flex flex-wrap gap-2 items-center">
                    <Badge variant="outline" className="text-base py-1 px-3">{group.region}</Badge>
                    {isMember && <Badge className="bg-green-600 text-base py-1 px-3">Your Group</Badge>}
                    {isPaid && group.price && <Badge variant="secondary" className="text-base py-1 px-3 border-accent text-accent-foreground">£{group.price.toFixed(2)}</Badge>}
                </div>
            </div>
            <Card><CardHeader><CardTitle>Details</CardTitle></CardHeader><CardContent className="grid gap-4"><div className="flex items-center"><User className="mr-2 h-5 w-5 text-primary" /><span className="font-medium mr-2">Supervisor:</span> {group.supervisorName}</div><div className="flex items-center"><Clock className="mr-2 h-5 w-5 text-primary" /><span className="font-medium mr-2">Time:</span>{group.startTime}{extraTime > 0 && (<span className="ml-2 text-amber-600 font-medium text-sm">(+{extraTime} mins extended duration)</span>)}</div><div className="flex items-start"><MapPin className="mr-2 h-5 w-5 text-primary shrink-0" /><div><span className="font-medium">Venue:</span> {group.venueName}<p className="text-sm text-muted-foreground">{group.venueAddress}</p></div></div></CardContent></Card>
            <Card><CardHeader><CardTitle>Session Dates</CardTitle></CardHeader><CardContent><ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">{group.dates.map((ts, i) => (<li key={i} className="flex items-center p-3 border rounded-md"><CalendarIcon className="mr-3 h-5 w-5 text-primary" /><div><div className="font-medium">Session {i + 1}</div><div className="text-sm text-muted-foreground">{format(ts.toDate(), "PPP")}</div></div></li>))}</ul></CardContent></Card>
            {(isMember || isAdminOrTrainer) && (<Card><CardHeader><CardTitle>Group Members ({memberCount})</CardTitle>{extraMembers > 0 && (<CardDescription className="text-amber-600"><AlertTriangle className="inline h-4 w-4 mr-1" />Group exceeds standard size of 8. Session duration extended by {extraTime} minutes.</CardDescription>)}</CardHeader><CardContent><div className="space-y-4">{members.map(member => (<div key={member.uid} className="flex items-center justify-between"><div className="flex items-center space-x-3"><Avatar><AvatarFallback>{member.fullName.charAt(0)}</AvatarFallback></Avatar><div><p className="text-sm font-medium leading-none">{member.fullName}</p><p className="text-xs text-muted-foreground">{member.email}</p></div></div>{isAdminOrTrainer && (<TransferUserDialog userId={member.uid} currentGroupId={group.id} userName={member.fullName} onTransferComplete={() => {setMembers(prev => prev.filter(m => m.uid !== member.uid)); setGroup(prev => prev ? {...prev, memberIds: prev.memberIds.filter(id => id !== member.uid)} : null);}} />)}</div>))}</div></CardContent></Card>)}
        </div>
        <div>
            <Card className="sticky top-6 border-t-4 border-t-accent shadow-lg">
                <CardHeader><CardTitle>Status</CardTitle></CardHeader>
                <CardContent className="space-y-4"><div className="flex justify-between items-center text-sm font-medium"><span>Group Size</span><span>{memberCount} / 8 Target</span></div><div className="w-full bg-secondary h-2 rounded-full overflow-hidden"><div className={`h-full transition-all duration-500 ${memberCount > 8 ? 'bg-amber-500' : 'bg-primary'}`} style={{ width: `${Math.min((memberCount / 8) * 100, 100)}%` }}/></div>{memberCount > 8 && (<div className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-md text-sm flex gap-2"><AlertTriangle className="h-5 w-5 shrink-0" /><p>This group is larger than standard size.</p></div>)}</CardContent>
                <CardFooter>
                    {isMember ? (
                        <Button className="w-full bg-green-600 hover:bg-green-700" disabled><CheckCircle2 className="mr-2 h-4 w-4" /> Member</Button>
                    ) : canJoin ? (
                         <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button className="w-full" disabled={isJoining}>{isJoining ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : isPaid ? <><CreditCard className="mr-2 h-4 w-4"/>Proceed to Payment</> : "Join Group"}</Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>{isPaid ? "Proceed to Payment" : "Join Supervision Group"}</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        {isPaid && group.price ? `You will be redirected to Stripe to complete the payment of £${group.price.toFixed(2)} for ` : "Confirm joining "}
                                        <strong>{group.name}</strong>? 
                                        You can only belong to one supervision group.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleJoin} disabled={isJoining}>{isJoining ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : (isPaid ? "Continue to Stripe" : "Confirm & Join")}</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    ) : (
                        <Button className="w-full" disabled variant="outline">{userDetails?.supervisionGroupId ? "Already in a Group" : "Cannot Join"}</Button>
                    )}
                </CardFooter>
            </Card>
        </div>
      </div>
    </div>
  );
}
