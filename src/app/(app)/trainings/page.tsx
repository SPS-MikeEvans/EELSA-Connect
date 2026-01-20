
"use client";

import { useEffect, useState, useMemo } from "react";
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
import { Calendar, MapPin, Users, Loader2, MoreVertical, Edit, Trash2, Filter } from "lucide-react";
import { format } from "date-fns";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";


export default function TrainingsPage() {
  const { user, userRole: role, isLoading: userLoading, userDetails } = useUser();
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<string>("all");
  const { toast } = useToast();

  const canManage = role === "Admin" || role === "Trainer";

  const fetchCourses = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      try {
        const q = query(collection(db, "trainingCourses"), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);
        const coursesData = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setCourses(coursesData);
      } catch (err: any) {
        console.error("Error fetching courses:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    if (!userLoading) {
        fetchCourses();
    }
  }, [user, userLoading]);

  const handleDelete = async (courseId: string, courseName: string) => {
    try {
        await deleteDoc(doc(db, "trainingCourses", courseId));
        toast({
            title: "Course Deleted",
            description: `The course "${courseName}" has been successfully deleted.`
        });
        fetchCourses();
    } catch (error) {
        toast({
            title: "Error",
            description: "Failed to delete the course.",
            variant: "destructive"
        });
    }
  };

  const regions = useMemo(() => {
      const r = new Set(courses.map(c => c.region).filter(Boolean));
      return Array.from(r).sort();
  }, [courses]);

  const filteredCourses = useMemo(() => {
      return courses.filter(course => {
          if (selectedRegion === "all") return true;
          return course.region === selectedRegion;
      });
  }, [courses, selectedRegion]);

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
                <h3 className="font-bold mb-2">Error Loading Courses</h3>
                <p>{error}</p>
                <p className="text-sm mt-2">Please check your internet connection or try refreshing the page.</p>
            </div>
        </div>
    );
  }

  return (
    <div className="container py-10 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Training Courses</h1>
          <p className="text-muted-foreground">
            Browse and join upcoming ELSA training cohorts.
          </p>
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
            {regions.length > 0 && (
                <Select value={selectedRegion} onValueChange={setSelectedRegion}>
                    <SelectTrigger className="w-full md:w-[180px]">
                        <div className="flex items-center gap-2">
                            <Filter className="h-4 w-4 text-muted-foreground" />
                            <SelectValue placeholder="Filter Region" />
                        </div>
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Regions</SelectItem>
                        {regions.map(r => (
                            <SelectItem key={r as string} value={r as string}>{r as string}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            )}
            {canManage && (
            <Button asChild>
                <Link href="/admin/trainings">Create Course</Link>
            </Button>
            )}
        </div>
      </div>

      {filteredCourses.length === 0 ? (
        <div className="text-center py-10 border rounded-lg bg-muted/10">
          <p className="text-muted-foreground">No active training courses found.</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredCourses.map((course) => {
             const participantCount = course.participantIds?.length || 0;
             const isFull = participantCount >= course.maxCapacity;
             const isJoined = userDetails?.enrolledCourseId === course.id;
             const startDate = course.dates?.core?.[0] ? new Date(course.dates.core[0].seconds * 1000) : null;

             return (
            <Card key={course.id} className="flex flex-col border-t-4 border-t-primary shadow-sm hover:shadow-md transition-shadow relative">
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
                                        <Link href={`/admin/trainings/${course.id}/edit`}>
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
                                        This action will permanently delete the course "{course.name}". This cannot be undone.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDelete(course.id, course.name)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                )}
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant={isJoined ? "default" : (isFull ? "destructive" : "secondary")}>
                        {isJoined ? "Enrolled" : (isFull ? "Full" : "Open")}
                    </Badge>
                    <Badge variant="outline">{course.region || "General"}</Badge>
                  </div>
                  {isJoined && <Badge variant="outline" className="ml-2 bg-green-50 text-green-700 border-green-200">Your Course</Badge>}
                </div>
                <CardTitle className="mt-2 line-clamp-2 pr-10">{course.name}</CardTitle>
                <CardDescription>Trainer: {course.trainerName}</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 space-y-4">
                <div className="flex items-center text-sm text-muted-foreground">
                  <MapPin className="mr-2 h-4 w-4 shrink-0" />
                  <span className="truncate">{course.venueName}</span>
                </div>
                <div className="flex items-center text-sm text-muted-foreground">
                  <Calendar className="mr-2 h-4 w-4 shrink-0" />
                  {course.datesTbc ? (
                      <span>Dates TBC</span>
                  ) : (
                      <span>Starts {startDate ? format(startDate, "PPP") : "TBA"}</span>
                  )}
                </div>
                <div className="flex items-center text-sm text-muted-foreground">
                   <Users className="mr-2 h-4 w-4 shrink-0" />
                   {participantCount} / {course.maxCapacity} Candidates
                </div>
              </CardContent>
              <CardFooter>
                <Button className="w-full" asChild variant={isJoined ? "outline" : "default"}>
                  <Link href={`/trainings/${course.id}`}>
                    {isJoined ? "View Details" : "View Details & Join"}
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
