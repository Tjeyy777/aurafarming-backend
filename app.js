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

/* ----------------------------- SECURITY ----------------------------- */

// secure HTTP headers
app.use(helmet());

// request logging
app.use(morgan("dev"));

// CORS config
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

app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));

// body parser
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// rate limiter for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    status: "error",
    message: "Too many login attempts. Please try again after 15 minutes.",
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

// public auth routes
app.use("/api/auth", authLimiter, authRoutes);

// protected app routes
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