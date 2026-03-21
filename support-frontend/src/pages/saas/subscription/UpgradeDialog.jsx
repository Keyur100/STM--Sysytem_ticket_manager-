import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  CircularProgress,
  Alert,
  Stepper,
  Step,
  StepLabel,
} from "@mui/material";
import api from "../../../api/axios";
import PlanSettingsStep from "../company/CompanyFormStepper/PlanSettingsStep";
import AddonsStep from "../company/CompanyFormStepper/AddonsStep";
import CompanyPaymentStep from "../company/CompanyFormStepper/CompanyPaymentStep";

const steps = ["Plan Settings", "Add-ons", "Payment"];

export default function UpgradeDialog({ open, subscription, company, onClose, onSuccess }) {
  const [activeStep, setActiveStep] = useState(0);
  const [form, setForm] = useState({
    _id: company?._id || null,
    plan: null,
    selectedAddons: company?.selectedAddons || {},
  });

  const [plans, setPlans] = useState([]);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [loadingAction, setLoadingAction] = useState(false);
  const [error, setError] = useState("");
  const [paymentData, setPaymentData] = useState(null);

  useEffect(() => {
    if (open && subscription) fetchPlans();
    // prefill current plan snapshot if available
    setForm((f) => ({ ...f, plan: subscription?.planSnapshot || null }));
  }, [open, subscription]);

  const fetchPlans = async () => {
    try {
      setLoadingPlans(true);
      const res = await api.get("/saas/plan");
      const payload = res?.data ?? res?.plans ?? res?.items ?? res ?? [];
      const plansList = Array.isArray(payload) ? payload : payload.plans || payload.items || payload.data || [];
      const filtered = (plansList || []).filter(
        (p) => (p.pricePaise || p.price || 0) > (subscription?.planSnapshot?.pricePaise || 0)
      );
      setPlans(filtered);
    } catch {
      setError("Failed to fetch plans");
    } finally {
      setLoadingPlans(false);
    }
  };

  const handleChange = (path, value) => {
    setForm((prev) => {
      const updated = { ...prev };
      const keys = String(path).split(".");
      let obj = updated;
      keys.slice(0, -1).forEach((k) => {
        if (obj[k] === undefined || obj[k] === null) obj[k] = {};
        obj = obj[k];
      });
      obj[keys[keys.length - 1]] = value;
      return updated;
    });
  };

  const handleNext = () => setActiveStep((s) => s + 1);
  const handleBack = () => setActiveStep((s) => Math.max(0, s - 1));

  const handleClose = () => {
    setActiveStep(0);
    setForm({
      _id: company?._id || null,
      plan: subscription?.planSnapshot || null,
      selectedAddons: company?.selectedAddons || {},
    });
    setPaymentData(null);
    setError("");
    onClose();
  };

  const handleFinishUpgrade = async () => {
    if (!form.plan || !form.plan._id) {
      setError("Please select a target plan before upgrading.");
      return;
    }

    try {
      setLoadingAction(true);
      setError("");

      const payload = {
        newPlanId: form.plan._id,
        couponCode: paymentData?.couponCode || null,
        useWallet: paymentData?.useWallet || false,
      };

      const res = await api.post(`/saas/company/subscriptions/${subscription.subscriptionId}/upgrade`, payload);
      // api returns already-unwrapped response object { success, message, data }
      if (res && res.success) {
        onSuccess?.();
        handleClose();
      } else {
        setError(res?.message || "Upgrade failed");
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Upgrade failed");
    } finally {
      setLoadingAction(false);
    }
  };

  const renderStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <PlanSettingsStep
            form={form}
            handleChange={handleChange}
            plansOverride={plans}
          />
        );
      case 1:
        return <AddonsStep form={form} handleChange={handleChange} />;
      case 2:
        return (
          <CompanyPaymentStep
            form={form}
            onUpdate={(updatedForm) => setForm((f) => ({ ...f, ...updatedForm }))}
            onSignedUp={() => onSuccess?.()}
            onPaymentReady={setPaymentData}
          />
        );
      default:
        return null;
    }
  };

  if (!subscription) return null;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>Upgrade Subscription</DialogTitle>

      <DialogContent sx={{ mt: 2 }}>
        <Box sx={{ mb: 2 }}>
          <strong>Current Plan:</strong> {subscription.planSnapshot?.name} — ₹{((subscription.planSnapshot?.pricePaise||0)/100).toFixed(2)}
        </Box>

        <Stepper activeStep={activeStep} alternativeLabel>
          {steps.map((label) => (
            <Step key={label}><StepLabel>{label}</StepLabel></Step>
          ))}
        </Stepper>

        <Box mt={3}>{renderStepContent(activeStep)}</Box>

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={loadingAction}>Cancel</Button>
        {activeStep > 0 && <Button onClick={handleBack}>Back</Button>}
        {activeStep < steps.length - 1 ? (
          <Button variant="contained" onClick={handleNext} disabled={loadingPlans}>{loadingPlans ? <CircularProgress size={18} /> : "Next"}</Button>
        ) : (
          <Button variant="contained" color="primary" onClick={handleFinishUpgrade} disabled={loadingAction}>
            {loadingAction ? <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}><CircularProgress size={18} />Upgrading...</Box> : "Upgrade Plan"}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
