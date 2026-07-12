import type { Request, Response } from "express";

import { AppError } from "../../utils/app-error";
import {
  bookingIdParamsSchema,
  createBookingSchema,
  listBookingsQuerySchema,
  rescheduleBookingSchema,
} from "./bookings.schema";
import {
  cancelBooking,
  createBooking,
  listBookableResources,
  listBookings,
  rescheduleBooking,
} from "./bookings.service";

function requireAuth(request: Request) {
  if (!request.auth) {
    throw new AppError(401, "AUTHENTICATION_REQUIRED", "Authentication is required");
  }
  return request.auth;
}

export async function listBookingsController(request: Request, response: Response) {
  const auth = requireAuth(request);
  const query = listBookingsQuerySchema.parse(request.query);
  const data = await listBookings(query, { employeeId: auth.employeeId, role: auth.role });
  response.json({ data });
}

export async function listBookableResourcesController(_request: Request, response: Response) {
  response.json({ data: await listBookableResources() });
}

export async function createBookingController(request: Request, response: Response) {
  const auth = requireAuth(request);
  const input = createBookingSchema.parse(request.body);
  const data = await createBooking(input, { employeeId: auth.employeeId, role: auth.role });
  response.status(201).json({ data });
}

export async function cancelBookingController(request: Request, response: Response) {
  const auth = requireAuth(request);
  const { id } = bookingIdParamsSchema.parse(request.params);
  const data = await cancelBooking(id, { employeeId: auth.employeeId, role: auth.role });
  response.json({ data });
}

export async function rescheduleBookingController(request: Request, response: Response) {
  const auth = requireAuth(request);
  const { id } = bookingIdParamsSchema.parse(request.params);
  const input = rescheduleBookingSchema.parse(request.body);
  const data = await rescheduleBooking(id, input, { employeeId: auth.employeeId, role: auth.role });
  response.json({ data });
}
