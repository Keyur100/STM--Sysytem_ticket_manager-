// src/components/ui/Sidebar.js
import React from "react";
import {
  Drawer,
  Toolbar,
  Divider,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import { Link } from "react-router-dom";
import routesConfig from "../../routesConfig";
import usePermissions from "../../helpers/hooks/usePermissions"; // adjust path if needed

const drawerWidth = 240;

export default function Sidebar({ mobileOpen, onToggle }) {
  const { hasPermission } = usePermissions();

  const drawer = (
    <div>
      <Toolbar />
      <Divider />
      <List>
        {routesConfig
          .filter((r) => hasPermission(r.permission))
          .map((r) => {
            const IconComp = r.icon;
            return (
              <ListItemButton component={Link} to={r.path} key={r.path}>
                <ListItemIcon>{IconComp && <IconComp />}</ListItemIcon>
                <ListItemText primary={r.label} />
              </ListItemButton>
            );
          })}
      </List>
    </div>
  );

  return (
    <>
      {/* Mobile Drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onToggle}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: "block", sm: "none" },
          "& .MuiDrawer-paper": { boxSizing: "border-box", width: drawerWidth },
        }}
      >
        {drawer}
      </Drawer>

      {/* Permanent Drawer */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: "none", sm: "block" },
          "& .MuiDrawer-paper": { boxSizing: "border-box", width: drawerWidth },
        }}
        open
      >
        {drawer}
      </Drawer>
    </>
  );
}
