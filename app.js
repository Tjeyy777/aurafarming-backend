const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");
const morgan = require("morgan");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const employeeRoutes = require("./routes/employeeRoutes");
const attendanceRoutes = require("./routes/attendenceRoutes");
const inventoryRoutes = require("./routes/inventoryRoutes");
const consumableRoutes = require("./routes/consumableRoutes");
const machineRoutes = require("./routes/machineRoutes");
const dieselRoutes = require("./routes/dieselRoutes");
const expenseRoutes = require("./routes/expenseRoutes");
const weighbridgeRoutes = require("./routes/weighbridgeRoutes");
const authRoutes = require("./routes/authRoutes");

const { protect } = require("./middleware/authMiddleware");

dotenv.config({ path: "./config.env" });

const app = express();

/* ----------------------------- CORS (must be first) ----------------------------- */

const allowedOrigins = [
  "http://localhost:5173",
  "https://aurafrontend.netlify.app",
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

// Apply CORS globally before anything else
app.use(cors(corsOptions));

// Handle ALL preflight OPTIONS requests immediately
app.options(/(.*)/, cors(corsOptions));

/* ----------------------------- SECURITY ----------------------------- */

// Helmet after CORS so it doesn't interfere with CORS headers
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

// Request logging
app.use(morgan("dev"));

/* ----------------------------- BODY PARSER ----------------------------- */

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

/* ----------------------------- RATE LIMITER ----------------------------- */

// Rate limiter for auth routes only
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  // Ensure CORS headers are preserved even on rate-limit rejections
  handler: (req, res) => {
    res.status(429).json({
      status: "error",
      message: "Too many login attempts. Please try again after 15 minutes.",
    });
  },
});

/* ----------------------------- DATABASE ----------------------------- */

const connectDB = async () => {
  try {
    const DB_URI = process.env.MONGO_URI || process.env.DATABASE_LOCAL;
    await mongoose.connect(DB_URI);
    console.log("Connected to MongoDB");
  } catch (err) {
    console.error("MongoDB connection error:", err.message);
    process.exit(1);
  }
};
connectDB();

/* ----------------------------- ROUTES ----------------------------- */

// Public auth routes
app.use("/api/auth", authLimiter, authRoutes);

// Protected app routes
app.use("/api/weighbridge", protect, weighbridgeRoutes);
app.use("/api/expenses", protect, expenseRoutes);
app.use("/api/diesel", protect, dieselRoutes);
app.use("/api/machines", protect, machineRoutes);
app.use("/api/consumables", protect, consumableRoutes);
app.use("/api/inventory", protect, inventoryRoutes);
app.use("/api/employees", protect, employeeRoutes);
app.use("/api/attendance", protect, attendanceRoutes);

/* ----------------------------- HEALTH CHECK ----------------------------- */

app.get("/", (req, res) => {
  res.status(200).json({
    status: "success",
    message: "Mining app backend is running",
  });
});

/* ----------------------------- 404 HANDLER ----------------------------- */

app.use((req, res) => {
  res.status(404).json({
    status: "error",
    message: `Route not found: ${req.originalUrl}`,
  });
});

module.exports = app;