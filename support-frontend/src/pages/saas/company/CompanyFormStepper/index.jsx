// // src/pages/saas/company/components/CompanyFormStepper.jsx
// import React, { useEffect, useState } from "react";
// import { Stepper, Step, StepLabel, Box, Button } from "@mui/material";
// import { useDispatch, useSelector } from "react-redux";
// import { useNavigate, useParams } from "react-router-dom";
// import { createCompany, updateCompany, getCompany } from "../../../../store/slices/saas/companySlice";

// import CompanyInfoStep from "./CompanyInfoStep";
// import BankDetailsStep from "./BankDetailsStep";
// import ContactInfoStep from "./ContactInfoStep";
// import PlanSettingsStep from "./PlanSettingsStep";

// const steps = ["Company Info", "Bank Details", "Contact Info", "Plan Settings"];

// export default function CompanyFormStepper() {
//   const [activeStep, setActiveStep] = useState(0);
//   const [form, setForm] = useState({
//     name: "",
//     url: "",
//     panNo: "",
//     gstNo: "",
//     bankAccount: { accountNumber: "", ifsc: "", bankName: "" },
//     contact: { personName: "", email: "", phone: "", address: "" },
//     plan: null, // will store full plan snapshot (object) or id (backwards compatibility)
//     planPrice: 0, // UI (rupees)
//     durationDays: 0,
//     effectivePermissions: {},
//     maxProvision: {
//       max_employees: 0,
//       max_suppliers: 0,
//       max_branch: 0,
//       max_customers: 0,
//       max_reseller: 0,
//       storageMB: 150 * 1024,
//     },
//   });

//   const dispatch = useDispatch();
//   const navigate = useNavigate();
//   const { id } = useParams();
//   const { companyDetails } = useSelector((s) => s.company || {});

//   // fetch company when editing
//   useEffect(() => {
//     if (id) dispatch(getCompany(id));
//   }, [id, dispatch]);

//   // prefill
//   useEffect(() => {
//     if (!companyDetails || !id) return;

//     // companyDetails.plan might be: Object (snapshot) or ObjectId (legacy)
//     const planSnapshot = companyDetails.plan && typeof companyDetails.plan === "object" ? companyDetails.plan : null;
//     const planPriceFromSnapshot = planSnapshot?.pricePaise ? planSnapshot.pricePaise / 100 : null;

//     setForm((prev) => ({
//       ...prev,
//       name: companyDetails.name || "",
//       url: companyDetails.url || "",
//       panNo: companyDetails.panNo || "",
//       gstNo: companyDetails.gstNo || "",
//       bankAccount: {
//         accountNumber: companyDetails.bankAccount?.accountNumber || "",
//         ifsc: companyDetails.bankAccount?.ifsc || "",
//         bankName: companyDetails.bankAccount?.bankName || "",
//       },
//       contact: {
//         personName: companyDetails.contact?.personName || "",
//         email: companyDetails.contact?.email || "",
//         phone: companyDetails.contact?.phone || "",
//         address: companyDetails.contact?.address || "",
//       },
//       plan: planSnapshot || companyDetails.plan || null, // prefer snapshot
//       planPrice: planPriceFromSnapshot ?? (companyDetails.planPricePaise ? companyDetails.planPricePaise / 100 : companyDetails.planPrice || 0),
//       durationDays: planSnapshot?.durationDays ?? companyDetails.durationDays ?? 0,
//       effectivePermissions: companyDetails.effectivePermissions || {},
//       maxProvision: {
//         max_employees: companyDetails.maxProvision?.max_employees || 0,
//         max_suppliers: companyDetails.maxProvision?.max_suppliers || 0,
//         max_branch: companyDetails.maxProvision?.max_branch || 0,
//         max_customers: companyDetails.maxProvision?.max_customers || 0,
//         max_reseller: companyDetails.maxProvision?.max_reseller || 0,
//         storageMB: companyDetails.maxProvision?.storageMB || 150 * 1024,
//       },
//     }));
//   }, [companyDetails, id]);

//   // robust nested handleChange: creates intermediate objects if missing
//   const handleChange = (path, value) => {
//     setForm((prev) => {
//       const updated = Array.isArray(prev) ? [...prev] : { ...prev };
//       const keys = String(path).split(".");
//       let obj = updated;
//       keys.slice(0, -1).forEach((k) => {
//         if (obj[k] === undefined || obj[k] === null) obj[k] = {};
//         // if it's a primitive (unexpected), override with object
//         if (typeof obj[k] !== "object") obj[k] = {};
//         obj = obj[k];
//       });
//       obj[keys[keys.length - 1]] = value;
//       return updated;
//     });
//   };

//   const handleNext = async () => {
//     if (activeStep === steps.length - 1) {
//       // final payload: store plan snapshot (form.plan) and also send planPricePaise for payment/order flows
//       const payload = {
//         ...form,
//         plan: form.plan, // full snapshot (if you prefer only _id, change here)
//         planPricePaise: Math.round((form.planPrice || 0) * 100),
//       };

//       if (id) {
//         await dispatch(updateCompany({ id, data: payload }));
//       } else {
//         await dispatch(createCompany(payload));
//       }

//       navigate("/companies");
//     } else {
//       setActiveStep((prev) => prev + 1);
//     }
//   };

//   const handleBack = () => setActiveStep((prev) => prev - 1);

//   const validateStep = () => {
//     switch (activeStep) {
//       case 0:
//         return form.name.trim() && form.url.trim() && form.panNo.trim() && form.gstNo.trim();
//       case 1:
//         return form.bankAccount.accountNumber && form.bankAccount.ifsc && form.bankAccount.bankName;
//       case 2:
//         return form.contact.personName && form.contact.email && form.contact.phone;
//       case 3:
//         return form.plan && Object.keys(form.effectivePermissions || {}).length > 0;
//       default:
//         return true;
//     }
//   };

//   const renderStepContent = (step) => {
//     switch (step) {
//       case 0:
//         return <CompanyInfoStep form={form} handleChange={handleChange} />;
//       case 1:
//         return <BankDetailsStep form={form} handleChange={handleChange} />;
//       case 2:
//         return <ContactInfoStep form={form} handleChange={handleChange} />;
//       case 3:
//         return <PlanSettingsStep form={form} handleChange={handleChange} />;
//       default:
//         return null;
//     }
//   };

//   return (
//     <Box>
//       <Stepper activeStep={activeStep}>
//         {steps.map((label) => (
//           <Step key={label}>
//             <StepLabel>{label}</StepLabel>
//           </Step>
//         ))}
//       </Stepper>

//       <Box mt={3}>{renderStepContent(activeStep)}</Box>

//       <Box mt={3} display="flex" justifyContent="space-between">
//         <Button disabled={activeStep === 0} onClick={handleBack}>
//           Back
//         </Button>
//         <Button variant="contained" onClick={handleNext} disabled={!validateStep()}>
//           {activeStep === steps.length - 1 ? "Submit" : "Next"}
//         </Button>
//       </Box>
//     </Box>
//   );
// }
// src/pages/saas/company/components/CompanyFormStepper.jsx
import React, { useEffect, useState } from "react";
import { Stepper, Step, StepLabel, Box, Button } from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import { createCompany, updateCompany, getCompany } from "../../../../store/slices/saas/companySlice";

import CompanyInfoStep from "./CompanyInfoStep";
import BankDetailsStep from "./BankDetailsStep";
import ContactInfoStep from "./ContactInfoStep";
import PlanSettingsStep from "./PlanSettingsStep";

const steps = ["Company Info", "Bank Details", "Contact Info", "Plan Settings"];

export default function CompanyFormStepper() {
  const [activeStep, setActiveStep] = useState(0);
  const [form, setForm] = useState({
    name: "",
    url: "",
    panNo: "",
    gstNo: "",
    bankAccount: { accountNumber: "", ifsc: "", bankName: "" },
    contact: { personName: "", email: "", phone: "", address: "" },
    plan: null, // full snapshot
  });

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { id } = useParams();
  const companyDetails = useSelector((s) => s.company.selected);


  // fetch company when editing
  useEffect(() => {
    if (id) dispatch(getCompany(id));
  }, [id, dispatch]);

  // prefill
  useEffect(() => {
    if (!companyDetails || !id) return;

    const planSnapshot =
      companyDetails.plan

    setForm((prev) => ({
      ...prev,
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
      plan: planSnapshot || companyDetails.plan || null, // prefer snapshot
    }));
  }, [companyDetails, id]);

  // robust nested handleChange: creates intermediate objects if missing
  const handleChange = (path, value) => {
    setForm((prev) => {
      const updated = Array.isArray(prev) ? [...prev] : { ...prev };
      const keys = String(path).split(".");
      let obj = updated;
      keys.slice(0, -1).forEach((k) => {
        if (obj[k] === undefined || obj[k] === null) obj[k] = {};
        if (typeof obj[k] !== "object") obj[k] = {};
        obj = obj[k];
      });
      obj[keys[keys.length - 1]] = value;
      return updated;
    });
  };

  const handleNext = async () => {
    if (activeStep === steps.length - 1) {
      // final payload: remove UI-only keys
      const { plan, ...rest } = form;

      const payload = {
        ...rest,
        plan: plan, // full snapshot
        planPricePaise: Math.round((plan?.pricePaise || 0)), // derived from snapshot
      };

      if (id) {
        await dispatch(updateCompany({ id, data: payload }));
      } else {
        await dispatch(createCompany(payload));
      }

      navigate("/companies");
    } else {
      setActiveStep((prev) => prev + 1);
    }
  };

  const handleBack = () => setActiveStep((prev) => prev - 1);

  const validateStep = () => {
    switch (activeStep) {
      case 0:
        return form.name.trim() && form.url.trim() && form.panNo.trim() && form.gstNo.trim();
      case 1:
        return form.bankAccount.accountNumber && form.bankAccount.ifsc && form.bankAccount.bankName;
      case 2:
        return form.contact.personName && form.contact.email && form.contact.phone;
      case 3:
        return form.plan && Array.isArray(form.plan.modulePermissions) && form.plan.modulePermissions.length > 0;
      default:
        return true;
    }
  };

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
      default:
        return null;
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
          {activeStep === steps.length - 1 ? "Submit" : "Next"}
        </Button>
      </Box>
    </Box>
  );
}

