import type { Role } from "@prisma/client";

declare global {
  namespace Express {
    interface Request {
      auth?: {
        userId: string;
        employeeId: string;
        email: string;
        role: Role;
      };
    }
  }
}

export {};
