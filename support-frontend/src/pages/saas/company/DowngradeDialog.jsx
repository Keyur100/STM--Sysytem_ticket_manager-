import React from "react";
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography } from "@mui/material";
import api from "../../../api/axios";

export default function DowngradeDialog({ open, onClose, subscription, targetPlan, onSuccess }) {
  const handleConfirm = async () => {
    try {
      await api.post(`/saas/subscriptions/${subscription._id}/downgrade`, { newPlanId: targetPlan._id });
      onSuccess && onSuccess();
      onClose();
    } catch (err) {
      alert(err?.response?.data?.message || err?.message || "Failed to schedule downgrade");
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Schedule Downgrade</DialogTitle>
      <DialogContent>
        <Typography variant="body1">This will schedule the subscription to downgrade to <strong>{targetPlan?.name}</strong> at the next billing date. No partial refunds will be issued.</Typography>
        <Typography variant="body2" sx={{ mt: 1 }}>Subscription renewal date: {new Date(subscription?.renewalDate || subscription?.nextBillingDate || Date.now()).toLocaleDateString()}</Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleConfirm} variant="contained">Confirm</Button>
      </DialogActions>
    </Dialog>
  );
}
