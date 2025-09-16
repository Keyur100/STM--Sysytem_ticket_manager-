import React, { useEffect, useState } from "react";
import { Box, Paper } from "@mui/material";
import api from "../../api/axios";

export default function AuditList() {
  const [logs, setLogs] = useState([]);
  useEffect(() => { api.get("/audits").then((r) => setLogs(r.data)).catch(() => {}); }, []);
  return (
    <Box p={2}>
      <Paper sx={{ p: 2 }}>
        <h3>Audit Logs</h3>
        {logs.map((l) => <div key={l._id}>{l.entityType} - {l.action} - {new Date(l.createdAt).toLocaleString()}</div>)}
      </Paper>
    </Box>
  );
}
