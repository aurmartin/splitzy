export class DisplayableError extends Error {
  title: string;
  message: string;

  constructor(title: string, message: string) {
    super(`${title}: ${message}`);
    this.title = title;
    this.message = message;
  }
}
