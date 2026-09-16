import { useState, useEffect } from "react";
import { MapPin, Plus, Star, Pencil, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, SectionHeader } from "@/components/ui/Surfaces";
import { TextField } from "@/components/ui/Field";
import { Modal, ConfirmDialog } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/Feedback";
import { useAuth } from "@/state/AuthContext";
import { useToast } from "@/state/ToastContext";
import {
  updateProfile,
  getAddresses,
  addAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
} from "@/services/authService";

const EMPTY_ADDRESS = {
  label: "Home",
  name: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  phone: "",
  default: false,
};

export default function Profile() {
  const { user, setUser } = useAuth();
  const toast = useToast();

  const [form, setForm] = useState({
    name: user?.name || "",
    email: user?.email || "",
    phone: user?.phone || "",
  });
  const [saving, setSaving] = useState(false);

  const [addresses, setAddresses] = useState([]);
  const [loadingAddrs, setLoadingAddrs] = useState(true);
  const [editing, setEditing] = useState(null); // address object or null
  const [draft, setDraft] = useState(EMPTY_ADDRESS);
  const [modalOpen, setModalOpen] = useState(false);
  const [savingAddr, setSavingAddr] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const loadAddresses = async () => {
    try {
      const list = await getAddresses();
      setAddresses(list || []);
    } catch (err) {
      toast.error(err.message || "Could not load addresses.");
    } finally {
      setLoadingAddrs(false);
    }
  };

  useEffect(() => {
    loadAddresses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await updateProfile({ name: form.name, phone: form.phone });
      if (updated) setUser((prev) => ({ ...prev, ...updated }));
      toast.success("Profile updated", "Your details were saved.");
    } catch (err) {
      toast.error(err.message || "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  const openAdd = () => {
    setEditing(null);
    setDraft({ ...EMPTY_ADDRESS, name: user?.name || "", phone: user?.phone || "" });
    setModalOpen(true);
  };

  const openEdit = (addr) => {
    setEditing(addr);
    setDraft({
      label: addr.label || "Home",
      name: addr.name || "",
      line1: addr.line1 || "",
      line2: addr.line2 || "",
      city: addr.city || "",
      state: addr.state || "",
      phone: addr.phone || "",
      default: addr.default,
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    if (savingAddr) return;
    setModalOpen(false);
    setEditing(null);
  };

  const submitAddress = async (e) => {
    e.preventDefault();
    if (!draft.name.trim() || !draft.line1.trim() || !draft.city.trim() || !draft.state.trim() || !draft.phone.trim()) {
      toast.error("Name, address, city, state, and phone are required.");
      return;
    }
    setSavingAddr(true);
    try {
      const result = editing
        ? await updateAddress(editing._id, draft)
        : await addAddress(draft);
      setAddresses(result || []);
      toast.success(editing ? "Address updated" : "Address added", "Your address book was updated.");
      setModalOpen(false);
      setEditing(null);
    } catch (err) {
      toast.error(err.message || "Could not save this address.");
    } finally {
      setSavingAddr(false);
    }
  };

  const handleSetDefault = async (addrId) => {
    try {
      const result = await setDefaultAddress(addrId);
      setAddresses(result || []);
      toast.success("Default address updated");
    } catch (err) {
      toast.error(err.message || "Could not update default address.");
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeletingId(deleting._id);
    try {
      const result = await deleteAddress(deleting._id);
      setAddresses(result || []);
      toast.success("Address deleted");
      setDeleting(null);
    } catch (err) {
      toast.error(err.message || "Could not delete this address.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">Profile</h1>
        <p className="mt-1 text-sm text-muted">Manage your personal information and saved addresses.</p>
      </div>

      <Card className="p-5 sm:p-6">
        <SectionHeader title="Personal information" subtitle="Your name, email, and phone number." />
        <form onSubmit={save} className="mt-5 max-w-xl space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              label="Full name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
            <TextField
              label="Email address"
              type="email"
              value={form.email}
              disabled
              helperText="Email changes are not supported yet."
            />
          </div>
          <TextField
            label="Phone number"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
          />
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
            <Button variant="secondary" size="sm" icon={Plus} onClick={openAdd}>
              Add address
            </Button>
          }
        />
        <div className="mt-5">
          {loadingAddrs ? (
            <div className="flex items-center gap-2 py-8 text-sm text-muted">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading saved addresses…
            </div>
          ) : addresses.length === 0 ? (
            <EmptyState
              title="No saved addresses yet"
              description="Add a delivery address to speed up checkout."
              action={
                <Button variant="secondary" size="sm" icon={Plus} onClick={openAdd}>
                  Add your first address
                </Button>
              }
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {addresses.map((addr) => {
                const isDefault = !!addr.default;
                return (
                  <div
                    key={addr._id}
                    className={`rounded-xl border p-4 ${isDefault ? "border-brand-500/60 bg-brand-500/5" : "border-line bg-raised"}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <span
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                            isDefault ? "bg-brand-500 text-white" : "bg-line/60 text-muted"
                          }`}
                        >
                          <MapPin className="h-4 w-4" />
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-ink">
                              {addr.label || "Home"}
                            </p>
                            {isDefault && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-brand-500/10 px-2 py-0.5 text-[0.68rem] font-semibold text-brand-600">
                                <Star className="h-3 w-3" /> Default
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-sm text-muted">{addr.name}</p>
                          <p className="text-sm text-muted">
                            {addr.line1}
                            {addr.line2 ? `, ${addr.line2}` : ""}
                          </p>
                          <p className="text-sm text-muted">
                            {addr.city}, {addr.state}
                          </p>
                          <p className="text-sm text-muted">{addr.phone}</p>
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-1.5">
                      {!isDefault && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSetDefault(addr._id)}
                        >
                          Set default
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" icon={Pencil} onClick={() => openEdit(addr)}>
                        Edit
                      </Button>
                      <Button
                        variant="dangerGhost"
                        size="sm"
                        icon={Trash2}
                        onClick={() => setDeleting(addr)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Card>

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editing ? "Edit address" : "Add a new address"}
        subtitle="This address will be available to select during checkout."
        actions={
          <>
            <Button variant="ghost" onClick={closeModal} disabled={savingAddr}>
              Cancel
            </Button>
            <Button type="submit" form="address-form" loading={savingAddr}>
              {editing ? "Save changes" : "Add address"}
            </Button>
          </>
        }
      >
        <form id="address-form" onSubmit={submitAddress} className="space-y-4 py-1">
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              label="Label"
              value={draft.label}
              onChange={(e) => setDraft((d) => ({ ...d, label: e.target.value }))}
              placeholder="Home"
              required
            />
            <TextField
              label="Recipient name"
              value={draft.name}
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              required
            />
          </div>
          <TextField
            label="Address line 1"
            value={draft.line1}
            onChange={(e) => setDraft((d) => ({ ...d, line1: e.target.value }))}
            required
          />
          <TextField
            label="Address line 2 (optional)"
            value={draft.line2}
            onChange={(e) => setDraft((d) => ({ ...d, line2: e.target.value }))}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              label="City"
              value={draft.city}
              onChange={(e) => setDraft((d) => ({ ...d, city: e.target.value }))}
              required
            />
            <TextField
              label="State"
              value={draft.state}
              onChange={(e) => setDraft((d) => ({ ...d, state: e.target.value }))}
              required
            />
          </div>
          <TextField
            label="Phone number"
            value={draft.phone}
            onChange={(e) => setDraft((d) => ({ ...d, phone: e.target.value }))}
            required
          />
          <label className="flex cursor-pointer items-center gap-2 text-sm text-muted">
            <input
              type="checkbox"
              className="h-4 w-4 accent-brand-600"
              checked={!!draft.default}
              onChange={(e) => setDraft((d) => ({ ...d, default: e.target.checked }))}
            />
            Make this my default address
          </label>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        title="Delete this address?"
        description={`Remove "${deleting?.label || "Home"}" — ${deleting?.line1 || ""}, ${deleting?.city || ""}. This cannot be undone.`}
        confirmLabel="Delete address"
        cancelLabel="Cancel"
        danger
        loading={deletingId === deleting?._id}
      />
    </div>
  );
}