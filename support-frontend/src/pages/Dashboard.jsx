import React from "react";
import { Box, Typography, Grid, Paper } from "@mui/material";
export default function Dashboard() {
  return (
    <Box p={2}>
      <Typography variant="h4">Dashboard</Typography>
      <Grid container spacing={2} mt={1}>
        <Grid item xs={12} md={4}><Paper sx={{p:2}}>Quick stats</Paper></Grid>
        <Grid item xs={12} md={8}><Paper sx={{p:2}}>Charts / Activity</Paper></Grid>
      </Grid>
    </Box>
  );
}
