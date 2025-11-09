import React, { useEffect, useState, useCallback } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  RadioGroup,
  FormControlLabel,
  Radio,
  Divider,
  CircularProgress,
  Alert,
  Checkbox,
} from "@mui/material";
import { useDispatch } from "react-redux";
import api from "../../../../api/axios";
import Loader from "../../../../components/common/Loader";
import CouponModal from "./CouponModal";
import { signupCompany, updateCompany } from "../../../../store/slices/saas/companySlice";

export default function CompanyPaymentStep({ form, onUpdate, onSignedUp }) {
  const dispatch = useDispatch();
  const [walletBalance, setWalletBalance] = useState(0);
  const [couponCode, setCouponCode] = useState("");
  const [discountAmount, setDiscountAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("RAZORPAY");
  const [useWallet, setUseWallet] = useState(false);
  const [loading, setLoading] = useState(false);
  const [alertMsg, setAlertMsg] = useState(null);
  const [couponModalOpen, setCouponModalOpen] = useState(false);

  const plan = form.plan;

  // ✅ Fetch wallet balance
  const fetchWallet = useCallback(async () => {
    if (!form._id) return;
    try {
      const res = await api.get(`/saas/wallet/${form._id}`);
      setWalletBalance((res.wallet.balance || 0) / 100);
    } catch (err) {
      console.error("Wallet fetch failed:", err);
    }
  }, [form._id]);

  useEffect(() => {
    fetchWallet();
  }, [fetchWallet]);

  // ✅ Apply coupon logic
  const handleApplyCoupon = async (code) => {
    const appliedCode = code || couponCode;
    if (!appliedCode || !plan) return;
    try {
      setLoading(true);
      const res = await api.post("/saas/coupons/apply", {
        code: appliedCode,
        planCode: plan.code,
        amountPaise: plan.pricePaise || 0,
      });
      const discountPaise = res.data.discountPaise || 0;
      setDiscountAmount(discountPaise / 100);
      setCouponCode(appliedCode);
      setAlertMsg({ type: "success", text: `Coupon "${appliedCode}" applied successfully` });
    } catch (err) {
      console.error("Apply coupon failed:", err);
      setAlertMsg({
        type: "error",
        text: err.response?.data?.message || "Invalid or expired coupon",
      });
    } finally {
      setLoading(false);
    }
  };

  const planPrice = (plan?.pricePaise || 0) / 100;
  const totalAfterDiscount = Math.max(planPrice - discountAmount, 0);
  const walletAppliedAmount = useWallet ? Math.min(walletBalance, totalAfterDiscount) : 0;
  const finalPayable = totalAfterDiscount - walletAppliedAmount;

  // ✅ Auto-switch wallet logic
  useEffect(() => {
    if (useWallet && walletBalance >= totalAfterDiscount) {
      setPaymentMethod("WALLET_ONLY");
    } else if (paymentMethod === "WALLET_ONLY" && walletBalance < totalAfterDiscount) {
      setPaymentMethod("RAZORPAY");
    }
  }, [walletBalance, totalAfterDiscount, useWallet]);

  // ✅ Confirm and Pay
  const handleConfirmAndPay = async () => {
    if (!form._id) {
      setAlertMsg({ type: "error", text: "Company draft missing. Please go back and create draft." });
      return;
    }

    try {
      setLoading(true);
      await dispatch(updateCompany({ id: form._id, data: { plan: form.plan } }));

      const payload = {
        companyId: form._id,
        plan: form.plan,
        couponCode: couponCode || null,
        useWallet,
        walletAmountPaise: walletAppliedAmount * 100,
        paymentMethod: paymentMethod === "WALLET_ONLY" ? "WALLET" : paymentMethod,
      };

      const action = await dispatch(signupCompany(payload));
      const res = action.payload;

      if (paymentMethod === "WALLET_ONLY" || finalPayable <= 0) {
        onSignedUp?.();
        return;
      }

      if (res?.rzpOrder) {
        const { rzpOrder, order, razorpayKey } = res;
        const options = {
          key: razorpayKey || process.env.REACT_APP_RAZORPAY_KEY,
          amount: rzpOrder.amount,
          currency: "INR",
          name: "SaaS Billing",
          description: `${plan.name}`,
          order_id: rzpOrder.id,
          handler: async function (response) {
            try {
              await api.post("/saas/payment/verify", {
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
                orderId: order._id,
              });
              onSignedUp?.();
            } catch (err) {
              setAlertMsg({ type: "error", text: "Payment verification failed" });
            }
          },
          prefill: {
            name: form.contact?.personName,
            email: form.contact?.email,
            contact: form.contact?.phone,
          },
          theme: { color: "#1976d2" },
        };
        const rzp = new window.Razorpay(options);
        rzp.open();
      } else if (res?.payment?.status === "SUCCESS") {
        onSignedUp?.();
      }
    } catch (err) {
      console.error("Payment failed", err);
      setAlertMsg({ type: "error", text: err?.message || "Payment failed" });
    } finally {
      setLoading(false);
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
/>


        <Divider sx={{ my: 2 }} />

        {/* ✅ Summary */}
        <Typography>Plan Price: ₹{planPrice.toFixed(2)}</Typography>
        {discountAmount > 0 && (
          <Typography color="success.main">Discount: -₹{discountAmount.toFixed(2)}</Typography>
        )}
        {useWallet && (
          <Typography color="info.main">Wallet Used: -₹{walletAppliedAmount.toFixed(2)}</Typography>
        )}
        <Typography sx={{ mt: 1 }}>
          <strong>Final Payable: ₹{finalPayable.toFixed(2)}</strong>
        </Typography>

        {/* ✅ Wallet */}
        <Box mt={2}>
          <FormControlLabel
            control={
              <Checkbox checked={useWallet} onChange={(e) => setUseWallet(e.target.checked)} />
            }
            label={`Use Wallet (Balance ₹${walletBalance.toFixed(2)})`}
          />
        </Box>

        {/* ✅ Payment Method */}
        {finalPayable > 0 && (
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
        )}

        {/* ✅ Confirm & Pay */}
        <Box mt={3}>
          <Button
            variant="contained"
            color="primary"
            fullWidth
            onClick={handleConfirmAndPay}
            disabled={loading}
          >
            {loading ? <CircularProgress size={20} color="inherit" /> : "Confirm & Pay"}
          </Button>
        </Box>

        {alertMsg && (
          <Alert severity={alertMsg.type} sx={{ mt: 2 }}>
            {alertMsg.text}
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
