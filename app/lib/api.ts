// app/lib/api.ts
import axios from "axios";

const api = axios.create({ withCredentials: true });

let redirecting = false;

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
        console.log('err.response?.status',err.response?.status)
      redirecting = true; // avoid multiple redirects when several requests fail together
      const here = window.location.pathname + window.location.search;
      window.location.href = `/login?redirect=${encodeURIComponent(here)}`;
    }
    return Promise.reject(err);
  },
);
export default api;