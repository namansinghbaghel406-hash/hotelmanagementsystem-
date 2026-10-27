import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8001/api";
export const API_ORIGIN = API_URL.replace(/\/api\/?$/, "");

const api = axios.create({ baseURL: API_URL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// An expired or invalid token sends the user back to the login page.
api.interceptors.response.use(
  (r) => r,
  (error) => {
    const url = error?.config?.url || "";
    if (error?.response?.status === 401 && !url.includes("/auth/login") && localStorage.getItem("token")) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.assign("/login");
    }
    return Promise.reject(error);
  }
);

export const errMsg = (e) => e?.response?.data?.msg || e?.message || "Something went wrong";

// Uploaded images are served by the API; seed/demo photos are absolute URLs.
export const assetUrl = (p) => (!p ? "https://placehold.co/600x380?text=Room" : /^https?:\/\//.test(p) ? p : `${API_ORIGIN}${p}`);

export default api;
