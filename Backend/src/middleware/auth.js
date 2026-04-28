const User = require("../models/User");
const RevokedToken = require("../models/RevokedToken");
const { JWT_COOKIE_NAME, verifyJwt } = require("../utils/token");

const authenticate = async (req, res, next) => {
    const token = req.cookies[JWT_COOKIE_NAME];

    if (!token) {
        return res.status(401).json({
            success: false,
            message: "Authentication required.",
        });
    }

    try {
        const payload = verifyJwt(token);

        if (payload.jti) {
            const isRevoked = await RevokedToken.exists({ jti: payload.jti });
            if (isRevoked) {
                return res.status(401).json({
                    success: false,
                    message: "Session revoked. Please login again.",
                });
            }
        }

        const user = await User.findById(payload.userId);

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Authentication failed.",
            });
        }

        req.user = user;
        return next();
    } catch (_error) {
        return res.status(401).json({
            success: false,
            message: "Invalid or expired session.",
        });
    }
};

module.exports = {
    authenticate,
};
