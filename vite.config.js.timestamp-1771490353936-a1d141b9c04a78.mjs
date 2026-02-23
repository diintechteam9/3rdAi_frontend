// vite.config.js
import { defineConfig } from "file:///D:/jan2026/GPS_tracker_main/frontend-main/frontend-main/node_modules/vite/dist/node/index.js";
import vue from "file:///D:/jan2026/GPS_tracker_main/frontend-main/frontend-main/node_modules/@vitejs/plugin-vue/dist/index.mjs";
import vueJsx from "file:///D:/jan2026/GPS_tracker_main/frontend-main/frontend-main/node_modules/@vitejs/plugin-vue-jsx/dist/index.mjs";
var vite_config_default = defineConfig({
  plugins: [vue(), vueJsx()],
  server: {
    proxy: {
      // API proxy - avoids CORS, requests go to same origin
      "/api": {
        target: "https://stage.brahmakosh.com",
        changeOrigin: true
      },
      // Socket.IO proxy - required for WebSocket to work in dev
      "/socket.io": {
        target: "https://stage.brahmakosh.com",
        ws: true,
        changeOrigin: true
      }
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJEOlxcXFxqYW4yMDI2XFxcXEdQU190cmFja2VyX21haW5cXFxcZnJvbnRlbmQtbWFpblxcXFxmcm9udGVuZC1tYWluXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJEOlxcXFxqYW4yMDI2XFxcXEdQU190cmFja2VyX21haW5cXFxcZnJvbnRlbmQtbWFpblxcXFxmcm9udGVuZC1tYWluXFxcXHZpdGUuY29uZmlnLmpzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9EOi9qYW4yMDI2L0dQU190cmFja2VyX21haW4vZnJvbnRlbmQtbWFpbi9mcm9udGVuZC1tYWluL3ZpdGUuY29uZmlnLmpzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSdcbmltcG9ydCB2dWUgZnJvbSAnQHZpdGVqcy9wbHVnaW4tdnVlJ1xuaW1wb3J0IHZ1ZUpzeCBmcm9tICdAdml0ZWpzL3BsdWdpbi12dWUtanN4J1xuXG4vLyBodHRwczovL3ZpdGUuZGV2L2NvbmZpZy9cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyh7XG4gIHBsdWdpbnM6IFt2dWUoKSwgdnVlSnN4KCldLFxuICBzZXJ2ZXI6IHtcbiAgICBwcm94eToge1xuICAgICAgLy8gQVBJIHByb3h5IC0gYXZvaWRzIENPUlMsIHJlcXVlc3RzIGdvIHRvIHNhbWUgb3JpZ2luXG4gICAgICAnL2FwaSc6IHtcbiAgICAgICAgdGFyZ2V0OiAnaHR0cHM6Ly9zdGFnZS5icmFobWFrb3NoLmNvbScsXG4gICAgICAgIGNoYW5nZU9yaWdpbjogdHJ1ZSxcbiAgICAgIH0sXG4gICAgICAvLyBTb2NrZXQuSU8gcHJveHkgLSByZXF1aXJlZCBmb3IgV2ViU29ja2V0IHRvIHdvcmsgaW4gZGV2XG4gICAgICAnL3NvY2tldC5pbyc6IHtcbiAgICAgICAgdGFyZ2V0OiAnaHR0cHM6Ly9zdGFnZS5icmFobWFrb3NoLmNvbScsXG4gICAgICAgIHdzOiB0cnVlLFxuICAgICAgICBjaGFuZ2VPcmlnaW46IHRydWUsXG4gICAgICB9LFxuICAgIH0sXG4gIH0sXG59KVxuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUFpVyxTQUFTLG9CQUFvQjtBQUM5WCxPQUFPLFNBQVM7QUFDaEIsT0FBTyxZQUFZO0FBR25CLElBQU8sc0JBQVEsYUFBYTtBQUFBLEVBQzFCLFNBQVMsQ0FBQyxJQUFJLEdBQUcsT0FBTyxDQUFDO0FBQUEsRUFDekIsUUFBUTtBQUFBLElBQ04sT0FBTztBQUFBO0FBQUEsTUFFTCxRQUFRO0FBQUEsUUFDTixRQUFRO0FBQUEsUUFDUixjQUFjO0FBQUEsTUFDaEI7QUFBQTtBQUFBLE1BRUEsY0FBYztBQUFBLFFBQ1osUUFBUTtBQUFBLFFBQ1IsSUFBSTtBQUFBLFFBQ0osY0FBYztBQUFBLE1BQ2hCO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFDRixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
