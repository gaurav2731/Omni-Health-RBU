import { useEffect } from 'react';

// Transient status message; announced politely to screen readers.
// Keyed by the parent (toast.id) so a new message restarts the timer.
export default function Toast({ message, tone = 'success', onDone, duration = 2600 }) {
  useEffect(() => {
    if (!message) return undefined;
    const timer = setTimeout(onDone, duration);
    return () => clearTimeout(timer);
  }, [message, duration, onDone]);

  if (!message) return null;

  return (
    <div role="status" aria-live="polite" className={`toast toast-${tone}`}>
      {message}
    </div>
  );
}
