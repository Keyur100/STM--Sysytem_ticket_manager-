import React, { useEffect, useState } from "react";
import { Box, Paper, Button } from "@mui/material";
import TableWrapper from "../../../components/common/TableWrapper";
import { Link, useNavigate } from "react-router-dom";
import api from "../../../api/axios";
import usePermissions from "../../../helpers/hooks/usePermissions";
import useDebounce from "../../../helpers/hooks/useDebounce";

export default function CouponList() {
  const [coupons, setCoupons] = useState([]);
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const [order, setOrder] = useState("asc");
  const [orderBy, setOrderBy] = useState("code");
  const nav = useNavigate();
  const { hasPermission } = usePermissions();

  const fetchCoupons = async () => {
    const res = await api.get("/saas/coupons", { params: { page: page + 1, limit, q, order, orderBy } });

    // Support two possible response formats: { globalCoupons, companyCoupons } or { coupons, total }
    if (res?.data?.globalCoupons || res?.data?.companyCoupons) {
      const globalCoupons = (res?.data?.globalCoupons || []).map((c) => ({ ...c, scope: "Global" }));
      const companyCoupons = (res?.data?.companyCoupons || []).map((c) => ({ ...c, scope: "Company" }));
      setCoupons([...globalCoupons, ...companyCoupons]);
      setTotal((globalCoupons.length + companyCoupons.length) || 0);
    } else {
      setCoupons(res?.data?.coupons || res?.data || []);
      setTotal(res?.data?.total || (res?.data?.length || 0));
    }
  };

  useEffect(() => {
    fetchCoupons();
  }, [page, limit, q, order, orderBy]);
  /** 🔹 Debounce search input */
  const debouncedSearch = useDebounce((v) => {
    setQ(v);
    setPage(0);
  }, 400);

  const handleDelete = async (row) => {
    await api.delete(`/saas/coupons/${row._id}`);
    fetchCoupons();
  };

  const columns = [
    { field: "code", label: "Code" },
    { field: "discountType", label: "Type" },
    { field: "discountValue", label: "Value",render: (r) => r.discountType === "PERCENT" ? `${r.discountValue}%` : `₹${(r.discountValue / 100).toFixed(2)}` },
    {
      field: "validFrom",
      label: "Valid From",
      render: (r) => new Date(r.validFrom).toLocaleDateString()
    },
    {
      field: "validTo",
      label: "Valid To",
      render: (r) => new Date(r.validTo).toLocaleDateString()
    },
    {
      field: "scope",
      label: "Scope"
    }
  ];

  return (
    <Box p={2}>
      <Paper sx={{ p: 2 }}>
        <Box display="flex" justifyContent="space-between">
          <h3>Coupons</h3>
          {hasPermission("saas.coupon_create") && (
            <Button component={Link} to="/coupons/new">Add new</Button>
          )}
        </Box>

        <TableWrapper
          data={coupons}
          columns={columns}
          total={total}
          page={page}
          rowsPerPage={limit}
          onPageChange={(newPage) => setPage(newPage)}
          onRowsPerPageChange={(n) => { setLimit(n); setPage(0); }}
          onSortChange={(field, dir) => { setOrderBy(field); setOrder(dir); }}
          order={order}
          orderBy={orderBy}
          onSearchChange={debouncedSearch}
          searchPlaceHolder={'Search by code.'}
          onAdd={{ fn: () => nav('/coupons/new'), perm: 'saas.coupon_create' }}
          onEdit={(r) => nav(`/coupons/${r._id}/edit`)}
          onDelete={handleDelete}
          editPerm="saas.coupon_update"
          deletePerm="saas.coupon_delete"
          addLabel="Add Coupon"
        />
      </Paper>
    </Box>
  );
}
