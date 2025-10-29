import axios from "axios";
import type { AxiosInstance, AxiosResponse } from "axios";

const API_BASE = (import.meta.env.VITE_API_BASE as string) || "http://localhost:5000";


const api: AxiosInstance = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
});

async function post<T>(url: string, data?: unknown): Promise<T> {
  const response: AxiosResponse<T> = await api.post(url, data);
  return response.data;
}

async function get<T>(url: string): Promise<T> {
  const response: AxiosResponse<T> = await api.get(url);
  return response.data;
}

export { api as default, post, get };

