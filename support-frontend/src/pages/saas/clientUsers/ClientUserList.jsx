import React, { useEffect, useState } from 'react';
import { Box, Paper } from '@mui/material';
import TableWrapper from '../../../components/common/TableWrapper';
import api from '../../../api/axios';
import ClientUserEditModal from '../company/ClientUserEditModal';
import useDebounce from '../../../helpers/hooks/useDebounce';

export default function ClientUserList() {
  const [clients, setClients] = useState([]);
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState('');
  const [order, setOrder] = useState('asc');
  const [orderBy, setOrderBy] = useState('name');
  const [editing, setEditing] = useState(null);

  const fetch = async () => {
    try {
      const res = await api.get('/saas/client-users', { params: { all: true, page: page + 1, limit, q, order, orderBy } });
      const wrapper = res?.data || {};
      const data = wrapper.data || wrapper;
      setClients(data.clientUsers || data.client_users || []);
      setTotal(data.total || (data.clientUsers ? data.clientUsers.length : (data.length || 0)));
    } catch (e) { console.error(e); }
  };

  useEffect(() => { fetch(); }, [page, limit, q, order, orderBy]);

  const debouncedSearch = useDebounce((v) => { setQ(v); setPage(0); }, 400);

  const columns = [
    { field: 'name', label: 'Name' },
    { field: 'email', label: 'Email' },
    { field: 'phone', label: 'Phone' },
    { field: 'companyName', label: 'Company', render: (r) => r.companyName || r.company || '-' },
    { field: 'createdAt', label: 'Created', render: (r) => r.createdAt ? new Date(r.createdAt).toLocaleString() : '-' }
  ];

  return (
    <Box p={2}>
      <Paper sx={{ p: 2 }}>

      <TableWrapper
        headerLabel="Client Users"
        data={clients}
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
        searchPlaceHolder={'Search by name or email.'}
        onEdit={(r) => setEditing(r._id)}
        editPerm="company_update"
        hideEdit={true}
      />

      <ClientUserEditModal open={!!editing} onClose={(saved) => { setEditing(null); if (saved) fetch(); }} userId={editing} />
    </Paper>
    </Box>
  );
}
