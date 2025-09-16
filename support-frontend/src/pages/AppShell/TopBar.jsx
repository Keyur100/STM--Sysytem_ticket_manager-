// src/components/ui/Topbar.js
import React from "react";
import {
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Box,
  Menu,
  MenuItem,
  ListItemIcon,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import Brightness7Icon from "@mui/icons-material/Brightness7"; // sun
import Brightness4Icon from "@mui/icons-material/Brightness4"; // moon
import AccountCircle from "@mui/icons-material/AccountCircle"; // profile
import LogoutIcon from "@mui/icons-material/Logout"; // logout
import PersonIcon from "@mui/icons-material/Person"; // view/update profile
import KeyIcon from "@mui/icons-material/Key"; // reset password
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { clearAuth } from "../../store/slices/authSlice";
import { setTheme } from "../../store/slices/uiSlice";
import ProfileModal from "../../components/common/modals/ProfileModal";
import ResetPasswordModal from "../../components/common/modals/ResetPasswordModal";
import usePermissions from "../../helpers/hooks/usePermissions";

export default function Topbar({ onMenuClick }) {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const theme = useSelector((state) => state.ui.theme);

  const [anchorEl, setAnchorEl] = React.useState(null);
  const [showProfile, setShowProfile] = React.useState(false);
  const [showReset, setShowReset] = React.useState(false);

  const toggleTheme = () => dispatch(setTheme(theme === "light" ? "dark" : "light"));

  const handleMenuOpen = (event) => setAnchorEl(event.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);

   const { hasPermission } = usePermissions();
 
  return (
    <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
      <Toolbar>
        {/* Menu button for mobile */}
        <IconButton
          color="inherit"
          edge="start"
          onClick={onMenuClick}
          sx={{ mr: 2, display: { sm: "none" } }}
        >
          <MenuIcon />
        </IconButton>

        {/* App title */}
        <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
          Support System
        </Typography>

        {/* Right side: Theme toggle & profile dropdown */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          {/* Theme toggle */}
          <IconButton color="inherit" onClick={toggleTheme}>
            {theme === "light" ? <Brightness7Icon /> : <Brightness4Icon />}
          </IconButton>

          {/* Profile dropdown */}
          {(hasPermission("user.self_update") ||
            hasPermission("user.self_read") ||
            hasPermission("user.reset_password")) && (
            <>
              <IconButton color="inherit" onClick={handleMenuOpen}>
                <AccountCircle />
              </IconButton>
              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleMenuClose}
              >
                {/* {hasPermission("user.self_read") && (
                  <MenuItem
                    onClick={() => {
                      setShowProfile(true);
                      handleMenuClose();
                    }}
                  >
                    <ListItemIcon>
                      <PersonIcon fontSize="small" />
                    </ListItemIcon>
                    View Profile
                  </MenuItem>
                )}

                {hasPermission("user.self_update") && (
                  <MenuItem
                    onClick={() => {
                      setShowProfile(true);
                      handleMenuClose();
                    }}
                  >
                    <ListItemIcon>
                      <PersonIcon fontSize="small" />
                    </ListItemIcon>
                    Update Profile
                  </MenuItem>
                )} */}

                {hasPermission("user.reset_password") && (
                  <MenuItem
                    onClick={() => {
                      setShowReset(true);
                      handleMenuClose();
                    }}
                  >
                    <ListItemIcon>
                      <KeyIcon fontSize="small" />
                    </ListItemIcon>
                    Reset Password
                  </MenuItem>
                )}

                {/* Logout */}
                <MenuItem
                  onClick={() => {
                    dispatch(clearAuth());
                    navigate("/login");
                    handleMenuClose();
                  }}
                >
                  <ListItemIcon>
                    <LogoutIcon fontSize="small" />
                  </ListItemIcon>
                  Logout
                </MenuItem>
              </Menu>
            </>
          )}
        </Box>

        {/* Modals */}
        <ProfileModal open={showProfile} onClose={() => setShowProfile(false)} />
        <ResetPasswordModal open={showReset} onClose={() => setShowReset(false)} />
      </Toolbar>
    </AppBar>
  );
}
