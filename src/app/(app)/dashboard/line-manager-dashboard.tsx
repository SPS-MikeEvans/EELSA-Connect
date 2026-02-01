
"use client";

import { useEffect, useState } from "react";
import { useUser } from "@/providers/user-provider";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, UserPlus, Users } from "lucide-react";
import { InviteStaffDialog } from "@/components/manager/invite-staff-dialog";
import { UserDetails } from "@/providers/user-provider";

export default function LineManagerDashboard() {
    const { userDetails } = useUser();
    const [staff, setStaff] = useState<UserDetails[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!userDetails?.uid) return;

        setLoading(true);
        const staffQuery = query(collection(db, "users"), where("linkedLineManagerId", "==", userDetails.uid));

        const unsubscribe = onSnapshot(staffQuery, (snapshot) => {
            const staffData = snapshot.docs.map(doc => doc.data() as UserDetails);
            setStaff(staffData);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching staff:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [userDetails?.uid]);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Manager Dashboard</h1>
                    <p className="text-muted-foreground">Oversee your team and their training progress.</p>
                </div>
                <InviteStaffDialog>
                    <Button>
                        <UserPlus className="mr-2 h-4 w-4" />
                        Invite Staff
                    </Button>
                </InviteStaffDialog>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>My Team</CardTitle>
                    <CardDescription>Staff members linked to you as their line manager.</CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center p-8">
                            <Loader2 className="h-8 w-8 animate-spin" />
                        </div>
                    ) : staff.length === 0 ? (
                        <div className="text-center py-10 border rounded-lg bg-muted/10">
                             <Users className="mx-auto h-10 w-10 text-muted-foreground/50 mb-4" />
                            <p className="text-muted-foreground">You haven't invited any staff members yet.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {staff.map(member => (
                                <div key={member.uid} className="flex items-center justify-between p-3 border rounded-md">
                                    <div className="flex items-center gap-4">
                                        <Avatar>
                                            <AvatarImage src={member.photoURL} />
                                            <AvatarFallback>{member.fullName.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p className="font-semibold">{member.fullName}</p>
                                            <p className="text-sm text-muted-foreground">{member.email}</p>
                                        </div>
                                    </div>
                                    {/* Placeholder for future actions */}
                                    <Button variant="ghost" size="sm">View Progress</Button>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
