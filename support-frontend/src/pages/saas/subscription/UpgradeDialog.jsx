import React, { useState, useEffect } from "react";
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
  MenuItem,
  Card,
  CardContent,
  Typography,
} from "@mui/material";
import api from "../../../api/api";

export default function UpgradeDialog({ open, subscription, company, onClose, onSuccess }) {
  const [newPlanId, setNewPlanId] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [useWallet, setUseWallet] = useState(false);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchingPlans, setFetchingPlans] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState(null);

  // Fetch available plans
  useEffect(() => {
    if (open && subscription) {
      fetchPlans();
    }
  }, [open, subscription]);

  const fetchPlans = async () => {
    try {
      setFetchingPlans(true);
      const response = await api.get("/saas/plans");
      // Filter only plans more expensive than current
      const filtered = response.data.data.filter(
        (p) => p.pricePaise > subscription.planSnapshot?.pricePaise
      );
      setPlans(filtered);
    } catch (err) {
      setError("Failed to fetch plans");
    } finally {
      setFetchingPlans(false);
    }
  };

  const handleUpgrade = async () => {
    try {
      if (!newPlanId) {
        setError("Please select a plan to upgrade to");
        return;
      }

      setLoading(true);
      setError("");

      const response = await api.post(
        `/saas/subscriptions/${subscription._id}/upgrade`,
        {
          newPlanId,
          couponCode: couponCode || null,
          useWallet,
        }
      );

      if (response.data.success) {
        onSuccess?.();
        handleClose();
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to upgrade subscription");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setNewPlanId("");
    setCouponCode("");
    setUseWallet(false);
    setError("");
    setPreview(null);
    onClose();
  };

  const selectedPlan = plans.find((p) => p._id === newPlanId);

  if (!subscription) return null;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Upgrade Subscription</DialogTitle>

      <DialogContent sx={{ mt: 2 }}>
        {/* Current Plan Info */}
        <Card sx={{ mb: 3, bgcolor: "background.paper" }}>
          <CardContent>
            <Typography variant="subtitle2" color="textSecondary">
              Current Plan
            </Typography>
            <Typography variant="h6">
              {subscription.planSnapshot?.name}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              ₹ {(subscription.planSnapshot?.pricePaise / 100).toFixed(2)}/month
            </Typography>
          </CardContent>
        </Card>

        {/* Plan Selection */}
        <TextField
          select
          fullWidth
          label="Select Plan to Upgrade To"
          value={newPlanId}
          onChange={(e) => setNewPlanId(e.target.value)}
          disabled={fetchingPlans || loading}
          sx={{ mb: 2 }}
        >
          {plans.length === 0 ? (
            <MenuItem disabled>No higher plans available</MenuItem>
          ) : (
            plans.map((plan) => (
              <MenuItem key={plan._id} value={plan._id}>
                {plan.name} - ₹{(plan.pricePaise / 100).toFixed(2)}/month
              </MenuItem>
            ))
          )}
        </TextField>

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

        {/* Price Preview */}
        {selectedPlan && (
          <Card sx={{ bgcolor: "action.hover" }}>
            <CardContent>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Upgrade Summary
              </Typography>
              <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                <Typography variant="body2">New Plan Price:</Typography>
                <Typography variant="body2">
                  ₹{(selectedPlan.pricePaise / 100).toFixed(2)}
                </Typography>
              </Box>
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="body2" fontWeight="bold">
                  Amount Due:
                </Typography>
                <Typography variant="body2" fontWeight="bold">
                  (Calculated after payment)
                </Typography>
              </Box>
            </CardContent>
          </Card>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleUpgrade}
          variant="contained"
          disabled={!newPlanId || loading || fetchingPlans}
        >
          {loading ? (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <CircularProgress size={20} color="inherit" />
              Upgrading...
            </Box>
          ) : (
            "Upgrade Plan"
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
