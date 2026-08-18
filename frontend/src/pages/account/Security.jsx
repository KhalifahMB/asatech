import { useState } from "react";
import { ShieldCheck, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, SectionHeader } from "@/components/ui/Surfaces";
import { PasswordInput } from "@/components/ui/Field";
import { EmptyState } from "@/components/ui/Feedback";
import { useToast } from "@/state/ToastContext";
import { client } from "@/services/client";

export default function Security() {
  const toast = useToast();
  const [pwd, setPwd] = useState({ current: "", next: "", confirm: "" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [twoFA, setTwoFA] = useState(false);

  const changePassword = async (e) => {
    e.preventDefault();
    setError("");
    if (pwd.next.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    if (pwd.next !== pwd.confirm) {
      setError("Passwords do not match.");
      return;
    }
    setSaving(true);
    try {
      await client.post("/auth/password/change", {
        currentPassword: pwd.current,
        newPassword: pwd.next,
      });
      setPwd({ current: "", next: "", confirm: "" });
      toast.success("Password updated", "Your password was changed.");
    } catch (err) {
      setError(err.message || "Failed to update password.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">Security</h1>
        <p className="mt-1 text-sm text-muted">Manage your password and security preferences.</p>
      </div>

      <Card className="p-5 sm:p-6">
        <SectionHeader title="Change password" subtitle="Choose a strong, unique password." />
        <form onSubmit={changePassword} className="mt-5 flex max-w-md flex-col gap-5">
          <PasswordInput
            label="Current password"
            value={pwd.current}
            onChange={(e) => setPwd((p) => ({ ...p, current: e.target.value }))}
            required
          />
          <PasswordInput
            label="New password"
            value={pwd.next}
            onChange={(e) => setPwd((p) => ({ ...p, next: e.target.value }))}
            error={error}
            required
          />
          <PasswordInput
            label="Confirm new password"
            value={pwd.confirm}
            onChange={(e) => setPwd((p) => ({ ...p, confirm: e.target.value }))}
            required
          />
          <Button type="submit" loading={saving} icon={KeyRound}>
            Update password
          </Button>
        </form>
      </Card>

      <Card className="flex items-center justify-between gap-4 p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-500/10 text-brand-500">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-semibold text-ink">Two-factor authentication</p>
            <p className="text-sm text-muted">Add an extra layer of security to your account.</p>
          </div>
        </div>
        <button
          onClick={() => {
            setTwoFA((v) => !v);
            toast.info(twoFA ? "2FA disabled" : "2FA setup — coming soon");
          }}
          role="switch"
          aria-checked={twoFA}
          className={`relative h-6 w-11 shrink-0 rounded-full transition ${twoFA ? "bg-brand-600" : "bg-raised border border-line"}`}
        >
          <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${twoFA ? "left-[22px]" : "left-0.5"}`} />
        </button>
      </Card>

      <Card className="p-5 sm:p-6">
        <SectionHeader title="Active sessions" subtitle="Devices currently signed in to your account." />
        <div className="mt-5">
          <EmptyState
            title="Session tracking coming soon"
            description="Detailed session and login-activity monitoring will be available in a future update."
          />
        </div>
      </Card>
    </div>
  );
}
