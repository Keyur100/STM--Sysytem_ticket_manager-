import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  CircularProgress,
  InputAdornment,
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import api from "../../../../api/axios";

const CouponModal = ({ open, onClose, onSelect, companyId, planCode }) => {
  const [coupons, setCoupons] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) fetchCoupons();
  }, [open, planCode]);

  const fetchCoupons = async () => {
    try {
      setLoading(true);
      console.log("Fetching coupons with planCode:", planCode);
      // Pass planCode as query parameter
      const queryParam = planCode ? `?planCode=${planCode}` : "";
      const res = await api.get(`/saas/coupons/get-perticular/${companyId}${queryParam}`);
      const allCoupons = [
        ...(res.data?.coupons || []),
        // ...(res.data?.globalCoupons || []),
        // ...(res.data?.companyCoupons || []),
      ];
      console.log("Fetched coupons:", allCoupons);
      setCoupons(allCoupons);
    } catch (error) {
      console.error("Error fetching coupons:", error);
    } finally {
      setLoading(false);
    }
  };

  const filtered = coupons.filter(
    (c) =>
      c.code.toLowerCase().includes(search.toLowerCase()) ||
      c.description?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3 } }}
    >
      <DialogTitle sx={{ fontWeight: 600 }}>🎟️ Select a Coupon</DialogTitle>

      <DialogContent dividers sx={{ p: 3 }}>
        {/* Search Bar */}
        <TextField
          fullWidth
          variant="outlined"
          size="small"
          placeholder="Search coupons..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="action" />
              </InputAdornment>
            ),
          }}
          sx={{ mb: 3 }}
        />

        {loading ? (
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress />
          </Box>
        ) : filtered.length > 0 ? (
          <Grid container spacing={2}>
            {filtered.map((coupon) => (
              <Grid item xs={12} sm={4} key={coupon._id}>
                <Card
                  variant="outlined"
                  sx={{
                    borderRadius: 2,
                    cursor: "pointer",
                    height: 150,
                    width:250,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    transition: "0.2s",
                    "&:hover": {
                      boxShadow: 3,
                      borderColor: "primary.main",
                    },
                  }}
                  onClick={() => {
                    onSelect(coupon);
                    onClose();
                  }}
                >
                  <CardContent
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      height: "100%",
                      p: 2,
                    }}
                  >
                    <Box>
                      <Typography
                        variant="subtitle1"
                        fontWeight={600}
                        color="primary"
                        gutterBottom
                      >
                        {coupon.code}
                      </Typography>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ minHeight: "40px" }}
                      >
                        {coupon.description || "No description"}
                      </Typography>
                    </Box>

                    <Box>
                      <Typography variant="body2" color="success.main">
                        {coupon.discountType === "PERCENT"
                          ? `${coupon.discountValue}% off`
                          : `₹${(coupon.discountValue / 100).toFixed(2)} off`}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Valid: {new Date(coupon.validFrom).toLocaleDateString()} -{" "}
                        {new Date(coupon.validTo).toLocaleDateString()}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        ) : (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ textAlign: "center", mt: 2 }}
          >
            No coupons found
          </Typography>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} variant="outlined">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CouponModal;
