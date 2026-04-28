const mongoose = require("mongoose");

const normalizeMongoUri = (mongoUri) => {
    if (!mongoUri) {
        return mongoUri;
    }

    const protocolSeparatorIndex = mongoUri.indexOf("://");
    if (protocolSeparatorIndex === -1) {
        return mongoUri;
    }

    const protocol = mongoUri.slice(0, protocolSeparatorIndex + 3);
    const rest = mongoUri.slice(protocolSeparatorIndex + 3);
    const hostSeparatorIndex = rest.lastIndexOf("@");

    if (hostSeparatorIndex <= 0) {
        return mongoUri;
    }

    const credentials = rest.slice(0, hostSeparatorIndex);
    const host = rest.slice(hostSeparatorIndex + 1);
    const passwordSeparatorIndex = credentials.indexOf(":");

    if (passwordSeparatorIndex === -1) {
        return mongoUri;
    }

    const username = credentials.slice(0, passwordSeparatorIndex);
    const rawPassword = credentials.slice(passwordSeparatorIndex + 1);
    if (!rawPassword) {
        return mongoUri;
    }

    const encodedPassword = encodeURIComponent(rawPassword);

    return `${protocol}${username}:${encodedPassword}@${host}`;
};

const connectDatabase = async () => {
    try {
        const mongoUri = normalizeMongoUri(process.env.MONGODB_URI);
        await mongoose.connect(mongoUri);
        console.log("MongoDB connection established.");
    } catch (error) {
        console.error(`MongoDB connection failed: ${error.message}`);
        process.exit(1);
    }
};

module.exports = {
    connectDatabase,
};
