import React from "react";
import { createTheme, ThemeProvider, CssBaseline } from "@mui/material";
import { useSelector, useDispatch } from "react-redux";
import { setTheme } from "../store/slices/uiSlice";

export function getTheme(mode = "light") {
  return createTheme({
    palette: { mode },
    components: { MuiButton: { defaultProps: { disableElevation: true } } }
  });
}

export function ThemeWrapper({ children }) {
  const mode = useSelector((s) => s.ui?.theme || "light");//dark
  const theme = React.useMemo(() => getTheme(mode), [mode]);
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}
