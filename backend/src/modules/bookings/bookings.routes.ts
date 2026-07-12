import { Router } from "express";

import { authenticateToken } from "../../middleware/auth";
import { asyncHandler } from "../../utils/async-handler";
import {
  cancelBookingController,
  createBookingController,
  listBookableResourcesController,
  listBookingsController,
  rescheduleBookingController,
} from "./bookings.controller";

export const bookingsRouter = Router();

bookingsRouter.use(authenticateToken);
bookingsRouter.get("/resources", asyncHandler(listBookableResourcesController));
bookingsRouter.get("/", asyncHandler(listBookingsController));
bookingsRouter.post("/", asyncHandler(createBookingController));
bookingsRouter.patch("/:id/cancel", asyncHandler(cancelBookingController));
bookingsRouter.patch("/:id/reschedule", asyncHandler(rescheduleBookingController));
