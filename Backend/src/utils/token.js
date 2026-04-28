const jwt = require("jsonwebtoken");
const { randomUUID } = require("crypto");

const JWT_COOKIE_NAME = "token";

const getCookieOptions = () => ({
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/",
});

const signJwt = (payload, options = {}) => {
    const jwtPayload = {
        ...payload,
        jti: payload.jti || randomUUID(),
    };

    return jwt.sign(jwtPayload, process.env.JWT_SECRET, {
        expiresIn: options.expiresIn || process.env.JWT_EXPIRES_IN || "7d",
    });
};

const verifyJwt = (token) => jwt.verify(token, process.env.JWT_SECRET);

const sendAuthCookie = (res, userId) => {
    const token = signJwt({ userId });
    res.cookie(JWT_COOKIE_NAME, token, getCookieOptions());
    return token;
};

const clearAuthCookie = (res) => {
    res.cookie(JWT_COOKIE_NAME, "", {
        ...getCookieOptions(),
        maxAge: 0,
    });
};

module.exports = {
    JWT_COOKIE_NAME,
    signJwt,
    verifyJwt,
    sendAuthCookie,
    clearAuthCookie,
};
