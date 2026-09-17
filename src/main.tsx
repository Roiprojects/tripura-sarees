import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { SetupRequired } from "./components/SetupRequired";
import "./index.css";
import "@fontsource/playfair-display/500.css";
import "@fontsource/playfair-display/600.css";
import "@fontsource/playfair-display/700.css";
import "@fontsource/playfair-display/800.css";
import "@fontsource/playfair-display/500-italic.css";

const missingEnv = (["VITE_SUPABASE_URL", "VITE_SUPABASE_PUBLISHABLE_KEY"] as const).filter(
  (name) => !import.meta.env[name],
);

createRoot(document.getElementById("root")!).render(
  missingEnv.length > 0 ? <SetupRequired missing={[...missingEnv]} /> : <App />,
);
