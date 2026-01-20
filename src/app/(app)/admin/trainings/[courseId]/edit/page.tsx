
"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { useUser } from "@/providers/user-provider";
import { useParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { CalendarIcon, Loader2, Trash2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { trainingFormSchema } from "@/schemas/training-schema";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { RegionAutocomplete } from "@/components/common/region-autocomplete";

export default function EditTrainingPage() {
  const router = useRouter();
  const { courseId } = useParams();
  const { user } = useUser();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  const form = useForm<z.infer<typeof trainingFormSchema>>({
    resolver: zodResolver(trainingFormSchema),
    defaultValues: {
      name: "",
      trainerName: "",
      trainerEmail: "",
      venueName: "",
      venueAddress: "",
      region: "",
      maxCapacity: 20,
      startTime: "",
      endTime: "",
      coreDates: [],
      specialistDates: [],
      supervisionDates: [],
      datesTbc: false,
    },
  });

  const datesTbc = form.watch("datesTbc");

  useEffect(() => {
    async function fetchCourse() {
      if (!courseId || typeof courseId !== 'string') return;
      try {
        const docRef = doc(db, "trainingCourses", courseId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          form.reset({
            name: data.name,
            trainerName: data.trainerName,
            trainerEmail: data.trainerEmail,
            region: data.region || "",
            venueName: data.venueName,
            venueAddress: data.venueAddress,
            maxCapacity: data.maxCapacity,
            startTime: data.startTime,
            endTime: data.endTime,
            coreDates: data.coreDates?.map((d: any) => d.toDate()) || [],
            specialistDates: data.specialistDates?.map((d: any) => d.toDate()) || [],
            supervisionDates: data.supervisionDates?.map((d: any) => d.toDate()) || [],
            datesTbc: data.datesTbc || false,
          });
        }
      } catch (error) {
        console.error("Failed to fetch course", error);
        toast({ title: "Error", description: "Could not load course details.", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    }
    fetchCourse();
  }, [courseId, form, toast]);

  async function onSubmit(values: z.infer<typeof trainingFormSchema>) {
    if (!courseId || typeof courseId !== 'string') return;
    setIsSubmitting(true);
    try {
      const courseRef = doc(db, "trainingCourses", courseId);
      
      const region = values.region.trim().replace(/\b\w/g, l => l.toUpperCase());

      await updateDoc(courseRef, {
        ...values,
        region,
        updatedAt: serverTimestamp(),
      });

      toast({
        title: "Course Updated",
        description: "The training course has been successfully updated.",
      });
      router.push("/admin/trainings");
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "Failed to update training course.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }
  
  async function handleDelete() {
    if (!courseId || typeof courseId !== 'string') return;
    try {
        await updateDoc(doc(db, "trainingCourses", courseId), { status: 'archived' });
        toast({ title: "Course Archived", description: "The course has been archived." });
        router.push("/admin/trainings");
    } catch (e) {
        toast({ title: "Error", description: "Failed to archive course.", variant: "destructive" });
    }
  }

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="container mx-auto py-8 max-w-2xl">
      <div className="flex justify-between items-center mb-8">
        <div>
            <h1 className="text-3xl font-bold font-headline text-primary">Edit Training Course</h1>
            <p className="text-muted-foreground">Update details for this cohort.</p>
        </div>
         <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button variant="destructive" size="icon"><Trash2 className="h-4 w-4"/></Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Archive this course?</AlertDialogTitle>
                    <AlertDialogDescription>This will hide the course from new users. Existing data will be preserved.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete}>Archive</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Course Name</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Autumn 2024 Cohort" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="trainerName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Lead Trainer</FormLabel>
                  <FormControl>
                    <Input placeholder="Trainer Name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="trainerEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Trainer Email</FormLabel>
                  <FormControl>
                    <Input placeholder="trainer@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          <FormField
              control={form.control}
              name="region"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Region / Area</FormLabel>
                  <RegionAutocomplete 
                    value={field.value} 
                    onChange={field.onChange} 
                    placeholder="Select region (e.g. Stafford)" 
                  />
                  <FormMessage />
                </FormItem>
              )}
            />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="venueName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Venue Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., The Community Centre" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="venueAddress"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Venue Address</FormLabel>
                  <FormControl>
                    <Input placeholder="123 Main St, Town" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="maxCapacity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Capacity</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="startTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Start Time</FormLabel>
                  <FormControl>
                    <Input type="time" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="endTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>End Time</FormLabel>
                  <FormControl>
                    <Input type="time" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="datesTbc"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>
                    Dates To Be Confirmed
                  </FormLabel>
                  <FormDescription>
                    Check this if the exact dates are not yet finalized.
                  </FormDescription>
                </div>
              </FormItem>
            )}
          />

          {!datesTbc && (
             <div className="space-y-4 border rounded-md p-4 bg-muted/20">
                <h3 className="font-semibold">Course Schedule</h3>
                <p className="text-sm text-muted-foreground mb-4">Please select the dates for each module.</p>
                
                <FormField
                control={form.control}
                name="coreDates"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Core Training Days (Select 6)</FormLabel>
                    <Popover>
                        <PopoverTrigger asChild>
                        <FormControl>
                            <Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                            {field.value?.length > 0 ? `${field.value.length} dates selected` : <span>Pick dates</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                        </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                            mode="multiple"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => date < new Date() }
                            initialFocus
                        />
                        </PopoverContent>
                    </Popover>
                    <div className="flex flex-wrap gap-2 mt-2">
                        {field.value?.sort((a,b) => a.getTime() - b.getTime()).map((date, index) => (
                            <div key={index} className="bg-secondary text-secondary-foreground px-2 py-1 rounded-md text-xs">
                                {format(date, "PPP")}
                            </div>
                        ))}
                    </div>
                    <FormMessage />
                    </FormItem>
                )}
                />
                 <FormField
                control={form.control}
                name="specialistDates"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Specialist Days (Select 2)</FormLabel>
                    <Popover>
                        <PopoverTrigger asChild>
                        <FormControl>
                            <Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                            {field.value?.length > 0 ? `${field.value.length} dates selected` : <span>Pick dates</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                        </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                            mode="multiple"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => date < new Date() }
                            initialFocus
                        />
                        </PopoverContent>
                    </Popover>
                     <div className="flex flex-wrap gap-2 mt-2">
                        {field.value?.sort((a,b) => a.getTime() - b.getTime()).map((date, index) => (
                            <div key={index} className="bg-secondary text-secondary-foreground px-2 py-1 rounded-md text-xs">
                                {format(date, "PPP")}
                            </div>
                        ))}
                    </div>
                    <FormMessage />
                    </FormItem>
                )}
                />
                 <FormField
                control={form.control}
                name="supervisionDates"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Supervision Days (Select 2)</FormLabel>
                    <Popover>
                        <PopoverTrigger asChild>
                        <FormControl>
                            <Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                            {field.value?.length > 0 ? `${field.value.length} dates selected` : <span>Pick dates</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                        </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                            mode="multiple"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => date < new Date() }
                            initialFocus
                        />
                        </PopoverContent>
                    </Popover>
                     <div className="flex flex-wrap gap-2 mt-2">
                        {field.value?.sort((a,b) => a.getTime() - b.getTime()).map((date, index) => (
                            <div key={index} className="bg-secondary text-secondary-foreground px-2 py-1 rounded-md text-xs">
                                {format(date, "PPP")}
                            </div>
                        ))}
                    </div>
                    <FormMessage />
                    </FormItem>
                )}
                />
             </div>
          )}

          <div className="flex justify-end space-x-4">
            <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
