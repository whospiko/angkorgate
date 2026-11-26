import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AngkorGateProvider } from "@angkorgate/react";
import "./index.css";
import App from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AngkorGateProvider
      clientId={import.meta.env.VITE_OIDC_CLIENT_ID || "demo-app"}
      baseUrl={import.meta.env.VITE_ANGKORGATE_URL || "http://localhost:8080"}
      consoleUrl={
        import.meta.env.VITE_ANGKORGATE_CONSOLE_URL || "http://localhost:4000"
      }
      persistCookie={false}
    >
      <App />
    </AngkorGateProvider>
  </StrictMode>
);
