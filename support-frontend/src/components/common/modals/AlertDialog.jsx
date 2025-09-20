import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  Box,
  Typography,
} from "@mui/material";
import InfoIcon from "@mui/icons-material/Info";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";

export default function AlertDialog({
  open,
  title,
  message,
  onClose,
  onConfirm,
  confirmText = "Confirm",
  cancelText = "Cancel",
  type = "info", // "info" | "confirm" | "success" | "warning" | "error"
}) {
  // Icon + color mapping
  const typeConfig = {
    info: { icon: <InfoIcon color="info" sx={{ fontSize: 32 }} />, color: "info" },
    confirm: { icon: <WarningAmberIcon color="warning" sx={{ fontSize: 32 }} />, color: "warning" },
    success: { icon: <CheckCircleIcon color="success" sx={{ fontSize: 32 }} />, color: "success" },
    error: { icon: <ErrorIcon color="error" sx={{ fontSize: 32 }} />, color: "error" },
    warning: { icon: <WarningAmberIcon color="warning" sx={{ fontSize: 32 }} />, color: "warning" },
  };

  const { icon, color } = typeConfig[type] || typeConfig.info;

  return (
    <Dialog
      open={open}
      onClose={() => onClose(false)}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 3, p: 1 },
      }}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          {icon}
          <Typography variant="h6" color={`${color}.main`}>
            {title || "Alert"}
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        <DialogContentText sx={{ fontSize: 16 }}>{message}</DialogContentText>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        {type === "confirm" ? (
          <>
            <Button onClick={() => onClose(false)}>{cancelText}</Button>
            <Button
              variant="contained"
              color={color}
              onClick={() => {
                onConfirm?.();
                onClose(true);
              }}
            >
              {confirmText}
            </Button>
          </>
        ) : (
          <Button
            variant="contained"
            color={color}
            onClick={() => onClose(true)}
          >
            OK
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
