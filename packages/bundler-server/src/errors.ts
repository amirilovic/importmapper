export class ApplicationError extends Error {}

export class NotFoundError extends ApplicationError {
  details: unknown;
  constructor(message: string, details?: unknown) {
    super(message);

    this.name = "NotFoundError";
    this.details = details;
  }
}

export class BadRequestError extends ApplicationError {
  details: unknown;
  constructor(message: string, details?: unknown) {
    super(message);

    this.name = "BadRequestError";
    this.details = details;
  }
}
