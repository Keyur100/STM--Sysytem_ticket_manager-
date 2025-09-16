import React, { useEffect, useState } from "react";
import { Box, Paper, Typography } from "@mui/material";
import api from "../../api/axios";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from "recharts";

export default function Analytics() {
  const [data, setData] = useState([]);

  useEffect(() => {
    api.get("/analytics/agents").then((r) => {
      const mapped = (r.data || []).map((x, i) => ({ name: x.agentId?.name || `Agent ${i+1}`, count: x.count || 0 }));
      setData(mapped);
    }).catch(() => {});
  }, []);

  return (
    <Box p={2}>
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6">Tickets by Agent</Typography>
        <Box height={320}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" name="Tickets" />
            </BarChart>
          </ResponsiveContainer>
        </Box>
      </Paper>
    </Box>
  );
}
