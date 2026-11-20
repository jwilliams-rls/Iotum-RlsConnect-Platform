import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import theme from "./theme";
import { applyCatalog } from "./pricing";

async function start() {
const response = await fetch("/api/catalog");
if (!response.ok) throw new Error("Pricing unavailable");
applyCatalog(await response.json());
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  </React.StrictMode>
);


}
start().catch(() => {
  document.getElementById("root").textContent = "Real Life Connect pricing is temporarily unavailable. Please check that the backend is running, then refresh this page.";
});
