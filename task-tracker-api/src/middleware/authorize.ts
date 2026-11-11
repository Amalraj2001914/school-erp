import { NextFunction, Request, Response } from "express";
import { AppError } from "../errors/app-error";
import { hasPermission, Permission } from "../config/permissions";

// A "middleware factory": call it with a permission, it returns the middleware
export function requirePermission(permission: Permission) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new AppError(401, "Authentication required");
    }
    if (!hasPermission(req.user.role, permission)) {
      throw new AppError(403, "You do not have permission to perform this action");
    }
    next();
  };
}