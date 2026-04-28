const REQUIRED_ENV_VARS = ["MONGODB_URI", "JWT_SECRET", "PORT", "CLIENT_URL"];

const REQUIRED_FOR_PAYMENTS = ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"];

const validateEnv = () => {
    const missingVariables = REQUIRED_ENV_VARS.filter(
        (variableName) => !process.env[variableName],
    );

    if (missingVariables.length > 0) {
        throw new Error(
            `Missing required environment variables: ${missingVariables.join(", ")}`,
        );
    }

    if (!process.env.DISABLE_PAYMENT_MODULE) {
        const missingPaymentVariables = REQUIRED_FOR_PAYMENTS.filter(
            (variableName) => !process.env[variableName],
        );

        if (missingPaymentVariables.length > 0) {
            console.warn(
                `Payment environment variables are not configured: ${missingPaymentVariables.join(", ")}. Payment endpoints will return configuration errors until they are provided.`,
            );
        }
    }
};

module.exports = {
    validateEnv,
};
