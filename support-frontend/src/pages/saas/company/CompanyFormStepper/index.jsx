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
    code: "",
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
      code: companyDetails.code || '',
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
      // planSnapshot is stored in company model and prefilled as 'plan' in form
      plan: companyDetails.planSnapshot || null,
      selectedAddons: companyDetails.selectedAddons || {},
      // Persisted branchId (newer backend) or fallback to first branch
      branchId: companyDetails.branchId || (companyDetails.branches && companyDetails.branches[0] ? companyDetails.branches[0]._id : null),
      // Persisted client user reference (newer backend)
      clientId: companyDetails.clientId || companyDetails.clientId || null,
      // Prefill branch defaults from company
      branchCompanyName: companyDetails.name || "",
      branchName: companyDetails.name || "",
      branchAddress: companyDetails.contact?.address || "",
      branchPhone: companyDetails.contact?.phone || "",
      branchEmail: companyDetails.contact?.email || "",
      branchGstn: companyDetails.gstNo || companyDetails.gst || "",
      branchPan: companyDetails.panNo || "",
      branchCode: companyDetails.branches && companyDetails.branches[0] ? (companyDetails.branches[0].code || '') : '',
    });
    // If company has branches, prefill first branch fields (for edit flows)
    if (companyDetails.branches && companyDetails.branches.length > 0) {
      const b = companyDetails.branches[0];
      setForm((f) => ({ ...f,
        branchId: b._id,
        branchCode: b.code || '',
        branchCompanyName: b.companyName || f.branchCompanyName,
        branchName: b.name || f.branchName,
        branchAddress: b.address || f.branchAddress,
        branchPhone: b.phone || f.branchPhone,
        branchPhone2: b.phone2 || f.branchPhone2,
        branchEmail: b.email || f.branchEmail,
        branchGstn: b.gstn || f.branchGstn,
        branchPan: b.pan || f.branchPan,
        branchLogo: b.logo || f.branchLogo,
      }));
    }
    // If company has a primary client user id, fetch it and prefill contact fields
    if (companyDetails.clientId) {
      (async () => {
        try {
          const res = await api.get(`/saas/client-users/${companyDetails.clientId}`);
          const wrapper = res?.data || res;
          const client = wrapper?.data?.clientUser || wrapper?.clientUser || wrapper?.data || wrapper;
          if (client) {
            setForm((f) => ({ ...f, contact: {
              personName: client.name || f.contact?.personName || '',
              email: client.email || f.contact?.email || '',
              phone: client.phone || f.contact?.phone || '',
              address: f.contact?.address || '',
            } }));
            try { handleChange('contact.personName', client.name); handleChange('contact.email', client.email); handleChange('contact.phone', client.phone); } catch (e) {}
          }
        } catch (e) {
          // ignore fetch errors
        }
      })();
    }
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
          code: form.code,
        };
        const action = await dispatch(createDraftCompany(draftPayload));
        // If the action failed (validation / isExist), do not proceed
        if (action.error) {
          const msg = action.payload?.message || action.payload?.error || action.error.message || 'Failed to create draft';
          setPaymentError(msg);
          return;
        }
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
              code: form.code,
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
        // allow updating the branch when returning to this step (if branchId exists)

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
            // If branchId present, update rather than create
            if (form.branchId) {
              await api.put(`/saas/branch/${form.branchId}`, payload);
              setForm((f) => ({ ...f, branchCreated: true }));
            } else {
              const res = await api.post('/saas/branch', payload);
              const wrapper = res?.data || res;
              const created = wrapper.data || wrapper;
              // Try multiple shapes: created may be branch doc or { branch, clientUser }
              const newBranchId = created?._id || created?.id || created?.branch?._id || created?.branch?.id || (wrapper?.data?.branch?._id) || (wrapper?.branch?._id) || null;
              const newClientId = created?.clientUser?._id || created?.clientUser?.id || created?.clientUserId || wrapper?.data?.clientUser?._id || wrapper?.clientUser?._id || null;
              // mark branch created and store returned id to allow future updates
              setForm((f) => ({ ...f, branchCreated: true, branchId: newBranchId || f.branchId, clientId: newClientId || f.clientId }));
              // Also update via handleChange to ensure dependent effects see the branchId and clientId immediately
              try {
                if (newBranchId) handleChange('branchId', newBranchId);
                if (newClientId) handleChange('clientId', newClientId);
                if (newBranchId) handleChange('branchCreated', true);
              } catch (e) {}
            }
          } catch (err) {
            console.error('Failed to create/update branch from stepper', err);
            const isExist = err?.response?.data?.isExist || err?.response?.data?.error === 'isExist';
            const message = err?.response?.data?.message || err?.message || 'Failed to create/update branch';
            setPaymentError(message);
            if (isExist) return; // don't advance to next step
          }
        }
        // proceed to next step
        setActiveStep((s) => s + 1);
        return;
      }

      // For other intermediate steps (plan/addons), update company as before
      if (form._id) {
        const action = await dispatch(
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
        if (action.error) {
          setPaymentError(action.error.message || 'Failed to update company');
          return;
        }
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
    // Basic client-side validations per step
    if (activeStep === 0) {
      if (!form.code || !form.name || !form.contact || !form.contact.email) return false;
    }
    if (activeStep === 1) {
      // require primary branch fields when creating/updating branch
      if (!form.branchName || !form.branchCompanyName || !form.branchAddress || !form.branchEmail || !form.branchCode) return false;
    }
    if (activeStep === 2) {
      // plan must be selected
      if (!form.plan) return false;
    }
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
