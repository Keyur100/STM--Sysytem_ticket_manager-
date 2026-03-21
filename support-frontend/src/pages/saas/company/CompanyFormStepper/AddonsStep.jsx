import React, { useEffect, useState, useCallback } from "react";
import {
  Grid,
  Card,
  CardContent,
  Typography,
  
  Button,
  Box,
  CircularProgress,
  Alert,
  Chip,
  Divider,
  useTheme,
  Tooltip,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import InfoIcon from "@mui/icons-material/Info";
import api from "../../../../api/axios";
import Loader from "../../../../components/common/Loader";
import usePermissions from "../../../../helpers/hooks/usePermissions";
import RequiredTextField from '../../../../components/form/RequiredTextField';

export default function AddonsStep({ form, handleChange }) {
  const theme = useTheme();
  const { hasPermission } = usePermissions();
  const [addons, setAddons] = useState([]);
  const [selectedAddons, setSelectedAddons] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Check if user has permission to read add-ons
  const canReadAddons = hasPermission("saas.addon_read");
  const canBuyAddons = hasPermission("saas.addon_buy");

  // Theme-aware colors
  const isDark = theme.palette.mode === "dark";
  const cardBgColor = isDark ? theme.palette.background.paper : "#fff";
  const headerColor = isDark ? theme.palette.primary.light : theme.palette.primary.main;
  const selectedCardBg = isDark ? "rgba(25, 118, 210, 0.1)" : "#f5f9ff";
  const dividerColor = isDark ? theme.palette.divider : "#e0e0e0";

  // Fetch add-ons from backend
  const fetchAddons = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get("/saas/addons");
      const responseData = res.data;
      const addonList = responseData || [];
      setAddons(Array.isArray(addonList) ? addonList : []);
    } catch (err) {
      console.error("Failed to fetch addons:", err);
      setError("Failed to load add-ons");
      setAddons([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAddons();
  }, [fetchAddons]);

  // Initialize selected addons from form if available
  useEffect(() => {
    if (form.selectedAddons && typeof form.selectedAddons === "object") {
      setSelectedAddons({ ...form.selectedAddons });
    }
  }, [form.selectedAddons]);

  // Handle quantity change
  const handleQuantityChange = (addonValue, quantity) => {
    const newQuantity = Math.max(0, quantity);
    const updated = { ...selectedAddons };

    if (newQuantity === 0) {
      delete updated[addonValue];
    } else {
      updated[addonValue] = newQuantity;
    }

    setSelectedAddons(updated);
    handleChange("selectedAddons", updated);
  };

  // Handle increment/decrement buttons
  const handleIncrement = (addonValue, currentQty = 0) => {
    handleQuantityChange(addonValue, currentQty + 1);
  };

  const handleDecrement = (addonValue, currentQty = 0) => {
    handleQuantityChange(addonValue, Math.max(0, currentQty - 1));
  };

  // Calculate total for an add-on
  const calculateAddonTotal = (addon) => {
    const qty = selectedAddons[addon.value] || 0;
    const price = (addon.pricePaise || 0) / 100;
    return price * qty;
  };

  // Calculate total add-ons price
  const getTotalAddonsPrice = () => {
    return addons.reduce((sum, addon) => sum + calculateAddonTotal(addon), 0);
  };

  if (loading) {
    return <Loader />;
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
        {error}
      </Alert>
    );
  }

  if (addons.length === 0) {
    return (
      <Alert severity="info" sx={{ borderRadius: 2 }}>
        No add-ons available at the moment
      </Alert>
    );
  }

  return (
    <Box sx={{ py: 2 }}>
      {/* Header Section */}
      <Box sx={{ mb: 4 }}>
        <Typography 
          variant="h5" 
          sx={{ 
            fontWeight: 700, 
            mb: 1,
            color: headerColor,
          }}
        >
          Add-ons & Enhancements
        </Typography>
        <Typography 
          variant="body2" 
          color="textSecondary"
          sx={{ mb: 2 }}
        >
          Extend your plan with additional features and services
        </Typography>
      </Box>

      {/* Permission Alerts */}
      {!canReadAddons && (
        <Alert severity="warning" sx={{ mb: 3, borderRadius: 2 }}>
          You don't have permission to view add-ons
        </Alert>
      )}

      {canReadAddons && !canBuyAddons && (
        <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
          You can view add-ons but don't have permission to purchase them
        </Alert>
      )}

      {/* Add-ons Grid */}
      <Grid container spacing={2.5}>
        {addons.map((addon) => {
          const qty = selectedAddons[addon.value] || 0;
          const price = (addon.pricePaise || 0) / 100;
          const total = calculateAddonTotal(addon);
          const isSelected = qty > 0;

          return (
            <Grid item sx={{ width: "320px" }} key={addon.value}>
              <Card
                sx={{
                  height: "380px",
                  display: "flex",
                  flexDirection: "column",
                  backgroundColor: isSelected ? selectedCardBg : cardBgColor,
                  border: `2px solid ${isSelected ? theme.palette.primary.main : dividerColor}`,
                  borderRadius: 2,
                  transition: "all 0.3s ease",
                  "&:hover": {
                    boxShadow: isDark 
                      ? "0 8px 24px rgba(0, 0, 0, 0.3)" 
                      : "0 8px 24px rgba(0, 0, 0, 0.12)",
                    borderColor: theme.palette.primary.main,
                  },
                }}
              >
                <CardContent sx={{ flexGrow: 1, pb: 2 }}>
                  {/* Title with Check Icon and Info Icon */}
                  <Box display="flex" alignItems="flex-start" gap={0.5} mb={1}>
                    <Box flex={1}>
                      <Typography 
                        variant="subtitle1" 
                        sx={{ 
                          fontWeight: 700,
                          color: isDark ? theme.palette.text.primary : "#1a1a1a",
                          mb: 0.5
                        }}
                      >
                        {addon.name}
                      </Typography>
                    </Box>
                    {addon.description && (
                      <Tooltip 
                        title={addon.description}
                        arrow
                        placement="top"
                      >
                        <InfoIcon 
                          sx={{ 
                            color: theme.palette.primary.main, 
                            fontSize: "1.2rem",
                            flexShrink: 0,
                            cursor: "pointer",
                            opacity: 0.7,
                            "&:hover": {
                              opacity: 1
                            }
                          }} 
                        />
                      </Tooltip>
                    )}
                    {isSelected && (
                      <CheckCircleIcon 
                        sx={{ 
                          color: theme.palette.primary.main, 
                          fontSize: "1.5rem",
                          flexShrink: 0
                        }} 
                      />
                    )}
                  </Box>

                  {/* Description */}
                  {addon.description && (
                    <Typography 
                      variant="body2" 
                      color="textSecondary" 
                      sx={{ 
                        mb: 2,
                        lineHeight: 1.5,
                        display: "none"
                      }}
                    >
                      {addon.description}
                    </Typography>
                  )}

                  <Divider sx={{ my: 1.5 }} />

                  {/* Price and Tax Info */}
                  <Box sx={{ mb: 2 }}>
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        fontWeight: 600,
                        color: theme.palette.primary.main,
                        fontSize: "1.1rem"
                      }}
                    >
                      ₹{price.toFixed(2)} 
                      <Typography 
                        component="span" 
                        variant="caption" 
                        sx={{ ml: 0.5, fontWeight: 400 }}
                      >
                        per unit
                      </Typography>
                    </Typography>
                    {addon.hasTax && (
                      <Chip 
                        label={`Incl. ${addon.taxName || "Tax"}`}
                        size="small"
                        variant="outlined"
                        sx={{ mt: 1, height: "24px" }}
                      />
                    )}
                  </Box>
                </CardContent>

                {/* Quantity Controls */}
                <Divider />
                <CardContent sx={{ pt: 2, pb: 2 }}>
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      display: "block", 
                      mb: 1.5,
                      fontWeight: 600,
                      color: "textSecondary"
                    }}
                  >
                    Quantity
                  </Typography>
                  
                  <Box 
                    display="flex" 
                    alignItems="center" 
                    gap={0.5}
                    mb={2}
                  >
                    <Button
                      size="small"
                      variant={qty > 0 ? "contained" : "outlined"}
                      onClick={() => handleDecrement(addon.value, qty)}
                      disabled={!canBuyAddons || qty === 0}
                      sx={{
                        minWidth: "40px",
                        height: "40px",
                        p: 0,
                        borderRadius: 1,
                      }}
                    >
                      <RemoveIcon fontSize="small" />
                    </Button>

                    <RequiredTextField
                      formik={null}
                      name={`addon_${addon.value}`}
                      type="number"
                      size="small"
                      value={qty}
                      onChange={(e) => handleQuantityChange(addon.value, parseInt(e.target.value) || 0)}
                      disabled={!canBuyAddons}
                      inputProps={{ min: 0, step: 1, style: { textAlign: "center" } }}
                      sx={{ 
                        width: 70,
                        "& .MuiInputBase-input": {
                          textAlign: "center",
                          fontWeight: 600,
                        }
                      }}
                    />

                    <Button
                      size="small"
                      variant={qty > 0 ? "contained" : "outlined"}
                      onClick={() => handleIncrement(addon.value, qty)}
                      disabled={!canBuyAddons}
                      sx={{
                        minWidth: "40px",
                        height: "40px",
                        p: 0,
                        borderRadius: 1,
                      }}
                    >
                      <AddIcon fontSize="small" />
                    </Button>
                  </Box>

                  {/* Total for this addon */}
                  {qty > 0 && (
                    <Box 
                      sx={{
                        backgroundColor: isDark 
                          ? "rgba(255, 255, 255, 0.05)" 
                          : "#f5f5f5",
                        p: 1.5,
                        borderRadius: 1,
                        textAlign: "center"
                      }}
                    >
                      <Typography variant="caption" color="textSecondary">
                        Subtotal
                      </Typography>
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          fontWeight: 700,
                          color: theme.palette.primary.main,
                          fontSize: "1rem"
                        }}
                      >
                        ₹{total.toFixed(2)}
                      </Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {/* Summary Card */}
      {Object.keys(selectedAddons).length > 0 && (
        <Card 
          sx={{ 
            mt: 4, 
            backgroundColor: selectedCardBg,
            border: `2px solid ${theme.palette.primary.main}`,
            borderRadius: 2
          }}
        >
          <CardContent>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Box>
                <Typography variant="body2" color="textSecondary" sx={{ mb: 0.5 }}>
                  Total Add-ons Cost
                </Typography>
                <Typography 
                  variant="h6" 
                  sx={{ 
                    fontWeight: 700,
                    color: theme.palette.primary.main,
                  }}
                >
                  ₹{getTotalAddonsPrice().toFixed(2)}
                </Typography>
              </Box>
              <Box sx={{ textAlign: "right" }}>
                <Typography variant="caption" color="textSecondary">
                  {Object.values(selectedAddons).reduce((sum, qty) => sum + qty, 0)} item{Object.values(selectedAddons).reduce((sum, qty) => sum + qty, 0) !== 1 ? "s" : ""} selected
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
