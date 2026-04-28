const mongoose = require("mongoose");

const revokedTokenSchema = new mongoose.Schema(
    {
        jti: {
            type: String,
            required: true,
            unique: true,
            index: true,
            trim: true,
        },
        expiresAt: {
            type: Date,
            required: true,
            index: true,
        },
    },
    {
        timestamps: true,
    },
);

// Auto-remove entries when token expiry has passed.
revokedTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("RevokedToken", revokedTokenSchema);
