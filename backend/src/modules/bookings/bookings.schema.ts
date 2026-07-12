import { z } from "zod";

const isoDateTime = z
  .string()
  .refine((value) => !Number.isNaN(Date.parse(value)), "Provide a valid ISO date-time");

export const bookingIdParamsSchema = z.object({ id: z.string().uuid() }).strict();

export const createBookingSchema = z
  .object({
    assetId: z.string().uuid(),
    startTime: isoDateTime,
    endTime: isoDateTime,
    purpose: z.string().trim().min(3).max(280),
    employeeId: z.string().uuid().optional(),
  })
  .strict()
  .refine(
    (input) => Date.parse(input.endTime) > Date.parse(input.startTime),
    { message: "End time must be after start time", path: ["endTime"] },
  );

export const rescheduleBookingSchema = z
  .object({
    startTime: isoDateTime,
    endTime: isoDateTime,
    purpose: z.string().trim().min(3).max(280).optional(),
  })
  .strict()
  .refine(
    (input) => Date.parse(input.endTime) > Date.parse(input.startTime),
    { message: "End time must be after start time", path: ["endTime"] },
  );

export const listBookingsQuerySchema = z
  .object({
    assetId: z.string().uuid().optional(),
    employeeId: z.string().uuid().optional(),
    status: z.enum(["UPCOMING", "ONGOING", "COMPLETED", "CANCELLED"]).optional(),
    from: isoDateTime.optional(),
    to: isoDateTime.optional(),
    scope: z.enum(["mine", "all"]).optional(),
  })
  .partial()
  .strict();

export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type RescheduleBookingInput = z.infer<typeof rescheduleBookingSchema>;
export type ListBookingsQuery = z.infer<typeof listBookingsQuerySchema>;
