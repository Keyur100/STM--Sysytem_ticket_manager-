import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  FormControlLabel,
  Checkbox,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Typography,
} from "@mui/material";
import api from "../../../api/axios";

export default function ReactivateDialog({ open, subscription, onClose, onSuccess }) {
  const [couponCode, setCouponCode] = useState("");
  const [useWallet, setUseWallet] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleReactivate = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.post(
        `/saas/subscriptions/${subscription._id}/reactivate`,
        {
          couponCode: couponCode || null,
          useWallet,
        }
      );

      if (response.data.success) {
        onSuccess?.();
        handleClose();
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to reactivate subscription");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setCouponCode("");
    setUseWallet(false);
    setError("");
    onClose();
  };

  if (!subscription) return null;

  // Determine reactivation mode
  const now = Date.now();
  const isExpired = subscription.status === "EXPIRED";
  const graceEnd = subscription.endAt + (7 * 24 * 60 * 60 * 1000);
  const isWithinGrace = isExpired && now <= graceEnd;

  let reactivationMode = "Unknown";
  if (subscription.status === "ACTIVE" && now < subscription.endAt) {
    reactivationMode = "RENEWAL";
  } else if (isWithinGrace) {
    reactivationMode = "REACTIVATE";
  } else {
    reactivationMode = "PURCHASE";
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Reactivate Subscription</DialogTitle>

      <DialogContent sx={{ mt: 2 }}>
        {/* Subscription Info */}
        <Card sx={{ mb: 3, bgcolor: "background.paper" }}>
          <CardContent>
            <Typography variant="subtitle2" color="textSecondary">
              Plan
            </Typography>
            <Typography variant="h6">
              {subscription.planSnapshot?.name}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              ₹{(subscription.planSnapshot?.pricePaise / 100).toFixed(2)}/month
            </Typography>
            {subscription.addonSnapshot?.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" color="textSecondary">
                  Add-ons
                </Typography>
                {subscription.addonSnapshot.map((addon, idx) => (
                  <Typography key={idx} variant="body2">
                    • {addon.name} (×{addon.qty}) - ₹
                    {((addon.pricePaise * addon.qty) / 100).toFixed(2)}
                  </Typography>
                ))}
              </Box>
            )}
          </CardContent>
        </Card>

        {/* Reactivation Mode Info */}
        <Alert severity="info" sx={{ mb: 2 }}>
          {reactivationMode === "RENEWAL"
            ? "Schedule renewal for your next billing cycle"
            : reactivationMode === "REACTIVATE"
            ? "Restore your subscription immediately (within grace period)"
            : "Create a new subscription plan"}
        </Alert>

        {/* Coupon Code */}
        <TextField
          fullWidth
          label="Coupon Code (Optional)"
          value={couponCode}
          onChange={(e) => setCouponCode(e.target.value)}
          placeholder="Enter promo code"
          disabled={loading}
          sx={{ mb: 2 }}
        />

        {/* Wallet Checkbox */}
        <FormControlLabel
          control={
            <Checkbox
              checked={useWallet}
              onChange={(e) => setUseWallet(e.target.checked)}
              disabled={loading}
            />
          }
          label="Use wallet balance for payment"
          sx={{ mb: 2 }}
        />

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Summary Card */}
        <Card sx={{ bgcolor: "action.hover" }}>
          <CardContent>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Reactivation Summary
            </Typography>
            <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
              <Typography variant="body2">Mode:</Typography>
              <Typography variant="body2" fontWeight="bold">
                {reactivationMode}
              </Typography>
            </Box>
            <Box sx={{ display: "flex", justifyContent: "space-between" }}>
              <Typography variant="body2">Amount Due:</Typography>
              <Typography variant="body2">
                (Calculated after payment)
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleReactivate}
          variant="contained"
          disabled={loading}
        >
          {loading ? (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <CircularProgress size={20} color="inherit" />
              Processing...
            </Box>
          ) : (
            "Reactivate"
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
