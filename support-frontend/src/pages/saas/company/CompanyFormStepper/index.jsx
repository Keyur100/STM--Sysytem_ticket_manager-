import React, { useEffect, useState } from "react";
import { Stepper, Step, StepLabel, Box, Button, CircularProgress, Alert } from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import {
  createDraftCompany,
  updateCompany,
  getCompany,
} from "../../../../store/slices/saas/companySlice";
import { signupCompany } from "../../../../store/slices/saas/companySlice";

import CompanyContactInfoStep from "./CompanyContactInfoStep";
import AddonsStep from "./AddonsStep";
import PlanSettingsStep from "./PlanSettingsStep";
import BranchStep from "./BranchStep";
import CompanyPaymentStep from "./CompanyPaymentStep";
import api from "../../../../api/axios";

const steps = ["Company & Contact Details", "Branch Details", "Plan Settings", "Add-ons", "Payment"];

export default function CompanyFormStepper() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { id } = useParams();
  const companyDetails = useSelector((s) => s.company.selected);

  const emptyForm = {
    _id: null,
    name: "",
    url: "",
    panNo: "",
    gstNo: "",
    contact: { personName: "", email: "", phone: "", address: "" },
    plan: null,
    selectedAddons: {},
  };

  const [activeStep, setActiveStep] = useState(0);
  const [form, setForm] = useState(emptyForm);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState(null);
  const [paymentData, setPaymentData] = useState({
    couponCode: null,
    useWallet: false,
    walletAppliedAmount: 0,
    discountAmount: 0,
    addonsArray: [],
  });

  /** Reset form for new company */
  useEffect(() => {
    if (!id) {
      setForm(emptyForm);
    }
  }, [id]);

  /** Fetch company if editing */
  useEffect(() => {
    if (id) dispatch(getCompany(id));
  }, [id, dispatch]);

  /** Prefill form if editing */
  useEffect(() => {
    if (!id || !companyDetails) return;

    setForm({
      _id: companyDetails._id || null,
      name: companyDetails.name || "",
      url: companyDetails.url || "",
      panNo: companyDetails.panNo || "",
      gstNo: companyDetails.gstNo || "",
      contact: {
        personName: companyDetails.contact?.personName || "",
        email: companyDetails.contact?.email || "",
        phone: companyDetails.contact?.phone || "",
        address: companyDetails.contact?.address || "",
      },
      plan: companyDetails.plan || null,
      selectedAddons: companyDetails.selectedAddons || {},
      // Prefill branch defaults from company
      branchCompanyName: companyDetails.name || "",
      branchName: companyDetails.name || "",
      branchAddress: companyDetails.contact?.address || "",
      branchPhone: companyDetails.contact?.phone || "",
      branchEmail: companyDetails.contact?.email || "",
      branchGstn: companyDetails.gstNo || companyDetails.gst || "",
      branchPan: companyDetails.panNo || "",
    });
  }, [id, companyDetails]);

  /** Handle form changes */
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

  /** Next button */
  const handleNext = async () => {
    // Step 0: Create/update draft with company and contact info
    if (activeStep === 0) {
      if (!form._id) {
        const draftPayload = {
          name: form.name,
          url: form.url,
          panNo: form.panNo,
          gstNo: form.gstNo,
          contact: form.contact,
        };
        const action = await dispatch(createDraftCompany(draftPayload));
        const created = action.payload;
        if (created && created._id) setForm((f) => ({ ...f, _id: created._id }));
      } else {
        await dispatch(
          updateCompany({
            id: form._id,
            data: {
              name: form.name,
              url: form.url,
              panNo: form.panNo,
              gstNo: form.gstNo,
              contact: form.contact,
            },
          })
        );
      }
      setActiveStep((s) => s + 1);
      return;
    }

    // Steps 1-2: Update draft
    if (activeStep > 0 && activeStep < steps.length - 1) {
      // If Branch step (index 1) then create branch before proceeding
      if (activeStep === 1) {
        // create branch only once per company creation
        if (form.branchCreated) {
          setActiveStep((s) => s + 1);
          return;
        }

        if (form._id && form.branchName) {
          const payload = {
            companyId: form._id,
            code: form.branchCode || '',
            companyName: form.branchCompanyName || form.name || '',
            name: form.branchName || '',
            tagline: form.branchTagline || '',
            address: form.branchAddress || '',
            logo: form.branchLogo || '',
            phone: form.branchPhone || '',
            phone2: form.branchPhone2 || '',
            email: form.branchEmail || '',
            gstn: form.branchGstn || '',
            pan: form.branchPan || '',
            status: form.branchStatus || 'active',
            contactInfo: form.branchContactInfo || '',
            contactPerson: {
              name: form.contact?.personName || '',
              email: form.contact?.email || '',
              phone: form.contact?.phone || '',
            },
          };

          try {
            await api.post('/saas/branch', payload);
            // mark branch created to avoid duplicate creates
            setForm((f) => ({ ...f, branchCreated: true }));
          } catch (err) {
            console.error('Failed to create branch from stepper', err);
          }
        }
        // proceed to next step
        setActiveStep((s) => s + 1);
        return;
      }

      // For other intermediate steps (plan/addons), update company as before
      if (form._id) {
        await dispatch(
          updateCompany({
            id: form._id,
            data: {
              name: form.name,
              url: form.url,
              panNo: form.panNo,
              gstNo: form.gstNo,
              contact: form.contact,
              plan: form.plan,
              selectedAddons: form.selectedAddons,
            },
          })
        );
      }
      setActiveStep((s) => s + 1);
      return;
    }

    // Final step handled by CompanyPaymentStep
    setActiveStep((s) => s + 1);
  };

  /** Back button */
  const handleBack = () => setActiveStep((s) => Math.max(0, s - 1));

  /** Render step content */
  const renderStepContent = (step) => {
    switch (step) {
      case 0:
        return <CompanyContactInfoStep form={form} handleChange={handleChange} />;
      case 1:
        return <BranchStep form={form} handleChange={handleChange} />;
      case 2:
        return <PlanSettingsStep form={form} handleChange={handleChange} />;
      case 3:
        return <AddonsStep form={form} handleChange={handleChange} />;
      case 4:
        return (
          <CompanyPaymentStep
            form={form}
            onUpdate={(updatedForm) => setForm((f) => ({ ...f, ...updatedForm }))}
            onSignedUp={() => navigate("/companies")}
            onPaymentReady={setPaymentData}
          />
        );
      default:
        return null;
    }
  };

  /** Validate step enablement */
  const validateStep = () => {
    return true;
  };

  /** Handle Payment */
  const handlePayment = async () => {
    if (!form._id) {
      setPaymentError("Company draft missing. Please go back and create draft.");
      return;
    }

    try {
      setPaymentLoading(true);
      setPaymentError(null);

      const payload = {
        companyId: form._id,
        plan: form.plan,
        addons: paymentData.addonsArray || [],
        couponCode: paymentData.couponCode || null,
        useWallet: paymentData.useWallet || false,
        walletAmountPaise: (paymentData.walletAppliedAmount || 0) * 100,
      };

      console.log("📦 Payment Payload:", payload);

      const action = await dispatch(signupCompany(payload));
      if (action.payload) {
        navigate("/companies");
      }
    } catch (err) {
      setPaymentError(err?.message || "Payment failed. Please try again.");
      console.error("Payment error:", err);
    } finally {
      setPaymentLoading(false);
    }
  };

  // buildAddonsArray removed — CompanyPaymentStep computes its own addon array

  return (
    <Box>
      <Stepper activeStep={activeStep}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      <Box mt={3}>{renderStepContent(activeStep)}</Box>

      {paymentError && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {paymentError}
        </Alert>
      )}

      <Box mt={3} display="flex" justifyContent="space-between">
        <Button disabled={activeStep === 0} onClick={handleBack}>
          Back
        </Button>
        <Button 
          variant="contained" 
          onClick={activeStep === steps.length - 1 ? handlePayment : handleNext}
          disabled={!validateStep() || paymentLoading}
        >
          {paymentLoading ? (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <CircularProgress size={20} color="inherit" />
              Processing...
            </Box>
          ) : (
            activeStep === steps.length - 1 ? "Confirm & Pay" : "Next"
          )}
        </Button>
      </Box>
    </Box>
  );
}
