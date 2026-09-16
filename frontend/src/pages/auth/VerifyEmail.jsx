import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle2, AlertTriangle, MailCheck, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import { verifyEmail, resendVerification } from "@/services/authService";

export default function VerifyEmail() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialEmail = searchParams.get("email") || "";

  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [deliveryFailed, setDeliveryFailed] = useState(
    searchParams.get("emailStatus") === "failed"
  );

  // Countdown timer for the resend button
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const id = setTimeout(() => setResendCooldown((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [resendCooldown]);

  const handleVerify = async (ev) => {
    ev.preventDefault();
    setError("");
    if (!email.trim() || otp.trim().length < 4) {
      setError("Enter your email and the 6-digit code.");
      return;
    }
    setLoading(true);
    try {
      await verifyEmail({ email, otp });
      setDone(true);
    } catch (err) {
      if (err.code === "OTP_EXPIRED") {
        setError("Code expired. Tap 'Resend code' to get a new one.");
      } else if (err.code === "INVALID_OTP") {
        setError("Invalid code. Please double-check and try again.");
      } else {
        setError(err.message || "Verification failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = useCallback(async () => {
    if (resendCooldown > 0 || resending) return;
    setError("");
    setResending(true);
    try {
      const res = await resendVerification(email);
      if (res?.emailDelivered === false) {
        setDeliveryFailed(true);
      } else {
        setDeliveryFailed(false);
        setResendCooldown(30);
      }
    } catch (err) {
      setError(err.message || "Could not resend code. Please try again.");
    } finally {
      setResending(false);
    }
  }, [email, resending, resendCooldown]);

  if (done) {
    return (
      <div className="animate-slide-up text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
          <CheckCircle2 className="h-7 w-7" />
        </span>
        <h1 className="mt-5 text-2xl font-bold tracking-tight text-ink">Email verified</h1>
        <p className="mt-2 text-sm text-muted">Your account is now active. You can sign in.</p>
        <Button onClick={() => navigate("/login")} variant="secondary" className="mt-6">
          Sign in
        </Button>
      </div>
    );
  }

  return (
    <div className="animate-slide-up">
      <h1 className="text-2xl font-bold tracking-tight text-ink">Verify your email</h1>
      <p className="mt-1 text-sm text-muted">
        Enter the 6-digit code sent to <span className="font-medium text-ink">{email || "your inbox"}</span>.
      </p>

      {deliveryFailed && (
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-sm text-amber-600">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          The verification email could not be delivered. Check your inbox/spam, or tap &ldquo;Resend code&rdquo; below.
        </div>
      )}

      <form onSubmit={handleVerify} noValidate className="mt-8 flex flex-col gap-5">
        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-sm text-red-500">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </div>
        )}
        <TextField
          label="Email address"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <TextField
          label="Verification code"
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
          placeholder="000000"
          inputProps={{
            style: {
              letterSpacing: "6px",
              fontSize: "18px",
              textAlign: "center",
              fontVariantNumeric: "tabular-nums",
            },
            maxLength: 6,
          }}
          required
        />
        <Button type="submit" loading={loading} className="w-full" size="lg">
          Verify email
        </Button>
      </form>

      <div className="mt-6 flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={handleResend}
          disabled={resending || resendCooldown > 0}
          className="flex items-center gap-1.5 text-sm font-medium text-brand-500 hover:text-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RotateCw className={`h-3.5 w-3.5 ${resending ? "animate-spin" : ""}`} />
          {resendCooldown > 0
            ? `Resend in ${resendCooldown}s`
            : resending
            ? "Sending…"
            : "Resend code"}
        </button>
        <Link to="/login" className="text-sm font-semibold text-brand-500 hover:text-brand-600">
          Back to sign in
        </Link>
      </div>
    </div>
  );
}