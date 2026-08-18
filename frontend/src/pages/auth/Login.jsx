import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { TextField, PasswordInput } from "@/components/ui/Field";
import { useAuth } from "@/state/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || "/account";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const e = {};
    if (!email.trim()) e.email = "Email is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = "Enter a valid email address.";
    if (!password) e.password = "Password is required.";
    return e;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    setFormError("");
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) return;
    setLoading(true);
    try {
      const user = await login({ email, password });
      navigate(user.role === "admin" ? "/admin" : from, { replace: true });
    } catch (err) {
      setFormError(err.message || "Unable to sign in. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-slide-up">
      <h1 className="text-2xl font-bold tracking-tight text-ink">Welcome back</h1>
      <p className="mt-1 text-sm text-muted">Sign in to your ASATECH account.</p>

      <form onSubmit={handleSubmit} noValidate className="mt-8 flex flex-col gap-5">
        {formError && (
          <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-sm text-red-500">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            {formError}
          </div>
        )}
        <TextField
          label="Email address"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
          required
        />
        <PasswordInput
          label="Password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
          required
        />
        <div className="-mt-2 text-right">
          <Link to="/forgot-password" className="text-xs font-medium text-brand-500 hover:text-brand-600">
            Forgot password?
          </Link>
        </div>
        <Button type="submit" loading={loading} className="w-full" size="lg">
          Sign in
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        New to ASATECH?{" "}
        <Link to="/register" className="font-semibold text-brand-500 hover:text-brand-600">
          Create an account
        </Link>
      </p>

      <p className="mt-6 rounded-lg border border-line bg-raised px-3 py-2 text-center text-xs text-faint">
        Demo: sign in with any email. Use an email containing “admin” to open the admin console.
      </p>
    </div>
  );
}
