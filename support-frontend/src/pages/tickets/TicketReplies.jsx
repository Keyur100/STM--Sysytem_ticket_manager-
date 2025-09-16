// src/pages/tickets/TicketReplies.js
import React, { useEffect, useState } from "react";
import { Box, Paper, Typography, TextField, Button, Stack, Chip } from "@mui/material";
import { useParams } from "react-router-dom";
import api from "../../api/axios";

export default function TicketReplies() {
  const { ticketId } = useParams();
  const [replies, setReplies] = useState([]);
  const [newReply, setNewReply] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchReplies = async () => {
    try {
      const res = await api.get(`/replies/${ticketId}`);
      setReplies(res.data || []); // your API response
    } catch (err) {
      console.error("Failed to fetch replies:", err);
    }
  };

  useEffect(() => {
    fetchReplies();
  }, [ticketId]);

  const handleSendReply = async () => {
    if (!newReply.trim()) return;
    try {
      setLoading(true);
      await api.post("/replies", { ticketId, message: newReply, type: "public" });
      setNewReply("");
      fetchReplies();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to send reply");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box p={2}>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6">Replies</Typography>
      </Paper>

      <Stack spacing={2} mb={3}>
        {replies.map((r) => (
          <Paper key={r._id} sx={{ p: 2 }}>
            <Stack direction="row" spacing={1} alignItems="center" mb={1}>
              {/* Show sender type (SU, NU, SA) */}
              <Chip size="small" label={r.senderId?.type || "Unknown"} />
              <Chip size="small" label={r.type} color={r.type === "internal" ? "warning" : "primary"} />
              <Typography variant="caption">{new Date(r.createdAt).toLocaleString()}</Typography>
            </Stack>
            <Typography>{r.message}</Typography>
          </Paper>
        ))}
      </Stack>

      <Paper sx={{ p: 2 }}>
        <Typography variant="subtitle1">Add Reply</Typography>
        <TextField
          fullWidth
          multiline
          rows={3}
          placeholder="Type your reply..."
          value={newReply}
          onChange={(e) => setNewReply(e.target.value)}
          sx={{ mb: 2 }}
        />
        <Button variant="contained" onClick={handleSendReply} disabled={loading}>
          {loading ? "Sending..." : "Send Reply"}
        </Button>
      </Paper>
    </Box>
  );
}
