import { Bell } from "lucide-react";
import { EmptyState } from "@/components/ui/Feedback";

/**
 * Customer notifications.
 * TODO: connect to a notifications endpoint once the backend exposes one.
 */
export default function Notifications() {
  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">Notifications</h1>
        <p className="mt-1 text-sm text-muted">Order updates and account activity.</p>
      </div>

      <EmptyState
        icon={Bell}
        title="You're all caught up"
        description="Notifications about your orders and account activity will appear here."
      />
    </div>
  );
}
