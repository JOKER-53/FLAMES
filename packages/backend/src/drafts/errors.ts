export class DraftError extends Error {
  constructor(public status: number, message: string, public code = "draft-error") { super(message); }
}
