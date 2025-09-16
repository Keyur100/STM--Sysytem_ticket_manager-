import { createSlice } from "@reduxjs/toolkit";
const slice = createSlice({
  name: "ui",
  initialState: { theme: "light", loading: false,error: null,
 },
  reducers: {
    setTheme(s, a) {
      s.theme = a.payload;
    },
    setLoading(s, a) {
      s.loading = a.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
});
export const { setTheme, setLoading , setError, clearError} = slice.actions;
export default slice.reducer;
