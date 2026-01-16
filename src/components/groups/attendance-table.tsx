"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import { doc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";

interface Participant {
  uid: string;
  fullName: string;
  email: string;
  photoURL?: string;
}

interface AttendanceTableProps {
  collectionName: "trainingCourses" | "supervisionGroups";
  docId: string;
  dates: Date[]; // All session dates
  participants: Participant[];
  initialAttendance: Record<string, string[]>; // { dateIso: [userIds] }
  title: string;
}

export function AttendanceTable({
  collectionName,
  docId,
  dates,
  participants,
  initialAttendance,
  title,
}: AttendanceTableProps) {
  const [attendance, setAttendance] = useState(initialAttendance || {});
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  // Sort dates chronologically
  const sortedDates = [...dates].sort((a, b) => a.getTime() - b.getTime());

  const handleCheck = async (date: Date, userId: string, isChecked: boolean) => {
    const dateKey = date.toISOString();
    const uniqueId = `${dateKey}-${userId}`;

    // Optimistic UI Update
    setAttendance((prev) => {
      const currentList = prev[dateKey] || [];
      if (isChecked) {
        return { ...prev, [dateKey]: [...currentList, userId] };
      } else {
        return {
            ...prev,
            [dateKey]: currentList.filter((id) => id !== userId),
        };
      }
    });

    setLoadingIds((prev) => new Set(prev).add(uniqueId));

    try {
      const ref = doc(db, collectionName, docId);
      
      const updatePayload = {
        [`attendance.${dateKey}`]: isChecked ? arrayUnion(userId) : arrayRemove(userId)
      };

      await updateDoc(ref, updatePayload);

    } catch (error) {
      console.error("Failed to update attendance", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save attendance. Please try again.",
      });
      // Revert optimistic update
      setAttendance((prev) => {
        const currentList = prev[dateKey] || [];
        if (!isChecked) { // We were trying to check it, so revert to unchecked
           return { ...prev, [dateKey]: [...currentList, userId] }; 
        } else {
             return { ...prev, [dateKey]: currentList.filter(id => id !== userId) };
        }
      });
    } finally {
      setLoadingIds((prev) => {
        const next = new Set(prev);
        next.delete(uniqueId);
        return next;
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
            <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
            <p className="text-muted-foreground">
            Track attendance for {participants.length} participants across {dates.length} sessions.
            </p>
        </div>
      </div>

      <div className="rounded-md border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[250px] min-w-[200px] sticky left-0 bg-card z-10">Participant</TableHead>
              {sortedDates.map((date, i) => (
                <TableHead key={i} className="text-center min-w-[100px]">
                  <div className="flex flex-col items-center">
                    <span className="font-semibold">{format(date, "d MMM")}</span>
                    <span className="text-xs text-muted-foreground font-normal">
                      {format(date, "yyyy")}
                    </span>
                  </div>
                </TableHead>
              ))}
              <TableHead className="text-center min-w-[80px]">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {participants.map((user) => {
                // Calculate total attendance for this user
                let userTotal = 0;
                sortedDates.forEach(d => {
                    if (attendance[d.toISOString()]?.includes(user.uid)) userTotal++;
                });

                return (
              <TableRow key={user.uid}>
                <TableCell className="font-medium sticky left-0 bg-card z-10 border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.photoURL} alt={user.fullName} />
                      <AvatarFallback>{user.fullName.substring(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="whitespace-nowrap">{user.fullName}</span>
                      <span className="text-xs text-muted-foreground truncate max-w-[150px]">{user.email}</span>
                    </div>
                  </div>
                </TableCell>
                {sortedDates.map((date) => {
                    const dateKey = date.toISOString();
                    const isPresent = attendance[dateKey]?.includes(user.uid);
                    const isLoading = loadingIds.has(`${dateKey}-${user.uid}`);

                  return (
                    <TableCell key={dateKey} className="text-center p-0">
                      <div className="flex justify-center items-center h-16 w-full">
                          {isLoading ? (
                              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                          ) : (
                              <Checkbox 
                                checked={isPresent}
                                onCheckedChange={(checked) => handleCheck(date, user.uid, checked as boolean)}
                              />
                          )}
                      </div>
                    </TableCell>
                  );
                })}
                <TableCell className="text-center font-bold">
                    <span className={userTotal === sortedDates.length ? "text-green-600" : ""}>
                        {userTotal} / {sortedDates.length}
                    </span>
                </TableCell>
              </TableRow>
            )})}
            {participants.length === 0 && (
                <TableRow>
                    <TableCell colSpan={sortedDates.length + 2} className="text-center py-8 text-muted-foreground">
                        No participants found in this group.
                    </TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
