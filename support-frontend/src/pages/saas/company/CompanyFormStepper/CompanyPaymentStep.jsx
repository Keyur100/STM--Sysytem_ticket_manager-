import React, { useEffect, useState, useCallback } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  
  Button,
  RadioGroup,
  FormControlLabel,
  Radio,
  Divider,
  CircularProgress,
  Alert,
  Checkbox,
  useTheme,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
} from "@mui/material";
import api from "../../../../api/axios";
import Loader from "../../../../components/common/Loader";
import CouponModal from "./CouponModal";
import RequiredTextField from '../../../../components/form/RequiredTextField';
export default function CompanyPaymentStep({ form, subscription, onPaymentReady }) {
  const theme = useTheme();
  const [walletBalance, setWalletBalance] = useState(0);
  const [couponCode, setCouponCode] = useState("");
  const [discountAmount, setDiscountAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("RAZORPAY");
  const [useWallet, setUseWallet] = useState(false);
  const [, setLoading] = useState(false);
  const [, setAlertMsg] = useState(null);
  const [couponModalOpen, setCouponModalOpen] = useState(false);
  const [addonsData, setAddonsData] = useState([]);
  const [walletDialogOpen, setWalletDialogOpen] = useState(false);
  const [walletDialogMode, setWalletDialogMode] = useState("add");
  const [walletAmount, setWalletAmount] = useState("");
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const [prorationData, setProrationData] = useState(null);

  const plan = form.plan;
  // Fetch add-ons to calculate totals
  useEffect(() => {
    const fetchAddons = async () => {
      try {
        const res = await api.get("/saas/addons");
        const responseData = res.data;
        const addonList = responseData || [];
        setAddonsData(Array.isArray(addonList) ? addonList : []);
      } catch (err) {
        console.error("Error fetching addons:", err);
      }
    };
    fetchAddons();
  }, []);

  // Convert selectedAddons from { value: qty } to [{ addonId, qty }]
  const buildAddonsArray = useCallback(() => {
    if (!form.selectedAddons || typeof form.selectedAddons !== "object") {
      return [];
    }
    
    const addonsArray = [];
    Object.keys(form.selectedAddons).forEach((addonValue) => {
      const addon = addonsData.find(a => a.value === addonValue);
      if (addon) {
        addonsArray.push({
          addonId: addon._id,
          qty: form.selectedAddons[addonValue]
        });
      } else {
        console.warn(`⚠️ Addon not found in addonsData - value: "${addonValue}", available addons:`, addonsData.map(a => ({ value: a.value, _id: a._id })));
      }
    });
    
    console.log("✅ Built addons array:", addonsArray);
    return addonsArray;
  }, [form.selectedAddons, addonsData]);

  // Calculate total add-ons price based on selected quantities
  const calculateAddonsTotal = () => {
    if (!form.selectedAddons || typeof form.selectedAddons !== "object") {
      return 0;
    }
    
    let total = 0;
    
    Object.keys(form.selectedAddons).forEach((addonValue) => {
      const addon = addonsData.find(a => a.value === addonValue);
      if (addon) {
        const qty = form.selectedAddons[addonValue];
        const price = (addon.pricePaise || 0) / 100;
        total += price * qty;
      }
    });
    
    return total;
  };

  // ✅ Fetch wallet balance
  const fetchWallet = useCallback(async () => {
    if (!form._id) return;
    try {
      const res = await api.get(`/saas/wallet/${form._id}`);
      setWalletBalance((res.wallet.balancePaise || 0) / 100);
    } catch (err) {
      console.error("Error fetching wallet balance:", err);
    }
  }, [form._id]);

  useEffect(() => {
    fetchWallet();
  }, [fetchWallet]);

  // Fetch proration data for upgrades
  useEffect(() => {
    const fetchProration = async () => {
      if (!subscription || !subscription.subscriptionId || !plan || !plan._id) {
        setProrationData(null);
        return;
      }

      try {
        const payload = {
          newPlanId: plan._id,
        };

        const res = await api.post(`/saas/company/subscriptions/${subscription.subscriptionId}/upgrade/calculate`, payload);
        setProrationData(res?.data);
      } catch (err) {
        console.error("Error fetching proration:", err);
        setProrationData(null);
      }
    };

    fetchProration();
  }, [subscription, plan]);

  // ✅ Apply coupon logic
  const handleApplyCoupon = async (code) => {
    const appliedCode = code || couponCode;
    if (!appliedCode || !plan) return;
    try {
      setLoading(true);
      const totalAmountPaise = (planPrice + addonsTotal) * 100;
      const res = await api.post("/saas/coupons/apply", {
        code: appliedCode,
        planCode: plan.code,
        amountPaise: totalAmountPaise,
      });
      if (res.data && res.data.success === false) {
        throw new Error(res.data.message || 'Coupon apply failed');
      }
      const discountPaise = res.data.discountPaise || 0;
      setDiscountAmount(discountPaise / 100);
      setCouponCode(appliedCode);
      setAlertMsg({ type: "success", text: `Coupon "${appliedCode}" applied successfully` });
    } catch (err) {
      setAlertMsg({
        type: "error",
        text: err.message || err.response?.data?.message || "Invalid or expired coupon",
      });
    } finally {
      setLoading(false);
    }
  };

  const planPrice = (plan?.pricePaise || 0) / 100;
  const addonsTotal = calculateAddonsTotal();
  const subtotal = planPrice + addonsTotal;
  // ✅ Tax calculation respecting taxIncluded per item
  const TAX_PERCENT = 18;
  // build items in paise to avoid rounding issues
  const planPricePaise = plan?.pricePaise || 0;
  const addonsTotalPaise = (() => {
    let sum = 0;
    Object.keys(form.selectedAddons || {}).forEach((addonValue) => {
      const addon = addonsData.find(a => a.value === addonValue);
      if (addon) {
        const qty = form.selectedAddons[addonValue] || 0;
        sum += (addon.pricePaise || 0) * qty;
      }
    });
    return sum;
  })();

  const subtotalPaise = planPricePaise + addonsTotalPaise;
  const discountPaise = Math.round((discountAmount || 0) * 100);

  // compute tax from items where tax is included and tax to add for tax-not-included items
  let taxFromIncludedPaise = 0;
  let taxBaseExcludedPaise = 0;

  // plan
  if (plan?.hasTax) {
    if (plan?.taxIncluded) {
      taxFromIncludedPaise += Math.round((planPricePaise * TAX_PERCENT) / (100+TAX_PERCENT));
    } else {
      taxBaseExcludedPaise += planPricePaise;
    }
  }

  // addons
  Object.keys(form.selectedAddons || {}).forEach((addonValue) => {
    const addon = addonsData.find(a => a.value === addonValue);
    if (!addon) return;
    const qty = form.selectedAddons[addonValue] || 0;
    const linePaise = (addon.pricePaise || 0) * qty;
    if (addon.hasTax) {
      if (addon.taxIncluded) {
        taxFromIncludedPaise += Math.round((linePaise * TAX_PERCENT) / (100+TAX_PERCENT));
      } else {
        taxBaseExcludedPaise += linePaise;
      }
    }
  });

  // Allocate discount to excluded base first (reduces taxable excluded base)
  const discountConsumedOnExcluded = Math.min(discountPaise, taxBaseExcludedPaise);
  const remainingExcludedBase = Math.max(0, taxBaseExcludedPaise - discountConsumedOnExcluded);

  // tax on excluded base after discount consumed against it
  const taxOnExcludedPaise = Math.round(remainingExcludedBase * (TAX_PERCENT / 100));

  // total tax for display = included portion + added portion

  // Use proration data for upgrades, otherwise calculate locally
  const isUpgrade = !!subscription && !!subscription.subscriptionId;
  
  let finalPayable = 0;
  let totalWithTax = 0;
  let walletAppliedAmount = 0;
  let remainingValueDisplay = 0;
  
  if (isUpgrade && prorationData) {
    // Use proration credit from backend and compute payable locally
    remainingValueDisplay = (prorationData.remainingValuePaise || 0) / 100;
    const upgradedPlanPrice = (prorationData.subtotalPaise || 0) / 100;
    totalWithTax = Math.max(0, upgradedPlanPrice + addonsTotal - discountAmount - remainingValueDisplay);
    walletAppliedAmount = useWallet ? Math.min(walletBalance, totalWithTax) : 0;
    finalPayable = Math.max(0, totalWithTax - walletAppliedAmount);
  } else {
    // Local calculation for new subscriptions
    const totalWithTaxPaise = Math.max(0, subtotalPaise - discountPaise + taxOnExcludedPaise);
    totalWithTax = totalWithTaxPaise / 100;
    walletAppliedAmount = useWallet ? Math.min(walletBalance, totalWithTax) : 0;
    finalPayable = totalWithTax - walletAppliedAmount;
  }

  // Get addon details for display
  const getAddonDetailsForDisplay = () => {
    if (!form.selectedAddons || typeof form.selectedAddons !== "object") {
      return [];
    }
    
    const details = [];
    Object.keys(form.selectedAddons).forEach((addonValue) => {
      const addon = addonsData.find(a => a.value === addonValue);
      if (addon) {
        const qty = form.selectedAddons[addonValue];
        const price = (addon.pricePaise || 0) / 100;
        details.push({
          name: addon.name,
          value: addon.value,
          qty,
          price,
          lineTotal: price * qty
        });
      }
    });
    return details;
  };

  // ✅ Notify stepper when payment data is ready (AFTER calculations)
  useEffect(() => {
    if (onPaymentReady) {
      onPaymentReady({
        couponCode,
        useWallet,
        walletAppliedAmount,
        discountAmount,
        addonsArray: buildAddonsArray(),
        finalPayable,
        isUpgrade,
        prorationData: isUpgrade ? prorationData : null,
      });
    }
  }, [couponCode, useWallet, walletAppliedAmount, discountAmount, form.selectedAddons, addonsData, finalPayable, isUpgrade, prorationData, onPaymentReady, buildAddonsArray]);

  // ✅ Auto-switch wallet logic
  useEffect(() => {
    if (useWallet && walletBalance >= totalWithTax) {
      setPaymentMethod("WALLET_ONLY");
    } else if (paymentMethod === "WALLET_ONLY" && walletBalance < totalWithTax) {
      setPaymentMethod("RAZORPAY");
    }
  }, [walletBalance, totalWithTax, useWallet, paymentMethod]);

  // ✅ Handle Wallet Add/Deduct
  const handleWalletAction = async () => {
    if (!walletAmount || isNaN(walletAmount) || Number(walletAmount) <= 0) {
      setSnackbar({ open: true, message: "Please enter a valid amount", severity: "error" });
      return;
    }

    try {
      const amountInPaise = Number(walletAmount) * 100;
      const endpoint = walletDialogMode === "add" 
        ? `/saas/wallet/topup/${form._id}` 
        : `/saas/wallet/deduct/${form._id}`;

      const res = await api.post(endpoint, { amountPaise: amountInPaise });
      if (res.data && res.data.success === false) {
        setSnackbar({ open: true, message: res.data.message || 'Action failed', severity: 'error' });
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

  if (!plan) return <Loader />;

  return (
    <Card sx={{ p: 4, borderRadius: 3, width: "100%", maxWidth: 900, margin: "auto" }}>
      <CardContent>
        <Typography variant="h5" fontWeight={600} mb={2}>
          Payment Summary
        </Typography>

        <Typography variant="subtitle1" mb={1}>
          Plan: <strong>{plan.name}</strong>
        </Typography>

        <Divider sx={{ my: 2 }} />

       {/* ✅ Coupon Section */}
<Typography variant="h6" mb={1} fontWeight={600}>
  Coupon
</Typography>

{couponCode ? (
  <Alert
    severity="success"
    icon={false}
    sx={{
      mb: 2,
      p: 2,
      borderRadius: 2,
      backgroundColor: "success.light",
      color: "success.contrastText",
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
       <Button
      color="error"
      variant="contained"
      size="small"
      sx={{
        // ml: 2,
        textTransform: "none",
        borderRadius: 2,
        boxShadow: "none",
      }}
      onClick={() => {
        setCouponCode("");
        setDiscountAmount(0);
        setAlertMsg({
          type: "info",
          text: "Coupon removed successfully",
        });
      }}
    >
      Remove
    </Button>
    </Box>

   
  </Alert>
) : (
  <Button
    variant="outlined"
    color="primary"
    onClick={() => setCouponModalOpen(true)}
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
  onSelect={(coupon) => handleApplyCoupon(coupon.code)}
  companyId={form._id}
  planCode={form.plan?.code}
/>


        <Divider sx={{ my: 2 }} />

        {/* ✅ Summary */}
        <Box sx={{ mb: 3, p: 2, backgroundColor: "action.hover", borderRadius: 2 }}>
          <Typography variant="h6" fontWeight={600} mb={2}>📊 Price Breakdown</Typography>
          
          {/* Plan Price */}
          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1.5 }}>
            <Typography>Plan: <strong>{plan.name}</strong></Typography>
            <Typography fontWeight={600}>₹{planPrice.toFixed(2)}</Typography>
          </Box>

          {/* Add-ons Detailed Breakdown */}
          {getAddonDetailsForDisplay().length > 0 && (
            <>
              <Divider sx={{ my: 1.5 }} />
              <Typography variant="body2" fontWeight={600} sx={{ mb: 1, color: "primary.main" }}>
                📦 Add-ons:
              </Typography>
              <Box sx={{ ml: 2, mb: 1.5 }}>
                {getAddonDetailsForDisplay().map((addonDetail, idx) => (
                  <Box key={idx} sx={{ display: "flex", justifyContent: "space-between", mb: 0.8, opacity: 0.9 }}>
                    <Typography variant="body2">
                      {addonDetail.name} <span style={{ color: theme.palette.text.secondary }}>× {addonDetail.qty}</span>
                    </Typography>
                    <Typography variant="body2" fontWeight={500}>
                      ₹{addonDetail.lineTotal.toFixed(2)}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </>
          )}

          {getAddonDetailsForDisplay().length === 0 && (
            <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1.5, opacity: 0.6 }}>
              <Typography>Add-ons:</Typography>
              <Typography fontWeight={600}>₹0.00</Typography>
            </Box>
          )}

          <Divider sx={{ my: 1.5 }} />

          {/* Subtotal */}
          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1.5 }}>
            <Typography fontWeight={600}>Subtotal:</Typography>
            <Typography fontWeight={700} sx={{ fontSize: "1.05rem" }}>₹{subtotal.toFixed(2)}</Typography>
          </Box>

          {/* Discount */}
          {discountAmount > 0 && (
            <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1.5, color: "success.main" }}>
              <Typography>💚 Discount:</Typography>
              <Typography fontWeight={600} color="success.main">-₹{discountAmount.toFixed(2)}</Typography>
            </Box>
          )}

          {/* Proration Credit for Upgrades */}
          {isUpgrade && remainingValueDisplay > 0 && (
            <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1.5, color: "info.main" }}>
              <Typography>🔄 Current Plan Credit:</Typography>
              <Typography fontWeight={600} color="info.main">-₹{remainingValueDisplay.toFixed(2)}</Typography>
            </Box>
          )}

          {/* Amount after discount and proration */}
          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1.5 }}>
            <Typography fontWeight={600}>
              {isUpgrade ? "After Discount & Credit:" : "After Discount:"}
            </Typography>
            <Typography fontWeight={600}>
              ₹{totalWithTax.toFixed(2)}
            </Typography>
          </Box>

          {/* Tax Calculation */}
          {plan?.hasTax && (
            <Box sx={{ mb: 1.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1, borderRadius: 1, backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'action.selected' }}>
                <Typography fontWeight={500}>🧾 {plan?.taxName || "GST"} (18%):</Typography>
                <Box sx={{ textAlign: 'right' }}>
                  {taxFromIncludedPaise > 0 && (
                    <Typography variant="body2" sx={{ color: theme.palette.mode === 'dark' ? 'text.secondary' : 'text.secondary' }}>Included: ₹{(taxFromIncludedPaise/100).toFixed(2)}</Typography>
                  )}
                  {taxOnExcludedPaise > 0 && (
                    <Typography fontWeight={600} sx={{ color: theme.palette.warning.main }}>+₹{(taxOnExcludedPaise/100).toFixed(2)}</Typography>
                  )}
                </Box>
              </Box>
            </Box>
          )}

          <Divider sx={{ my: 1.5 }} />

          {/* Final Payable */}
          <Box sx={{ 
            display: "flex", 
            justifyContent: "space-between", 
            p: 1.5, 
            backgroundColor: theme.palette.mode === "dark" ? "primary.dark" : "primary.light",
            borderRadius: 1.5,
            border: `1px solid ${theme.palette.primary.main}`
          }}>
            <Typography sx={{ fontSize: "1.1rem", fontWeight: 700, color: theme.palette.mode === "dark" ? "primary.light" : "primary.main" }}>💳 Final Payable:</Typography>
            <Typography sx={{ fontSize: "1.2rem", fontWeight: 700, color: theme.palette.mode === "dark" ? "primary.light" : "primary.main" }}>₹{finalPayable.toFixed(2)}</Typography>
          </Box>

          {/* Wallet Applied */}
          {useWallet && walletAppliedAmount > 0 && (
            <Box sx={{ display: "flex", justifyContent: "space-between", mt: 1.5, color: "info.main" }}>
              <Typography>Wallet Used:</Typography>
              <Typography fontWeight={600} color="info.main">-₹{walletAppliedAmount.toFixed(2)}</Typography>
            </Box>
          )}
        </Box>

        {/* ✅ Wallet */}
        <Box mt={3}>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
            <FormControlLabel
              control={
                <Checkbox 
                  checked={useWallet} 
                  onChange={(e) => setUseWallet(e.target.checked)}
                  disabled={walletBalance <= 0}
                />
              }
              label={`Use Wallet (Balance ₹${walletBalance.toFixed(2)}) ${walletBalance <= 0 ? '- Disabled' : ''}`}
              sx={{ opacity: walletBalance <= 0 ? 0.6 : 1 }}
            />
            <Box sx={{ display: "flex", gap: 1 }}>
              <Button
                variant="outlined"
                size="small"
                sx={{
                  background: "linear-gradient(90deg, #4caf50, #81c784)",
                  color: "#fff",
                  border: "none",
                  "&:hover": { background: "linear-gradient(90deg, #388e3c, #66bb6a)" },
                }}
                onClick={() => { setWalletDialogMode("add"); setWalletDialogOpen(true); }}
              >
                ➕ Add
              </Button>
              <Button
                variant="outlined"
                size="small"
                sx={{
                  background: "linear-gradient(90deg, #f44336, #e57373)",
                  color: "#fff",
                  border: "none",
                  "&:hover": { background: "linear-gradient(90deg, #d32f2f, #ef5350)" },
                }}
                onClick={() => { setWalletDialogMode("deduct"); setWalletDialogOpen(true); }}
              >
                ➖ Deduct
              </Button>
            </Box>
          </Box>
        </Box>

        {/* ✅ Wallet Dialog */}
        <Dialog open={walletDialogOpen} onClose={() => setWalletDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ fontWeight: "bold", textAlign: "center" }}>
            {walletDialogMode === "add" ? "Add Balance" : "Deduct Balance"}
          </DialogTitle>
          <DialogContent>
              <RequiredTextField
                formik={null}
                name="walletAmount"
                label="Amount (₹)"
                fullWidth
                margin="dense"
                type="number"
                value={walletAmount}
                onChange={(e) => setWalletAmount(e.target.value)}
                sx={{ mt: 1 }}
              />
          </DialogContent>
          <DialogActions sx={{ justifyContent: "space-between", px: 3, pb: 2 }}>
            <Button onClick={() => { setWalletDialogOpen(false); setWalletAmount(""); }}>
              Cancel
            </Button>
            <Button 
              variant="contained" 
              onClick={handleWalletAction}
              sx={{
                background: walletDialogMode === "add" 
                  ? "linear-gradient(90deg, #4caf50, #81c784)" 
                  : "linear-gradient(90deg, #f44336, #e57373)",
              }}
            >
              {walletDialogMode === "add" ? "Add" : "Deduct"}
            </Button>
          </DialogActions>
        </Dialog>

        {/* ✅ Payment Method */}
        {/* {finalPayable > 0 && (
          <>
            <Divider sx={{ my: 2 }} />
            <Typography variant="h6">Payment Method</Typography>
            <RadioGroup
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              row
            >
              <FormControlLabel value="RAZORPAY" control={<Radio />} label="Online (Razorpay)" />
              <FormControlLabel value="OFFLINE" control={<Radio />} label="Offline / Manual" />
            </RadioGroup>
          </>
        )} */}

        {/* ✅ Confirm & Pay button moved to Stepper */}
        {/* Payment is now handled in the Stepper component */}

        {/* ✅ Snackbar for Wallet Actions */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={3000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          anchorOrigin={{ vertical: "top", horizontal: "right" }}
        >
          <Alert severity={snackbar.severity} sx={{ width: "100%" }}>
            {snackbar.message}
          </Alert>
        </Snackbar>
      </CardContent>
    </Card>
  );
}
