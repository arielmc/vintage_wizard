import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import "./index.css";   // Tailwind first
import "./styles.css";  // Custom overrides after

import App from "./App";
import { ErrorBoundary } from "./components/common";
import { FirebaseProvider, AuthProvider, InventoryProvider } from "./contexts";

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Root element not found");

const root = createRoot(rootElement);

root.render(
  <StrictMode>
    <ErrorBoundary>
      <FirebaseProvider>
        <AuthProvider>
          <InventoryProvider>
            <BrowserRouter>
              <App />
            </BrowserRouter>
          </InventoryProvider>
        </AuthProvider>
      </FirebaseProvider>
    </ErrorBoundary>
  </StrictMode>
);
