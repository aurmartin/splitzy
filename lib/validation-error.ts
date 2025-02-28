export class ValidationError extends Error {
  errors: Record<string, string>;

  constructor(errors: Record<string, string>) {
    super(JSON.stringify(errors));
    this.errors = errors;
  }
}
