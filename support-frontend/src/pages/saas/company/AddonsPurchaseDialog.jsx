import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Grid,
  Typography,
  TextField,
  Checkbox,
  FormControlLabel,
  Divider,
  Alert,
  Snackbar,
} from "@mui/material";
import api from "../../../api/axios";
import CouponModal from "./CompanyFormStepper/CouponModal";
// import CouponModal from "./CompanyPaymentStep/CouponModal";

export default function AddonsPurchaseDialog({ open, onClose, companyId, onSuccess }) {
  const [addons, setAddons] = useState([]);
  const [selected, setSelected] = useState({});
  const [coupon, setCoupon] = useState("");
  const [discountPaise, setDiscountPaise] = useState(0);
  const [useWallet, setUseWallet] = useState(false);
  const [loading, setLoading] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);
  const [couponModalOpen, setCouponModalOpen] = useState(false);
  const [alert, setAlert] = useState(null);
  const [walletDialogOpen, setWalletDialogOpen] = useState(false);
  const [walletDialogMode, setWalletDialogMode] = useState("add");
  const [walletAmount, setWalletAmount] = useState("");
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const res = await api.get("/saas/addons");
        setAddons(res.data?.addons || res.data || []);
      } catch (e) {
        setAddons([]);
      }

      try {
        const w = await api.get(`/saas/wallet/${companyId}`);
        setWalletBalance((w?.wallet?.balancePaise || 0) / 100);
      } catch (e) {
        setWalletBalance(0);
      }
    })();
  }, [open, companyId]);

  const changeQty = (value, qty) => {
    const q = Math.max(0, Number(qty || 0));
    setSelected((s) => ({ ...s, [value]: q }));
  };

  const buildItems = () => {
    const items = [];
    addons.forEach((a) => {
      const qty = selected[a.value] || 0;
      if (qty > 0) items.push({ addonId: a._id, qty, addon: a });
    });
    return items;
  };

  const calculateSubtotalPaise = () => {
    let total = 0;
    addons.forEach((a) => {
      const qty = selected[a.value] || 0;
      total += (a.pricePaise || 0) * qty;
    });
    return total;
  };

  const TAX_PERCENT = 18;

  const applyCoupon = async (code) => {
    const items = buildItems();
    if (!items.length) return setAlert({ type: 'error', message: 'Select at least one add-on first' });
    try {
      const totalPaise = calculateSubtotalPaise();
      const res = await api.post('/saas/coupons/apply', { code, amountPaise: totalPaise, planCode: null, companyId });
      if (res.data && res.data.success === false) return setAlert({ type: 'error', message: res.data.message });
      const dp = (res.data && (res.data.discountPaise ?? res.data.data?.discountPaise)) || 0;
      setDiscountPaise(dp);
      setCoupon(code);
      setAlert({ type: 'success', message: `Coupon applied: -₹${(dp/100).toFixed(2)}` });
    } catch (err) {
      setAlert({ type: 'error', message: err.message || err.response?.data?.message || 'Coupon apply failed' });
    }
  };

  const calculateTaxPaise = () => {
    let taxIncluded = 0;
    let taxExcludedBase = 0;
    addons.forEach((a) => {
      const qty = selected[a.value] || 0;
      if (!qty) return;
      const linePaise = (a.pricePaise || 0) * qty;
      if (a.hasTax) {
        if (a.taxIncluded) taxIncluded += Math.round((linePaise * TAX_PERCENT) / (100 + TAX_PERCENT));
        else taxExcludedBase += linePaise;
      }
    });
    return { taxIncluded, taxExcludedBase, taxOnExcluded: Math.round((taxExcludedBase) * (TAX_PERCENT/100)) };
  };

  const subtotalPaise = calculateSubtotalPaise();
  // discountPaise is set when coupon applied
  const taxParts = calculateTaxPaise();
  const totalPaise = Math.max(0, subtotalPaise - discountPaise + taxParts.taxOnExcluded);
  const walletAppliedPaise = useWallet ? Math.min(Math.round(walletBalance*100), totalPaise) : 0;
  const payablePaise = Math.max(0, totalPaise - walletAppliedPaise);

  const handleBuy = async () => {
    const items = buildItems().map((it) => ({ addonId: it.addonId, qty: it.qty }));
    if (items.length === 0) return setAlert({ type: 'error', message: 'Select at least one add-on' });

    setLoading(true);
    try {
      const payload = { addons: items, useWallet, couponCode: coupon };
      const res = await api.post(`/saas/company/${companyId}/addons/purchase`, payload);
      if (res.data && res.data.success === false) {
        setAlert({ type: 'error', message: res.data.message || 'Purchase failed' });
        return;
      }
      onSuccess && onSuccess(res.data);
      onClose();
    } catch (err) {
      setAlert({ type: 'error', message: err.response?.data?.message || err.message || 'Purchase failed' });
    } finally {
      setLoading(false);
    }
  };

  const openWalletDialog = (mode) => {
    setWalletDialogMode(mode);
    setWalletDialogOpen(true);
    setWalletAmount("");
  };

  const handleWalletAction = async () => {
    if (!walletAmount || isNaN(walletAmount) || Number(walletAmount) <= 0) {
      setSnackbar({ open: true, message: "Please enter a valid amount", severity: "error" });
      return;
    }

    try {
      const amountInPaise = Math.round(Number(walletAmount) * 100);
      const endpoint = walletDialogMode === "add" ? `/saas/wallet/topup/${companyId}` : `/saas/wallet/deduct/${companyId}`;
      const res = await api.post(endpoint, { amountPaise: amountInPaise });
      if (res.data && res.data.success === false) {
        setSnackbar({ open: true, message: res.data.message || 'Action failed', severity: 'error' });
        return;
      }

      setSnackbar({ open: true, message: `Balance ${walletDialogMode === 'add' ? 'added' : 'deducted'} successfully!`, severity: 'success' });
      // refresh wallet
      try {
        const w = await api.get(`/saas/wallet/${companyId}`);
        setWalletBalance((w?.wallet?.balancePaise || 0) / 100);
      } catch (e) {
        // ignore
      }
      setWalletDialogOpen(false);
      setWalletAmount("");
    } catch (err) {
      setSnackbar({ open: true, message: err.response?.data?.message || err.message || 'Action failed', severity: 'error' });
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Purchase Add-ons</DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 1 }}>
          <Grid container spacing={2}>
            {addons.map((a) => (
              <Grid item xs={12} sm={6} key={a._id}>
                <Box sx={{ border: "1px solid #eee", p: 1, borderRadius: 1 }}>
                  <Typography variant="subtitle2">{a.name}</Typography>
                  <Typography variant="body2">₹{((a.pricePaise || 0) / 100).toFixed(2)}</Typography>
                  <Box display="flex" gap={1} alignItems="center" sx={{ mt: 1 }}>
                    <Button size="small" onClick={() => changeQty(a.value, (selected[a.value] || 0) - 1)}>-</Button>
                    <TextField size="small" value={selected[a.value] || 0} onChange={(e) => changeQty(a.value, e.target.value)} sx={{ width: 64 }} />
                    <Button size="small" onClick={() => changeQty(a.value, (selected[a.value] || 0) + 1)}>+</Button>
                  </Box>
                </Box>
              </Grid>
            ))}
          </Grid>

          <Box sx={{ mt: 2 }}>
            <Button variant="outlined" onClick={() => setCouponModalOpen(true)} sx={{ mb: 1 }}>Select Coupon</Button>
            <Box sx={{ display: 'inline-flex', gap: 1, ml: 1 }}>
              <Button
                variant="contained"
                size="small"
                onClick={() => openWalletDialog('add')}
                sx={{
                  background: "linear-gradient(90deg, #4caf50, #81c784)",
                  color: "#fff",
                  border: "none",
                  boxShadow: 'none',
                  textTransform: 'none'
                }}
              >➕ Add</Button>
              <Button
                variant="contained"
                size="small"
                onClick={() => openWalletDialog('deduct')}
                sx={{
                  background: "linear-gradient(90deg, #f44336, #e57373)",
                  color: "#fff",
                  border: "none",
                  boxShadow: 'none',
                  textTransform: 'none'
                }}
              >➖ Deduct</Button>
            </Box>
            {coupon && (
              <Alert
                severity="success"
                action={<Button size="small" onClick={() => { setCoupon(""); setDiscountPaise(0); setAlert({ type: 'info', message: 'Coupon removed' }); }}>Remove</Button>}
              >
                Applied: {coupon} — -₹{(discountPaise/100).toFixed(2)}
              </Alert>
            )}
            <Box sx={{ mt: 2 }}>
              <Typography variant="h6">Price Breakdown</Typography>
              <Divider sx={{ my: 1 }} />
              <Box display="flex" justifyContent="space-between"><Typography>Subtotal</Typography><Typography>₹{(subtotalPaise/100).toFixed(2)}</Typography></Box>
              {discountPaise > 0 && (
                <Box display="flex" justifyContent="space-between"><Typography>Coupon Discount</Typography><Typography>-₹{(discountPaise/100).toFixed(2)}</Typography></Box>
              )}
              <Box display="flex" justifyContent="space-between"><Typography>Tax (included)</Typography><Typography>₹{(taxParts.taxIncluded/100).toFixed(2)}</Typography></Box>
              <Box display="flex" justifyContent="space-between"><Typography>Tax (to add)</Typography><Typography>₹{(taxParts.taxOnExcluded/100).toFixed(2)}</Typography></Box>
              <Box display="flex" justifyContent="space-between"><Typography>Wallet Balance</Typography><Typography>₹{walletBalance.toFixed(2)}</Typography></Box>
              <FormControlLabel control={<Checkbox checked={useWallet} onChange={(e) => setUseWallet(e.target.checked)} />} label="Use Wallet Balance" />
              <Divider sx={{ my: 1 }} />
              <Box display="flex" justifyContent="space-between"><Typography fontWeight={700}>Total Payable</Typography><Typography fontWeight={700}>₹{(payablePaise/100).toFixed(2)}</Typography></Box>
            </Box>
          </Box>

          <CouponModal open={couponModalOpen} onClose={() => setCouponModalOpen(false)} onSelect={(c) => applyCoupon(c.code)} companyId={companyId} />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleBuy} disabled={loading} variant="contained">{loading ? "Processing..." : "Buy"}</Button>
      </DialogActions>

      {/* Wallet Dialog */}
      <Dialog open={walletDialogOpen} onClose={() => setWalletDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ textAlign: 'center', fontWeight: 'bold' }}>{walletDialogMode === 'add' ? 'Add Balance' : 'Deduct Balance'}</DialogTitle>
        <DialogContent>
          <TextField
            label="Amount (₹)"
            fullWidth
            margin="dense"
            type="number"
            value={walletAmount}
            onChange={(e) => setWalletAmount(e.target.value)}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'space-between', px: 3, pb: 2 }}>
          <Button onClick={() => { setWalletDialogOpen(false); setWalletAmount(''); }}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleWalletAction}
            sx={{
              background: walletDialogMode === 'add' ? "linear-gradient(90deg, #4caf50, #81c784)" : "linear-gradient(90deg, #f44336, #e57373)",
              color: '#fff'
            }}
          >{walletDialogMode === 'add' ? 'Add' : 'Deduct'}</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar({ ...snackbar, open: false })} anchorOrigin={{ vertical: 'top', horizontal: 'right' }}>
        <Alert severity={snackbar.severity} sx={{ width: '100%' }}>{snackbar.message}</Alert>
      </Snackbar>
    </Dialog>
  );
}
