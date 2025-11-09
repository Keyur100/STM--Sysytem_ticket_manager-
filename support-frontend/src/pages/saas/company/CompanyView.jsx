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
} from "@mui/material";
import { useParams, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  getWallet,
  addWalletBalance,
  deductWalletBalance,
} from "../../../store/slices/saas/walletSlice";
import { getCompany } from "../../../store/slices/saas/companySlice";
import usePermissions from "../../../helpers/hooks/usePermissions";

const CompanyView = React.memo(() => {
  const { companyId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const { selected, loading } = useSelector((state) => state.company);
  const { wallet } = useSelector((state) => state.wallet);
  const { hasPermission } = usePermissions();
  const themeMode = useSelector((state) => state.ui.theme); // light or dark

  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState("add");
  const [amount, setAmount] = useState("");

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
      handleDialogClose();
    } catch (err) {
      setSnackbar({ open: true, message: err?.message || "Action failed", severity: "error" });
    }
  }, [dispatch, companyId, amount, dialogMode, handleDialogClose]);

  useEffect(() => {
    if (companyId) {
      dispatch(getCompany(companyId));
      dispatch(getWallet(companyId));
    }
  }, [dispatch, companyId]);

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

      {/* Company Info */}
      <Paper sx={{ p: 3, mb: 3, borderRadius: 2, background: getGradient("#e0f7fa", "#b2ebf2", "#004d40", "#00695c") }}>
        <Typography variant="h6" fontWeight="bold" mb={2}>Company Info</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <Typography><strong>Name:</strong> {selected?.name || "-"}</Typography>
            <Typography><strong>Contact:</strong> {selected?.contact?.phone || "-"}</Typography>
            <Typography><strong>Email:</strong> {selected?.contact?.email || "-"}</Typography>
            <Typography><strong>Status:</strong> {selected?.status || "-"}</Typography>
          </Grid>
          {/* <Grid item xs={12} sm={6}>
          </Grid> */}
        </Grid>
      </Paper>

      {/* Plan Info */}
      <Paper sx={{ p: 3, mb: 3, borderRadius: 2, background: getGradient("#e0f7fa", "#b2ebf2", "#004d40", "#00695c") }}>
        <Typography variant="h6" fontWeight="bold" mb={2}>Plan Info</Typography>
        <Typography><strong>Plan Name:</strong> {planData?.name || "-"}</Typography>
        <Typography><strong>Duration:</strong> {planData?.durationDays || "-"} days</Typography>
        <Typography><strong>Price:</strong> ₹{planData?.pricePaise ? planData.pricePaise / 100 : "-"}</Typography>
        {/* <Typography><strong>Plan Expiry:</strong> {selected?.planExpiry ? new Date(selected.planExpiry).toLocaleDateString() : "-"}</Typography> */}
      </Paper>

      {/* Wallet */}
      <Paper sx={{ p: 3, mb: 3, borderRadius: 2, background: getGradient("#e0f7fa", "#b2ebf2", "#004d40", "#00695c") }}>
        <Typography variant="h6" fontWeight="bold" mb={2}>Wallet</Typography>
        <Typography fontWeight="bold" mb={2}>Current Balance: ₹{wallet?.balance ? wallet.balance / 100 : 0}</Typography>
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
      </Paper>

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
        {selected?.transactions?.length ? (
          selected.transactions.map((txn, idx) => (
            <Paper
              key={idx}
              sx={{
                p: 2,
                mb: 1,
                borderRadius: 2,
                background: txn.type.includes("CREDIT")
                  ? getGradient("#d0f0c0", "#a8e6a2", "#00695c", "#00897b")
                  : getGradient("#f8d7da", "#f1a2a5", "#b71c1c", "#c62828"),
              }}
            >
              <Typography fontWeight="bold">
                {txn.type === "NEW_SUBSCRIPTION" ? "📦 Subscription Purchase" :
                 txn.type === "WALLET_CREDIT" ? "💰 Wallet Credit" : "💸 Wallet Debit"}
              </Typography>
              <Typography>Amount: ₹{txn.amountPaise / 100}</Typography>
              <Typography variant="body2" color="text.secondary">
                Date: {txn.date ? new Date(txn.date).toLocaleString() : "-"}
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
    </Box>
  );
});

export default CompanyView;
