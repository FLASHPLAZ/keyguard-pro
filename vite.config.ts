import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// Current backend project. Used only when the hosting platform does not
// provide VITE_SUPABASE_* env vars, so production builds can never fall back
// to an older/decommissioned backend (which made freshly generated license
// keys look "unknown" to the API).
const BACKEND_URL = "https://mcpbzkekllhsmtelfvbe.supabase.co";
const BACKEND_PROJECT_ID = "mcpbzkekllhsmtelfvbe";
const BACKEND_PUBLISHABLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1jcGJ6a2VrbGxoc210ZWxmdmJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5MDMzMDAsImV4cCI6MjA4ODQ3OTMwMH0.FhpKhE_iBIzzR2oxgOouhViYkEd3jKVGt-CmDI4mC7c";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const supabaseUrl = env.VITE_SUPABASE_URL || BACKEND_URL;
  const supabaseKey = env.VITE_SUPABASE_PUBLISHABLE_KEY || BACKEND_PUBLISHABLE_KEY;
  const supabaseProjectId = env.VITE_SUPABASE_PROJECT_ID || BACKEND_PROJECT_ID;

  return {
    server: {
      host: "::",
      port: 8080,
      hmr: {
        overlay: false,
      },
    },
    define: {
      "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(supabaseUrl),
      "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify(supabaseKey),
      "import.meta.env.VITE_SUPABASE_PROJECT_ID": JSON.stringify(supabaseProjectId),
    },
    plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
