import axios from "axios";

const API_BASE = (import.meta.env.VITE_API_BASE as string) || "http://localhost:5000";

const api = axios.create({
  baseURL: API_BASE,
  // Add other defaults here (timeout, headers)
  timeout: 15000,
});

export default api;