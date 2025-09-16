import React from "react";
import { Pagination as MuiPagination, Select, MenuItem, Box } from "@mui/material";
export default function Pagination({ page, count, onChange, limit, onLimitChange }) {
  return (
    <Box display="flex" alignItems="center" gap={2} mt={2}>
      <MuiPagination page={page} count={count} onChange={(e, p) => onChange(p)} />
      <Box display="flex" alignItems="center" gap={1}>
        <div>Per page</div>
        <Select value={limit} onChange={(e) => onLimitChange(e.target.value)} size="small">
          {[5, 10, 20, 50].map((n) => <MenuItem key={n} value={n}>{n}</MenuItem>)}
        </Select>
      </Box>
    </Box>
  );
}
