const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);
require("dotenv").config();
const path = require("path");
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const routes = require("./routes");
const sanitize = require("./middleware/sanitize");
const rateLimit = require("./middleware/rateLimit");
const { notFound, errorHandler } = require("./middleware/error");
const { systemHealth } = require("./controllers/reportController");
const jobs = require("./jobs");

const PORT = process.env.PORT || 8001;
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/hotelpro";

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 16) {
  console.error("JWT_SECRET is missing or too short. Copy .env.example to .env and set a long random value.");
  process.exit(1);
}

const app = express();
app.set("trust proxy", 1); // correct client IPs behind a load balancer / reverse proxy
app.disable("x-powered-by");

app.use(cors({ origin: (process.env.CLIENT_URL || "http://localhost:5173").split(",") }));
app.use(express.json({ limit: "100kb" }));
app.use(sanitize);

// Basic request logging for monitoring
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    if (req.originalUrl.startsWith("/api")) console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - start}ms`);
  });
  next();
});

app.use("/uploads", express.static(path.join(__dirname, "uploads"), { maxAge: "7d" }));
app.get("/api/health", (req, res) => res.json({ status: "ok", ...systemHealth() }));
app.use("/api", rateLimit({ windowMs: 60 * 1000, max: 300 }), routes);

app.use(notFound);
app.use(errorHandler);

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("Connected to MongoDB");
    app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
    jobs.start();
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err.message);
    process.exit(1);
  });
