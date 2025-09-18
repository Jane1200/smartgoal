import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api"
});

// Attach token automatically
api.interceptors.request.use(
  (config) => {
    try {
      const raw = localStorage.getItem("sg_auth");
      const token = raw ? JSON.parse(raw)?.token : null;
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (e) {
      console.warn("Failed to parse auth token from localStorage:", e);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default api;

// Helper to convert a relative file path from the API (e.g., "/uploads/...")
// into an absolute URL pointing to the API server origin (without the /api suffix)
export function getFileUrl(relativePath) {
  if (!relativePath) return "";
  const base = api.defaults.baseURL || "";
  const origin = base.replace(/\/?api\/?$/, "");
  // Ensure we don't double-add slashes
  if (relativePath.startsWith("http://") || relativePath.startsWith("https://")) {
    return relativePath;
  }
  if (relativePath.startsWith("/")) {
    return `${origin}${relativePath}`;
  }
  return `${origin}/${relativePath}`;
}
