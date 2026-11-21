import { voidReact } from "@void/react/plugin";
import { defineConfig, lazyPlugins } from "vite-plus";
import { voidPlugin } from "void";

export default defineConfig({
  // OAuth の送り返し先と CLI の ENIKKI_API_URL が 5173 を前提にしているので、ほかのポートへ移らせない
  server: { port: 5173, strictPort: true },
  plugins: lazyPlugins(() => [voidPlugin(), voidReact({ react: { compiler: true } })]),
});
