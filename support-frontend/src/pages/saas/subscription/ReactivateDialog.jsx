import React, { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  FormControlLabel,
  Checkbox,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Typography,
  Divider,
  Snackbar,
  useTheme,
} from "@mui/material";
import api from "../../../api/axios";
import CouponModal from "../company/CompanyFormStepper/CouponModal";

export default function ReactivateDialog({ open, subscription, company, onClose, onSuccess }) {
  const theme = useTheme();
  const [couponCode, setCouponCode] = useState("");
  const [discountAmount, setDiscountAmount] = useState(0);
  const [useWallet, setUseWallet] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [couponModalOpen, setCouponModalOpen] = useState(false);
  const [walletDialogOpen, setWalletDialogOpen] = useState(false);
  const [walletDialogMode, setWalletDialogMode] = useState("add");
  const [walletAmount, setWalletAmount] = useState("");
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  const handleReactivate = async () => {
    try {
      setLoading(true);
      setError("");

      // Use subscriptionId if available (from company plan details), otherwise use _id
      const subId = subscription.subscriptionId || subscription._id;

      if (!subId) {
        setError("Subscription ID not found");
        setLoading(false);
        return;
      }

      const response = await api.post(
        `/saas/company/subscriptions/${subId}/reactivate`,
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

  // ✅ Fetch wallet balance
  const fetchWallet = useCallback(async () => {
    const companyId = company?._id || subscription?.companyId;
    if (!companyId) return;
    try {
      const res = await api.get(`/saas/wallet/${companyId}`);
      setWalletBalance((res.wallet?.balancePaise || 0) / 100);
    } catch (err) {
      console.error("Error fetching wallet balance:", err);
    }
  }, [subscription?.companyId]);

  useEffect(() => {
    if (open) {
      fetchWallet();
      // Validate required data
      const companyId = company?._id || subscription?.companyId;
      if (!companyId) {
        console.warn("⚠️ ReactivateDialog: companyId is missing. Pass either company prop or subscription.companyId", { subscription, company });
      }
    }
  }, [open, fetchWallet]);

  // ✅ Apply coupon logic
  const handleApplyCoupon = async (code) => {
    try {
      setLoading(true);
      const planPricePaise = subscription.planSnapshot?.pricePaise || 0;
      const res = await api.post("/saas/coupons/apply", {
        code,
        planCode: subscription.planSnapshot?.code,
        amountPaise: planPricePaise,
      });
      if (res.data && res.data.success === false) {
        throw new Error(res.data.message || "Coupon apply failed");
      }
      const discountPaise = res.data.discountPaise || 0;
      setDiscountAmount(discountPaise / 100);
      setCouponCode(code);
      setSnackbar({ 
        open: true, 
        message: `Coupon "${code}" applied successfully`, 
        severity: "success" 
      });
    } catch (err) {
      setSnackbar({
        open: true,
        message: err.message || err.response?.data?.message || "Invalid or expired coupon",
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  // ✅ Handle Wallet Add/Deduct
  const handleWalletAction = async () => {
    // Validate companyId exists
    const companyId = company?._id || subscription?.companyId;
    if (!companyId) {
      setSnackbar({ 
        open: true, 
        message: "Error: Company ID not found. Please reload and try again.", 
        severity: "error" 
      });
      return;
    }

    // Validate amount
    if (!walletAmount || isNaN(walletAmount) || Number(walletAmount) <= 0) {
      setSnackbar({ open: true, message: "Please enter a valid amount", severity: "error" });
      return;
    }

    try {
      const amountInPaise = Number(walletAmount) * 100;
      const endpoint = walletDialogMode === "add" 
        ? `/saas/wallet/topup/${companyId}` 
        : `/saas/wallet/deduct/${companyId}`;

      const res = await api.post(endpoint, { amountPaise: amountInPaise });
      if (res.data && res.data.success === false) {
        setSnackbar({ open: true, message: res.data.message || "Action failed", severity: "error" });
        return;
      }

      setSnackbar({ 
        open: true, 
        message: `Balance ${walletDialogMode === "add" ? "added" : "deducted"} successfully!`, 
        severity: "success" 
      });

      // Refresh wallet balance
      fetchWallet();
      setWalletDialogOpen(false);
      setWalletAmount("");
    } catch (err) {
      setSnackbar({ 
        open: true, 
        message: err.response?.data?.message || "Action failed", 
        severity: "error" 
      });
    }
  };

  const handleClose = () => {
    setCouponCode("");
    setDiscountAmount(0);
    setUseWallet(false);
    setError("");
    setWalletAmount("");
    setCouponModalOpen(false);
    setWalletDialogOpen(false);
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

  // ✅ COMPREHENSIVE TAX CALCULATION (matching CompanyPaymentStep)
  const TAX_PERCENT = 18;
  const planPricePaise = subscription.planSnapshot?.pricePaise || 0;
  const addonsTotalPaise = subscription.addonSnapshot?.reduce((sum, addon) => {
    return sum + ((addon.pricePaise || 0) * (addon.qty || 1));
  }, 0) || 0;

  const subtotalPaise = planPricePaise + addonsTotalPaise;
  const discountPaise = Math.round((discountAmount || 0) * 100);

  // Compute tax from items where tax is included and tax to add for tax-not-included items
  let taxFromIncludedPaise = 0;
  let taxBaseExcludedPaise = 0;

  // Plan tax
  if (subscription.planSnapshot?.hasTax) {
    if (subscription.planSnapshot?.taxIncluded) {
      taxFromIncludedPaise += Math.round(
        (planPricePaise * TAX_PERCENT) / (100 + TAX_PERCENT)
      );
    } else {
      taxBaseExcludedPaise += planPricePaise;
    }
  }

  // Addons tax
  subscription.addonSnapshot?.forEach((addon) => {
    if (!addon.hasTax) return;
    const linePaise = (addon.pricePaise || 0) * (addon.qty || 1);
    if (addon.taxIncluded) {
      taxFromIncludedPaise += Math.round(
        (linePaise * TAX_PERCENT) / (100 + TAX_PERCENT)
      );
    } else {
      taxBaseExcludedPaise += linePaise;
    }
  });

  // Allocate discount to excluded base first (reduces taxable excluded base)
  const discountConsumedOnExcluded = Math.min(discountPaise, taxBaseExcludedPaise);
  const remainingExcludedBase = Math.max(0, taxBaseExcludedPaise - discountConsumedOnExcluded);

  // Tax on excluded base after discount consumed against it
  const taxOnExcludedPaise = Math.round(
    remainingExcludedBase * (TAX_PERCENT / 100)
  );

  // Final calculations
  const totalWithTaxPaise = Math.max(0, subtotalPaise - discountPaise + taxOnExcludedPaise);
  const totalWithTax = totalWithTaxPaise / 100;

  // Wallet logic
  const walletAppliedAmount = useWallet ? Math.min(walletBalance, totalWithTax) : 0;
  const finalPayable = Math.max(0, totalWithTax - walletAppliedAmount);

  // Display prices
  const planPrice = planPricePaise / 100;
  const addonsTotal = addonsTotalPaise / 100;
  const subtotal = planPrice + addonsTotal;

  return (
    <>
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 600, fontSize: "1.3rem", pb: 1 }}>
          🔄 Reactivate Subscription
        </DialogTitle>

        <DialogContent sx={{ mt: 1 }}>
          {/* Subscription Info */}
          <Card sx={{ mb: 3, bgcolor: "background.paper", borderRadius: 2 }}>
            <CardContent>
              <Typography variant="subtitle2" color="textSecondary">
                Plan
              </Typography>
              <Typography variant="h6" fontWeight={600}>
                {subscription.planSnapshot?.name}
              </Typography>
              <Typography variant="body2" color="textSecondary" sx={{ mb: 1.5 }}>
                ₹{planPrice.toFixed(2)}/month
              </Typography>

              {subscription.addonSnapshot?.length > 0 && (
                <Box>
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
          <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
            <strong>{reactivationMode} Mode:</strong>{" "}
            {reactivationMode === "RENEWAL"
              ? "Schedule renewal for your next billing cycle"
              : reactivationMode === "REACTIVATE"
              ? "Restore your subscription immediately (within grace period)"
              : "Create a new subscription plan"}
          </Alert>

          {/* ✅ Coupon Section */}
          <Typography variant="h6" mb={1.5} fontWeight={600}>
            🎟️ Coupon
          </Typography>

          {couponCode ? (
            <Alert
              severity="success"
              icon={false}
              sx={{
                mb: 2,
                p: 2,
                borderRadius: 2,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                boxShadow: 1,
              }}
            >
              <Box>
                <Typography variant="body1" fontWeight={500}>
                  Applied Coupon: <strong>{couponCode}</strong>
                </Typography>
                <Typography variant="body2">
                  Discount: ₹{discountAmount.toFixed(2)}
                </Typography>
              </Box>
              <Button
                color="error"
                variant="contained"
                size="small"
                sx={{
                  textTransform: "none",
                  borderRadius: 1,
                  boxShadow: "none",
                }}
                onClick={() => {
                  setCouponCode("");
                  setDiscountAmount(0);
                }}
              >
                Remove
              </Button>
            </Alert>
          ) : (
            <Button
              variant="outlined"
              color="primary"
              onClick={() => setCouponModalOpen(true)}
              disabled={loading}
              sx={{
                mb: 2,
                borderRadius: 2,
                px: 3,
                py: 1,
                fontWeight: 500,
                textTransform: "none",
                "&:hover": {
                  backgroundColor: "primary.light",
                  color: "white",
                },
              }}
            >
              Select Coupon
            </Button>
          )}

          <CouponModal
            open={couponModalOpen}
            onClose={() => setCouponModalOpen(false)}
            onSelect={(coupon) => {
              handleApplyCoupon(coupon.code);
              setCouponModalOpen(false);
            }}
            companyId={company?._id || subscription?.companyId}
            planCode={subscription.planSnapshot?.code}
          />

          <Divider sx={{ my: 2 }} />

          {/* ✅ Price Summary */}
          <Box sx={{ mb: 2, p: 2, backgroundColor: "action.hover", borderRadius: 2 }}>
            <Typography variant="h6" fontWeight={600} mb={1}>
              📊 Price Summary
            </Typography>

            <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
              <Typography>Plan:</Typography>
              <Typography fontWeight={600}>₹{planPrice.toFixed(2)}</Typography>
            </Box>

            {addonsTotal > 0 && (
              <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                <Typography>Add-ons:</Typography>
                <Typography fontWeight={600}>₹{addonsTotal.toFixed(2)}</Typography>
              </Box>
            )}

            <Divider sx={{ my: 1 }} />

            <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
              <Typography fontWeight={600}>Subtotal:</Typography>
              <Typography fontWeight={700}>₹{subtotal.toFixed(2)}</Typography>
            </Box>

            {discountAmount > 0 && (
              <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1, color: "success.main" }}>
                <Typography>💚 Discount:</Typography>
                <Typography fontWeight={600}>-₹{discountAmount.toFixed(2)}</Typography>
              </Box>
            )}

            {/* Tax Calculation */}
            {(subscription.planSnapshot?.hasTax || subscription.addonSnapshot?.some(a => a.hasTax)) && (
              <Box sx={{ mb: 1.5 }}>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    p: 1,
                    borderRadius: 1,
                    backgroundColor:
                      theme.palette.mode === "dark"
                        ? "rgba(255,255,255,0.03)"
                        : "action.selected",
                  }}
                >
                  <Typography fontWeight={500}>
                    🧾 {subscription.planSnapshot?.taxName || "GST"} (18%):
                  </Typography>
                  <Box sx={{ textAlign: "right" }}>
                    {taxFromIncludedPaise > 0 && (
                      <Typography variant="body2" sx={{ color: "text.secondary" }}>
                        Included: ₹{(taxFromIncludedPaise / 100).toFixed(2)}
                      </Typography>
                    )}
                    {taxOnExcludedPaise > 0 && (
                      <Typography fontWeight={600} sx={{ color: theme.palette.warning.main }}>
                        +₹{(taxOnExcludedPaise / 100).toFixed(2)}
                      </Typography>
                    )}
                  </Box>
                </Box>
              </Box>
            )}

            <Divider sx={{ my: 1 }} />

            {/* Final Payable */}
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                p: 1.5,
                backgroundColor:
                  theme.palette.mode === "dark" ? "primary.dark" : "primary.light",
                borderRadius: 1.5,
                border: `1px solid ${theme.palette.primary.main}`,
              }}
            >
              <Typography
                sx={{
                  fontSize: "1.1rem",
                  fontWeight: 700,
                  color: theme.palette.mode === "dark" ? "primary.light" : "primary.main",
                }}
              >
                💳 Final Amount:
              </Typography>
              <Typography
                sx={{
                  fontSize: "1.2rem",
                  fontWeight: 700,
                  color: theme.palette.mode === "dark" ? "primary.light" : "primary.main",
                }}
              >
                ₹{finalPayable.toFixed(2)}
              </Typography>
            </Box>

            {/* Wallet Applied */}
            {useWallet && walletAppliedAmount > 0 && (
              <Box sx={{ display: "flex", justifyContent: "space-between", mt: 1.5, color: "info.main" }}>
                <Typography>💰 Wallet Used:</Typography>
                <Typography fontWeight={600} color="info.main">
                  -₹{walletAppliedAmount.toFixed(2)}
                </Typography>
              </Box>
            )}
          </Box>

          {/* ✅ Wallet Section */}
          <Box mt={3}>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
              <FormControlLabel
                control={
                  <Checkbox 
                    checked={useWallet} 
                    onChange={(e) => setUseWallet(e.target.checked)}
                    disabled={walletBalance <= 0 || loading}
                  />
                }
                label={`Use Wallet (Balance ₹${walletBalance.toFixed(2)}) ${walletBalance <= 0 ? '- Disabled' : ''}`}
                sx={{ opacity: walletBalance <= 0 ? 0.6 : 1 }}
              />
              <Box sx={{ display: "flex", gap: 1 }}>
                <Button
                  variant="outlined"
                  size="small"
                  disabled={loading}
                  sx={{
                    background: "linear-gradient(90deg, #4caf50, #81c784)",
                    color: "#fff",
                    border: "none",
                    textTransform: "none",
                    fontWeight: 500,
                    "&:hover": { background: "linear-gradient(90deg, #388e3c, #66bb6a)" },
                    "&:disabled": { background: "rgba(0,0,0,0.12)", color: "rgba(0,0,0,0.26)" },
                  }}
                  onClick={() => { setWalletDialogMode("add"); setWalletDialogOpen(true); }}
                >
                  ➕ Add
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  disabled={loading || walletBalance <= 0}
                  sx={{
                    background: "linear-gradient(90deg, #f44336, #e57373)",
                    color: "#fff",
                    border: "none",
                    textTransform: "none",
                    fontWeight: 500,
                    "&:hover": { background: "linear-gradient(90deg, #d32f2f, #ef5350)" },
                    "&:disabled": { background: "rgba(0,0,0,0.12)", color: "rgba(0,0,0,0.26)" },
                  }}
                  onClick={() => { setWalletDialogMode("deduct"); setWalletDialogOpen(true); }}
                >
                  ➖ Deduct
                </Button>
              </Box>
            </Box>
          </Box>

          {/* ✅ Wallet Dialog */}
          <Dialog open={walletDialogOpen} onClose={() => setWalletDialogOpen(false)} maxWidth="xs" fullWidth>
            <DialogTitle>
              {walletDialogMode === "add" ? "➕ Add to Wallet" : "➖ Deduct from Wallet"}
            </DialogTitle>
            <DialogContent sx={{ pt: 2 }}>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="textSecondary" mb={1}>
                  Current Balance: ₹{walletBalance.toFixed(2)}
                </Typography>
              </Box>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                }}
              >
                <Typography>₹</Typography>
                <input
                  type="number"
                  placeholder="Enter amount"
                  value={walletAmount}
                  onChange={(e) => setWalletAmount(e.target.value)}
                  disabled={loading}
                  style={{
                    flex: 1,
                    padding: "10px",
                    border: "1px solid #ccc",
                    borderRadius: "4px",
                    fontSize: "1rem",
                  }}
                />
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setWalletDialogOpen(false)} disabled={loading}>
                Cancel
              </Button>
              <Button
                onClick={handleWalletAction}
                variant="contained"
                disabled={loading || !walletAmount}
              >
                {loading ? <CircularProgress size={20} /> : walletDialogMode === "add" ? "Add" : "Deduct"}
              </Button>
            </DialogActions>
          </Dialog>

          {error && (
            <Alert severity="error" sx={{ mb: 2, mt: 2, borderRadius: 2 }}>
              {error}
            </Alert>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleReactivate}
            variant="contained"
            disabled={loading}
            sx={{ borderRadius: 1 }}
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

      {/* Snackbar for wallet actions */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
}
