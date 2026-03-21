import React, { useEffect, useState, useCallback } from "react";
import {
  Box,
  Typography,
  Paper,
  Grid,
  Button,
  Snackbar,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from "@mui/material";
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useParams, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  getWallet,
  addWalletBalance,
  deductWalletBalance,
} from "../../../store/slices/saas/walletSlice";
import { getCompany } from "../../../store/slices/saas/companySlice";
import usePermissions from "../../../helpers/hooks/usePermissions";
import api from "../../../api/axios";
import AddonsPurchaseDialog from "./AddonsPurchaseDialog";
import DowngradeDialog from "./DowngradeDialog";

const CompanyView = React.memo(() => {
  const { companyId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const { selected, loading } = useSelector((state) => state.company);
  const { wallet } = useSelector((state) => state.wallet);
  const { hasPermission } = usePermissions();
  const themeMode = useSelector((state) => state.ui.theme); // light or dark

  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const [openAddons, setOpenAddons] = useState(false);
  const [openDowngrade, setOpenDowngrade] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState("add");
  const [amount, setAmount] = useState("");
  const [transactions, setTransactions] = useState([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [branches, setBranches] = useState([]);
  const [clientUsers, setClientUsers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentDialogOrder, setPaymentDialogOrder] = useState(null);

  // ✅ Define fetchTransactions FIRST (before other callbacks that use it)
  const fetchTransactions = useCallback(async (id) => {
    setLoadingTransactions(true);
    try {
      const res = await api.get(`/saas/company/${id}/transactions?limit=50&page=1`);
      setTransactions(res.data?.transactions || []);
    } catch (err) {
      console.error("Error fetching transactions:", err);
      setSnackbar({ open: true, message: "Failed to fetch transactions", severity: "error" });
    } finally {
      setLoadingTransactions(false);
    }
  }, []);

  const handleCloseSnackbar = useCallback(() => setSnackbar((prev) => ({ ...prev, open: false })), []);
  const openWalletDialog = useCallback((mode) => { setDialogMode(mode); setDialogOpen(true); }, []);
  const handleDialogClose = useCallback(() => { setDialogOpen(false); setAmount(""); }, []);

  const handleWalletAction = useCallback(async () => {
    if (!amount || isNaN(amount)) {
      setSnackbar({ open: true, message: "Please enter a valid amount", severity: "error" });
      return;
    }
    const payload = { companyId, amount: Number(amount) };
    try {
      if (dialogMode === "add") {
        await dispatch(addWalletBalance(payload)).unwrap();
        dispatch(getCompany(companyId));

        setSnackbar({ open: true, message: "Balance added successfully!", severity: "success" });
      } else {
        await dispatch(deductWalletBalance(payload)).unwrap();
        dispatch(getCompany(companyId));

        setSnackbar({ open: true, message: "Balance deducted successfully!", severity: "success" });
      }
      dispatch(getWallet(companyId));
      fetchTransactions(companyId);
      handleDialogClose();
    } catch (err) {
      setSnackbar({ open: true, message: err?.message || "Action failed", severity: "error" });
    }
  }, [dispatch, companyId, amount, dialogMode, handleDialogClose, fetchTransactions]);

  const handleAddonsSuccess = useCallback((data) => {
    dispatch(getCompany(companyId));
    dispatch(getWallet(companyId));
    fetchTransactions(companyId);
    setSnackbar({ open: true, message: "Add-ons purchase created", severity: "success" });
  }, [dispatch, companyId, fetchTransactions]);

  const handleDowngradeSuccess = useCallback(() => {
    dispatch(getCompany(companyId));
    setSnackbar({ open: true, message: "Downgrade scheduled", severity: "success" });
  }, [dispatch, companyId]);

  useEffect(() => {
    if (companyId) {
      dispatch(getCompany(companyId));
      dispatch(getWallet(companyId));
      fetchTransactions(companyId);
      // fetch full details including branches & client users
      (async () => {
        try {
          const res = await api.get(`/saas/company/${companyId}/full-details`);
          const data = res.data || {};
          setBranches(data.branches || []);
          setClientUsers(data.clientUsers || []);
          setOrders(data.orderSummary?.recentOrders || []);
        } catch (err) {
          console.error('Failed to fetch company full details', err);
        }
      })();
    }
  }, [dispatch, companyId, fetchTransactions]);

  const planData = selected?.plan || {};

  if (loading) return (
    <Box display="flex" justifyContent="center" alignItems="center" height="80vh">
      <CircularProgress />
    </Box>
  );

  // Gradient helper based on theme
  const getGradient = (lightStart, lightEnd, darkStart, darkEnd) =>
    themeMode === "dark"
      ? `linear-gradient(90deg, ${darkStart}, ${darkEnd})`
      : `linear-gradient(90deg, ${lightStart}, ${lightEnd})`;

  return (
    <Box p={3} maxWidth="900px" mx="auto">
      {/* Back Button */}
      <Button variant="outlined" onClick={() => navigate(-1)} sx={{ mb: 3 }}>← Back</Button>

      {/* Company Info (Accordion) */}
      <Accordion defaultExpanded sx={{ mb: 2 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6" fontWeight="bold">Company Info</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Typography><strong>Name:</strong> {selected?.name || "-"}</Typography>
              <Typography><strong>Contact:</strong> {selected?.contact?.phone || "-"}</Typography>
              <Typography><strong>Email:</strong> {selected?.contact?.email || "-"}</Typography>
              <Typography><strong>Status:</strong> {selected?.status || "-"}</Typography>
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* Plan Info */}
      <Accordion sx={{ mb: 2 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6" fontWeight="bold">Plan Info</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box>
            <Typography><strong>Plan Name:</strong> {planData?.name || "-"}</Typography>
            <Typography><strong>Duration:</strong> {planData?.durationDays || "-"} days</Typography>
            <Typography><strong>Price:</strong> ₹{planData?.pricePaise ? planData.pricePaise / 100 : "-"}</Typography>
            <Box display="flex" gap={2} sx={{ mt: 2 }}>
              <Button variant="outlined" onClick={() => navigate(`/branches?companyId=${companyId}`)}>Manage Branches</Button>
              {hasPermission("saas.addon_buy") && (
                <Button variant="contained" onClick={() => setOpenAddons(true)}>Purchase Add-ons</Button>
              )}
              {hasPermission("saas.subscription_downgrade") && (
                <Button variant="outlined" color="warning" onClick={() => setOpenDowngrade(true)}>Schedule Downgrade</Button>
              )}
            </Box>

            {/* Branches */}
            {branches && branches.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle1" fontWeight="bold">Branches</Typography>
                {branches.map((b) => (
                  <Paper key={b._id} sx={{ p: 1, mt: 1, background: themeMode === 'dark' ? '#2c2c2c' : '#fff', color: themeMode === 'dark' ? '#fff' : 'inherit' }}>
                    <Typography><strong>{b.name}</strong> — {b.address || '-'}</Typography>
                    <Typography variant="caption">Phone: {b.phone || '-'} • Email: {b.email || '-'}</Typography>
                  </Paper>
                ))}
              </Box>
            )}

            {/* Addons snapshot (if any) */}
            {planData?.addonSnapshot && planData.addonSnapshot.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle1" fontWeight="bold">Add-ons</Typography>
                {planData.addonSnapshot.map((addon, idx) => {
                  const qty = addon.qty || addon.quantity || 1;
                  const price = (addon.pricePaise || 0) / 100;
                  return (
                    <Box key={idx} sx={{ mt: 1 }}>
                      <Typography>• {addon.name} — {qty} × ₹{price.toFixed(2)} = ₹{(price * qty).toFixed(2)}</Typography>
                    </Box>
                  );
                })}
              </Box>
            )}

            {/* Client Users */}
            {clientUsers && clientUsers.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle1" fontWeight="bold">Client Users</Typography>
                {clientUsers.map((u) => (
                  <Paper key={u._id} sx={{ p: 1, mt: 1, background: themeMode === 'dark' ? '#2c2c2c' : '#fff', color: themeMode === 'dark' ? '#fff' : 'inherit' }}>
                    <Typography><strong>{u.name}</strong> — {u.email}</Typography>
                    <Typography variant="caption">Phone: {u.phone || '-'}</Typography>
                  </Paper>
                ))}
              </Box>
            )}
          </Box>
        </AccordionDetails>
      </Accordion>

      {/* Wallet */}
      <Accordion sx={{ mb: 2 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6" fontWeight="bold">Wallet</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box>
            <Typography fontWeight="bold" mb={2}>Current Balance: ₹{wallet?.balancePaise ? wallet.balancePaise / 100 : 0}</Typography>
            {hasPermission("saas.wallet_topup") && (
              <Box display="flex" gap={2} flexWrap="wrap">
                <Button
                  onClick={() => openWalletDialog("add")}
                  sx={{
                    background: "linear-gradient(90deg, #4caf50, #81c784)",
                    color: "#fff",
                    "&:hover": { background: "linear-gradient(90deg, #388e3c, #66bb6a)" },
                  }}
                >➕ Add Balance</Button>
                <Button
                  onClick={() => openWalletDialog("deduct")}
                  sx={{
                    background: "linear-gradient(90deg, #f44336, #e57373)",
                    color: "#fff",
                    "&:hover": { background: "linear-gradient(90deg, #d32f2f, #ef5350)" },
                  }}
                >➖ Deduct Balance</Button>
              </Box>
            )}
          </Box>
        </AccordionDetails>
      </Accordion>

      {/* Orders */}
      <Accordion sx={{ mb: 2 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6" fontWeight="bold">Orders</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box>
            <Typography variant="subtitle1" fontWeight="600">Plan Orders</Typography>
            {orders.filter(o => (o.orderType || '').toLowerCase().includes('subscription') || (o.items || []).some(i => i.type === 'plan')).length === 0 && (
              <Typography sx={{ mb: 1 }}>No plan orders found.</Typography>
            )}
            {orders.filter(o => (o.orderType || '').toLowerCase().includes('subscription') || (o.items || []).some(i => i.type === 'plan')).map((o) => (
              <Paper key={o._id} sx={{ p: 1, mt: 1 }}>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography fontWeight={600}>Order #{o.orderNumber || String(o._id).slice(-6)}</Typography>
                    <Typography variant="body2">Status: {o.status}</Typography>
                  </Box>
                  <Box>
                    <Button size="small" onClick={() => { setPaymentDialogOrder(o); setPaymentDialogOpen(true); }}>View Payment History</Button>
                  </Box>
                </Box>
                <Box sx={{ mt: 1 }}>
                  <Box display="flex" justifyContent="space-between"><Typography>Subtotal</Typography><Typography>₹{((o.totals?.subtotalPaise||0)/100).toFixed(2)}</Typography></Box>
                  <Box display="flex" justifyContent="space-between"><Typography>Coupon Discount</Typography><Typography>-₹{((o.totals?.totalDiscountPaise||0)/100).toFixed(2)}</Typography></Box>
                  <Box display="flex" justifyContent="space-between"><Typography>Tax</Typography><Typography>₹{((o.totals?.totalTaxPaise||0)/100).toFixed(2)}</Typography></Box>
                  <Box display="flex" justifyContent="space-between" sx={{ mt: 1 }}><Typography fontWeight={700}>Total Payable</Typography><Typography fontWeight={700}>₹{((o.totals?.totalPayablePaise||0)/100).toFixed(2)}</Typography></Box>
                </Box>
              </Paper>
            ))}

            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle1" fontWeight="600">Add-on Orders</Typography>
              {orders.filter(o => (o.orderType || '').toLowerCase().includes('addon') || (o.items || []).some(i => i.type === 'addon')).length === 0 && (
                <Typography sx={{ mb: 1 }}>No add-on orders found.</Typography>
              )}
              {orders.filter(o => (o.orderType || '').toLowerCase().includes('addon') || (o.items || []).some(i => i.type === 'addon')).map((o) => (
                <Paper key={o._id} sx={{ p: 1, mt: 1 }}>
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Box>
                      <Typography fontWeight={600}>Order #{o.orderNumber || String(o._id).slice(-6)}</Typography>
                      <Typography variant="body2">Status: {o.status}</Typography>
                    </Box>
                    <Box>
                      <Button size="small" onClick={() => { setPaymentDialogOrder(o); setPaymentDialogOpen(true); }}>View Payment History</Button>
                    </Box>
                  </Box>
                  <Box sx={{ mt: 1 }}>
                    <Box display="flex" justifyContent="space-between"><Typography>Subtotal</Typography><Typography>₹{((o.totals?.subtotalPaise||0)/100).toFixed(2)}</Typography></Box>
                    <Box display="flex" justifyContent="space-between"><Typography>Coupon Discount</Typography><Typography>-₹{((o.totals?.totalDiscountPaise||0)/100).toFixed(2)}</Typography></Box>
                    <Box display="flex" justifyContent="space-between"><Typography>Tax</Typography><Typography>₹{((o.totals?.totalTaxPaise||0)/100).toFixed(2)}</Typography></Box>
                    <Box display="flex" justifyContent="space-between" sx={{ mt: 1 }}><Typography fontWeight={700}>Total Payable</Typography><Typography fontWeight={700}>₹{((o.totals?.totalPayablePaise||0)/100).toFixed(2)}</Typography></Box>
                  </Box>
                </Paper>
              ))}
            </Box>
          </Box>
        </AccordionDetails>
      </Accordion>

      {/* Payment History Dialog */}
      <Dialog open={paymentDialogOpen} onClose={() => setPaymentDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Payment History</DialogTitle>
        <DialogContent>
          {paymentDialogOrder ? (
            (paymentDialogOrder.payments || []).length ? (
              (paymentDialogOrder.payments || []).map((p) => (
                <Paper key={p._id} sx={{ p: 1, mb: 1 }}>
                  <Typography><strong>{p.method}</strong> — ₹{((p.amountPaise||0)/100).toFixed(2)}</Typography>
                  <Typography variant="body2">Transaction: {p.referenceId || '-'}</Typography>
                  <Typography variant="body2" color="text.secondary">Date: {p.paidAt ? new Date(p.paidAt).toLocaleString() : '-'}</Typography>
                </Paper>
              ))
            ) : (
              <Typography>No payments found for this order.</Typography>
            )
          ) : (
            <Typography>Select an order to view payments.</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPaymentDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Transactions - Scrollable */}
      <Paper
        sx={{
          p: 3,
          mb: 3,
          borderRadius: 2,
          background: getGradient("#e0f7fa", "#b2ebf2", "#004d40", "#00695c"),
          maxHeight: "400px",
          overflowY: "auto",
        }}
      >
        <Typography variant="h6" fontWeight="bold" mb={2}>Transactions</Typography>
        {loadingTransactions ? (
          <Box display="flex" justifyContent="center" p={2}>
            <CircularProgress size={30} />
          </Box>
        ) : transactions?.length ? (
          transactions.map((txn, idx) => (
            <Paper
              key={idx}
              sx={{
                p: 2,
                mb: 1,
                borderRadius: 2,
                background: 
                  txn.type === "WALLET_CREDIT" || txn.type === "REFUND"
                    ? getGradient("#d0f0c0", "#a8e6a2", "#00695c", "#00897b")
                    : getGradient("#f8d7da", "#f1a2a5", "#b71c1c", "#c62828"),
              }}
            >
              <Typography fontWeight="bold">
                {txn.type === "SUBSCRIPTION_PURCHASE" ? "📦 Subscription Purchase" :
                 txn.type === "WALLET_CREDIT" ? "💰 Wallet Credit" :
                 txn.type === "WALLET_DEBIT" ? "💸 Wallet Debit" :
                 txn.type === "REFUND" ? "🔄 Refund" :
                 txn.type === "ADJUSTMENT" ? "⚙️ Adjustment" : "📝 " + txn.type}
              </Typography>
              <Typography>Amount: ₹{(txn.amountPaise / 100).toFixed(2)}</Typography>
              <Typography variant="body2">Source: {txn.source || "-"}</Typography>
              {txn.description && <Typography variant="body2">Description: {txn.description}</Typography>}
              <Typography variant="body2" color="text.secondary">
                Date: {txn.createdAt ? new Date(txn.createdAt).toLocaleString() : "-"}
              </Typography>
            </Paper>
          ))
        ) : (
          <Typography>No transactions found.</Typography>
        )}
      </Paper>

      {/* Wallet Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={handleDialogClose}
        PaperProps={{
          sx: {
            borderRadius: 3,
            p: 2,
            minWidth: { xs: "280px", sm: "400px" },
            background: themeMode === "dark" ? "#1e1e1e" : "#f0f9ff",
            boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
          },
        }}
      >
        <DialogTitle
          sx={{
            fontWeight: "bold",
            fontSize: "1.2rem",
            textAlign: "center",
            color: themeMode === "dark" ? "#fff" : "#00796b",
          }}
        >
          {dialogMode === "add" ? "Add Balance" : "Deduct Balance"}
        </DialogTitle>

        <DialogContent>
          <TextField
            label="Amount (₹)"
            fullWidth
            margin="dense"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            sx={{
              mt: 1,
              mb: 2,
              "& .MuiInputBase-root": {
                borderRadius: 2,
                backgroundColor: themeMode === "dark" ? "#2c2c2c" : "#fff",
              },
            }}
          />
        </DialogContent>

        <DialogActions sx={{ justifyContent: "space-between", px: 3, pb: 2 }}>
          <Button
            onClick={handleDialogClose}
            sx={{
              borderRadius: 2,
              textTransform: "none",
              color: themeMode === "dark" ? "#fff" : "#00796b",
              border: `1px solid ${themeMode === "dark" ? "#555" : "#00796b"}`,
              "&:hover": {
                backgroundColor: themeMode === "dark" ? "#333" : "#b2ebf2",
              },
            }}
          >
            Cancel
          </Button>

          <Button
            variant="contained"
            onClick={handleWalletAction}
            sx={{
              borderRadius: 2,
              textTransform: "none",
              px: 3,
              background: dialogMode === "add"
                ? "linear-gradient(135deg, #43e97b, #38f9d7)"
                : "linear-gradient(135deg, #ff6a6a, #ff8c8c)",
              color: "#fff",
              fontWeight: 600,
              "&:hover": {
                background: dialogMode === "add"
                  ? "linear-gradient(135deg, #0b937aff, #43e97b)"
                  : "linear-gradient(135deg, #ce5151ff, #ff6a6a)",
              },
              boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
            }}
          >
            {dialogMode === "add" ? "Add" : "Deduct"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* Addons & Downgrade Dialogs */}
      <AddonsPurchaseDialog
        open={openAddons}
        onClose={() => setOpenAddons(false)}
        companyId={companyId}
        onSuccess={handleAddonsSuccess}
      />

      <DowngradeDialog
        open={openDowngrade}
        onClose={() => setOpenDowngrade(false)}
        subscription={selected?.subscription || selected}
        targetPlan={selected?.plan}
        onSuccess={handleDowngradeSuccess}
      />
    </Box>
  );
});

export default CompanyView;

// Addons purchase dialog
// Note: dialogs are defined in separate files under same folder
