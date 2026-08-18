import { createTheme } from "@mui/material/styles";

/**
 * Builds the Material UI theme to match the ASATECH design tokens.
 * MUI is used for complex controls (dialogs, tables, selects, menus…),
 * while Tailwind handles layout and custom styling. Keeping the two in
 * sync here ensures a coherent visual system.
 */
export function buildTheme(mode) {
  const dark = mode === "dark";

  return createTheme({
    palette: {
      mode: dark ? "dark" : "light",
      primary: { main: "#3b82f6", contrastText: "#ffffff" },
      secondary: { main: "#0ea5e9" },
      error: { main: "#ef4444" },
      warning: { main: "#f59e0b" },
      success: { main: "#10b981" },
      info: { main: "#3b82f6" },
      background: {
        default: dark ? "#070a12" : "#f4f6fa",
        paper: dark ? "#0d1220" : "#ffffff",
      },
      text: {
        primary: dark ? "#e7ecf5" : "#0e1729",
        secondary: dark ? "#99a4b8" : "#5a6474",
      },
      divider: dark ? "#1f2737" : "#e3e7ef",
    },
    shape: { borderRadius: 10 },
    typography: {
      fontFamily: '"Inter", system-ui, -apple-system, sans-serif',
      button: { textTransform: "none", fontWeight: 600 },
      fontSize: 14,
    },
    components: {
      MuiPaper: {
        styleOverrides: { root: { backgroundImage: "none" } },
      },
      MuiButtonBase: {
        defaultProps: { disableRipple: false },
      },
      MuiCssBaseline: {
        styleOverrides: {
          body: { backgroundColor: dark ? "#070a12" : "#f4f6fa" },
        },
      },
    },
  });
}
