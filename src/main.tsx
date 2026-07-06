import "./styles/index.css";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { initializeSecureTokens } from "./services/keyringService";

async function bootstrap() {
  // Inicializa tokens seguros do Keyring do SO antes de montar a árvore de componentes
  await initializeSecureTokens();
  
  ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}

bootstrap();
