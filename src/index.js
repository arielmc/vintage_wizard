import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "./index.css";   // Tailwind first
import "./styles.css";  // Custom overrides after

import App from "./App";

const rootElement = document.getElementById("root");
const root = createRoot(rootElement);

root.render(
  <StrictMode>
    <App />
  </StrictMode>
);
