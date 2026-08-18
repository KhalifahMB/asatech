import { useState } from "react";
import {
  TextField as MuiTextField,
  Select as MuiSelect,
  MenuItem,
  FormControl,
  InputLabel,
  FormHelperText,
  InputAdornment,
  IconButton,
} from "@mui/material";
import { Eye, EyeOff } from "lucide-react";

/**
 * Standard text input backed by Material UI.
 *
 * A minimum top margin of `0.5rem` is applied so the floating label of
 * outlined inputs isn't clipped when several fields are stacked with
 * flex gap. This makes spacing predictable across all auth/checkout forms.
 */
export function TextField({ error, helperText, label, required, className, ...props }) {
  return (
    <MuiTextField
      size="small"
      fullWidth
      variant="outlined"
      margin="dense"
      label={label}
      required={required}
      error={!!error}
      helperText={error || helperText}
      className={className}
      {...props}
    />
  );
}

/** Password input with a visibility toggle. */
export function PasswordInput({ label, required, error, helperText, ...props }) {
  const [show, setShow] = useState(false);
  return (
    <MuiTextField
      size="small"
      fullWidth
      variant="outlined"
      margin="dense"
      label={label}
      required={required}
      error={!!error}
      helperText={error || helperText}
      type={show ? "text" : "password"}
      InputProps={{
        endAdornment: (
          <InputAdornment position="end">
            <IconButton
              onClick={() => setShow((s) => !s)}
              edge="end"
              size="small"
              aria-label={show ? "Hide password" : "Show password"}
            >
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </IconButton>
          </InputAdornment>
        ),
      }}
      {...props}
    />
  );
}

/** Select dropdown with an optional placeholder. */
export function SelectField({
  label,
  value,
  onChange,
  options = [],
  required,
  error,
  helperText,
  placeholder,
  className,
  ...props
}) {
  return (
    <FormControl size="small" fullWidth margin="dense" error={!!error} className={className}>
      {label && (
        <InputLabel required={required} id={`${label}-label`}>
          {label}
        </InputLabel>
      )}
      <MuiSelect
        labelId={label ? `${label}-label` : undefined}
        label={label}
        value={value ?? ""}
        onChange={onChange}
        displayEmpty={!!placeholder}
        {...props}
      >
        {placeholder ? (
          <MenuItem value="" disabled>
            <span className="text-faint">{placeholder}</span>
          </MenuItem>
        ) : null}
        {options.map((o) => (
          <MenuItem key={o.value} value={o.value}>
            {o.label}
          </MenuItem>
        ))}
      </MuiSelect>
      {(error || helperText) && <FormHelperText>{error || helperText}</FormHelperText>}
    </FormControl>
  );
}

/** Multi-line textarea. */
export function TextArea({ label, error, helperText, required, rows = 4, ...props }) {
  return (
    <MuiTextField
      size="small"
      fullWidth
      multiline
      minRows={rows}
      variant="outlined"
      margin="dense"
      label={label}
      required={required}
      error={!!error}
      helperText={error || helperText}
      {...props}
    />
  );
}
