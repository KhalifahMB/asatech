import { useState } from "react";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, SectionHeader } from "@/components/ui/Surfaces";
import { PageHeader } from "@/components/ui/PageHeader";
import { TextField } from "@/components/ui/Field";
import { useToast } from "@/state/ToastContext";
import { useAuth } from "@/state/AuthContext";

function Toggle({ label, desc, value, onChange }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div>
        <p className="text-sm font-medium text-ink">{label}</p>
        <p className="text-sm text-muted">{desc}</p>
      </div>
      <button
        onClick={() => onChange(!value)}
        role="switch"
        aria-checked={value}
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${value ? "bg-brand-600" : "bg-raised border border-line"}`}
      >
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${value ? "left-[22px]" : "left-0.5"}`} />
      </button>
    </div>
  );
}

export default function Settings() {
  const toast = useToast();
  const { user } = useAuth();
  const [store, setStore] = useState({ name: "ASATECH", email: "support@asatech.ng" });
  const [prefs, setPrefs] = useState({
    fraudEmail: true,
    lowStock: true,
    dailyDigest: false,
    failedPayment: true,
  });
  const [saving, setSaving] = useState(false);

  const save = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      toast.success("Settings saved");
    }, 600);
  };

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader title="Settings" subtitle="Configure your admin workspace." />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5 sm:p-6">
          <SectionHeader title="Store settings" subtitle="Basic storefront configuration." />
          <div className="mt-5 space-y-4">
            <TextField label="Store name" value={store.name} onChange={(e) => setStore((s) => ({ ...s, name: e.target.value }))} />
            <TextField label="Support email" value={store.email} onChange={(e) => setStore((s) => ({ ...s, email: e.target.value }))} />
          </div>
        </Card>

        <Card className="p-5 sm:p-6">
          <SectionHeader title="Admin profile" subtitle="Your administrator account." />
          <div className="mt-5 space-y-4">
            <TextField label="Name" value={user?.name || ""} />
            <TextField label="Email" value={user?.email || ""} disabled />
            <p className="text-xs text-faint">Account details are managed via the backend on integration.</p>
          </div>
        </Card>
      </div>

      <Card className="p-5 sm:p-6">
        <SectionHeader title="Notification preferences" subtitle="Choose which events you want to be notified about." />
        <div className="mt-3 divide-y divide-line">
          <Toggle label="High-risk fraud alerts" desc="Email me when a high-risk transaction is flagged." value={prefs.fraudEmail} onChange={(v) => setPrefs((p) => ({ ...p, fraudEmail: v }))} />
          <Toggle label="Low stock alerts" desc="Notify me when a product is running low." value={prefs.lowStock} onChange={(v) => setPrefs((p) => ({ ...p, lowStock: v }))} />
          <Toggle label="Failed payments" desc="Notify me when a payment fails." value={prefs.failedPayment} onChange={(v) => setPrefs((p) => ({ ...p, failedPayment: v }))} />
          <Toggle label="Daily digest" desc="A daily summary of sales and risk." value={prefs.dailyDigest} onChange={(v) => setPrefs((p) => ({ ...p, dailyDigest: v }))} />
        </div>
      </Card>

      <div className="flex justify-end">
        <Button onClick={save} loading={saving} icon={Save}>
          Save settings
        </Button>
      </div>
    </div>
  );
}
