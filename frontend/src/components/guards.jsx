import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/state/AuthContext";
import { PageLoader } from "@/components/ui/Feedback";

/**
 * Frontend-only route guards. These provide UX/navigation gating only; real
 * authorization is enforced by the backend. There is no hard security
 * boundary in the browser.
 */

export function RequireAuth({ children }) {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }
  return children;
}

export function RequireAdmin({ children }) {
  const { isAuthenticated, isAdmin } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }
  if (!isAdmin) {
    return <Navigate to="/account" replace />;
  }
  return children;
}

export function AuthLoadingGate({ children }) {
  // Auth state is read synchronously from localStorage on startup, so there is
  // no async "loading" phase today. Kept as a hook point for a real JWT decode.
  return children;
}

export { PageLoader };
