class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public errorCode?: string,
  ) {
    super(message);

    this.name = "AppError";
    Error.captureStackTrace?.(this, AppError);
  }
}
export { AppError };
