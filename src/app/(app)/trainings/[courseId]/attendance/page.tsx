"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { AttendanceTable } from "@/components/groups/attendance-table";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import { RoleGate } from "@/components/auth/role-gate";

export default function TrainingAttendancePage() {
  const { courseId } = useParams();
  const router = useRouter();
  const [course, setCourse] = useState<any>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      if (!courseId) return;
      try {
        const docRef = doc(db, "trainingCourses", courseId as string);
        const snap = await getDoc(docRef);
        
        if (snap.exists()) {
          const data = snap.data();
          setCourse({ id: snap.id, ...data });

          if (data.participantIds && data.participantIds.length > 0) {
            // Fetch participants
            const userPromises = data.participantIds.map((uid: string) => getDoc(doc(db, "users", uid)));
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
        console.error("Error fetching course data:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [courseId]);

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="animate-spin h-8 w-8" /></div>;
  }

  if (!course) return <div>Course not found</div>;

  // Combine all dates from different timestamp arrays
  const coreDates = (course.dates?.core || []).map((d: any) => d.toDate ? d.toDate() : new Date(d));
  const specialistDates = (course.dates?.specialist || []).map((d: any) => d.toDate ? d.toDate() : new Date(d));
  const supervisionDates = (course.dates?.supervision || []).map((d: any) => d.toDate ? d.toDate() : new Date(d));

  const allDates = [...coreDates, ...specialistDates, ...supervisionDates];

  return (
    <RoleGate allowedRoles={['Admin', 'Trainer']}>
      <div className="container max-w-6xl py-10">
        <Button variant="ghost" onClick={() => router.back()} className="mb-4 pl-0">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Course
        </Button>
        
        <AttendanceTable 
            collectionName="trainingCourses"
            docId={courseId as string}
            title={`${course.name} - Attendance`}
            dates={allDates}
            participants={participants}
            initialAttendance={course.attendance || {}}
        />
      </div>
    </RoleGate>
  );
}
