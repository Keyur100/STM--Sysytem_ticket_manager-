import { configureStore } from "@reduxjs/toolkit";
import { combineReducers } from "redux";
import storage from "redux-persist/lib/storage";
import { persistReducer, persistStore } from "redux-persist";

import authReducer from "./slices/authSlice";
import uiReducer from "./slices/uiSlice";
import companyReducer from "./slices/saas/companySlice"
const rootReducer = combineReducers({
  auth: authReducer,
  ui: uiReducer,
  company:companyReducer
});

const persistConfig = {
  key: "root",
  storage,
  whitelist: ["auth", "ui"], // choose what slices to persist
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [
          "persist/PERSIST",
          "persist/REHYDRATE",
          "persist/REGISTER",
          "persist/FLUSH",
          "persist/PAUSE",
          "persist/PURGE",
        ],
        ignoredPaths: ["register"], // fixes non-serializable warning
      },
    }),
});

export const persistor = persistStore(store);
export default store;
