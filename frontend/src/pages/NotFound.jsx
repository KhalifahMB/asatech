import { Link } from "react-router-dom";
import { NotFoundIllustration } from "@/components/ui/Feedback";

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
      <NotFoundIllustration />
      <p className="mt-6 text-5xl font-extrabold tracking-tight text-ink">404</p>
      <h1 className="mt-2 text-xl font-semibold text-ink">Page not found</h1>
      <p className="mt-2 max-w-sm text-sm text-muted">
        The page you’re looking for doesn’t exist or may have been moved.
      </p>
      <Link
        to="/"
        className="mt-6 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
      >
        Back to home
      </Link>
    </div>
  );
}
