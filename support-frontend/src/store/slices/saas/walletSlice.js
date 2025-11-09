import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../../api/axios";
import endpoints from "../../../api/saas/endpoints";

/**
 * 🔹 Fetch Wallet by Company ID
 */
export const getWallet = createAsyncThunk(
  "wallet/getWallet",
  async (companyId, { rejectWithValue }) => {
    try {
      const res = await api.get(endpoints.wallet.get(companyId));
      return res.wallet
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

/**
 * 🔹 Add (Topup) Wallet Balance
 */
export const addWalletBalance = createAsyncThunk(
  "wallet/addWalletBalance",
  async ({ companyId, amount }, { rejectWithValue }) => {
    try {
      const payload = { amountPaise: amount * 100, method: "MANUAL" };
      const res = await api.post(endpoints.wallet.topup(companyId), payload);
      return res.wallet 
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

/**
 * 🔹 Deduct Wallet Balance
 */
export const deductWalletBalance = createAsyncThunk(
  "wallet/deductWalletBalance",
  async ({ companyId, amount }, { rejectWithValue }) => {
    try {
      const payload = { amountPaise: amount * 100, method: "MANUAL" };
      const res = await api.post(endpoints.wallet.deduct(companyId), payload);
      return res.wallet
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);


const walletSlice = createSlice({
  name: "wallet",
  initialState: {
    wallet: null,
    transactions: [],
    walletLoading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      // getWallet
      .addCase(getWallet.pending, (state) => {
        state.walletLoading = true;
      })
      .addCase(getWallet.fulfilled, (state, action) => {
        state.walletLoading = false;
        state.wallet = action.payload;
      })
      .addCase(getWallet.rejected, (state, action) => {
        state.walletLoading = false;
        state.error = action.payload;
      })

      // addWalletBalance
      .addCase(addWalletBalance.pending, (state) => {
        state.walletLoading = true;
      })
      .addCase(addWalletBalance.fulfilled, (state, action) => {
        state.walletLoading = false;
        state.wallet = action.payload;
      })
      .addCase(addWalletBalance.rejected, (state, action) => {
        state.walletLoading = false;
        state.error = action.payload;
      })

      // deductWalletBalance
      .addCase(deductWalletBalance.pending, (state) => {
        state.walletLoading = true;
      })
      .addCase(deductWalletBalance.fulfilled, (state, action) => {
        state.walletLoading = false;
        state.wallet = action.payload;
      })
      .addCase(deductWalletBalance.rejected, (state, action) => {
        state.walletLoading = false;
        state.error = action.payload;
      })

    // 
  },
});

export default walletSlice.reducer;
