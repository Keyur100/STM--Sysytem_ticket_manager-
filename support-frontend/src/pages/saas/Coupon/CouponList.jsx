import React, { useEffect, useState } from "react";
import { Box, Paper, Button } from "@mui/material";
import TableWrapper from "../../../components/common/TableWrapper";
import { Link, useNavigate } from "react-router-dom";
import api from "../../../api/axios";
import usePermissions from "../../../helpers/hooks/usePermissions";

export default function CouponList() {
  const [coupons, setCoupons] = useState([]);
  const nav = useNavigate();
  const { hasPermission } = usePermissions();

  const fetchCoupons = async () => {
    const res = await api.get("/saas/coupon");

    const globalCoupons = (res?.data?.globalCoupons || []).map((c) => ({
      ...c,
      scope: "Global"
    }));

    const companyCoupons = (res?.data?.companyCoupons || []).map((c) => ({
      ...c,
      scope: "Company"
    }));

    setCoupons([...globalCoupons, ...companyCoupons]);
  };

  useEffect(() => {
    fetchCoupons();
  }, []);

  const handleDelete = async (row) => {
    await api.delete(`/saas/coupons/${row._id}`);
    fetchCoupons();
  };

  const columns = [
    { field: "code", label: "Code" },
    { field: "type", label: "Type" },
    { field: "value", label: "Value" },
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
          {hasPermission("coupon.create") && (
            <Button component={Link} to="/saas/coupons/new">Add new</Button>
          )}
        </Box>

        <TableWrapper
          data={coupons}
          columns={columns}
          onEdit={(r) => nav(`/saas/coupons/${r._id}/edit`)}
          onDelete={handleDelete}
          editPerm="coupon.update"
          deletePerm="coupon.delete"
        />
      </Paper>
    </Box>
  );
}
