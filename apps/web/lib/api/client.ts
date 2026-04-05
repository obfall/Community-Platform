import axios from "axios";
import { getAccessToken, getRefreshToken, setTokens, clearTokens } from "../auth";

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api",
  timeout: 15_000,
  headers: {
    "Content-Type": "application/json",
  },
});

// リクエスト: Authorization ヘッダー付与 + FormData 対応
apiClient.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // FormData 送信時は Content-Type を削除（axios が boundary 付きで自動設定）
  if (config.data instanceof FormData) {
    delete config.headers["Content-Type"];
  }
  return config;
});

// レスポンス: 401 → トークンリフレッシュ → リトライ
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

function processQueue(error: unknown, token: string | null) {
  failedQueue.forEach((prom) => {
    if (token) {
      prom.resolve(token);
    } else {
      prom.reject(error);
    }
  });
  failedQueue = [];
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    // リフレッシュ・ログイン・登録リクエスト自体の401はスキップ
    const skipPaths = ["/auth/refresh", "/auth/login", "/auth/register"];
    if (skipPaths.some((p) => originalRequest.url?.includes(p))) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise<string>((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then((token) => {
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return apiClient(originalRequest);
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      clearTokens();
      window.location.href = "/login";
      return Promise.reject(error);
    }

    try {
      const { data } = await axios.post(`${apiClient.defaults.baseURL}/auth/refresh`, {
        refreshToken,
      });
      setTokens(data.accessToken, data.refreshToken);
      processQueue(null, data.accessToken);
      originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
      return apiClient(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError, null);
      clearTokens();
      window.location.href = "/login";
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);
