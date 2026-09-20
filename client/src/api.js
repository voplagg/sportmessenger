import axios from "axios";
import { auth } from "./firebase";

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "http://localhost:5000/api",
});

api.interceptors.request.use(async (config) => {
  const user = auth.currentUser;
  console.log("🔑 api.js called for:", config.url, "| user:", user?.uid || "NULL");  // ← добавили

  if (user) {
    const token = await user.getIdToken();
    console.log("🔑 token length:", token.length);                                    // ← добавили
    config.headers.Authorization = `Bearer ${token}`;
  } else {
    console.warn("⚠️ auth.currentUser is NULL — токен не будет отправлен!");         // ← добавили
  }
  return config;
});

export default api;