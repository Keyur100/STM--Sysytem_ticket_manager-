import React, { useEffect, useState } from "react";
import { Box, Paper, Button, Chip } from "@mui/material";
import TableWrapper from "../../../components/common/TableWrapper";
import { useNavigate } from "react-router-dom";
import api from "../../../api/axios";
import usePermissions from "../../../helpers/hooks/usePermissions";
import useDebounce from "../../../helpers/hooks/useDebounce";

export default function AddonList() {
  const [addons, setAddons] = useState([]);
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const [order, setOrder] = useState("asc");
  const [orderBy, setOrderBy] = useState("name");
  const nav = useNavigate();
  const { hasPermission } = usePermissions();

  const fetchAddons = async () => {
    try {
      const res = await api.get("/saas/addons", {
        params: { page: page + 1, limit, q, order, orderBy },
      });

      setAddons(res?.data?.addons || []);
      setTotal(res?.data?.total || 0);
    } catch (error) {
      console.error("Error fetching addons:", error);
    }
  };

  useEffect(() => {
    fetchAddons();
  }, [page, limit, q, order, orderBy]);

  /** 🔹 Debounce search input */
  const debouncedSearch = useDebounce((v) => {
    setQ(v);
    setPage(0);
  }, 400);

  const handleDelete = async (row) => {
    try {
      await api.delete(`/saas/addons/${row._id}`);
      fetchAddons();
    } catch (error) {
      console.error("Error deleting addon:", error);
    }
  };

  const columns = [
    { field: "name", label: "Name" },
    { field: "value", label: "Value" },
    {
      field: "type",
      label: "Type",
      render: (r) => (
        <Chip
          label={r.type === "limit" ? "📊 Limit" : "🔓 Feature"}
          size="small"
          variant="outlined"
        />
      ),
    },
    {
      field: "billingType",
      label: "Billing",
      render: (r) => (
        <Chip
          label={r.billingType === "onetime" ? "🔔 One-time" : "🔄 Recurring"}
          size="small"
          variant="outlined"
        />
      ),
    },
    {
      field: "scope",
      label: "Scope",
      render: (r) => (
        <Chip
          label={r.scope === "global" ? "🌍 Global" : "🏢 Company"}
          size="small"
        />
      ),
    },
    {
      field: "companyId",
      label: "Company",
      render: (r) => {
        if (!r.companyId) return "-";
        if (typeof r.companyId === 'object' && r.companyId.name) {
          return r.companyId.name;
        }
        return "Company";
      }
    },
    {
      field: "pricePaise",
      label: "Price",
      render: (r) => `₹${(r.pricePaise / 100).toFixed(2)}`,
    },
    {
      field: "expiryType",
      label: "Expiry Type",
      render: (r) => {
        if (r.billingType === "onetime") return "-";
        if (r.expiryType === "duration") return `${r.durationDays}d`;
        if (r.expiryType === "plan_end") return "Plan End";
        if (r.expiryType === "yearly") return "Yearly";
        return r.expiryType;
      },
    },
    {
      field: "isActive",
      label: "Status",
      render: (r) => (
        <Chip
          label={r.isActive ? "✅ Active" : "❌ Inactive"}
          size="small"
          color={r.isActive ? "success" : "error"}
        />
      ),
    },
  ];

  return (
    <Box p={2}>
      <Paper sx={{ p: 2 }}>
        <TableWrapper
          headerLabel="Addons"
          data={addons}
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
          searchPlaceHolder={"Search by name or value."}
          onAdd={{ fn: () => nav("/addons/new"), perm: "saas.addon_create" }}
          onEdit={(r) => nav(`/addons/${r._id}/edit`)}
          onDelete={handleDelete}
          editPerm="saas.addon_update"
          deletePerm="saas.addon_delete"
          addLabel="Add Addon"
        />
      </Paper>
    </Box>
  );
}
