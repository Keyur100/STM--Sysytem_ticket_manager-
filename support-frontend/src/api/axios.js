// src/api/axios.js
import axios from "axios";
import store from "../store";
import { setLoading, setError } from "../store/slices/uiSlice";
import { setAuth, clearAuth } from "../store/slices/authSlice";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
  timeout: 40000,
});

api.interceptors.request.use((cfg) => {
  const state = store.getState();
  const token = state?.auth?.token;
  if (token) cfg.headers.Authorization = `Bearer ${token}`;

  store.dispatch(setLoading(true)); // show loader
  return cfg;
});

api.interceptors.response.use(
  (res) => {
    store.dispatch(setLoading(false));
    return res.data;
  },
  async (err) => {
    store.dispatch(setLoading(false));
    const original = err.config;

    // Avoid infinite loop if refresh itself fails
    if (original.url.includes("/auth/refresh")) {
      return Promise.reject(err);
    }

    if (err.response?.status === 401 && !original._retry) {
      original._retry = true;

      try {
        const refresh = window.localStorage.getItem("refresh_token");
        if (!refresh) throw new Error("No refresh token");

        // use separate axios instance for refresh
        const {data} = await api.post("/auth/refresh", { refresh });

        store.dispatch(
          setAuth({
            user: data.user || {},
            token: data.access,
            permissions: data.user?.roles?.permissions || [],
          })
        );
        window.localStorage.setItem("refresh_token", data.refresh);

        original.headers.Authorization = `Bearer ${data.access}`;
        return api(original);
      } catch (e) {
        store.dispatch(clearAuth());
        store.dispatch(setError("Session expired. Please login again."));
        window.localStorage.removeItem("refresh_token");
        return Promise.reject(e);
      }
    }

    const msg = err.response?.data?.error || err.message || "Something went wrong";
    store.dispatch(setError(msg));
    return Promise.reject(err);
  }
);



export default api;
