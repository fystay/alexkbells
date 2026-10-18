/** What a portal Server Action returns to its form. Shared by server and browser code. */
export interface ActionState {
  status: "idle" | "success" | "error";
  message: string;
  /** Field name -> message. */
  errors: Record<string, string>;
}

export const IDLE: ActionState = { status: "idle", message: "", errors: {} };

export function success(message: string): ActionState {
  return { status: "success", message, errors: {} };
}

export function failure(message: string, errors: Record<string, string> = {}): ActionState {
  return { status: "error", message, errors };
}
