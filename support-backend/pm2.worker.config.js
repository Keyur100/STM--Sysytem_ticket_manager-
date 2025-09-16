module.exports = {
  apps: [
    // Main backend API
    {
      name: "support-backend",
      script: "src/server.js",
      watch: false,
      env: {
        NODE_ENV: "development"
      },
      env_production: {
        NODE_ENV: "production"
      }
    },

    // Workers
    {
      name: "assignment-worker",
      script: "src/workers/assignmentWorker.js",
      watch: false
    },
    {
      name: "reply-worker",
      script: "src/workers/replyWorker.js",
      watch: false
    },
    {
      name: "escalation-worker",
      script: "src/workers/escalationWorker.js",
      watch: false
    },
    {
      name: "autoclose-worker",
      script: "src/workers/autocloseWorker.js",
      watch: false
    },
    {
      name: "notification-worker",
      script: "src/workers/notificationWorker.js",
      watch: false
    }
  ]
};
