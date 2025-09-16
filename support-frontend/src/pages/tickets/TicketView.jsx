import React, { useEffect, useState } from "react";
import {
  Box,
  Paper,
  Typography,
  Button,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
} from "@mui/material";
import { useParams } from "react-router-dom";
import api from "../../api/axios";

export default function TicketView() {
  const { id } = useParams();
  const [ticket, setTicket] = useState(null);
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [agents, setAgents] = useState([]);

  const priorities = ["p1", "p2", "p3"];
  const statuses = ["new","on_hold", "duplicate", "spam","closed","cancelled"];

  // Load ticket + agents
  useEffect(() => {
    const loadData = async () => {
      // 1. Load ticket details
      const { data: ticketData } = await api.get(`/tickets/${id}`);
      setTicket(ticketData);
      setStatus(ticketData.status || "new");
      setPriority(ticketData.priority || "p2");
      setAssignedTo(ticketData.assignedTo || "");

      // 2. Load assignable agents from department
      if (ticketData.department._id) {
        const { data: agentsData } = await api.get(
          `/ticket-assignable-users/${ticketData.department._id}`
        );
        setAgents(agentsData || []);
      }
    };

    loadData();
  }, [id]);

  // Update ticket
  const handleUpdate = async () => {
    await api.patch(`/tickets/${id}`, {
      department:ticket.department._id,
      statusKey:status,
      priority,
      assignedAgentId:assignedTo,
    });

    const { data } = await api.get(`/tickets/${id}`);
    setTicket(data);
  };

  if (!ticket) return <div>Loading...</div>;

  return (
    <Box p={2}>
      <Paper sx={{ p: 2 }}>
        <Typography variant="h5">{ticket.title}</Typography>
        <Typography>{ticket.description}</Typography>

        <Box mt={2} display="flex" alignItems="center" gap={2}>
          {/* Status */}
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={status}
              label="Status"
              onChange={(e) => setStatus(e.target.value)}
            >
              {statuses.map((s) => (
                <MenuItem key={s} value={s}>
                  {s}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Priority */}
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Priority</InputLabel>
            <Select
              value={priority}
              label="Priority"
              onChange={(e) => setPriority(e.target.value)}
            >
              {priorities.map((p) => (
                <MenuItem key={p} value={p}>
                  {p}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Assign Agent */}
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>Assign To</InputLabel>
            <Select
              value={assignedTo}
              label="Assign To"
              onChange={(e) => setAssignedTo(e.target.value)}
            >
              {agents.length > 0 ? (
                agents.map((a) => (
                  <MenuItem key={a.userId} value={a.userId}>
                    {a.name || "Unnamed User"}
                  </MenuItem>
                ))
              ) : (
                <MenuItem disabled>No agents available</MenuItem>
              )}
            </Select>
          </FormControl>

          {/* Update button */}
          <Button variant="contained" color="primary" onClick={handleUpdate}>
            Update
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}
