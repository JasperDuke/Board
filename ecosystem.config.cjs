module.exports = {
  apps: [
    {
      name: "atenxion-board",
      script: "npm",
      args: "start",
      env: {
        NODE_ENV: "production",
        PORT: 3008,
      },
    },
  ],
};
