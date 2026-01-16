
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { RoleGate } from "@/components/auth/role-gate";
import { trainingFormSchema } from "@/schemas/training-schema";

export default function CreateTrainingPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<z.infer<typeof trainingFormSchema>>({
    resolver: zodResolver(trainingFormSchema),
    defaultValues: {
      name: "",
      trainerName: "",
      trainerEmail: "",
      venueName: "",
      venueAddress: "",
      maxCapacity: 20,
      startTime: "09:00",
      endTime: "15:30",
      coreDates: [],
      specialistDates: [],
      supervisionDates: [],
      price: 0,
      specialistPrice: 0,
      datesTbc: false,
    },
  });

  const datesTbc = form.watch("datesTbc");

  async function onSubmit(values: z.infer<typeof trainingFormSchema>) {
    setSubmitting(true);
    try {
      const { coreDates, specialistDates, supervisionDates, ...restOfValues } = values;
      
      await addDoc(collection(db, "trainingCourses"), {
        ...restOfValues,
        dates: {
          core: values.datesTbc ? [] : coreDates,
          specialist: values.datesTbc ? [] : specialistDates,
          supervision: values.datesTbc ? [] : supervisionDates,
        },
        participantIds: [],
        attendance: {},
        createdAt: serverTimestamp(),
      });

      toast({
        title: "Course Created",
        description: "The training course has been successfully created.",
      });
      router.push("/trainings");
    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create course. Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  const DatePickerField = ({ name, label, count }: { name: any; label: string; count: number }) => (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem className="flex flex-col">
          <FormLabel>{label} ({field.value?.length || 0}/{count})</FormLabel>
          <Popover>
            <PopoverTrigger asChild>
              <FormControl>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-full pl-3 text-left font-normal",
                    !field.value && "text-muted-foreground"
                  )}
                >
                  {field.value?.length > 0 ? (
                    `${field.value.length} dates selected`
                  ) : (
                    <span>Pick dates</span>
                  )}
                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                </Button>
              </FormControl>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="multiple"
                selected={field.value}
                onSelect={field.onChange}
                disabled={(date) => date < new Date("1900-01-01")}
                initialFocus
                max={count}
              />
            </PopoverContent>
          </Popover>
          <FormDescription>
            Select exactly {count} dates.
          </FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  );

  return (
    <RoleGate allowedRoles={['Admin', 'Trainer']}>
      <div className="container max-w-2xl py-10">
        <Card>
          <CardHeader>
            <CardTitle>Create Training Course</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Course Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Autumn 2024 Cohort" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="trainerName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Trainer Name</FormLabel>
                        <FormControl>
                          <Input placeholder="John Doe" {...field} />
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
                          <Input placeholder="john@example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
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

                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="venueName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Venue Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Community Centre" {...field} />
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
                          <Input placeholder="123 Main St..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
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
                    name="price"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Core Price (GBP)</FormLabel>
                        <FormControl>
                            <Input type="number" placeholder="e.g., 450.00" {...field} />
                        </FormControl>
                         <FormDescription>Base price for 6-day training.</FormDescription>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                </div>

                <FormField
                  control={form.control}
                  name="specialistPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Specialist Training Price (Optional)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="e.g., 150.00" {...field} />
                      </FormControl>
                      <FormDescription>Additional cost for the 2 specialist days. Leave 0 if included/free.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-4 pt-4 border-t">
                  <FormField
                    control={form.control}
                    name="datesTbc"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 shadow-sm">
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
                            Check this if the exact dates are not yet decided.
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />

                  {!datesTbc && (
                    <div className="space-y-4">
                      <h3 className="font-semibold">Schedule Dates</h3>
                      <DatePickerField name="coreDates" label="Core Training Days" count={6} />
                      <DatePickerField name="specialistDates" label="Specialist Days" count={2} />
                      <DatePickerField name="supervisionDates" label="Supervision Days" count={2} />
                    </div>
                  )}
                </div>

                <Button type="submit" disabled={submitting} className="w-full">
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Course
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </RoleGate>
  );
}
