import React, {
  useEffect,
  useState,
  useCallback,
  useMemo,
  memo,
} from "react";
import {
  Grid,
  Typography,
  Checkbox,
  FormControlLabel,
  Card,
  CardContent,
  TextField,
  Divider,
  Paper,
  Box,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { useSelector } from "react-redux";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import api from "../../../../api/axios";
import Loader from "../../../../components/common/Loader";

export default function PlanSettingsStep({ form, handleChange }) {
  const [plans, setPlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [loading, setLoading] = useState(false);

  /** Fetch plans */
  const fetchPlans = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get("/saas/plan");
      setPlans(res.data.plans || []);
    } catch (err) {
      console.error("Failed to fetch plans:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  /** Select matching or default plan */
  useEffect(() => {
    if (!plans.length) return;

    if (form.plan && form.plan._id) {
      const found = plans.find((p) => String(p._id) === String(form.plan._id));
      if (found) setSelectedPlan(found);
      return;
    }

    const defaultPlan = plans.find((p) => p.isDefault);
    if (defaultPlan) handleSelectPlan(defaultPlan);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plans]);

  /** Select plan */
  const handleSelectPlan = useCallback(
    (plan) => {
      if (!plan) return;

      if (form.plan && form.plan._id === plan._id && checkPlanModified(form, plan)) {
        setSelectedPlan(plan);
        return;
      }

      setSelectedPlan(plan);

      const planSnapshot = {
        _id: plan._id,
        code: plan.code,
        description: plan.description,
        planGroup: plan.planGroup,
        billingCycle: plan.billingCycle,
        name: plan.name,
        pricePaise: plan.pricePaise,
        durationDays: plan.durationDays,
        userPricing: { ...plan.userPricing },
        hasTax: plan.hasTax,
        taxName: plan.taxName,
        taxIncluded: plan.taxIncluded,
        modulePermissions: plan.modulePermissions.map((mod) => ({
          moduleKey: mod.moduleKey,
          displayName: mod.displayName,
          actions: mod.actions.map((a) => ({
            key: a.key,
            displayName: a.displayName,
            enabled: true,
          })),
        })),
      };

      const perms = {};
      planSnapshot.modulePermissions.forEach((mod) => {
        perms[mod.moduleKey] = mod.actions.map((a) => a.key);
      });

      handleChange("plan", planSnapshot);
      handleChange("effectivePermissions", perms);
    },
    [form.plan, handleChange]
  );

  /** Handlers for price, duration, user limits */
  const handlePriceChange = (val) => {
    const rupees = parseFloat(val || 0);
    const updated = { ...form.plan, pricePaise: Math.round(rupees * 100) };
    handleChange("plan", updated);
  };

  const handleDurationChange = (val) => {
    const days = parseInt(val || 0, 10);
    const updated = { ...form.plan, durationDays: days };
    handleChange("plan", updated);
  };

  const handleMaxProvisionChange = (key, value) => {
    const v = parseInt(value || 0, 10);
    const updated = {
      ...form.plan,
      userPricing: { ...(form.plan.userPricing || {}), [key]: v },
    };
    handleChange("plan", updated);
  };

  /** Toggle permission handlers */
  const togglePermission = useCallback(
    (moduleKey, actionKey) => {
      const updatedPlan = JSON.parse(JSON.stringify(form.plan));
      const module = updatedPlan.modulePermissions.find(
        (m) => m.moduleKey === moduleKey
      );
      if (!module) return;

      module.actions = module.actions.map((a) =>
        a.key === actionKey ? { ...a, enabled: !a.enabled } : a
      );

      const perms = { ...(form.effectivePermissions || {}) };
      const enabledKeys = module.actions.filter((a) => a.enabled).map((a) => a.key);
      perms[moduleKey] = enabledKeys;

      handleChange("plan", updatedPlan);
      handleChange("effectivePermissions", perms);
    },
    [form.plan, form.effectivePermissions, handleChange]
  );

  const toggleAllPermissions = useCallback(
    (moduleKey) => {
      const updatedPlan = JSON.parse(JSON.stringify(form.plan));
      const module = updatedPlan.modulePermissions.find(
        (m) => m.moduleKey === moduleKey
      );
      if (!module) return;

      const allEnabled = module.actions.every((a) => a.enabled);
      module.actions = module.actions.map((a) => ({ ...a, enabled: !allEnabled }));

      const perms = { ...(form.effectivePermissions || {}) };
      perms[moduleKey] = module.actions
        .filter((a) => a.enabled)
        .map((a) => a.key);

      handleChange("plan", updatedPlan);
      handleChange("effectivePermissions", perms);
    },
    [form.plan, form.effectivePermissions, handleChange]
  );

  const handleReset = () => {
    if (selectedPlan) handleSelectPlan(selectedPlan);
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "row",
        gap: 3,
        height: "80vh",
        overflow: "hidden",
      }}
    >
      <PlanListSidebar
        plans={plans}
        selectedPlan={selectedPlan}
        loading={loading}
        onSelect={handleSelectPlan}
        form={form}
      />
      <PlanDetailPanel
        form={form}
        onPriceChange={handlePriceChange}
        onDurationChange={handleDurationChange}
        onMaxChange={handleMaxProvisionChange}
        togglePermission={togglePermission}
        toggleAll={toggleAllPermissions}
        handleReset={handleReset}
      />
    </Box>
  );
}

/* ---------------- Sidebar ---------------- */
const PlanListSidebar = memo(
  ({ plans, selectedPlan, loading, onSelect, form }) => {
    const themeMode = useSelector((s) => s.ui?.theme || "light");
    const plansWithModified = useMemo(() => {
      return plans.map((plan) => ({
        ...plan,
        isModified:
          selectedPlan && String(selectedPlan._id) === String(plan._id)
            ? checkPlanModified(form, plan)
            : false,
      }));
    }, [plans, form, selectedPlan]);

    return (
      <Box sx={{ width: 360, flexShrink: 0, display: "flex", flexDirection: "column" }}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, pl: 1 }}>
          Available Plans
        </Typography>
        <Paper
          sx={{
            flexGrow: 1,
            borderRadius: 3,
            overflowY: "auto",
            boxShadow: "0 4px 15px rgba(0,0,0,0.06)",
          }}
        >
          {loading ? (
            <Loader />
          ) : (
            plansWithModified.map((p) => (
              <PlanCard
                key={p._id}
                plan={p}
                isSelected={selectedPlan && String(selectedPlan._id) === String(p._id)}
                isModified={p.isModified}
                onClick={() => onSelect(p)}
                themeMode={themeMode}
              />
            ))
          )}
        </Paper>
      </Box>
    );
  }
);

/* ---------------- Plan Card ---------------- */
const PlanCard = memo(({ plan, isSelected, isModified, onClick, themeMode }) => {
  const bgGradient = plan.isDefault
    ? themeMode === "light"
      ? "linear-gradient(90deg, #fff7e6, #ffe3b3)"
      : "linear-gradient(90deg, #3a2f1c, #5a4628)"
    : themeMode === "light"
    ? "linear-gradient(90deg, #f0f7ff, #d0e4ff)"
    : "linear-gradient(90deg, #1e1e2f, #2a2a3f)";

  return (
    <Card
      onClick={onClick}
      sx={{
        cursor: "pointer",
        border: isSelected ? "2px solid" : "1px solid #ddd",
        borderColor: isSelected ? "primary.main" : "transparent",
        borderRadius: 3,
        m: 1,
        position: "relative",
        background: bgGradient,
        boxShadow: isSelected
          ? "0 6px 20px rgba(25,118,210,0.25)"
          : "0 2px 8px rgba(0,0,0,0.06)",
        "&:hover": { transform: "scale(1.02)", boxShadow: "0 8px 25px rgba(0,0,0,0.12)" },
        transition: "all 0.18s ease-in-out",
      }}
    >
      {plan.isDefault && (
        <Box
          sx={{
            position: "absolute",
            top: 8,
            right: 8,
            backgroundColor: themeMode === "light" ? "#ffcc80" : "#7b5e2b",
            color: themeMode === "light" ? "#4a2e00" : "#fff8e1",
            px: 1,
            py: 0.3,
            borderRadius: "10px",
            fontSize: 12,
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
          }}
        >
          <EmojiEventsIcon fontSize="small" sx={{ mr: 0.4 }} /> Default
        </Box>
      )}

      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography fontWeight={700}>{plan.name}</Typography>
          {isModified && (
            <Typography variant="caption" color="secondary" fontWeight={700}>
              Modified
            </Typography>
          )}
        </Box>

        <Typography color="text.secondary" sx={{ mt: 1 }}>
          ₹{((plan.pricePaise || plan.price || 0) / 100).toLocaleString()} •{" "}
          {plan.durationDays
            ? `${plan.durationDays} days`
            : plan.durationType || "Unlimited"}
        </Typography>

        {plan.description && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
            {plan.description}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
});

/* ---------------- Detail Panel ---------------- */
function useDebounce(value, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

const PlanDetailPanel = React.memo(
  ({ form, onPriceChange, onDurationChange, onMaxChange, togglePermission, toggleAll, handleReset }) => {
    const [searchTerm, setSearchTerm] = useState("");
    const debouncedSearchTerm = useDebounce(searchTerm, 300); // 300ms debounce
    const selectedPlan = form.plan;

    if (!selectedPlan)
      return (
        <Paper sx={{ flexGrow: 1, p: 4, borderRadius: 3, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Typography>Select a plan to view details</Typography>
        </Paper>
      );

    // Filter modules based on debounced search term
    const filteredModules = (selectedPlan.modulePermissions || []).filter((mod) =>
      mod.displayName?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
      mod.moduleKey?.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
    );

    return (
      <Paper sx={{ flexGrow: 1, p: 4, borderRadius: 3, overflowY: "auto" }}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h5" fontWeight={600}>
            {selectedPlan.name}
          </Typography>
        </Box>

        <Box display="flex" alignItems="center" sx={{ my: 3 }}>
          <TextField
            label="Plan Price (₹)"
            type="number"
            value={selectedPlan.pricePaise ? selectedPlan.pricePaise / 100 : ""}
            onChange={(e) => onPriceChange(e.target.value)}
            sx={{ width: 220, mr: 2 }}
          />
          <TextField
            label="Duration (Days)"
            type="number"
            value={selectedPlan.durationDays || ""}
            onChange={(e) => onDurationChange(e.target.value)}
            sx={{ width: 220 }}
          />
        </Box>

        <Divider sx={{ my: 3 }} />

        <Typography variant="h6" fontWeight={600} sx={{ mb: 1 }}>
          User Limits
        </Typography>
        <UserLimitFields form={form} onMaxChange={onMaxChange} />

        <Divider sx={{ my: 3 }} />

        <Typography variant="h6" fontWeight={600} sx={{ mb: 1 }}>
          Module Permissions
        </Typography>

        {/* Search Bar */}
        <TextField
          placeholder="Search module..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          fullWidth
          sx={{ mb: 2 }}
          size="small"
        />

        {filteredModules.map((mod) => (
          <ModulePermissionCard
            key={mod.moduleKey}
            mod={mod}
            togglePermission={togglePermission}
            toggleAll={toggleAll}
          />
        ))}

        {filteredModules.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            No modules match your search.
          </Typography>
        )}
      </Paper>
    );
  }
);



/* ---------------- User Limit Fields ---------------- */
const UserLimitFields = memo(({ form, onMaxChange }) => {
  const fields = [
    { key: "max_employees", label: "Max Employees" },
    { key: "max_suppliers", label: "Max Suppliers" },
    { key: "max_branch", label: "Max Branches" },
    { key: "max_customers", label: "Max Customers" },
    { key: "max_reseller", label: "Max Resellers" },
    { key: "storageMB", label: "Storage (MB)" },
  ];

  const userPricing = form.plan?.userPricing || {};

  return (
    <Grid container spacing={2}>
      {fields.map(({ key, label }) => (
        <Grid item key={key}>
          <TextField
            label={label}
            type="number"
            value={userPricing[key] ?? ""}
            onChange={(e) => onMaxChange(key, e.target.value)}
            sx={{ width: 220 }}
          />
        </Grid>
      ))}
    </Grid>
  );
});

/* ---------------- Module Permission Card ---------------- */
const ModulePermissionCard = React.memo(({ mod, togglePermission, toggleAll }) => {
  const [actionsState, setActionsState] = useState(mod.actions || []);

  // keep local state synced with parent updates
  useEffect(() => {
    setActionsState(mod.actions || []);
  }, [mod.actions]);

  const handleTogglePermission = useCallback(
    (actionKey) => {
      setActionsState((prev) =>
        prev.map((a) =>
          a.key === actionKey ? { ...a, enabled: !a.enabled } : a
        )
      );
      togglePermission(mod.moduleKey, actionKey);
    },
    [mod.moduleKey, togglePermission]
  );

  const handleToggleAll = useCallback(() => {
    const allEnabled = actionsState.every((a) => a.enabled);
    const updated = actionsState.map((a) => ({ ...a, enabled: !allEnabled }));
    setActionsState(updated);
    toggleAll(mod.moduleKey);
  }, [actionsState, mod.moduleKey, toggleAll]);

  const totalCount = actionsState.length;
  const enabledCount = actionsState.filter((a) => a.enabled).length;

  const isAllSelected = totalCount > 0 && enabledCount === totalCount;

  return (
    <Accordion
      sx={{
        mb: 2,
        borderRadius: 2,
        boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
      }}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <FormControlLabel
          control={
            <Checkbox
              checked={isAllSelected}
              indeterminate={!isAllSelected && enabledCount > 0}
              onChange={handleToggleAll}
            />
          }
          label={
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography fontWeight={700}>
                {mod.displayName || mod.moduleKey}
              </Typography>
              <Typography
                variant="body2"
                color={enabledCount > 0 ? "success.main" : "text.secondary"}
              >
                ({enabledCount}/{totalCount} enabled)
              </Typography>
            </Box>
          }
          onClick={(e) => e.stopPropagation()}
        />
      </AccordionSummary>

      <AccordionDetails>
        <Box sx={{ pl: 3 }}>
          {actionsState.map((action) => (
            <FormControlLabel
              key={action.key}
              control={
                <Checkbox
                  checked={action.enabled}
                  onChange={() => handleTogglePermission(action.key)}
                />
              }
              label={action.displayName || action.key}
            />
          ))}
        </Box>
      </AccordionDetails>
    </Accordion>
  );
});


/* ---------------- Helpers ---------------- */
const arrayEquals = (a = [], b = []) =>
  a.length === b.length && [...a].sort().every((v, i) => v === [...b].sort()[i]);

const checkPlanModified = (form, plan) => {
  if (!form?.plan) return false;
  const fp = form.plan;

  const priceChanged = (plan.pricePaise || 0) !== (fp.pricePaise || 0);
  const durationChanged = (plan.durationDays || 0) !== (fp.durationDays || 0);

  const usageChanged = Object.keys(plan.userPricing || {}).some(
    (k) => (fp.userPricing?.[k] || 0) !== parseInt(plan.userPricing[k] || 0)
  );

  const permissionChanged = (plan.modulePermissions || []).some((mod) => {
    const defaultKeys = (mod.actions || []).map((a) => a.key);
    const selectedKeys =
      fp.modulePermissions
        ?.find((m) => m.moduleKey === mod.moduleKey)
        ?.actions.filter((a) => a.enabled)
        .map((a) => a.key) || [];
    return !arrayEquals(defaultKeys, selectedKeys);
  });

  return priceChanged || durationChanged || usageChanged || permissionChanged;
};
