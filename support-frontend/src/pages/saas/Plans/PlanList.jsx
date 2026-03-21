import React, { useEffect, useState } from 'react';
import { Box, Paper, Button, CircularProgress, Alert } from '@mui/material';
import TableWrapper from '../../../components/common/TableWrapper';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../../api/axios';
import usePermissions from '../../../helpers/hooks/usePermissions';
import useDebounce from '../../../helpers/hooks/useDebounce';

export default function PlanList() {
  const [plans, setPlans] = useState([]);
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState('');
  const [order, setOrder] = useState('desc');
  const [orderBy, setOrderBy] = useState('createdAt');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const nav = useNavigate();
  const { hasPermission } = usePermissions();

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const res = await api.get('/saas/plan', { params: { page: page + 1, limit, search: q } });
      const payload = res.data?.data || res.data || {};
      setPlans(payload.plans || payload || []);
      setTotal(payload.total || (payload.plans?.length || payload.length || 0));
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load plans');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, [page, limit, q]);

  const debouncedSearch = useDebounce((v) => { setQ(v); setPage(0); }, 400);

  const handleDelete = async (row) => {
    try {
      await api.delete(`/saas/plan/${row._id}`);
      fetchPlans();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete plan');
    }
  };

  const columns = [
    { field: 'code', label: 'Code', sortable: true },
    { field: 'name', label: 'Name' },
    { field: 'billingCycle', label: 'Billing Cycle' },
    { field: 'pricePaise', label: 'Price', render: (r) => `₹${((r.pricePaise||0)/100).toFixed(2)}` },
    { field: 'isActive', label: 'Status', render: (r) => r.isActive ? 'Active' : 'Inactive' },
  ];

  if (loading) return <CircularProgress />;

  return (
    <Box p={2}>
      <Paper sx={{ p: 2 }}>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <TableWrapper
          headerLabel="Plans"
          data={plans}
          columns={columns}
          total={total}
          page={page}
          rowsPerPage={limit}
          onPageChange={(p) => setPage(p)}
          onRowsPerPageChange={(n) => { setLimit(n); setPage(0); }}
          onSortChange={(field, dir) => { setOrderBy(field); setOrder(dir); }}
          order={order}
          orderBy={orderBy}
          onSearchChange={debouncedSearch}
          searchPlaceHolder={'Search plans.'}
          onAdd={{ fn: () => nav('/plans/new'), perm: 'saas.plan_create' }}
          onEdit={(r) => nav(`/plans/${r._id}/edit`)}
          onDelete={handleDelete}
          editPerm="saas.plan_update"
          deletePerm="saas.plan_delete"
          addLabel="Add Plan"
        />
      </Paper>
    </Box>
  );
}
