import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import App from "./App";
import { store, persistor } from "./store";
import { ThemeWrapper } from "./theme/ThemeWrapper";
import GlobalUI from "./GlobalUi";

createRoot(document.getElementById("root")).render(
  <Provider store={store}>
    <PersistGate loading={null} persistor={persistor}>
      <ThemeWrapper>
        <BrowserRouter>
          <App />
          <GlobalUI />
        </BrowserRouter>
      </ThemeWrapper>
    </PersistGate>
  </Provider>
);
