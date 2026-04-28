const dotenv = require("dotenv");
const http = require("http");

dotenv.config();

const app = require("./app");
const { connectDatabase } = require("./config/database");
const { validateEnv } = require("./config/env");
const { initSignalingServer } = require("./sockets/signaling");

const PORT = Number(process.env.PORT || 5000);

const allowedOrigins = (process.env.CLIENT_URL || "http://localhost:5173")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

const startServer = async () => {
    try {
        validateEnv();
        await connectDatabase();

        const server = http.createServer(app);

        initSignalingServer(server, {
            origin: allowedOrigins,
            credentials: true,
        });

        server.listen(PORT, () => {
            console.log(`Nexus backend server running on port ${PORT}.`);
        });
    } catch (error) {
        console.error(`Server startup failed: ${error.message}`);
        process.exit(1);
    }
};

startServer();
