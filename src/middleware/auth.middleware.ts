import type { Request, Response, NextFunction } from "express";
import { AppError } from "../lib/app-error.js";
import { verifyAccessToken } from "../lib/token.js";

const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError(401, 'Unauthorized'));
  }
  
  const token = authHeader.split(' ')[1];
  if (!token) {
    return next(new AppError(401, 'Invalid token format'));
  }

  const { userId } = verifyAccessToken(token);  // throws AppError(401) on bad token
  req.userId = userId;
  next();
};

export { requireAuth };