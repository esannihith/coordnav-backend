import { Request, Response, NextFunction } from "express";
import { AppError } from "@/lib/app-error.js";

const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      status: "error",
      message: err.message,
    });
    return;
  }

  // Handle generic / unexpected internal server errors
  console.error("Unhandled Error Details:", err);
  res.status(500).json({
    status: "error",
    message: "Internal Server Error",
  });
};

export { errorHandler };
