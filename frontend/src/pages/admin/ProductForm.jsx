import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Surfaces";
import { PageHeader } from "@/components/ui/PageHeader";
import { TextField, SelectField, TextArea } from "@/components/ui/Field";
import { useToast } from "@/state/ToastContext";
import { getProduct } from "@/services/catalogService";
import { createProduct, updateProduct } from "@/services/adminService";
import { CATEGORIES, CATEGORY_LABELS } from "@/lib/constants";

const EMPTY = {
  name: "",
  slug: "",
  category: "smartphones",
  price: "",
  previousPrice: "",
  stock: "",
  short: "",
  description: "",
  badge: "",
  image: "",
};

export default function ProductForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const toast = useToast();
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (id) {
      getProduct(id).then((p) => {
        if (p) {
          setForm({
            name: p.name,
            slug: p.slug,
            category: p.category,
            price: p.price,
            previousPrice: p.previousPrice || "",
            stock: p.stock,
            short: p.short,
            description: p.description,
            badge: p.badge || "",
            image: p.images[0],
          });
        }
      });
    }
  }, [id]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Product name is required.";
    if (!form.price || Number(form.price) <= 0) e.price = "Enter a valid price.";
    if (form.stock === "" || Number(form.stock) < 0) e.stock = "Enter a valid stock quantity.";
    if (!form.description.trim()) e.description = "Description is required.";
    return e;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) return;

    const slug = form.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const payload = {
      ...form,
      slug,
      price: Number(form.price),
      previousPrice: form.previousPrice ? Number(form.previousPrice) : null,
      stock: Number(form.stock),
      rating: 4.5,
      ratingCount: 0,
      images: [form.image || `/images/${form.category === "smartphones" ? "phone-1" : form.category === "laptops" ? "laptop-1" : form.category === "tablets" ? "tablet-1" : form.category === "smartwatches" ? "watch-1" : form.category === "headphones" ? "headphone-1" : form.category === "chargers" ? "charger-1" : "phone-1"}.jpg`],
      specs: [{ label: "Category", value: CATEGORY_LABELS[form.category] }],
    };

    setSaving(true);
    try {
      if (isEdit) {
        await updateProduct(id, payload);
        toast.success("Product updated");
      } else {
        await createProduct({ ...payload, id: undefined });
        toast.success("Product created");
      }
      navigate("/admin/products");
    } catch (err) {
      toast.error(err?.message || "Failed to save product.");
      setSaving(false);
    }
  };

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title={isEdit ? "Edit product" : "Add product"}
        breadcrumbs={[{ label: "Products", to: "/admin/products" }, { label: isEdit ? "Edit" : "Add" }]}
      />

      <form onSubmit={handleSubmit} noValidate>
        <Card className="p-5 sm:p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <TextField label="Product name" value={form.name} onChange={set("name")} error={errors.name} required />
            </div>
            <SelectField
              label="Category"
              value={form.category}
              onChange={set("category")}
              options={CATEGORIES.map((c) => ({ value: c.id, label: c.label }))}
            />
            <TextField label="Badge (optional)" value={form.badge} onChange={set("badge")} helperText="e.g. New, Best Seller, Deal" />
            <TextField label="Price (₦)" type="number" value={form.price} onChange={set("price")} error={errors.price} required />
            <TextField label="Previous price (₦)" type="number" value={form.previousPrice} onChange={set("previousPrice")} helperText="Leave empty if not on sale" />
            <TextField label="Stock quantity" type="number" value={form.stock} onChange={set("stock")} error={errors.stock} required />
            <TextField label="Image URL" value={form.image} onChange={set("image")} helperText="Optional — defaults to category image" />
            <div className="sm:col-span-2">
              <TextField label="Short description" value={form.short} onChange={set("short")} />
            </div>
            <div className="sm:col-span-2">
              <TextArea label="Description" value={form.description} onChange={set("description")} error={errors.description} required rows={5} />
            </div>
          </div>
        </Card>

        <div className="mt-6 flex justify-between">
          <Button type="button" variant="ghost" onClick={() => navigate("/admin/products")} icon={ArrowLeft}>
            Cancel
          </Button>
          <Button type="submit" loading={saving} icon={Save}>
            {isEdit ? "Save changes" : "Create product"}
          </Button>
        </div>
      </form>
    </div>
  );
}
