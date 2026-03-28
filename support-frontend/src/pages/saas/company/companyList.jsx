// import React, { useEffect, useState } from 'react';
// import { Box, Button, List, ListItem, ListItemText, Typography } from '@mui/material';
// import api from '../../../api/axios';
// import CompanyEditModal from './CompanyEditModal';
// import ManageClientsModal from './ManageClientsModal';

// export default function CompanyList() {
//   const [companies, setCompanies] = useState([]);
//   const [loading, setLoading] = useState(false);
//   const [editId, setEditId] = useState(null);
//   const [manageId, setManageId] = useState(null);

//   const fetch = async () => {
//     setLoading(true);
//     try {
//       const res = await api.get('/saas/company');
//       setCompanies(res.data.items || res.data || []);
//     } catch (e) { console.error(e); }
//     setLoading(false);
//   };

//   useEffect(() => { fetch(); }, []);

//   return (
//     <Box>
//       <Typography variant="h6">Companies</Typography>
//       <List>
//         {companies.map(c => (
//           <ListItem key={c._id} secondaryAction={(
//             <>
//               <Button size="small" onClick={() => setEditId(c._id)}>Edit</Button>
//               <Button size="small" onClick={() => setManageId(c._id)}>Clients</Button>
//             </>
//           )}>
//             <ListItemText primary={c.name || c.code} secondary={c.contact?.email || ''} />
//           </ListItem>
//         ))}
//       </List>

//       <CompanyEditModal open={!!editId} onClose={(saved) => { setEditId(null); if (saved) fetch(); }} companyId={editId} />
//       <ManageClientsModal open={!!manageId} onClose={() => setManageId(null)} companyId={manageId} />
//     </Box>
//   );
// }
import React, { useState, useEffect, useCallback } from "react";
import { Box, Paper, Button, Stack, Dialog, DialogTitle, DialogContent, DialogActions, Typography, CircularProgress, Alert, Accordion, AccordionSummary, AccordionDetails, Chip } from "@mui/material";
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useNavigate } from "react-router-dom";
import api from "../../../api/axios";
import TableWrapper from "../../../components/common/TableWrapper";
import useDebounce from "../../../helpers/hooks/useDebounce";
import usePermissions from "../../../helpers/hooks/usePermissions";
import CashPaymentDialog from "./CashPaymentDialog";
import UpgradeDialog from "../subscription/UpgradeDialog";
import ReactivateDialog from "../subscription/ReactivateDialog";
import SyncModal from './SyncModal';
import AddonsPurchaseDialog from './AddonsPurchaseDialog';
import BranchAdminForm from './BranchAdminForm';

export default function CompanyList() {
  const [companies, setCompanies] = useState([]);
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const [order, setOrder] = useState("asc");
  const [orderBy, setOrderBy] = useState("name");
  const [selectedCompany, setSelectedCompany] = useState(null);
  
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsData, setDetailsData] = useState({ company: null });
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [reactivateOpen, setReactivateOpen] = useState(false);
  const [syncModalOpen, setSyncModalOpen] = useState(false);
  const [openAddons, setOpenAddons] = useState(false);
  const [branchAdminOpen, setBranchAdminOpen] = useState(false);
  const [selectedBranchId, setSelectedBranchId] = useState(null);
  const [opLoading, setOpLoading] = useState(false);
  const [showModulePermissions, setShowModulePermissions] = useState(false);

  const nav = useNavigate();
  const { hasPermission } = usePermissions();

  /** 🔹 Fetch Companies */
  const fetchCompanies = useCallback(async () => {
    const skip = page * limit;

    const res = await api.get("/saas/company", {
      params: {
        page: page + 1,
        limit,
        skip,
        search: q,
        sortBy: orderBy,
        sortOrder: order,
      },
    });

    const payload = res.data;
    const list = Array.isArray(payload)
      ? payload
      : payload.items || payload.data || [];

    setCompanies(list);
    setTotal(payload.total || payload.count || list.length);
  }, [page, limit, q, order, orderBy]);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  /** 🔹 Debounce search input */
  const debouncedSearch = useDebounce((v) => {
    setQ(v);
    setPage(0);
  }, 400);

  /** 🔹 Delete Company */
  const handleDelete = async (row) => {
    await api.delete(`/saas/company/${row._id}`);
    fetchCompanies();
  };

  const openDetails = useCallback(async (row) => {
    setDetailsOpen(true);
    setLoadingDetails(true);
    try {
      const res = await api.get(`/saas/company/${row._id}/full-details`);
      setDetailsData({ company: res.data || null });
    } catch (err) {
      console.error("Error loading company details:", err);
    } finally {
      setLoadingDetails(false);
    }
  }, []);

  const hasPaidOrders = (company) => {
    if (!company) return false;
    // Consider company as 'paid' when there is no pending amount
    if (company.paymentTotals && typeof company.paymentTotals.totalPendingPaise === 'number') {
      return company.paymentTotals.totalPendingPaise === 0;
    }

    // Fallback: if recent orders show paid status or successful payments
    if (company.orderSummary && Array.isArray(company.orderSummary.recentOrders)) {
      return company.orderSummary.recentOrders.some(
        (o) => o.status === "paid" || (Array.isArray(o.payments) && o.payments.some((p) => p.status === "success"))
      );
    }

    return false;
  };

  const closeDetails = useCallback(() => {
    setDetailsOpen(false);
    setDetailsData({ company: null });
    setSyncMessage('');
  }, []);

  const handleEditBranch = async (branch) => {
    setOpLoading(true);
    setSyncMessage('');
    try {
      // Ask backend to sync/edit branch with 3rd-party then update local schema
      await api.post(`/saas/branch/${branch._id}/sync`);
      setSyncMessage({ type: 'success', text: 'Branch updated successfully' });
      // refresh listings and details
      fetchCompanies();
      if (detailsData.company?.company?._id) openDetails({ _id: detailsData.company.company._id });
    } catch (err) {
      setSyncMessage({ type: 'error', text: err.response?.data?.message || 'Branch update failed' });
    } finally {
      setOpLoading(false);
    }
  };

  const handleEditClientUser = async (user) => {
    setOpLoading(true);
    setSyncMessage('');
    try {
      // Ask backend to sync/edit client user with 3rd-party then update local schema
      await api.post(`/saas/client-user/${user._id}/sync`);
      setSyncMessage({ type: 'success', text: 'Client user updated successfully' });
      fetchCompanies();
      if (detailsData.company?.company?._id) openDetails({ _id: detailsData.company.company._id });
    } catch (err) {
      setSyncMessage({ type: 'error', text: err.response?.data?.message || 'Client user update failed' });
    } finally {
      setOpLoading(false);
    }
  };

  // Helper: Check if company has unpaid/pending payments
  const hasUnpaidPayments = (company) => {
    // Prefer compact totals if provided
    if (company?.paymentTotals && typeof company.paymentTotals.totalPendingPaise === 'number') {
      return company.paymentTotals.totalPendingPaise > 0;
    }

    // Fallback: inspect recent orders for any amountDue
    if (company?.orderSummary?.recentOrders && company.orderSummary.recentOrders.length > 0) {
      return company.orderSummary.recentOrders.some(o => (o.final?.amountDuePaise || 0) > 0);
    }

    return false;
  };

  // Sync company data to 3rd-party Laravel API
  const handleSync = async (companyId) => {
    setSyncLoading(true);
    setSyncMessage('');
    try {
      await api.post(`/saas/company/${companyId}/sync`);
      setSyncMessage({ type: 'success', text: 'Sync completed successfully' });
    } catch (err) {
      setSyncMessage({ type: 'error', text: err.response?.data?.message || 'Sync failed' });
    } finally {
      setSyncLoading(false);
    }
  };

  /** 🔹 Define Table Columns */
  const columns = [
    {
      field: "name",
      label: "Company Name",
      sortable: true,
      width: 200,
      render: (r) => r.name || "-",
    },
    {
      field: "email",
      label: "Email",
      sortable: true,
      width: 250,
      render: (r) => r.email || r.contact?.email || "-",
    },
    {
      field: "plan",
      label: "Plan",
      width: 150,
      render: (r) => r.plan?.name || "—",
    },
    {
      field: "planExpiry",
      label: "Plan Expiry",
      sortable: true,
      width: 160,
      render: (r) => {
        if (!r.planExpiry) return "—";

        const DAY_MS = 24 * 60 * 60 * 1000;
        const now = Date.now();
        const expiry = Number(r.planExpiry);
        const durationDays = r.plan?.durationDays || null;

        let display = new Date(expiry).toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        });

        // If durationDays available, compute percent elapsed and color
        if (durationDays && durationDays > 0) {
          const daysRemaining = Math.ceil((expiry - now) / DAY_MS);
          const elapsed = Math.max(0, durationDays - daysRemaining);
          const pct = Math.min(100, Math.round((elapsed / durationDays) * 100));

          let bg = "#a5d6a7"; // green
          if (pct >= 80) bg = "#ef9a9a"; // red-ish
          else if (pct >= 40) bg = "#fff59d"; // yellow-ish

          return (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Box sx={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: bg }} />
              <span>{display}</span>
            </Box>
          );
        }

        return display;
      },
    },
    {
      field: "status",
      label: "Status",
      width: 120,
      render: (r) => r.status || "—",
    },
  ];

  return (
    <Box p={2}>
      <Paper sx={{ p: 2 }}>
        <TableWrapper
          headerLabel="Companies"
          data={companies}
          columns={columns}
          total={total}
          page={page}
          rowsPerPage={limit}
          onPageChange={(newPage) => setPage(newPage)}
          onRowsPerPageChange={(n) => {
            setLimit(n);
            setPage(0);
          }}
          onSortChange={(field, dir) => {
            setOrderBy(field);
            setOrder(dir);
          }}
          order={order}
          orderBy={orderBy}
          onSearchChange={debouncedSearch}
          searchPlaceHolder={"Search by name."}
          onAdd={{ fn: () => nav("/companies/new"), perm: "saas.company_create" }}
          onEdit={(r) => nav(`/companies/${r._id}/edit`)}
          onView={openDetails}
          onDelete={handleDelete}
          editPerm="saas.company_update"
          deletePerm="saas.company_delete"
          hideEdit={false}
          hideDelete={false}
          hideView={false}
          hideAdd={false}
          addLabel="Add Company"
        />
      </Paper>

      {/* 💰 Cash Payment Dialog */}
      {selectedCompany && (
        <CashPaymentDialog
          open={!!selectedCompany}
          company={selectedCompany}
          onClose={() => {
            setSelectedCompany(null);
          }}
          onSuccess={() => {
            // capture id before clearing selection
            const cid = selectedCompany?.company?._id || selectedCompany?._id;
            setSelectedCompany(null);
            fetchCompanies();
            // Refresh details if detail dialog is open
            if (detailsOpen && detailsData.company?.company?._id === cid) {
              openDetails({ _id: cid });
            }
          }}
        />
      )}

      {/* Details Dialog */}
      <Dialog open={detailsOpen} onClose={closeDetails} maxWidth="md" fullWidth>
        <DialogTitle>Company Details</DialogTitle>
        <DialogContent dividers sx={{ maxHeight: "80vh", overflowY: "auto" }}>
          {loadingDetails ? (
            <Box display="flex" justifyContent="center" p={4}><CircularProgress /></Box>
          ) : detailsData.company ? (
            <Box>
              {/* Sync Message */}
              {syncMessage && (
                <Alert severity={syncMessage.type} sx={{ mb: 2 }}>
                  {syncMessage.text}
                </Alert>
              )}

              {/* Action Buttons */}
              {hasPermission('saas.company_record_payment') && (
                <Stack direction="row" spacing={1} sx={{ mb: 3 }}>
                      {hasUnpaidPayments(detailsData.company) && !hasPaidOrders(detailsData.company) && (
                        <Button 
                          variant="contained" 
                          color="success"
                          onClick={() => setSelectedCompany(detailsData.company)}
                        >
                          💰 Record Payment
                        </Button>
                      )}
                      {hasPaidOrders(detailsData.company) && (
                        <Button 
                          variant="outlined" 
                          color="primary"
                          onClick={() => setSyncModalOpen(true)}
                          disabled={syncLoading}
                        >
                          🔄 Stepwise Sync
                        </Button>
                      )}
                      {hasPaidOrders(detailsData.company) && hasPermission('saas.addon_purchase') && (
                        <Button variant="contained" color="secondary" onClick={() => setOpenAddons(true)}>
                          ➕ Buy Addons
                        </Button>
                      )}
                </Stack>
              )}
              {/* Company Info */}
              <Typography variant="h6" sx={{ mb: 2, fontWeight: "bold" }}>📋 Company Information</Typography>
              <Paper sx={{ p: 2, mb: 3, backgroundColor: 'background.paper' }}>
                <Typography><strong>Name:</strong> {detailsData.company.company?.name || '-'}</Typography>
                <Typography><strong>Email:</strong> {detailsData.company.company?.email || '-'}</Typography>
                <Typography><strong>Status:</strong> {detailsData.company.company?.status || '-'}</Typography>
                <Typography><strong>Created:</strong> {detailsData.company.company?.createdAt ? new Date(detailsData.company.company.createdAt).toLocaleString() : '-'}</Typography>
              </Paper>

              {/* Branches */}
              {detailsData.company.branches && detailsData.company.branches.length > 0 && (
                <>
                  <Typography variant="h6" sx={{ mb: 2, fontWeight: "bold" }}>🏢 Branches</Typography>
                  <Paper sx={{ p: 2, mb: 3 }}>
                    {detailsData.company.branches.map((b) => (
                        <Box key={b._id} sx={{ mb: 1 }}>
                          <Typography variant="body2"><strong>{b.name || b.code || b._id}</strong></Typography>
                          <Typography variant="caption">{b.address || b.city || ''} {b.phone ? `• ${b.phone}` : ''}</Typography>
                          <Box sx={{ mt: 1 }}>
                            {/* <Button size="small" variant="outlined" onClick={() => handleEditBranch(b)} disabled={opLoading}>
                              Edit Branch
                            </Button> */}
                          </Box>
                        </Box>
                      ))}
                  </Paper>
                </>
              )}

              {/* Client Users */}
              {detailsData.company.clientUsers && detailsData.company.clientUsers.length > 0 && (
                <>
                  <Typography variant="h6" sx={{ mb: 2, fontWeight: "bold" }}>👥 Client Users</Typography>
                  <Paper sx={{ p: 2, mb: 3 }}>
                    {detailsData.company.clientUsers.map((u) => (
                      <Paper key={u._id} sx={{ p: 1, mb: 1 }}>
                        <Typography><strong>{u.name || u.email}</strong> <small>({u.status})</small></Typography>
                        <Typography variant="caption">Email: {u.email || '-'}</Typography>
                        <Typography variant="caption" display="block">Phone: {u.phone || '-'}</Typography>
                        <Typography variant="caption" display="block">Created: {u.createdAt ? new Date(u.createdAt).toLocaleString() : '-'}</Typography>
                        <Box mt={1}>
                          {/* <Button size="small" variant="outlined" onClick={() => handleEditClientUser(u)} disabled={opLoading}>
                            Edit User
                          </Button> */}
                        </Box>
                      </Paper>
                    ))}
                  </Paper>
                </>
              )}

              {/* Plan Details */}
              {detailsData.company.plan && (
                <>
                  <Typography variant="h6" sx={{ mb: 2, fontWeight: "bold" }}>📋 Plan Details</Typography>
                  <Paper sx={{ p: 2, mb: 3 }}>
                    <Typography><strong>Plan Name:</strong> {detailsData.company.plan.planSnapshot?.name || '-'}</Typography>
                    <Typography><strong>Price:</strong> ₹{detailsData.company.plan.planPricePaise ? (detailsData.company.plan.planPricePaise / 100).toFixed(2) : '-'}</Typography>
                    <Typography><strong>Status:</strong> {detailsData.company.plan.status || '-'}</Typography>
                    <Typography><strong>Expiry:</strong> {detailsData.company.plan.endAt ? new Date(detailsData.company.plan.endAt).toLocaleString() : '-'}</Typography>
                    
                    {/* Subscription Action Buttons */}
                    {hasPermission('saas.subscription_upgrade') && detailsData.company.plan.status === 'ACTIVE' && (
                      <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                        <Button variant="outlined" size="small" onClick={() => setUpgradeOpen(true)}>
                          🚀 Upgrade
                        </Button>
                      </Stack>
                    )}

                    {hasPermission('saas.subscription_reactivate') && (detailsData.company.plan.status === 'EXPIRED' || detailsData.company.plan.status === 'SUSPENDED') && (
                      <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                        <Button variant="outlined" size="small" onClick={() => setReactivateOpen(true)}>
                          ♻️ Reactivate
                        </Button>
                      </Stack>
                    )}

                    {detailsData.company.plan.addonSnapshot && detailsData.company.plan.addonSnapshot.length > 0 && (
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="subtitle2"><strong>Addons:</strong></Typography>
                        {detailsData.company.plan.addonSnapshot.map((addon, i) => {
                          const qty = addon.qty || addon.quantity || 1;
                          const price = (addon.pricePaise || 0) / 100;
                          return (
                            <Typography key={i} variant="body2">• {addon.name} - {qty} × ₹{price.toFixed(2)} = ₹{(price * qty).toFixed(2)}</Typography>
                          );
                        })}
                      </Box>
                    )}

                          {detailsData.company.plan.planSnapshot?.modulePermissions && detailsData.company.plan.planSnapshot.modulePermissions.length > 0 && (
                            <Box sx={{ mt: 2 }}>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Typography variant="subtitle2" sx={{ mb: 1 }}><strong>Module Permissions</strong></Typography>
                                <Button size="small" onClick={() => setShowModulePermissions((s) => !s)}>
                                  {typeof showModulePermissions === 'undefined' || showModulePermissions ? 'Hide' : 'Show'}
                                </Button>
                              </Box>

                              {!showModulePermissions ? (
                                <Box sx={{ mt: 1 }}>
                                  <Typography variant="body2" color="text.secondary">{detailsData.company.plan.planSnapshot.modulePermissions.length} modules hidden. Click "Show" to expand.</Typography>
                                </Box>
                              ) : (
                                detailsData.company.plan.planSnapshot.modulePermissions.map((mod, idx) => (
                                  <Accordion key={idx} sx={{ mt: 1 }}>
                                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                      <Typography sx={{ fontWeight: 700 }}>{mod.displayName || mod.moduleKey}</Typography>
                                    </AccordionSummary>
                                    <AccordionDetails>
                                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                        {(mod.actions || []).map((a, j) => {
                                          const permKey = `saas.${mod.moduleKey}_${a.key}`;
                                          const label = a.displayName || a.key || permKey;
                                          return (
                                            <Chip
                                              key={j}
                                              label={label}
                                              size="small"
                                              color={a.enabled ? 'primary' : 'default'}
                                              variant={a.enabled ? 'filled' : 'outlined'}
                                            />
                                          );
                                        })}
                                      </Box>
                                    </AccordionDetails>
                                  </Accordion>
                                ))
                              )}
                            </Box>
                          )}
                  </Paper>
                </>
              )}

              {/* Wallet Summary */}
              {detailsData.company.wallet && (
                <>
                  <Typography variant="h6" sx={{ mb: 2, fontWeight: "bold" }}>💰 Wallet Balance</Typography>
                  <Paper sx={{ p: 2, mb: 3, backgroundColor: 'success.light' }}>
                    <Typography variant="h6" sx={{ fontWeight: "bold" }}>₹{(detailsData.company.wallet.balance || 0).toFixed(2)}</Typography>
                    <Typography variant="body2">Status: {detailsData.company.wallet.status || '-'}</Typography>
                  </Paper>
                </>
              )}

              {/* Order Summary */}
              {detailsData.company.orderSummary && (
                <>
                  <Typography variant="h6" sx={{ mb: 2, fontWeight: "bold" }}>📦 Order Summary</Typography>
                  <Paper sx={{ p: 2, mb: 3 }}>
                    <Typography><strong>Total Orders:</strong> {detailsData.company.orderSummary.totalOrders}</Typography>
                    <Typography variant="subtitle2" sx={{ mt: 2, fontWeight: "bold" }}>Recent Orders:</Typography>
                    {detailsData.company.orderSummary.recentOrders && detailsData.company.orderSummary.recentOrders.length > 0 ? (
                      detailsData.company.orderSummary.recentOrders.map((order) => (
                        <Paper key={order._id} sx={{ p: 2, mt: 1.5, backgroundColor: 'warning.light', border: (theme) => `1px solid ${theme.palette.warning.main}` }}>
                          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                            <Typography variant="body2"><strong>Order #{order.orderNumber}</strong></Typography>
                            <Typography variant="caption" sx={{ backgroundColor: order.status === "paid" ? 'success.light' : 'warning.light', p: 0.5, borderRadius: 1, fontWeight: "bold" }}>{order.status.toUpperCase()}</Typography>
                          </Box>
                          <Typography variant="caption" sx={{ display: "block", mb: 1.5, color: "text.secondary" }}>{new Date(order.createdAt).toLocaleString()}</Typography>

                          {/* Items Details */}
                          {order.items && order.items.length > 0 && (
                            <Box sx={{ mb: 1.5, pl: 1, borderLeft: (theme) => `3px solid ${theme.palette.warning.main}` }}>
                              <Typography variant="subtitle2" sx={{ fontWeight: "bold", mb: 0.5 }}>Items:</Typography>
                              {order.items.map((item, idx) => (
                                <Box key={idx} sx={{ mb: 0.8 }}>
                                  <Typography variant="body2">
                                    {item.type === "plan" ? "📋" : "🎁"} <strong>{item.name}</strong>
                                    {item.qty > 1 && <span> x{item.qty}</span>}
                                  </Typography>
                                  <Typography variant="caption">₹{((item.priceAtPurchasePaise || 0) / 100).toFixed(2)} 
                                    {item.lineSubtotalPaise && <> → Subtotal: ₹{(item.lineSubtotalPaise / 100).toFixed(2)}</>}
                                  </Typography>
                                </Box>
                              ))}
                            </Box>
                          )}

                          {/* Totals Breakdown */}
                          {order.totals && (
                            <Box sx={{ mt: 1.5, p: 1.5, backgroundColor: 'background.paper', borderRadius: 1 }}>
                              <Typography variant="subtitle2" sx={{ fontWeight: "bold", mb: 1 }}>Totals Breakdown:</Typography>
                              <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1 }}>
                                <Typography variant="caption"><strong>Subtotal:</strong> ₹{((order.totals.subtotalPaise || 0) / 100).toFixed(2)}</Typography>
                                {order.totals.totalDiscountPaise > 0 && (
                                  <Typography variant="caption" sx={{ color: "#4caf50" }}>
                                    <strong>Discount:</strong> -₹{((order.totals.totalDiscountPaise || 0) / 100).toFixed(2)}
                                  </Typography>
                                )}
                                <Typography variant="caption"><strong>Taxable:</strong> ₹{((order.totals.taxableAmountPaise || 0) / 100).toFixed(2)}</Typography>
                                {order.totals.totalTaxPaise > 0 && (
                                  <Typography variant="caption"><strong>Tax:</strong> ₹{((order.totals.totalTaxPaise || 0) / 100).toFixed(2)}</Typography>
                                )}
                              </Box>
                              <Box sx={{ mt: 1, pt: 1, borderTop: (theme) => `2px solid ${theme.palette.divider}` }}>
                                <Typography variant="body2" sx={{ fontWeight: "bold", color: 'error.main' }}>
                                  Total Payable: ₹{((order.totals.totalPayablePaise || 0) / 100).toFixed(2)}
                                </Typography>
                              </Box>
                            </Box>
                          )}

                          {/* Payment Status */}
                          {order.payments && order.payments.length > 0 && (
                            <Box sx={{ mt: 1.5 }}>
                              <Typography variant="subtitle2" sx={{ fontWeight: "bold", mb: 0.5 }}>Payments:</Typography>
                              {order.payments.map((payment, idx) => (
                                <Typography key={idx} variant="caption" sx={{ display: "block", mb: 0.3 }}>
                                  {payment.method === "cash" ? "💵" : "💳"} ₹{((payment.amountPaise || 0) / 100).toFixed(2)} 
                                  <span style={{ marginLeft: "10px", color: payment.status === "success" ? "#4caf50" : "#f44336" }}>
                                    [{payment.status.toUpperCase()}]
                                  </span>
                                </Typography>
                              ))}
                            </Box>
                          )}
                        </Paper>
                      ))
                    ) : (
                      <Typography variant="body2">No recent orders</Typography>
                    )}
                  </Paper>
                </>
              )}

              {/* Payment Totals (compact) */}
              {detailsData.company.paymentTotals && (
                <>
                  <Typography variant="h6" sx={{ mb: 2, fontWeight: "bold" }}>💳 Payment Summary</Typography>
                  <Paper sx={{ p: 2, mb: 3 }}>
                    <Typography><strong>Total Paid:</strong> ₹{(detailsData.company.paymentTotals.totalPaidPaise / 100).toFixed(2)}</Typography>
                    <Typography><strong>Total Pending:</strong> ₹{(detailsData.company.paymentTotals.totalPendingPaise / 100).toFixed(2)}</Typography>
                  </Paper>
                </>
              )}

              {/* Transactions */}
              {detailsData.company.transactions && (
                <>
                  <Typography variant="h6" sx={{ mb: 2, fontWeight: "bold" }}>📊 Recent Transactions</Typography>
                  <Paper sx={{ p: 2 }}>
                    {detailsData.company.transactions.length > 0 ? (
                      detailsData.company.transactions.map((t) => (
                        <Paper key={t._id} sx={{ p: 1.5, mb: 1, backgroundColor: 'background.paper' }}>
                          <Typography variant="body2"><strong>{t.type}</strong></Typography>
                          <Typography variant="body2">Amount: ₹{(t.amount).toFixed(2)}</Typography>
                          <Typography variant="caption">{t.description}</Typography>
                          <Typography variant="caption" display="block" color="textSecondary">{new Date(t.createdAt).toLocaleString()}</Typography>
                        </Paper>
                      ))
                    ) : (
                      <Typography variant="body2">No transactions found.</Typography>
                    )}
                  </Paper>
                </>
              )}
            </Box>
          ) : (
            <Typography>No data available</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDetails}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Branch Admin Modal */}
      <Dialog open={branchAdminOpen} onClose={() => { setBranchAdminOpen(false); setSelectedBranchId(null); }} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Branch Admin</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1 }}>
            <BranchAdminForm companyId={detailsData.company?.company?._id} branchId={selectedBranchId} onSaved={() => { setBranchAdminOpen(false); setSelectedBranchId(null); fetchCompanies(); }} />
          </Box>
        </DialogContent>
      </Dialog>

      <AddonsPurchaseDialog
        open={openAddons}
        onClose={() => setOpenAddons(false)}
        companyId={detailsData.company?.company?._id}
        onSuccess={() => { setOpenAddons(false); openDetails({ _id: detailsData.company?.company?._id }); fetchCompanies(); }}
      />

      {/* Upgrade Dialog */}
      {detailsData.company && (
        <UpgradeDialog
          open={upgradeOpen}
          subscription={detailsData.company.plan}
          company={detailsData.company.company}
          onClose={() => setUpgradeOpen(false)}
          onSuccess={() => {
            setUpgradeOpen(false);
            openDetails({ _id: detailsData.company.company?._id });
          }}
        />
      )}

      {/* Reactivate Dialog */}
      {detailsData.company && (
        <ReactivateDialog
          open={reactivateOpen}
          subscription={detailsData.company.plan}
          company={detailsData.company.company}
          onClose={() => setReactivateOpen(false)}
          onSuccess={() => {
            setReactivateOpen(false);
            openDetails({ _id: detailsData.company.company?._id });
          }}
        />
      )}
      {/* Stepwise Sync Modal */}
      <SyncModal
        open={syncModalOpen}
        onClose={() => setSyncModalOpen(false)}
        companyId={detailsData.company?.company?._id}
      />
    </Box>
  );
}
