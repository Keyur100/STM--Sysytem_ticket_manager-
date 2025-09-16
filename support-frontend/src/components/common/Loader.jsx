import React from "react";
import CircularProgress from "@mui/material/CircularProgress";
import Box from "@mui/material/Box";
export default function Loader() {
  return (
    <Box display="flex" alignItems="center" justifyContent="center" p={4}>
      <CircularProgress />
    </Box>
  );
}
