
import * as z from "zod";

export const supervisionFormSchema = z.object({
  name: z.string().min(3, "Group Name is required"),
  supervisorName: z.string().min(2, "Supervisor Name is required"),
  supervisorEmail: z.string().email("Invalid email address"),
  region: z.string().min(2, "Region is required"),
  venueName: z.string().min(2, "Venue Name is required"),
  venueAddress: z.string().min(5, "Venue Address is required"),
  startTime: z.string().min(1, "Start Time is required"),
  maxCapacity: z.coerce.number().min(1).default(8),
  dates: z.array(z.date()).min(6, "Select exactly 6 Session dates").max(6, "Select exactly 6 Session dates"),
  price: z.coerce.number().nonnegative("Price must be a positive number").optional(),
});
