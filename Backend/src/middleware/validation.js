const { body, query, param, validationResult } = require("express-validator");

const runValidationRules = async (rules, req) => {
    for (const rule of rules) {
        await rule.run(req);
    }
};

const validate = (rules) => {
    return async (req, res, next) => {
        await runValidationRules(rules, req);
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: "Validation failed.",
                details: errors.array(),
            });
        }

        return next();
    };
};

const sanitizeInputValue = (value, path) => {
    if (typeof value !== "string") {
        return value;
    }

    const isSensitiveField =
        /password|otp|token|signatureImage|offer|answer|candidate/i.test(path);

    const trimmed = value.trim();
    if (isSensitiveField) {
        return trimmed;
    }

    return trimmed.replace(/[<>]/g, "");
};

const sanitizeAllInputs = validate([
    body("**").optional({ values: "null" }).customSanitizer((value, meta) => {
        return sanitizeInputValue(value, meta.path);
    }),
    query("**").optional({ values: "null" }).customSanitizer((value, meta) => {
        return sanitizeInputValue(value, meta.path);
    }),
    param("**").optional({ values: "null" }).customSanitizer((value, meta) => {
        return sanitizeInputValue(value, meta.path);
    }),
]);

const idParamRule = (name = "id") =>
    param(name).isMongoId().withMessage(`${name} must be a valid Mongo ID.`);

module.exports = {
    body,
    query,
    param,
    validate,
    sanitizeAllInputs,
    idParamRule,
};
