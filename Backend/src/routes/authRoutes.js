const express = require("express");
const { login, logout, me, register, verifyOtp } = require("../controllers/authController");
const { authenticate } = require("../middleware/auth");
const { authorizeRoles } = require("../middleware/role");
const { body, validate } = require("../middleware/validation");

const router = express.Router();

router.post(
    "/register",
    validate([
        body("name").isLength({ min: 2, max: 120 }).withMessage("name must be 2-120 chars."),
        body("email").isEmail().withMessage("valid email is required."),
        body("password").isLength({ min: 8 }).withMessage("password must be at least 8 chars."),
        body("role")
            .isIn(["investor", "entrepreneur", "Investor", "Entrepreneur"])
            .withMessage("role must be investor or entrepreneur."),
    ]),
    register,
);
router.post(
    "/login",
    validate([
        body("email").isEmail().withMessage("valid email is required."),
        body("password").isLength({ min: 1 }).withMessage("password is required."),
        body("role")
            .optional()
            .isIn(["investor", "entrepreneur", "Investor", "Entrepreneur"])
            .withMessage("invalid role."),
    ]),
    login,
);
router.post(
    "/verify-otp",
    validate([
        body("otpToken").isString().isLength({ min: 10 }).withMessage("otpToken is required."),
        body("otp").isLength({ min: 6, max: 6 }).withMessage("otp must be 6 digits."),
    ]),
    verifyOtp,
);
router.post("/logout", logout);
router.get("/me", authenticate, authorizeRoles("investor", "entrepreneur"), me);

module.exports = router;
