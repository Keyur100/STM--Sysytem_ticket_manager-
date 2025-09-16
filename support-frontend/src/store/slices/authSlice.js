import { createSlice } from "@reduxjs/toolkit";
const initial = { user: null, token: null, permissions: [] };
const slice = createSlice({ name: "auth", initialState: initial, reducers: {
  setAuth(state, action){ state.user = action.payload.user; state.token = action.payload.token;  },
  clearAuth(state){ state.user = null; state.token = null; state.permissions = [] }
}});
export const { setAuth, clearAuth } = slice.actions;
export default slice.reducer;
