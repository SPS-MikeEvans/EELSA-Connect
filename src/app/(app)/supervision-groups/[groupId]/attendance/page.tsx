"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { AttendanceTable } from "@/components/groups/attendance-table";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import { RoleGate } from "@/components/auth/role-gate";

export default function SupervisionAttendancePage() {
  const { groupId } = useParams();
  const router = useRouter();
  const [group, setGroup] = useState<any>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      if (!groupId) return;
      try {
        const docRef = doc(db, "supervisionGroups", groupId as string);
        const snap = await getDoc(docRef);
        
        if (snap.exists()) {
          const data = snap.data();
          setGroup({ id: snap.id, ...data });

          if (data.memberIds && data.memberIds.length > 0) {
            const userPromises = data.memberIds.map((uid: string) => getDoc(doc(db, "users", uid)));
            const userSnaps = await Promise.all(userPromises);
            const usersData = userSnaps.map(s => {
                const ud = s.data();
                return {
                    uid: s.id,
                    fullName: ud?.fullName || "Unknown User",
                    email: ud?.email || "",
                    photoURL: ud?.photoURL
                };
            });
            setParticipants(usersData);
          }
        }
      } catch (err) {
        console.error("Error fetching group data:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [groupId]);

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="animate-spin h-8 w-8" /></div>;
  }

  if (!group) return <div>Group not found</div>;

  const dates = (group.dates || []).map((d: any) => d.toDate ? d.toDate() : new Date(d));

  return (
    <RoleGate allowedRoles={['Admin', 'Trainer']}>
      <div className="container max-w-6xl py-10">
        <Button variant="ghost" onClick={() => router.back()} className="mb-4 pl-0">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Group
        </Button>
        
        <AttendanceTable 
            collectionName="supervisionGroups"
            docId={groupId as string}
            title={`Supervision Group (${group.supervisorName}) - Attendance`}
            dates={dates}
            participants={participants}
            initialAttendance={group.attendance || {}}
        />
      </div>
    </RoleGate>
  );
}
