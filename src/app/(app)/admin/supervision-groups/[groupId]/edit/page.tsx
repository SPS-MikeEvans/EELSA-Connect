
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { CalendarIcon, Loader2, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supervisionFormSchema } from "@/schemas/supervision-schema";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { RegionAutocomplete } from "@/components/common/region-autocomplete";


export default function EditSupervisionGroupPage() {
  const router = useRouter();
  const { groupId } = useParams();
  const { user } = useUser();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  const form = useForm<z.infer<typeof supervisionFormSchema>>({
    resolver: zodResolver(supervisionFormSchema),
    defaultValues: {
      name: "",
      supervisorName: "",
      supervisorEmail: "",
      region: "",
      venueName: "",
      venueAddress: "",
      startTime: "",
      maxCapacity: 8,
      dates: [],
    },
  });

  useEffect(() => {
    async function fetchGroup() {
      if (!groupId || typeof groupId !== 'string') return;
      try {
        const docRef = doc(db, "supervisionGroups", groupId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          const dates = data.dates ? data.dates.map((d: any) => d.toDate()) : [];
          
          form.reset({
            name: data.name,
            supervisorName: data.supervisorName,
            supervisorEmail: data.supervisorEmail,
            region: data.region || "",
            venueName: data.venueName,
            venueAddress: data.venueAddress,
            startTime: data.startTime,
            maxCapacity: data.maxCapacity,
            dates: dates,
          });
        }
      } catch (error) {
        console.error("Failed to fetch group", error);
        toast({ title: "Error", description: "Could not load group details.", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    }
    fetchGroup();
  }, [groupId, form, toast]);

  async function onSubmit(values: z.infer<typeof supervisionFormSchema>) {
    if (!groupId || typeof groupId !== 'string') return;
    setIsSubmitting(true);
    try {
      const groupRef = doc(db, "supervisionGroups", groupId);
      
      const region = values.region.trim().replace(/\b\w/g, l => l.toUpperCase());

      // Ensure dates are sorted chronologically
      const sortedDates = [...values.dates].sort((a, b) => a.getTime() - b.getTime());

      await updateDoc(groupRef, {
        ...values,
        region,
        dates: sortedDates,
        updatedAt: serverTimestamp(),
      });

      toast({
        title: "Group Updated",
        description: "The supervision group has been successfully updated.",
      });
      router.push("/supervision-groups");
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "Failed to update supervision group.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!groupId || typeof groupId !== 'string') return;
    try {
        await updateDoc(doc(db, "supervisionGroups", groupId), { status: 'archived' });
        toast({ title: "Group Archived", description: "The group has been archived." });
        router.push("/supervision-groups");
    } catch (e) {
        toast({ title: "Error", description: "Failed to delete group.", variant: "destructive" });
    }
  }

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="container mx-auto py-8 max-w-2xl">
      <div className="flex justify-between items-center mb-8">
        <div>
            <h1 className="text-3xl font-bold font-headline text-primary">Edit Supervision Group</h1>
            <p className="text-muted-foreground">Update details for this cohort.</p>
        </div>
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button variant="destructive" size="icon"><Trash2 className="h-4 w-4"/></Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Archive this group?</AlertDialogTitle>
                    <AlertDialogDescription>This will hide the group from new users. Existing data will be preserved.</AlertDialogDescription>
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
                <FormLabel>Group Name</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Southampton North Group 1" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <FormField
              control={form.control}
              name="supervisorName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Supervisor Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Supervisor Name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="supervisorEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Supervisor Email</FormLabel>
                  <FormControl>
                    <Input placeholder="supervisor@example.com" {...field} />
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="maxCapacity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Max Capacity</FormLabel>
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
          </div>

           <FormField
            control={form.control}
            name="dates"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Session Dates (Select 6)</FormLabel>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[0, 1, 2, 3, 4, 5].map((index) => (
                        <div key={index} className="space-y-1">
                            <span className="text-xs font-medium text-muted-foreground">Session {index + 1}</span>
                            <Popover>
                                <PopoverTrigger asChild>
                                <FormControl>
                                    <Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value?.[index] && "text-muted-foreground")}>
                                    {field.value?.[index] ? format(field.value[index], "PPP") : <span>Pick date</span>}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                    </Button>
                                </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    mode="single"
                                    selected={field.value?.[index]}
                                    onSelect={(date) => {
                                        const newDates = [...(field.value || [])];
                                        if (date) {
                                            newDates[index] = date;
                                            field.onChange(newDates);
                                        }
                                    }}
                                    disabled={(date) => date < new Date("1900-01-01") }
                                    initialFocus
                                />
                                </PopoverContent>
                            </Popover>
                        </div>
                    ))}
                </div>
                <FormMessage />
                </FormItem>
            )}
            />

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
