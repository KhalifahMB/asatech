import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { PasswordInput } from "@/components/ui/Field";
import { resetPassword } from "@/services/authService";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (confirm !== password) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      await resetPassword({ token, password });
      setDone(true);
    } catch (err) {
      setError(err.message || "Unable to reset password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="animate-slide-up text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
          <CheckCircle2 className="h-7 w-7" />
        </span>
        <h1 className="mt-5 text-2xl font-bold tracking-tight text-ink">Password updated</h1>
        <p className="mt-2 text-sm text-muted">You can now sign in with your new password.</p>
        <Button
          onClick={() => navigate("/login")}
          variant="secondary"
          className="mt-6"
        >
          Back to sign in
        </Button>
      </div>
    );
  }

  return (
    <div className="animate-slide-up">
      <h1 className="text-2xl font-bold tracking-tight text-ink">Set a new password</h1>
      <p className="mt-1 text-sm text-muted">Choose a strong password for your account.</p>
      <form onSubmit={handleSubmit} noValidate className="mt-8 flex flex-col gap-5">
        <PasswordInput
          label="New password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={error}
          required
        />
        <PasswordInput
          label="Confirm new password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
        />
        <Button type="submit" loading={loading} className="w-full" size="lg">
          Update password
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted">
        <Link to="/login" className="font-semibold text-brand-500 hover:text-brand-600">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
