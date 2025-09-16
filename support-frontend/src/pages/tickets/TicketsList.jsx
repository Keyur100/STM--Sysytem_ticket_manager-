import React, { useState, useEffect, useCallback } from "react";
import { Box, Paper, Button, Chip, Stack } from "@mui/material";
import TableWrapper from "../../components/common/TableWrapper";
import Pagination from "../../components/common/Pagination";
import SearchInput from "../../components/common/SearchInput";
import { Link, useNavigate } from "react-router-dom";
import api from "../../api/axios";
import usePermissions from "../../helpers/hooks/usePermissions";

export default function TicketsList() {
  const [tickets, setTickets] = useState([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const nav = useNavigate();
  const { hasPermission } = usePermissions();

  const fetch = useCallback(async () => {
    const skip = (page - 1) * limit;
    const res = await api.get("/tickets", {
      params: { page, limit, skip, search: q },
    });
    const payload = res.data;
    setTickets(Array.isArray(payload) ? payload : payload.items || []);
    setTotal(
      payload.total ||
        payload.count ||
        (Array.isArray(payload) ? payload.length : 0)
    );
  }, [page, limit, q]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const handleDelete = async (row) => {
    if (!confirm("Delete ticket?")) return;
    await api.delete(`/tickets/${row._id}`);
    fetch();
  };

  const handleReopen = async (ticket) => {
    try {
      await api.post(`/tickets/${ticket._id}/reopen`);
      fetch();
    } catch (err) {
      alert(err.response?.data?.message || "Cannot reopen ticket");
    }
  };

  const columns = [
    { field: "ticketNumber", label: "#", render: (r) => <b>{r._id}</b> },
    {
      field: "title",
      label: "Title",
      render: (r) => <Link to={`/tickets/${r._id}`}>{r.title}</Link>,
    },
    {
      field: "statusKey",
      label: "Status",
      render: (r) => (
        <Chip
          label={r.statusKey}
          color={r.statusKey === "open" ? "success" : "default"}
        />
      ),
    },
    {
      field: "department",
      label: "Department",
      render: (r) => r.department?.name || "-",
    },
    {
      field: "tags",
      label: "Tags",
      render: (r) => (
        <Stack direction="row" spacing={1} flexWrap="wrap">
          {r.tags?.map((t) => (
            <Chip key={t._id} label={t.name} size="small" />
          ))}
        </Stack>
      ),
    },
    {
      field: "assignedAgentId",
      label: "Agent",
      render: (r) => r.assignedAgentId[0]?.name || "-",
    },
    {
      field: "createdBy",
      label: "Creator",
      render: (r) => r.creator?.name || "-",
    },
  ];

  // Add View Replies column -TODO validation
  columns.push({
    field: "viewReplies",
    label: "Replies",
    render: (r) => (
      <Button
        size="small"
        variant="outlined"
        onClick={() => nav(`/tickets/${r._id}/replies`)}
      >
        View Replies
      </Button>
    ),
  });

  // Add Reopen column only if user has permission
  if (hasPermission("ticket.reopen")) {
    columns.push({
      field: "reopen",
      label: "Reopen",
      render: (r) => {
        const canReopen = ["closed", "resolved"].includes(r.statusKey);
        const editableMinutes = 60;
        const isDisabled =
          r.statusKey === "closed" &&
          (new Date() - new Date(r.lastActivityAt)) / (1000 * 60) >
            editableMinutes;
        return canReopen ? (
          <Button
            size="small"
            variant="outlined"
            disabled={isDisabled}
            onClick={() => handleReopen(r)}
          >
            Reopen
          </Button>
        ) : null;
      },
    });
  }

  // Priority column only if ticket.update or ticket.assign
  if (hasPermission("ticket.update") || hasPermission("ticket.assign")) {
    columns.push({
      field: "priority",
      label: "Priority",
      render: (r) => <b>{r.priority.toUpperCase()}</b>,
    });
  }
  return (
    <Box p={2}>
      <Paper sx={{ p: 2 }}>
        <Box display="flex" gap={2} alignItems="center" mb={2}>
          <SearchInput
            onChange={(v) => {
              setQ(v);
              setPage(1);
            }}
            placeholder="Search tickets by title * Priority"
          />
          {hasPermission("ticket.create") && (
            <Button component={Link} to="/tickets/new" variant="contained">
              Add new
            </Button>
          )}
        </Box>

        <TableWrapper
          data={tickets}
          columns={columns}
          onEdit={(r) => nav(`/tickets/${r._id}`)}
          onDelete={handleDelete}
          editPerm="ticket.update"
          deletePerm="ticket.delete"
          hideDelete={true} // 🔹 delete hidden only here
        />

        <Pagination
          page={page}
          count={Math.max(1, Math.ceil(total / limit))}
          onChange={setPage}
          limit={limit}
          onLimitChange={(n) => {
            setLimit(n);
            setPage(1);
          }}
        />
      </Paper>
    </Box>
  );
}
