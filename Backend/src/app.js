const cookieParser = require("cookie-parser");
const cors = require("cors");
const express = require("express");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const morgan = require("morgan");
const { errorHandler, notFoundHandler } = require("./middleware/errorHandler");
const { sanitizeAllInputs } = require("./middleware/validation");
const authRoutes = require("./routes/authRoutes");
const documentRoutes = require("./routes/documentRoutes");
const meetingRoutes = require("./routes/meetingRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const profileRoutes = require("./routes/profileRoutes");
const { setupSwagger } = require("./docs/swagger");

const app = express();

const allowedOrigins = (process.env.CLIENT_URL || "http://localhost:5173")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

const isLocalDevOrigin = (origin) => {
    try {
        const url = new URL(origin);
        const host = url.hostname;
        return (
            host === "localhost" ||
            host === "127.0.0.1" ||
            /^10\./.test(host) ||
            /^192\.168\./.test(host) ||
            /^172\.(1[6-9]|2\d|3[0-1])\./.test(host)
        );
    } catch (_error) {
        return false;
    }
};

app.use(
    helmet({
        crossOriginResourcePolicy: false,
    }),
);

app.use(
    rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 200,
        standardHeaders: "draft-8",
        legacyHeaders: false,
        message: {
            success: false,
            message: "Too many requests. Please try again later.",
        },
    }),
);

app.use(
    cors({
        origin: (origin, callback) => {
            if (!origin) {
                callback(null, true);
                return;
            }

            if (allowedOrigins.includes(origin)) {
                callback(null, true);
                return;
            }

            if (process.env.NODE_ENV !== "production" && isLocalDevOrigin(origin)) {
                callback(null, true);
                return;
            }

            callback(new Error("Not allowed by CORS"));
        },
        credentials: true,
    }),
);

app.use(morgan("dev"));
app.use("/api/payments/webhook", express.raw({ type: "application/json" }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(sanitizeAllInputs);

app.get("/api/health", (_req, res) => {
    res.status(200).json({
        success: true,
        message: "Nexus backend is healthy.",
    });
});

app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/meetings", meetingRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/payments", paymentRoutes);
setupSwagger(app);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
