const express = require("express");
const {
    handleStripeWebhook,
    deposit,
    withdraw,
    transfer,
    paymentHistory,
} = require("../controllers/paymentController");
const { authenticate } = require("../middleware/auth");
const { authorizeRoles } = require("../middleware/role");
const { body, query, validate } = require("../middleware/validation");

const router = express.Router();

router.post("/webhook", handleStripeWebhook);

const amountRule = body("amount")
    .isFloat({ gt: 0 })
    .withMessage("amount must be a positive number.");

const currencyRule = body("currency")
    .optional()
    .isLength({ min: 3, max: 3 })
    .withMessage("currency must be a 3-letter code.")
    .matches(/^[A-Za-z]{3}$/)
    .withMessage("currency must contain only letters.");

router.post(
    "/deposit",
    authenticate,
    authorizeRoles("investor", "entrepreneur"),
    validate([amountRule, currencyRule]),
    deposit,
);
router.post(
    "/withdraw",
    authenticate,
    authorizeRoles("investor", "entrepreneur"),
    validate([amountRule, currencyRule]),
    withdraw,
);
router.post(
    "/transfer",
    authenticate,
    authorizeRoles("investor", "entrepreneur"),
    validate([
        amountRule,
        currencyRule,
        body("recipientId").isMongoId().withMessage("recipientId must be a valid user id."),
    ]),
    transfer,
);
router.get(
    "/history",
    authenticate,
    authorizeRoles("investor", "entrepreneur"),
    validate([
        query("page").optional().isInt({ min: 1 }).withMessage("page must be >= 1."),
        query("limit")
            .optional()
            .isInt({ min: 1, max: 50 })
            .withMessage("limit must be between 1 and 50."),
    ]),
    paymentHistory,
);

module.exports = router;
