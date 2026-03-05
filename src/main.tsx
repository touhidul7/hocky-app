import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  document.body.innerHTML = '<div style="padding: 20px; font-family: sans-serif; color: red;">Error: Root element not found</div>';
} else {
  try {
    createRoot(rootElement).render(<App />);
  } catch (error) {
    console.error('Failed to render app:', error);
    rootElement.innerHTML = '<div style="padding: 20px; font-family: sans-serif; color: red;">Failed to initialize app. Check console for details.</div>';
  }
}
