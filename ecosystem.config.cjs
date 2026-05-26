module.exports = {
  apps: [{
    name: "openclaw-backend",
    script: "./node_modules/tsx/dist/cli.js",
    args: "src/server.ts",
    watch: false,
    env: {
      NODE_ENV: "development",
    }
  }]
}
