import { Notice } from "./ui";

/**
 * The outcome of an action that changed the page's shape (so its form is
 * gone), carried in the URL by the redirect: ?done=<key>. Unknown keys show
 * nothing.
 */
export function Flash({ done, messages }: { done: unknown; messages: Record<string, string> }) {
  const message = typeof done === "string" ? messages[done] : undefined;
  if (!message) return null;
  return (
    <div className="mt-6">
      <Notice>
        <span role="status">{message}</span>
      </Notice>
    </div>
  );
}
