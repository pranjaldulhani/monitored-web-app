const express = require("express");
const morgan = require("morgan");
const winston = require("winston");
const fs = require("fs");

// ---------- Step 1: Logging tools setup ----------
if (!fs.existsSync("logs")) fs.mkdirSync("logs");

const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: "logs/error.log", level: "error" }),
    new winston.transports.File({ filename: "logs/combined.log" }),
  ],
});

const app = express();
app.use(express.json());

// HTTP request logging (morgan -> winston)
app.use(
  morgan("combined", {
    stream: { write: (msg) => logger.info(msg.trim()) },
  })
);

// ---------- Step 3: Performance metrics ----------
const metrics = {
  totalRequests: 0,
  totalErrors: 0,
  totalResponseTimeMs: 0,
  startTime: Date.now(),
};

app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    metrics.totalRequests++;
    metrics.totalResponseTimeMs += duration;
    if (res.statusCode >= 500) metrics.totalErrors++;

    // Slow request alert
    if (duration > 1000) {
      logger.warn(`ALERT: Slow request ${req.method} ${req.url} took ${duration}ms`);
    }
  });
  next();
});

// ---------- Routes ----------
app.get("/", (req, res) => {
  res.send("Monitoring and Logging Demo App is running!");
});

// Health check
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    uptimeSeconds: Math.round(process.uptime()),
    memoryMB: Math.round(process.memoryUsage().rss / 1024 / 1024),
  });
});

// Metrics endpoint
app.get("/metrics", (req, res) => {
  const avg = metrics.totalRequests
    ? Math.round(metrics.totalResponseTimeMs / metrics.totalRequests)
    : 0;
  res.json({
    totalRequests: metrics.totalRequests,
    totalErrors: metrics.totalErrors,
    avgResponseTimeMs: avg,
    uptimeSeconds: Math.round((Date.now() - metrics.startTime) / 1000),
  });
});

// Slow route (testing alert ke liye)
app.get("/slow", (req, res) => {
  setTimeout(() => res.send("Slow response done"), 1500);
});

// Error route (testing error logging ke liye)
app.get("/error", (req, res, next) => {
  next(new Error("Test error: something went wrong"));
});

// ---------- Step 4: Error handling ----------
app.use((req, res) => {
  logger.warn(`404 Not Found: ${req.url}`);
  res.status(404).json({ message: "Route not found" });
});

app.use((err, req, res, next) => {
  logger.error(`${err.message} | ${req.method} ${req.url}`);
  res.status(500).json({ message: "Internal Server Error" });
});

// ---------- Step 2: Alerts (error rate check har 30 sec) ----------
setInterval(() => {
  if (metrics.totalRequests > 0) {
    const rate = (metrics.totalErrors / metrics.totalRequests) * 100;
    if (rate > 10) {
      logger.error(`ALERT: High error rate ${rate.toFixed(1)}%`);
    }
  }
  const memMB = process.memoryUsage().rss / 1024 / 1024;
  if (memMB > 300) logger.error(`ALERT: High memory usage ${memMB.toFixed(0)}MB`);
}, 30000);

// ---------- Step 5: Security + graceful shutdown ----------
app.disable("x-powered-by");

process.on("uncaughtException", (err) => {
  logger.error(`Uncaught Exception: ${err.message}`);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => logger.info(`Server started on port ${PORT}`));