import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "@igx-nexus/ui/styles.css";
import "./dashboard.css";

const root = document.getElementById("root");
if (!root) throw new Error("No se encontró el contenedor de la aplicación.");
createRoot(root).render(<StrictMode><App /></StrictMode>);
