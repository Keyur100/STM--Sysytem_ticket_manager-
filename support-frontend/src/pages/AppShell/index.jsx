// src/components/ui/AppShell.js
import React from "react";
import { Box, CssBaseline, Toolbar } from "@mui/material";
import { Outlet, useLocation } from "react-router-dom";
import Topbar from "./TopBar";
import Sidebar from "./Sidebar";

const drawerWidth = 240;

export default function AppShell() {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const location = useLocation();

  // hide shell on login
  if (location.pathname === "/login") return <Outlet />;

  return (
    <Box sx={{ display: "flex" }}>
      <CssBaseline />

      {/* Topbar */}
      <Topbar onMenuClick={() => setMobileOpen(!mobileOpen)} />

      {/* Sidebar */}
      <Sidebar mobileOpen={mobileOpen} onToggle={() => setMobileOpen(!mobileOpen)} />

      {/* Main content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${drawerWidth}px)` }, // offset content on desktop
          marginLeft: { sm: `${drawerWidth}px` },          // important to avoid being hidden
        }}
      >
        <Toolbar /> {/* keeps content below Topbar */}
        <Outlet />
      </Box>
    </Box>
  );
}
