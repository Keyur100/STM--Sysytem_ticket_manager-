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
import UpgradeDowngradeSyncModal from './UpgradeDowngradeSyncModal';
import AddonsPurchaseDialog from './AddonsPurchaseDialog';
import BranchAdminForm from './BranchAdminForm';

export default function CompanyList() {
  const [companies, setCompanies] = useState([]);
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const [order, setOrder] = useState("desc");
  const [orderBy, setOrderBy] = useState("createdAt");
  const [selectedCompany, setSelectedCompany] = useState(null);
  
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsData, setDetailsData] = useState({ company: null });
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [reactivateOpen, setReactivateOpen] = useState(false);
  const [syncModalOpen, setSyncModalOpen] = useState(false);
  const [upgradeDowngradeSyncModalOpen, setUpgradeDowngradeSyncModalOpen] = useState(false);
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
      <Dialog 
        open={detailsOpen} 
        onClose={closeDetails} 
        maxWidth="md" 
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: "16px",
            boxShadow: (theme) => theme.palette.mode === 'dark' 
              ? '0 20px 60px rgba(0, 0, 0, 0.8)' 
              : '0 20px 60px rgba(0, 0, 0, 0.15)',
            overflow: 'hidden',
          }
        }}
      >
        <DialogTitle 
          sx={{
            background: (theme) => theme.palette.mode === 'dark'
              ? `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`
              : `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.light} 100%)`,
            color: 'primary.contrastText',
            fontWeight: 700,
            fontSize: '1.5rem',
            padding: '24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 2,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ fontSize: '1.8rem' }}>🏢</Box>
            <span>Company Details</span>
          </Box>
          <Box
            onClick={closeDetails}
            sx={{
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 40,
              height: 40,
              borderRadius: '50%',
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              transition: 'all 0.3s ease',
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.3)',
                transform: 'scale(1.1)',
              },
              fontSize: '1.5rem',
            }}
          >
            ✕
          </Box>
        </DialogTitle>
        <DialogContent 
          dividers 
          sx={{ 
            maxHeight: "80vh", 
            overflowY: "auto",
            padding: '24px',
            backgroundColor: (theme) => theme.palette.mode === 'dark'
              ? 'rgba(0, 0, 0, 0.3)'
              : 'rgba(255, 255, 255, 0.5)',
            '&::-webkit-scrollbar': {
              width: '8px',
            },
            '&::-webkit-scrollbar-track': {
              backgroundColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
              borderRadius: '10px',
            },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: (theme) => theme.palette.primary.main,
              borderRadius: '10px',
              '&:hover': {
                backgroundColor: (theme) => theme.palette.primary.dark,
              }
            }
          }}
        >
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
                      {hasPaidOrders(detailsData.company) && detailsData.company?.company?.subscription?.previousSubscriptionId && (
                        <Button 
                          variant="outlined" 
                          color="success"
                          onClick={() => setUpgradeDowngradeSyncModalOpen(true)}
                          disabled={syncLoading}
                        >
                          ⬆️ Upgrade/Downgrade Sync
                        </Button>
                      )}
                      {hasPaidOrders(detailsData.company) && hasPermission('saas.addon_purchase') && (
                        <Button variant="contained" color="secondary" onClick={() => setOpenAddons(true)}>
                          ➕ Buy Addons
                        </Button>
                      )}
                      {detailsData.company.company?.isTrialUsed && (
                        <Button 
                          variant="contained" 
                          color="warning"
                          onClick={() => nav(`/companies/${detailsData.company.company?._id}/edit?fromTrialConvert=1`)}
                        >
                          🚀 Convert to Actual Plan
                        </Button>
                      )}
                </Stack>
              )}
              {/* Company Info */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 700, fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: 1, color: (theme) => theme.palette.primary.main }}>📋 Company Information</Typography>
                <Paper sx={{ 
                  p: 3, 
                  borderRadius: '12px',
                  backgroundColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(33, 150, 243, 0.08)' : 'rgba(33, 150, 243, 0.05)',
                  border: (theme) => `1px solid ${theme.palette.mode === 'dark' ? 'rgba(33, 150, 243, 0.2)' : 'rgba(33, 150, 243, 0.15)'}`,
                  backdropFilter: 'blur(10px)',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: (theme) => theme.palette.mode === 'dark' ? '0 8px 24px rgba(33, 150, 243, 0.2)' : '0 8px 24px rgba(33, 150, 243, 0.1)'
                  }
                }}>
                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                    <Box>
                      <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.5px' }}>Company Name</Typography>
                      <Typography sx={{ fontWeight: 600, fontSize: '1rem', mt: 0.5 }}>{detailsData.company.company?.name || '—'}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.5px' }}>Email</Typography>
                      <Typography sx={{ fontWeight: 600, fontSize: '1rem', mt: 0.5 }}>{detailsData.company.company?.email || '—'}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.5px' }}>Status</Typography>
                      <Box sx={{ mt: 0.5 }}>
                        <Chip label={detailsData.company.company?.status || '—'} size="small" color="primary" variant="filled" sx={{ fontWeight: 600 }} />
                      </Box>
                    </Box>
                    <Box>
                      <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.5px' }}>Created</Typography>
                      <Typography sx={{ fontWeight: 600, fontSize: '0.95rem', mt: 0.5 }}>{detailsData.company.company?.createdAt ? new Date(detailsData.company.company.createdAt).toLocaleDateString('en-IN') : '—'}</Typography>
                    </Box>
                  </Box>
                </Paper>
              </Box>

              {/* Branches */}
              {detailsData.company.branches && detailsData.company.branches.length > 0 && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h6" sx={{ mb: 2, fontWeight: 700, fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: 1, color: (theme) => theme.palette.primary.main }}>🏢 Branches</Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {detailsData.company.branches.map((b) => (
                      <Paper key={b._id} sx={{ 
                        p: 2.5, 
                        borderRadius: '12px',
                        backgroundColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(76, 175, 80, 0.08)' : 'rgba(76, 175, 80, 0.05)',
                        border: (theme) => `1px solid ${theme.palette.mode === 'dark' ? 'rgba(76, 175, 80, 0.2)' : 'rgba(76, 175, 80, 0.15)'}`,
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          transform: 'translateX(4px)',
                          boxShadow: (theme) => theme.palette.mode === 'dark' ? '0 4px 16px rgba(76, 175, 80, 0.2)' : '0 4px 16px rgba(76, 175, 80, 0.1)'
                        }
                      }}>
                        <Typography variant="body2" sx={{ fontWeight: 700, mb: 1, fontSize: '1rem' }}>{b.name || b.code || b._id}</Typography>
                        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                          {b.address && <Chip icon="📍" label={b.address} size="small" variant="outlined" />}
                          {b.city && <Chip icon="🏙️" label={b.city} size="small" variant="outlined" />}
                          {b.phone && <Chip icon="📞" label={b.phone} size="small" variant="outlined" />}
                        </Box>
                      </Paper>
                    ))}
                  </Box>
                </Box>
              )}

              {/* Client Users */}
              {detailsData.company.clientUsers && detailsData.company.clientUsers.length > 0 && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h6" sx={{ mb: 2, fontWeight: 700, fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: 1, color: (theme) => theme.palette.primary.main }}>👥 Client Users</Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {detailsData.company.clientUsers.map((u) => (
                      <Paper key={u._id} sx={{ 
                        p: 2.5, 
                        borderRadius: '12px',
                        backgroundColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(156, 39, 176, 0.08)' : 'rgba(156, 39, 176, 0.05)',
                        border: (theme) => `1px solid ${theme.palette.mode === 'dark' ? 'rgba(156, 39, 176, 0.2)' : 'rgba(156, 39, 176, 0.15)'}`,
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          transform: 'translateX(4px)',
                          boxShadow: (theme) => theme.palette.mode === 'dark' ? '0 4px 16px rgba(156, 39, 176, 0.2)' : '0 4px 16px rgba(156, 39, 176, 0.1)'
                        }
                      }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '1rem' }}>{u.name || u.email || '—'}</Typography>
                          <Chip label={u.status} size="small" color="secondary" variant="filled" sx={{ fontWeight: 600 }} />
                        </Box>
                        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5, mt: 1.5 }}>
                          {u.email && <Box><Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>📧 Email</Typography><Typography variant="caption" sx={{ display: 'block', mt: 0.3, fontWeight: 500 }}>{u.email}</Typography></Box>}
                          {u.phone && <Box><Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>📞 Phone</Typography><Typography variant="caption" sx={{ display: 'block', mt: 0.3, fontWeight: 500 }}>{u.phone}</Typography></Box>}
                          {u.createdAt && <Box><Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>📅 Created</Typography><Typography variant="caption" sx={{ display: 'block', mt: 0.3, fontWeight: 500 }}>{new Date(u.createdAt).toLocaleDateString('en-IN')}</Typography></Box>}
                        </Box>
                      </Paper>
                    ))}
                  </Box>
                </Box>
              )}

              {/* Plan Details */}
              {detailsData.company.plan && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h6" sx={{ mb: 2, fontWeight: 700, fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: 1, color: (theme) => theme.palette.primary.main }}>📋 Plan Details</Typography>
                  <Paper sx={{ 
                    p: 3, 
                    borderRadius: '12px',
                    backgroundColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(33, 150, 243, 0.08)' : 'rgba(33, 150, 243, 0.05)',
                    border: (theme) => `1px solid ${theme.palette.mode === 'dark' ? 'rgba(33, 150, 243, 0.2)' : 'rgba(33, 150, 243, 0.15)'}`,
                  }}>
                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 3 }}>
                      <Box>
                        <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.5px' }}>Plan Name</Typography>
                        <Typography sx={{ fontWeight: 600, fontSize: '1rem', mt: 0.5 }}>{detailsData.company.plan.planSnapshot?.name || '—'}</Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.5px' }}>Price</Typography>
                        <Typography sx={{ fontWeight: 600, fontSize: '1rem', mt: 0.5, color: 'primary.main' }}>₹{detailsData.company.plan.planPricePaise ? (detailsData.company.plan.planPricePaise / 100).toFixed(2) : '—'}</Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.5px' }}>Status</Typography>
                        <Box sx={{ mt: 0.5 }}>
                          <Chip label={detailsData.company.plan.status || '—'} size="small" color="primary" variant="filled" sx={{ fontWeight: 600 }} />
                        </Box>
                      </Box>
                      <Box>
                        <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.5px' }}>Expiry Date</Typography>
                        <Typography sx={{ fontWeight: 600, fontSize: '1rem', mt: 0.5 }}>{detailsData.company.plan.endAt ? new Date(detailsData.company.plan.endAt).toLocaleDateString('en-IN') : '—'}</Typography>
                      </Box>
                    </Box>
                    
                    {/* Subscription Action Buttons */}
                    {hasPermission('saas.subscription_upgrade') && detailsData.company.plan.status === 'ACTIVE' && (
                      <Stack direction="row" spacing={1} sx={{ mt: 2, mb: 2 }}>
                        <Button variant="contained" size="small" onClick={() => setUpgradeOpen(true)} sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}>
                          🚀 Upgrade
                        </Button>
                      </Stack>
                    )}

                    {hasPermission('saas.subscription_reactivate') && (detailsData.company.plan.status === 'EXPIRED' || detailsData.company.plan.status === 'SUSPENDED' || true) && (
                      <Stack direction="row" spacing={1} sx={{ mt: 2, mb: 2 }}>
                        <Button variant="contained" size="small" onClick={() => setReactivateOpen(true)} sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}>
                          ♻️ Reactivate
                        </Button>
                      </Stack>
                    )}

                    {detailsData.company.plan.addonSnapshot && detailsData.company.plan.addonSnapshot.length > 0 && (
                      <Box sx={{ mt: 2, p: 2, backgroundColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 193, 7, 0.1)' : 'rgba(255, 193, 7, 0.08)', borderRadius: '8px' }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>➕ Active Addons:</Typography>
                        {detailsData.company.plan.addonSnapshot.map((addon, i) => {
                          const qty = addon.qty || addon.quantity || 1;
                          const price = (addon.pricePaise || 0) / 100;
                          return (
                            <Chip key={i} icon="🎁" label={`${addon.name} - ${qty} × ₹${price.toFixed(2)}`} size="small" sx={{ mb: 0.5, mr: 0.5 }} variant="outlined" />
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
                </Box>
              )}

              {/* Wallet Summary */}
              {detailsData.company.wallet && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h6" sx={{ mb: 2, fontWeight: 700, fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: 1, color: (theme) => theme.palette.primary.main }}>💰 Wallet Balance</Typography>
                  <Paper sx={{ 
                    p: 3, 
                    borderRadius: '12px',
                    background: (theme) => theme.palette.mode === 'dark' 
                      ? 'linear-gradient(135deg, rgba(76, 175, 80, 0.15) 0%, rgba(103, 58, 183, 0.1) 100%)'
                      : 'linear-gradient(135deg, rgba(76, 175, 80, 0.1) 0%, rgba(103, 58, 183, 0.05) 100%)',
                    border: (theme) => `2px solid ${theme.palette.success.main}`,
                    boxShadow: (theme) => theme.palette.mode === 'dark' ? '0 8px 24px rgba(76, 175, 80, 0.2)' : '0 8px 24px rgba(76, 175, 80, 0.1)'
                  }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box>
                        <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.5px' }}>Available Balance</Typography>
                        <Typography variant="h4" sx={{ fontWeight: 700, mt: 1, fontSize: '2rem', color: 'success.main' }}>₹{(detailsData.company.wallet.balance || 0).toFixed(2)}</Typography>
                      </Box>
                      <Chip label={detailsData.company.wallet.status || '—'} size="medium" color="success" variant="filled" sx={{ fontWeight: 600, p: 1.5 }} />
                    </Box>
                  </Paper>
                </Box>
              )}

              {/* Order Summary */}
              {detailsData.company.orderSummary && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h6" sx={{ mb: 2, fontWeight: 700, fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: 1, color: (theme) => theme.palette.primary.main }}>📦 Order Summary</Typography>
                  <Paper sx={{ 
                    p: 2.5, 
                    borderRadius: '12px',
                    backgroundColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(33, 150, 243, 0.08)' : 'rgba(33, 150, 243, 0.05)',
                    border: (theme) => `1px solid ${theme.palette.mode === 'dark' ? 'rgba(33, 150, 243, 0.2)' : 'rgba(33, 150, 243, 0.15)'}`,
                  }}>
                    <Box sx={{ p: 1.5, backgroundColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(100, 200, 255, 0.1)' : 'rgba(100, 200, 255, 0.05)', borderRadius: '8px', mb: 2 }}>
                      <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.main' }}>{detailsData.company.orderSummary.totalOrders} Total Orders</Typography>
                    </Box>
                    <Typography variant="subtitle2" sx={{ mt: 2, fontWeight: 700, color: 'text.primary' }}>Recent Orders:</Typography>
                    {detailsData.company.orderSummary.recentOrders && detailsData.company.orderSummary.recentOrders.length > 0 ? (
                      detailsData.company.orderSummary.recentOrders.map((order) => (
                        <Paper key={order._id} sx={{ p: 2, mt: 1.5, backgroundColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 193, 7, 0.08)' : 'rgba(255, 193, 7, 0.05)', border: (theme) => `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255, 193, 7, 0.2)' : 'rgba(255, 193, 7, 0.15)'}`, borderRadius: '8px' }}>
                          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                            <Typography variant="body2"><strong>Order #{order.orderNumber}</strong></Typography>
                            <Box sx={{ display: "flex", gap: 1 }}>
                              <Chip label={order.orderType} size="small" color="primary" variant="outlined" />
                              <Chip label={order.status.toUpperCase()} size="small" color={order.status === "paid" ? "success" : "warning"} variant="filled" sx={{ fontWeight: "bold" }} />
                            </Box>
                          </Box>
                          <Typography variant="caption" sx={{ display: "block", mb: 1.5, color: "text.secondary" }}>📅 {new Date(order.createdAt).toLocaleDateString('en-IN')}</Typography>

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
                                {order.totals.planCreditPaise > 0 && (
                                  <Typography variant="caption" sx={{ color: "#2196f3" }}>
                                    <strong>Plan Credit:</strong> -₹{((order.totals.planCreditPaise || 0) / 100).toFixed(2)}
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
                </Box>
              )}

              {/* Payment Totals (compact) */}
              {detailsData.company.paymentTotals && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h6" sx={{ mb: 2, fontWeight: 700, fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: 1, color: (theme) => theme.palette.primary.main }}>💳 Payment Summary</Typography>
                  <Paper sx={{ 
                    p: 3, 
                    borderRadius: '12px',
                    backgroundColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(33, 150, 243, 0.08)' : 'rgba(33, 150, 243, 0.05)',
                    border: (theme) => `1px solid ${theme.palette.mode === 'dark' ? 'rgba(33, 150, 243, 0.2)' : 'rgba(33, 150, 243, 0.15)'}`,
                  }}>
                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                      <Box sx={{ p: 2, borderRadius: '8px', backgroundColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(76, 175, 80, 0.15)' : 'rgba(76, 175, 80, 0.1)' }}>
                        <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.5px' }}>Total Paid</Typography>
                        <Typography variant="h5" sx={{ fontWeight: 700, mt: 0.5, color: 'success.main' }}>₹{(detailsData.company.paymentTotals.totalPaidPaise / 100).toFixed(2)}</Typography>
                      </Box>
                      <Box sx={{ p: 2, borderRadius: '8px', backgroundColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(244, 67, 54, 0.15)' : 'rgba(244, 67, 54, 0.1)' }}>
                        <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.5px' }}>Total Pending</Typography>
                        <Typography variant="h5" sx={{ fontWeight: 700, mt: 0.5, color: 'error.main' }}>₹{(detailsData.company.paymentTotals.totalPendingPaise / 100).toFixed(2)}</Typography>
                      </Box>
                    </Box>
                  </Paper>
                </Box>
              )}

              {/* Transactions */}
              {detailsData.company.transactions && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h6" sx={{ mb: 2, fontWeight: 700, fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: 1, color: (theme) => theme.palette.primary.main }}>📊 Recent Transactions</Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {detailsData.company.transactions.length > 0 ? (
                      detailsData.company.transactions.map((t) => (
                        <Paper key={t._id} sx={{ 
                          p: 2.5, 
                          borderRadius: '12px',
                          backgroundColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 193, 7, 0.08)' : 'rgba(255, 193, 7, 0.05)',
                          border: (theme) => `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255, 193, 7, 0.2)' : 'rgba(255, 193, 7, 0.15)'}`,
                          transition: 'all 0.3s ease',
                          '&:hover': {
                            transform: 'translateX(4px)',
                            boxShadow: (theme) => theme.palette.mode === 'dark' ? '0 4px 16px rgba(255, 193, 7, 0.2)' : '0 4px 16px rgba(255, 193, 7, 0.1)'
                          }
                        }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                            <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '1rem', textTransform: 'capitalize' }}>{t.type}</Typography>
                            <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '1.05rem', color: 'primary.main' }}>₹{(t.amount).toFixed(2)}</Typography>
                          </Box>
                          <Typography variant="body2" sx={{ mb: 1, color: 'text.secondary' }}>{t.description}</Typography>
                          <Typography variant="caption" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>📅 {new Date(t.createdAt).toLocaleDateString('en-IN')}</Typography>
                        </Paper>
                      ))
                    ) : (
                      <Paper sx={{ p: 2, textAlign: 'center', backgroundColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)', borderRadius: '12px' }}>
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>No transactions found.</Typography>
                      </Paper>
                    )}
                  </Box>
                </Box>
              )}
            </Box>
          ) : (
            <Typography>No data available</Typography>
          )}
        </DialogContent>
        <DialogActions 
          sx={{
            padding: '16px 24px',
            backgroundColor: (theme) => theme.palette.mode === 'dark'
              ? 'rgba(0, 0, 0, 0.5)'
              : 'rgba(0, 0, 0, 0.02)',
            borderTop: (theme) => `1px solid ${theme.palette.divider}`,
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 1,
          }}
        >
          <Button 
            onClick={closeDetails}
            variant="contained"
            sx={{
              borderRadius: '8px',
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '0.95rem',
              padding: '8px 24px',
              transition: 'all 0.3s ease',
              background: (theme) => theme.palette.mode === 'dark'
                ? `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`
                : `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.light} 100%)`,
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: (theme) => theme.palette.mode === 'dark'
                  ? '0 8px 16px rgba(33, 150, 243, 0.4)'
                  : '0 8px 16px rgba(33, 150, 243, 0.3)',
              },
              '&:active': {
                transform: 'translateY(0)',
              }
            }}
          >
            ✓ Close
          </Button>
        </DialogActions>
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
      {/* Upgrade/Downgrade Sync Modal */}
      <UpgradeDowngradeSyncModal
        open={upgradeDowngradeSyncModalOpen}
        onClose={() => setUpgradeDowngradeSyncModalOpen(false)}
        companyId={detailsData.company?.company?._id}
      />
    </Box>
  );
}