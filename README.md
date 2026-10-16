# Monitored Web App

Simple Node.js + Express app with monitoring and logging best practices.

## Features
- Logging with Winston (console + file logs)
- HTTP request logging with Morgan
- /health endpoint for health check
- /metrics endpoint (requests, errors, avg response time)
- Alerts for slow requests, high error rate, high memory
- Centralized error handling
- Security: x-powered-by header disabled

## Run
npm install
node server.js
