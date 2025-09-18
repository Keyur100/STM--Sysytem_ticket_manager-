import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../../api/axios";
import {
  Button,
  Typography,
  MenuItem,
  TextField,
  Box,
  Card,
  CardContent,
  CardHeader,
} from "@mui/material";
import { useDispatch } from "react-redux";
import { setAuth } from "../../store/slices/authSlice";
import BadgeIcon from "@mui/icons-material/Badge";
import ApartmentIcon from "@mui/icons-material/Apartment";
export default function DepartmentSelect() {
  const loc = useLocation();
  const nav = useNavigate();
  const dispatch = useDispatch();
  const { user, memberships } = loc.state;
  const [dept, setDept] = React.useState("");

  const handleConfirm = async () => {
    const res = await api.post("/auth/select-department", {
      userId: user._id,
      departmentId: dept,
    });
    const data = res.data;

    dispatch(setAuth({ user: data.user, token: data.access }));
    window.localStorage.setItem("refresh_token", data.refresh);

    nav("/dashboard");
  };

  return (
    <Box
      minHeight="100vh"
      display="flex"
      alignItems="center"
      justifyContent="center"
      bgcolor="#f5f6fa"
      px={2}
    >
      <Card
        sx={{ maxWidth: 420, width: "100%", borderRadius: 3, boxShadow: 4 }}
      >
        <CardHeader
          title="Select Your Department"
          titleTypographyProps={{ variant: "h6", align: "center" }}
          sx={{ pb: 0 }}
        />
        <CardContent>
          <Typography
            variant="body2"
            color="text.secondary"
            align="center"
            mb={3}
          >
            Welcome <b>{user?.name || user?.email}</b> 👋 <br />
            Please choose your department to continue.
          </Typography>

          <TextField
            select
            fullWidth
            label="Department"
            value={dept}
            onChange={(e) => setDept(e.target.value)}
            sx={{ borderRadius: 2, mb: 3 }}
          >
            <MenuItem disabled value="">
              <em>Select department</em>
            </MenuItem>
            {memberships.map((m) => (
              <MenuItem key={m.departmentId._id} value={m.departmentId._id}>
                <BadgeIcon fontSize="small" style={{ marginRight: 8 }} />
                {m.roleId.name} —{" "}
                <ApartmentIcon fontSize="small" style={{ marginLeft: 8 }} />
                {m.departmentId.name}
              </MenuItem>
            ))}
          </TextField>

          <Button
            fullWidth
            size="large"
            variant="contained"
            disabled={!dept}
            onClick={handleConfirm}
            sx={{ borderRadius: 2 }}
          >
            Continue
          </Button>
        </CardContent>
      </Card>
    </Box>
  );
}
