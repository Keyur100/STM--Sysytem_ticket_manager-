import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSnackbar } from "notistack";
import { Box, Paper, Typography, Button, Stack, Alert, CircularProgress } from "@mui/material";
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import api from "../../../api/axios";

export default function CompanyDeleteAll() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { enqueueSnackbar } = useSnackbar();
  const navigate = useNavigate();

  const handleDeleteAll = async () => {
    const confirmed = window.confirm(
      "This will permanently delete all companies and all related records. Do you want to continue?"
    );
    if (!confirmed) return;

    setLoading(true);
    setError(null);

    try {
      await api.delete("/saas/company/all");
      enqueueSnackbar("All companies and related records were deleted successfully.", {
        variant: "success",
      });
      navigate("/companies");
    } catch (err) {
      const message = err.response?.data?.message || err.message || "Failed to delete all records.";
      setError(message);
      enqueueSnackbar(message, { variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box p={3}>
      <Paper sx={{ p: 4, maxWidth: 760, mx: "auto" }}>
        <Stack spacing={3}>
          <Typography variant="h5" fontWeight={700}>
            Delete All Companies
          </Typography>

          <Typography>
            This action will delete all company records and related data from the following collections:
          </Typography>

          <Box component="ul" sx={{ pl: 3, mb: 0 }}>
            <li>companies</li>
            <li>orders</li>
            <li>subscriptions</li>
            <li>wallets</li>
            <li>wallettransactions</li>
            <li>payments</li>
            <li>audittrails</li>
            <li>branches</li>
            <li>clientusers</li>
            <li>synclogs</li>
            <li>transactions</li>
          </Box>

          {error && <Alert severity="error">{error}</Alert>}

          <Button
            variant="contained"
            color="error"
            startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <DeleteForeverIcon />}
            onClick={handleDeleteAll}
            disabled={loading}
            sx={{ width: "fit-content", textTransform: "none" }}
          >
            {loading ? "Deleting..." : "Delete All Company Data"}
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
}
