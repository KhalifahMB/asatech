import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  IconButton,
} from "@mui/material";
import { X, AlertTriangle } from "lucide-react";
import { Button } from "./Button";

export function Modal({ open, onClose, title, subtitle, children, actions, maxWidth = "sm" }) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth={maxWidth} fullWidth>
      <DialogTitle className="flex items-center justify-between pr-2">
        <span className="text-base font-semibold">{title}</span>
        <IconButton onClick={onClose} aria-label="Close" size="small">
          <X className="h-4 w-4" />
        </IconButton>
      </DialogTitle>
      {subtitle && (
        <DialogContentText className="px-6 -mt-2 text-sm text-muted">{subtitle}</DialogContentText>
      )}
      <DialogContent dividers>{children}</DialogContent>
      {actions && <DialogActions>{actions}</DialogActions>}
    </Dialog>
  );
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = "Are you sure?",
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  danger = false,
  loading = false,
}) {
  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} maxWidth="xs" fullWidth>
      <DialogTitle className="flex items-center gap-2.5">
        {danger && (
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/10 text-red-500">
            <AlertTriangle className="h-4 w-4" />
          </span>
        )}
        <span className="text-base font-semibold">{title}</span>
      </DialogTitle>
      {description && (
        <DialogContent>
          <DialogContentText className="text-sm text-muted">{description}</DialogContentText>
        </DialogContent>
      )}
      <DialogActions>
        <Button variant="ghost" onClick={onClose} disabled={loading}>
          {cancelLabel}
        </Button>
        <Button variant={danger ? "danger" : "primary"} onClick={onConfirm} loading={loading}>
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
