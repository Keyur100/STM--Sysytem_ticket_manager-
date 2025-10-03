import React, { useState, useEffect, useCallback } from "react";
import { Box, Paper } from "@mui/material";
import { useNavigate } from "react-router-dom";
import api from "../../../api/axios";
import TableWrapper from "../../../components/common/TableWrapper";
import useDebounce from "../../../helpers/hooks/useDebounce";

export default function CompanyList() {
  const [companies, setCompanies] = useState([]);
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const [order, setOrder] = useState("asc");
  const [orderBy, setOrderBy] = useState("name");

  const nav = useNavigate();

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
      field: "paymentAmount",
      label: "Amount (₹)",
      width: 120,
      render: (r) => r.paymentAmount || "—",
    },
    {
      field: "paymentStatus",
      label: "Payment Status",
      width: 150,
      render: (r) => (r.paymentStatus ? r.paymentStatus : "—"),
    },
    {
      field: "planExpiry",
      label: "Plan Expiry",
      width: 160,
      render: (r) =>
        r.planExpiry
          ? new Date(r.planExpiry).toLocaleDateString("en-IN", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })
          : "—",
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
          onAdd={{ fn: () => nav("/companies/new"), perm: "company.create" }}
          onEdit={(r) => nav(`/companies/${r._id}/edit`)}
          onDelete={handleDelete}
          editPerm="company.update"
          deletePerm="company.delete"
          addLabel="Add Company"
        />
      </Paper>
    </Box>
  );
}
