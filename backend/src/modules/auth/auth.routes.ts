import { Router } from "express";

import { authenticateToken } from "../../middleware/auth";
import { asyncHandler } from "../../utils/async-handler";
import { loginController, meController, signupController } from "./auth.controller";

export const authRouter = Router();

authRouter.post("/signup", asyncHandler(signupController));
authRouter.post("/login", asyncHandler(loginController));
authRouter.get("/me", authenticateToken, asyncHandler(meController));
