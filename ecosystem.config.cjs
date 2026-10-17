// pm2 keeps BOTH the server and the tunnel alive (and restarts them on crash).
const domain = process.env.NGROK_DOMAIN || "your-domain.ngrok-free.app";
module.exports = {
  apps: [
    {
      name: "mcp-server",
      script: "dist/src/server.js",
      env: { NODE_ENV: "production" },
      max_restarts: 20,
    },
    {
      name: "mcp-tunnel",
      script: "ngrok",
      args: `http --url=${domain} 3000`,
      interpreter: "none",
    },
  ],
};
