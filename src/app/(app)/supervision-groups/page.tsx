
"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, query, orderBy, deleteDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { useUser } from "@/providers/user-provider";
import { Calendar, MapPin, Users, Loader2, UserCircle, Plus, MoreVertical, Edit, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

export default function SupervisionGroupsPage() {
  const { user, userRole: role, isLoading: userLoading, userDetails } = useUser();
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const canManage = role === "Admin" || role === "Trainer";

  const fetchGroups = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      try {
        const q = query(collection(db, "supervisionGroups"), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);
        const groupsData = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setGroups(groupsData);
      } catch (err: any) {
        console.error("Error fetching supervision groups:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    if (!userLoading) {
        fetchGroups();
    }
  }, [user, userLoading]);

  const handleDelete = async (groupId: string, groupName: string) => {
      try {
          await deleteDoc(doc(db, "supervisionGroups", groupId));
          toast({
              title: "Group Deleted",
              description: `The group "${groupName}" has been successfully deleted.`
          });
          // Refresh the list
          fetchGroups();
      } catch (error) {
          toast({
              title: "Error",
              description: "Failed to delete the group.",
              variant: "destructive"
          });
      }
  }

  if (userLoading || loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
     return (
        <div className="container py-10">
            <div className="p-8 border border-red-200 bg-red-50 text-red-700 rounded-md">
                <h3 className="font-bold mb-2">Error Loading Groups</h3>
                <p>{error}</p>
                <p className="text-sm mt-2">Please check your internet connection or try refreshing the page.</p>
            </div>
        </div>
    );
  }

  return (
    <div className="container py-10 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Supervision Groups</h1>
          <p className="text-muted-foreground">
            Find and join a supervision group in your region.
          </p>
        </div>
        {canManage && (
          <Button asChild>
            <Link href="/admin/supervision-groups/create">
                 <Plus className="mr-2 h-4 w-4" /> Create Group
            </Link>
          </Button>
        )}
      </div>

      {groups.length === 0 ? (
        <div className="text-center py-10 border rounded-lg bg-muted/10">
          <p className="text-muted-foreground">No supervision groups found.</p>
          {canManage && (
             <Button variant="link" asChild className="mt-2">
                <Link href="/admin/supervision-groups/create">Create the first one</Link>
             </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {groups.map((group) => {
             const memberCount = group.memberIds?.length || 0;
             const isOverCapacity = memberCount > 8; // Target is 8
             const isJoined = userDetails?.supervisionGroupId === group.id;
             const userHasGroup = !!userDetails?.supervisionGroupId;
             const firstDate = group.dates && group.dates[0] ? (group.dates[0].seconds ? new Date(group.dates[0].seconds * 1000) : null) : null;


             return (
            <Card key={group.id} className={`flex flex-col border-t-4 shadow-sm hover:shadow-md transition-shadow relative ${isJoined ? 'border-t-green-600 ring-1 ring-green-600' : 'border-t-purple-500'}`}>
              
               {canManage && (
                    <div className="absolute top-2 right-2">
                        <AlertDialog>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                        <MoreVertical className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem asChild>
                                        <Link href={`/admin/supervision-groups/${group.id}/edit`}>
                                            <Edit className="mr-2 h-4 w-4" /> Edit
                                        </Link>
                                    </DropdownMenuItem>
                                     <AlertDialogTrigger asChild>
                                        <DropdownMenuItem className="text-destructive">
                                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                                        </DropdownMenuItem>
                                    </AlertDialogTrigger>
                                </DropdownMenuContent>
                            </DropdownMenu>
                             <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        This action will permanently delete the group "{group.name}". This cannot be undone.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDelete(group.id, group.name)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                )}

              <CardHeader>
                <div className="flex justify-between items-start">
                   <div className="flex gap-2 flex-wrap">
                      <Badge variant={isJoined ? "default" : "secondary"}>
                        {isJoined ? "Your Group" : (group.region || "General")}
                      </Badge>
                      {isOverCapacity && <Badge variant="destructive">Over Capacity</Badge>}
                   </div>
                </div>
                <CardTitle className="mt-2 line-clamp-1 pr-10">{group.name}</CardTitle>
                <CardDescription className="flex items-center gap-1"><UserCircle className="h-3 w-3"/> {group.supervisorName}</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 space-y-4">
                <div className="flex items-center text-sm text-muted-foreground">
                  <MapPin className="mr-2 h-4 w-4 shrink-0" />
                  <span className="truncate">{group.venueName}</span>
                </div>
                <div className="flex items-center text-sm text-muted-foreground">
                  <Calendar className="mr-2 h-4 w-4 shrink-0" />
                  Starts: {firstDate ? format(firstDate, "PPP") : "TBA"}
                </div>
                 <div className="flex items-center text-sm text-muted-foreground">
                   <Users className="mr-2 h-4 w-4 shrink-0" />
                   {memberCount} / 8 Target
                </div>
              </CardContent>
              <CardFooter>
                <Button 
                    className="w-full" 
                    variant={isJoined ? "outline" : "default"}
                    disabled={!isJoined && userHasGroup && role !== 'Admin'} // Disable join if already in another group (unless admin managing)
                    asChild
                >
                  <Link href={`/supervision-groups/${group.id}`}>
                    {isJoined ? "View Group" : (userHasGroup && role !== 'Admin' ? "Already Assigned" : "View Details & Join")}
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          )})}
        </div>
      )}
    </div>
  );
}
