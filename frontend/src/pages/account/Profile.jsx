import { useState } from "react";
import { MapPin, Plus, Star } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, SectionHeader } from "@/components/ui/Surfaces";
import { TextField } from "@/components/ui/Field";
import { useAuth } from "@/state/AuthContext";
import { useToast } from "@/state/ToastContext";

export default function Profile() {
  const { user } = useAuth();
  const toast = useToast();
  const base = { name: user?.name || "", email: user?.email || "", phone: user?.phone || "" };
  const [form, setForm] = useState(base);
  const [saving, setSaving] = useState(false);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      // TODO: Connect to backend API
      // await client.patch("/auth/me", form);
      toast.success("Profile updated", "Your details were saved.");
    } catch (err) {
      toast.error(err.message || "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">Profile</h1>
        <p className="mt-1 text-sm text-muted">Manage your personal information.</p>
      </div>

      <Card className="p-5 sm:p-6">
        <form onSubmit={save} className="max-w-xl space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="Full name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
            <TextField label="Email address" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} required />
          </div>
          <TextField label="Phone number" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
          <Button type="submit" loading={saving}>
            Save changes
          </Button>
        </form>
      </Card>

      <Card className="p-5 sm:p-6">
        <SectionHeader
          title="Delivery addresses"
          subtitle="Used to calculate shipping and deliver your orders."
          action={
            <Button variant="secondary" size="sm" icon={Plus}>
              Add address
            </Button>
          }
        />
        <div className="mt-5 text-sm text-muted">
          <p>No saved addresses yet.</p>
          <p className="mt-1 text-xs text-faint">Addresses will appear here after your first order.</p>
        </div>
      </Card>
    </div>
  );
}
