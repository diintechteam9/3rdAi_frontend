// vite.config.js
import { defineConfig } from "file:///D:/jan2026/GPS_tracker_main/frontend-main/frontend-main/node_modules/vite/dist/node/index.js";
import vue from "file:///D:/jan2026/GPS_tracker_main/frontend-main/frontend-main/node_modules/@vitejs/plugin-vue/dist/index.mjs";
import vueJsx from "file:///D:/jan2026/GPS_tracker_main/frontend-main/frontend-main/node_modules/@vitejs/plugin-vue-jsx/dist/index.mjs";
var vite_config_default = defineConfig({
  plugins: [vue(), vueJsx()],
  server: {
    host: true,
    port: 5173,
    // Always use port 5173
    strictPort: true,
    // Fail immediately if 5173 is taken (no silent fallback to 5174)
    proxy: {
      "/api": {
        target: "http://127.0.0.1:4000",
        changeOrigin: true,
        secure: false
        // Local dev uses HTTP
      },
      "/socket.io": {
        target: "http://127.0.0.1:4000",
        ws: true,
        changeOrigin: true,
        secure: false
      }
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJEOlxcXFxqYW4yMDI2XFxcXEdQU190cmFja2VyX21haW5cXFxcZnJvbnRlbmQtbWFpblxcXFxmcm9udGVuZC1tYWluXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJEOlxcXFxqYW4yMDI2XFxcXEdQU190cmFja2VyX21haW5cXFxcZnJvbnRlbmQtbWFpblxcXFxmcm9udGVuZC1tYWluXFxcXHZpdGUuY29uZmlnLmpzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9EOi9qYW4yMDI2L0dQU190cmFja2VyX21haW4vZnJvbnRlbmQtbWFpbi9mcm9udGVuZC1tYWluL3ZpdGUuY29uZmlnLmpzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSdcbmltcG9ydCB2dWUgZnJvbSAnQHZpdGVqcy9wbHVnaW4tdnVlJ1xuaW1wb3J0IHZ1ZUpzeCBmcm9tICdAdml0ZWpzL3BsdWdpbi12dWUtanN4J1xuXG4vLyBodHRwczovL3ZpdGUuZGV2L2NvbmZpZy9cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyh7XG4gIHBsdWdpbnM6IFt2dWUoKSwgdnVlSnN4KCldLFxuICBzZXJ2ZXI6IHtcbiAgICBob3N0OiB0cnVlLFxuICAgIHBvcnQ6IDUxNzMsICAgICAgICAgLy8gQWx3YXlzIHVzZSBwb3J0IDUxNzNcbiAgICBzdHJpY3RQb3J0OiB0cnVlLCAgIC8vIEZhaWwgaW1tZWRpYXRlbHkgaWYgNTE3MyBpcyB0YWtlbiAobm8gc2lsZW50IGZhbGxiYWNrIHRvIDUxNzQpXG4gICAgcHJveHk6IHtcbiAgICAgICcvYXBpJzoge1xuICAgICAgICB0YXJnZXQ6ICdodHRwOi8vMTI3LjAuMC4xOjQwMDAnLFxuICAgICAgICBjaGFuZ2VPcmlnaW46IHRydWUsXG4gICAgICAgIHNlY3VyZTogZmFsc2UsIC8vIExvY2FsIGRldiB1c2VzIEhUVFBcbiAgICAgIH0sXG4gICAgICAnL3NvY2tldC5pbyc6IHtcbiAgICAgICAgdGFyZ2V0OiAnaHR0cDovLzEyNy4wLjAuMTo0MDAwJyxcbiAgICAgICAgd3M6IHRydWUsXG4gICAgICAgIGNoYW5nZU9yaWdpbjogdHJ1ZSxcbiAgICAgICAgc2VjdXJlOiBmYWxzZSxcbiAgICAgIH0sXG4gICAgfSxcbiAgfSxcbn0pXG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQWlXLFNBQVMsb0JBQW9CO0FBQzlYLE9BQU8sU0FBUztBQUNoQixPQUFPLFlBQVk7QUFHbkIsSUFBTyxzQkFBUSxhQUFhO0FBQUEsRUFDMUIsU0FBUyxDQUFDLElBQUksR0FBRyxPQUFPLENBQUM7QUFBQSxFQUN6QixRQUFRO0FBQUEsSUFDTixNQUFNO0FBQUEsSUFDTixNQUFNO0FBQUE7QUFBQSxJQUNOLFlBQVk7QUFBQTtBQUFBLElBQ1osT0FBTztBQUFBLE1BQ0wsUUFBUTtBQUFBLFFBQ04sUUFBUTtBQUFBLFFBQ1IsY0FBYztBQUFBLFFBQ2QsUUFBUTtBQUFBO0FBQUEsTUFDVjtBQUFBLE1BQ0EsY0FBYztBQUFBLFFBQ1osUUFBUTtBQUFBLFFBQ1IsSUFBSTtBQUFBLFFBQ0osY0FBYztBQUFBLFFBQ2QsUUFBUTtBQUFBLE1BQ1Y7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUNGLENBQUM7IiwKICAibmFtZXMiOiBbXQp9Cg==
