import axios from "axios";

const rawApiBase = import.meta.env.VITE_API_URL || "https://flox-h031.onrender.com";
const normalizedApiBase = rawApiBase.replace(/\/+$/, "");

const api = axios.create({
  baseURL: `${normalizedApiBase}/api`,
  withCredentials: true,
});

export default api;
