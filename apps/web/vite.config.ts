import { defineConfig, loadEnv } from "vite";

function assertLocalProxyTarget(rawTarget: string): string {
  let target: URL;
  try {
    target = new URL(rawTarget);
  } catch {
    throw new Error("NEXUS_API_PROXY_TARGET must be a valid URL");
  }
  const loopback = target.hostname === "127.0.0.1" || target.hostname === "localhost" || target.hostname === "[::1]";
  if (!loopback || target.protocol !== "http:" || target.username || target.password || target.pathname !== "/") {
    throw new Error("Live Lab proxy target must be a plain HTTP loopback origin");
  }
  return target.origin;
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const dataMode = env.VITE_NEXUS_DATA_MODE?.trim() || "demo";
  if (dataMode !== "live") return {};

  const token = env.NEXUS_LAB_AUTH_TOKEN?.trim();
  if (!token || token.length < 32) {
    throw new Error("Live Web mode requires NEXUS_LAB_AUTH_TOKEN with at least 32 characters");
  }
  const target = assertLocalProxyTarget(env.NEXUS_API_PROXY_TARGET?.trim() || "http://127.0.0.1:3100/");

  return {
    server: {
      proxy: {
        "/api": {
          target,
          changeOrigin: false,
          configure(proxy) {
            proxy.on("proxyReq", (proxyRequest) => {
              proxyRequest.setHeader("authorization", `Bearer ${token}`);
            });
          },
        },
      },
    },
  };
});
