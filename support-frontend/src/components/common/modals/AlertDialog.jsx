import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
} from "@mui/material";

export default function AlertDialog({
  open,
  title,
  message,
  onClose,
  onConfirm,
  confirmText = "Confirm",
  cancelText = "Cancel",
  type = "info", // "info" or "confirm"
}) {
  return (
    <Dialog open={open} onClose={() => onClose(false)}>
      <DialogTitle>{title || "Alert"}</DialogTitle>
      <DialogContent>
        <Typography>{message}</Typography>
      </DialogContent>
      <DialogActions>
        {type === "confirm" ? (
          <>
            <Button onClick={() => onClose(false)}>{cancelText}</Button>
            <Button
              variant="contained"
              color="error"
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
            onClick={() => onClose(true)}
          >
            OK
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
