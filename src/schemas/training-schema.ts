
import * as z from "zod";

export const trainingFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  trainerName: z.string().min(2, "Trainer Name is required"),
  trainerEmail: z.string().email("Invalid email address"),
  venueName: z.string().min(2, "Venue Name is required"),
  venueAddress: z.string().min(5, "Venue Address is required"),
  maxCapacity: z.coerce.number().min(1, "Capacity must be at least 1"),
  startTime: z.string().min(1, "Start Time is required"),
  endTime: z.string().min(1, "End Time is required"),
  coreDates: z.array(z.date()),
  specialistDates: z.array(z.date()),
  supervisionDates: z.array(z.date()),
  price: z.coerce.number().nonnegative("Price must be a positive number").optional(),
  specialistPrice: z.coerce.number().nonnegative("Price must be a positive number").optional(),
  datesTbc: z.boolean().default(false),
}).superRefine((data, ctx) => {
  if (!data.datesTbc) {
    if (data.coreDates.length !== 6) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Select exactly 6 Core dates",
        path: ["coreDates"],
      });
    }
    if (data.specialistDates.length !== 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Select exactly 2 Specialist dates",
        path: ["specialistDates"],
      });
    }
    if (data.supervisionDates.length !== 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Select exactly 2 Supervision dates",
        path: ["supervisionDates"],
      });
    }
  }
});
