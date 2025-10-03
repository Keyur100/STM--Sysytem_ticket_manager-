import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../../api/axios";
import endpoints from "../../../api/saas/endpoints";

/* -------------------------------
   🧩 Async Thunks (CRUD Operations)
----------------------------------*/

// ✅ Fetch all companies (with optional filters, pagination, etc.)
export const fetchCompanies = createAsyncThunk(
  "company/fetchAll",
  async (params, { rejectWithValue }) => {
    try {
      const res = await api.get(endpoints.company.list, { params });
      return res.data.items || [];
    } catch (error) {
      return rejectWithValue(error.response?.data || "Failed to fetch companies");
    }
  }
);

// ✅ Create a new company
export const createCompany = createAsyncThunk(
  "company/create",
  async (payload, { rejectWithValue }) => {
    try {
      const res = await api.post(endpoints.company.create, payload);
      return res.data.data || res.data; // depends on API format
    } catch (error) {
      return rejectWithValue(error.response?.data || "Failed to create company");
    }
  }
);

// ✅ Update an existing company
export const updateCompany = createAsyncThunk(
  "company/update",
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const res = await api.put(endpoints.company.update(id), data);
      return res.data.data || res.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || "Failed to update company");
    }
  }
);

// ✅ Delete a company
export const deleteCompany = createAsyncThunk(
  "company/delete",
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(endpoints.company.delete(id));
      return id; // Return deleted company's ID to remove from list
    } catch (error) {
      return rejectWithValue(error.response?.data || "Failed to delete company");
    }
  }
);

// ✅ Get single company details
export const getCompany = createAsyncThunk(
  "company/get",
  async (id, { rejectWithValue }) => {
    try {
      const res = await api.get(endpoints.company.get(id));
      return res.data.data || res.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || "Failed to fetch company details");
    }
  }
);

/* -------------------------------
   🧭 Slice
----------------------------------*/

const companySlice = createSlice({
  name: "company",
  initialState: {
    list: [],
    selected: null,
    loading: false,
    success: false,
    error: null,
  },
  reducers: {
    // ✅ Optional: reset selected company (e.g. on modal close)
    clearSelectedCompany: (state) => {
      state.selected = null;
    },
    // ✅ Optional: reset success/error after toast or UI feedback
    resetCompanyStatus: (state) => {
      state.success = false;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      /* -------------------------------
         Fetch All Companies
      ------------------------------- */
      .addCase(fetchCompanies.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
      })
      .addCase(fetchCompanies.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload || [];
        state.success = true;
      })
      .addCase(fetchCompanies.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Error fetching companies";
        state.list = [];
      })

      /* -------------------------------
         Create Company
      ------------------------------- */
      .addCase(createCompany.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
      })
      .addCase(createCompany.fulfilled, (state, action) => {
        state.loading = false;
        state.list.unshift(action.payload); // add to start of list
        state.success = true;
      })
      .addCase(createCompany.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Error creating company";
      })

      /* -------------------------------
         Update Company
      ------------------------------- */
      .addCase(updateCompany.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
      })
      .addCase(updateCompany.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.list.findIndex((c) => c.id === action.payload.id);
        if (index !== -1) state.list[index] = action.payload;
        if (state.selected?.id === action.payload.id) state.selected = action.payload;
        state.success = true;
      })
      .addCase(updateCompany.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Error updating company";
      })

      /* -------------------------------
         Delete Company
      ------------------------------- */
      .addCase(deleteCompany.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
      })
      .addCase(deleteCompany.fulfilled, (state, action) => {
        state.loading = false;
        state.list = state.list.filter((c) => c.id !== action.payload);
        state.success = true;
      })
      .addCase(deleteCompany.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Error deleting company";
      })

      /* -------------------------------
         Get Single Company
      ------------------------------- */
      .addCase(getCompany.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getCompany.fulfilled, (state, action) => {
        state.loading = false;
        state.selected = action.payload;
      })
      .addCase(getCompany.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Error fetching company";
      });
  },
});

/* -------------------------------
   📦 Exports
----------------------------------*/
export const { clearSelectedCompany, resetCompanyStatus } = companySlice.actions;
export default companySlice.reducer;
