import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Alert,
  CircularProgress,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from "@mui/material";
import api from "../../../api/axios";

export default function CashPaymentDialog({ open, company, onClose, onSuccess }) {
  // support both shapes: { _id, name, ... } or { company: { _id, name }, plan, ... }
  const currentCompany = company?.company || company || null;
  const currentPlan = company?.plan || null;
  const [cashReceiptNo, setCashReceiptNo] = useState("");
  const [orders, setOrders] = useState([]);
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetchingOrders, setFetchingOrders] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Fetch orders for the company when dialog opens
  useEffect(() => {
    console.log("CashPaymentDialog open:", open, "companyId:", currentCompany?._id);
    if (open && currentCompany?._id) {
      fetchOrders();
    }
  }, [open, currentCompany?._id]);

  // Generate a reasonably-unique cash receipt number when dialog opens
  useEffect(() => {
    if (!open) return;
    const gen = () => {
      const d = new Date();
      const datePart = d.toISOString().slice(0,10).replace(/-/g,'');
      const rnd = Math.floor(Math.random() * 900000) + 100000; // 6 digits
      return `CASH-${datePart}-${rnd}`;
    };
    setCashReceiptNo(gen());
  }, [open]);

  const fetchOrders = async () => {
    try {
      setFetchingOrders(true);
      const response = await api.get(`/saas/order`, {
        params: {
            companyId: currentCompany._id,
            // Filter for unpaid/partial orders (use actual DB status keys)
            status: ["partially_paid", "pending"],
            limit: 100,
          },
      });
      const orderList = Array.isArray(response.data)
        ? response.data
        : response.data?.items || response.data?.data || [];
      setOrders(orderList);
      if (orderList.length > 0) {
        setSelectedOrderId(orderList[0]._id);
      }
    } catch (err) {
      console.error("Error fetching orders:", err);
      setError("Failed to load company orders");
    } finally {
      setFetchingOrders(false);
    }
  };

  const handleSubmit = async () => {
    try {
      setError("");
      setSuccess("");

      if (!cashReceiptNo.trim()) {
        setError("Cash receipt number is required");
        return;
      }

      if (!selectedOrderId) {
        setError("Please select an order");
        return;
      }

      setLoading(true);

      const response = await api.post(
        `/saas/company/${currentCompany._id}/record-cash-payment`,
        {
          orderId: selectedOrderId,
          cashReceiptNo: cashReceiptNo.trim(),
        }
      );

      setSuccess(response.data?.message || "Cash payment recorded successfully!");
      setCashReceiptNo("");
      setSelectedOrderId("");

      // Callback to refresh parent list
      setTimeout(() => {
        onClose();
        onSuccess?.();
      }, 1500);
    } catch (err) {
      console.error("Error recording payment:", err);
      setError(err.response?.data?.message || "Failed to record cash payment");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setCashReceiptNo("");
      setSelectedOrderId("");
      setError("");
      setSuccess("");
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 600, fontSize: 18 }}>
        💰 Record Cash Payment
      </DialogTitle>

      <DialogContent sx={{ pt: 2 }}>
        {/* Company Info */}
        <Box mb={2}>
          <Typography variant="body2" color="textSecondary" mb={0.5}>
            Company
          </Typography>
            <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
            {currentCompany?.name}
          </Typography>
        </Box>

        {/* Plan Info */}
        {currentPlan && (
          <Box mb={2}>
            <Typography variant="body2" color="textSecondary" mb={0.5}>
              Plan
            </Typography>
            <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
              {currentPlan?.planSnapshot?.name || currentPlan?.planSnapshot?.code || currentPlan?.name || currentPlan}
            </Typography>
          </Box>
        )}

        {/* Error Alert */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Success Alert */}
        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}

        {/* Loading Orders */}
        {fetchingOrders && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
            <CircularProgress size={20} />
            <Typography variant="body2">Loading orders...</Typography>
          </Box>
        )}

        {/* Order Selection */}
        {!success && !fetchingOrders && orders.length > 0 && (
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Select Order</InputLabel>
            <Select
              value={selectedOrderId}
              onChange={(e) => setSelectedOrderId(e.target.value)}
              disabled={loading}
              label="Select Order"
            >
              {orders.map((order) => {
                const amountDuePaise = (order.final?.amountDuePaise ?? order.finalAmountPaise ?? (order.totals?.totalPayablePaise - (order.final?.totalPaidPaise || 0))) || 0;
                return (
                  <MenuItem key={order._id} value={order._id}>
                    Order #{order.orderNo || order._id.slice(-6)} - ₹{(amountDuePaise/100).toFixed(2)}
                  </MenuItem>
                );
              })}
            </Select>
          </FormControl>
        )}

        {/* Cash Receipt Number Input */}
        {!success && (
          <TextField
            fullWidth
            label="Cash Receipt Number"
            placeholder="e.g., CASH-2024-001"
            value={cashReceiptNo}
            onChange={(e) => setCashReceiptNo(e.target.value)}
            disabled={loading || fetchingOrders}
            autoFocus
            sx={{ mb: 2 }}
            helperText="Enter the cash receipt or reference number"
          />
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={handleClose} disabled={loading}>
          {success ? "Close" : "Cancel"}
        </Button>
        {!success && (
          <Button
            variant="contained"
            color="primary"
            onClick={handleSubmit}
            disabled={loading || !cashReceiptNo.trim() || !selectedOrderId || fetchingOrders}
          >
            {loading ? (
              <>
                <CircularProgress size={20} sx={{ mr: 1 }} />
                Recording...
              </>
            ) : (
              "Record Payment"
            )}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
