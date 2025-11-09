import React, { useEffect, useState } from "react";
import { Stepper, Step, StepLabel, Box, Button } from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import {
  createDraftCompany,
  updateCompany,
  getCompany,
  signupCompany,
} from "../../../../store/slices/saas/companySlice";

import CompanyInfoStep from "./CompanyInfoStep";
import BankDetailsStep from "./BankDetailsStep";
import ContactInfoStep from "./ContactInfoStep";
import PlanSettingsStep from "./PlanSettingsStep";
import CompanyPaymentStep from "./CompanyPaymentStep";

const steps = ["Company Info", "Bank Details", "Contact Info", "Plan Settings", "Payment"];

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
    bankAccount: { accountNumber: "", ifsc: "", bankName: "" },
    contact: { personName: "", email: "", phone: "", address: "" },
    plan: null,
  };

  const [activeStep, setActiveStep] = useState(0);
  const [form, setForm] = useState(emptyForm);

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
      bankAccount: {
        accountNumber: companyDetails.bankAccount?.accountNumber || "",
        ifsc: companyDetails.bankAccount?.ifsc || "",
        bankName: companyDetails.bankAccount?.bankName || "",
      },
      contact: {
        personName: companyDetails.contact?.personName || "",
        email: companyDetails.contact?.email || "",
        phone: companyDetails.contact?.phone || "",
        address: companyDetails.contact?.address || "",
      },
      plan: companyDetails.plan || null,
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
    // Step 0: create/update draft
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

    // Steps 1-3: update draft
    if (activeStep > 0 && activeStep < steps.length - 1) {
      if (form._id) {
        await dispatch(
          updateCompany({
            id: form._id,
            data: {
              name: form.name,
              url: form.url,
              panNo: form.panNo,
              gstNo: form.gstNo,
              bankAccount: form.bankAccount,
              contact: form.contact,
              plan: form.plan,
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
        return <CompanyInfoStep form={form} handleChange={handleChange} />;
      case 1:
        return <BankDetailsStep form={form} handleChange={handleChange} />;
      case 2:
        return <ContactInfoStep form={form} handleChange={handleChange} />;
      case 3:
        return <PlanSettingsStep form={form} handleChange={handleChange} />;
      case 4:
        return (
          <CompanyPaymentStep
            form={form}
            onUpdate={(updatedForm) => setForm((f) => ({ ...f, ...updatedForm }))}
            onSignedUp={() => navigate("/companies")}
          />
        );
      default:
        return null;
    }
  };

  /** Validate step enablement */
  const validateStep = () => {
    switch (activeStep) {
      case 0:
        return form.name.trim();
      case 1:
        return form.bankAccount.accountNumber && form.bankAccount.ifsc && form.bankAccount.bankName;
      case 2:
        return form.contact.personName && form.contact.email && form.contact.phone;
      case 3:
        return form.plan && Array.isArray(form.plan.modulePermissions) && form.plan.modulePermissions.length > 0;
      case 4:
        return true;
      default:
        return true;
    }
  };

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

      <Box mt={3} display="flex" justifyContent="space-between">
        <Button disabled={activeStep === 0} onClick={handleBack}>
          Back
        </Button>
        <Button variant="contained" onClick={handleNext} disabled={!validateStep()}>
          {activeStep === steps.length - 1 ? "Go to Payment" : "Next"}
        </Button>
      </Box>
    </Box>
  );
}
