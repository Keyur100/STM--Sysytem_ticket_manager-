import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  CircularProgress,
  TextField,
  Pagination,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import { usePermissions } from "../../../helpers/permissionHelper";
import api from "../../../api/axios";
import UpgradeDialog from "./UpgradeDialog";
import ReactivateDialog from "./ReactivateDialog";

export default function SubscriptionList({ companyId }) {
  const [subscriptions, setSubscriptions] = useState([]);
  const [page, setPage] = useState(1);
  const [limit, ] = useState(10);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const { hasPermission } = usePermissions();

  // Dialog states
  const [selectedSubscription, setSelectedSubscription] = useState(null);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [reactivateOpen, setReactivateOpen] = useState(false);

  const fetchSubscriptions = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get(`/saas/subscriptions`, {
        params: {
          companyId,
          page,
          limit,
          search,
        },
      });

      setSubscriptions(response.data.data || []);
      setTotal(response.data.pagination?.total || 0);
    } catch (err) {
      console.error("Failed to fetch subscriptions:", err);
    } finally {
      setLoading(false);
    }
  }, [companyId, page, limit, search]);

  useEffect(() => {
    if (companyId) {
      fetchSubscriptions();
    }
  }, [companyId, page, limit, search, fetchSubscriptions]);

  const handleUpgrade = (subscription) => {
    setSelectedSubscription(subscription);
    setUpgradeOpen(true);
  };

  const handleReactivate = (subscription) => {
    setSelectedSubscription(subscription);
    setReactivateOpen(true);
  };

  const getStatusColor = (status) => {
    const colors = {
      ACTIVE: "success",
      EXPIRED: "warning",
      CANCELLED: "error",
      PENDING: "info",
    };
    return colors[status] || "default";
  };

  const getStatusLabel = (status) => {
    const labels = {
      ACTIVE: "Active",
      EXPIRED: "Expired",
      CANCELLED: "Cancelled",
      PENDING: "Pending",
    };
    return labels[status] || status;
  };

  return (
    <Box>
      {/* Search */}
      <TextField
        placeholder="Search by plan name..."
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setPage(1);
        }}
        size="small"
        sx={{ mb: 2, width: 300 }}
      />

      {/* Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: "action.hover" }}>
              <TableCell>Plan</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Start Date</TableCell>
              <TableCell>End Date</TableCell>
              <TableCell>Price/Month</TableCell>
              <TableCell>Add-ons</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : subscriptions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                  No subscriptions found
                </TableCell>
              </TableRow>
            ) : (
              subscriptions.map((sub) => (
                <TableRow key={sub._id}>
                  <TableCell>{sub.planSnapshot?.name}</TableCell>
                  <TableCell>
                    <Chip
                      label={getStatusLabel(sub.status)}
                      color={getStatusColor(sub.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {new Date(sub.startAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    {new Date(sub.endAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    ₹{(sub.planSnapshot?.pricePaise / 100).toFixed(2)}
                  </TableCell>
                  <TableCell>
                    {sub.addonSnapshot?.length > 0
                      ? `${sub.addonSnapshot.length} add-on(s)`
                      : "-"}
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: "flex", gap: 1 }}>
                      {hasPermission("saas.subscription_upgrade") &&
                        sub.status === "ACTIVE" && (
                          <Button
                            size="small"
                            variant="outlined"
                            color="primary"
                            onClick={() => handleUpgrade(sub)}
                          >
                            ⬆️ Upgrade
                          </Button>
                        )}

                      {hasPermission("saas.subscription_reactivate") &&
                        (sub.status === "EXPIRED" || sub.status === "ACTIVE") && (
                          <Button
                            size="small"
                            variant="outlined"
                            color="success"
                            onClick={() => handleReactivate(sub)}
                          >
                            🔄 Renew
                          </Button>
                        )}
                    </Box>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination */}
      {total > limit && (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
          <Pagination
            count={Math.ceil(total / limit)}
            page={page}
            onChange={(e, value) => setPage(value)}
            disabled={loading}
          />
        </Box>
      )}

      {/* Upgrade Dialog */}
      {upgradeOpen && (
        <UpgradeDialog
          open={upgradeOpen}
          subscription={selectedSubscription}
          company={{ _id: companyId }}
          onClose={() => {
            setUpgradeOpen(false);
            setSelectedSubscription(null);
          }}
          onSuccess={() => {
            fetchSubscriptions();
          }}
        />
      )}

      {/* Reactivate Dialog */}
      {reactivateOpen && (
        <ReactivateDialog
          open={reactivateOpen}
          subscription={selectedSubscription}
          company={{ _id: companyId }}
          onClose={() => {
            setReactivateOpen(false);
            setSelectedSubscription(null);
          }}
          onSuccess={() => {
            fetchSubscriptions();
          }}
        />
      )}
    </Box>
  );
}
