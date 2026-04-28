const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");

const buildSpec = () => {
    const serverUrl = process.env.SERVER_PUBLIC_URL || `http://localhost:${process.env.PORT || 5000}`;

    return swaggerJsdoc({
        definition: {
            openapi: "3.0.3",
            info: {
                title: "Nexus API",
                version: "1.0.0",
                description: "Business Nexus backend API documentation.",
            },
            servers: [
                {
                    url: serverUrl,
                    description: "Nexus API server",
                },
            ],
            components: {
                securitySchemes: {
                    cookieAuth: {
                        type: "apiKey",
                        in: "cookie",
                        name: "token",
                    },
                },
                schemas: {
                    ApiSuccess: {
                        type: "object",
                        properties: {
                            success: { type: "boolean", example: true },
                            message: { type: "string" },
                        },
                    },
                    ApiError: {
                        type: "object",
                        properties: {
                            success: { type: "boolean", example: false },
                            message: { type: "string" },
                            code: { type: "string" },
                            details: { type: "object" },
                        },
                    },
                },
            },
            paths: {
                "/api/health": {
                    get: {
                        tags: ["System"],
                        summary: "Health check",
                        responses: { "200": { description: "Healthy" } },
                    },
                },
                "/api/auth/register": {
                    post: {
                        tags: ["Auth"],
                        summary: "Register user",
                        requestBody: { required: true },
                        responses: { "201": { description: "Registered" } },
                    },
                },
                "/api/auth/login": {
                    post: {
                        tags: ["Auth"],
                        summary: "Login and request OTP",
                        requestBody: { required: true },
                        responses: { "200": { description: "OTP required" } },
                    },
                },
                "/api/auth/verify-otp": {
                    post: {
                        tags: ["Auth"],
                        summary: "Verify login OTP",
                        requestBody: { required: true },
                        responses: { "200": { description: "Authenticated" } },
                    },
                },
                "/api/auth/logout": {
                    post: {
                        tags: ["Auth"],
                        summary: "Logout and revoke token",
                        security: [{ cookieAuth: [] }],
                        responses: { "200": { description: "Logged out" } },
                    },
                },
                "/api/auth/me": {
                    get: {
                        tags: ["Auth"],
                        summary: "Current user",
                        security: [{ cookieAuth: [] }],
                        responses: { "200": { description: "Current user" } },
                    },
                },
                "/api/profile/update": {
                    put: {
                        tags: ["Profile"],
                        summary: "Update profile",
                        security: [{ cookieAuth: [] }],
                        requestBody: { required: true },
                        responses: { "200": { description: "Profile updated" } },
                    },
                },
                "/api/profile/{id}": {
                    get: {
                        tags: ["Profile"],
                        summary: "Get profile",
                        security: [{ cookieAuth: [] }],
                        parameters: [
                            {
                                in: "path",
                                name: "id",
                                required: true,
                                schema: { type: "string" },
                            },
                        ],
                        responses: { "200": { description: "Profile details" } },
                    },
                },
                "/api/meetings/schedule": {
                    post: {
                        tags: ["Meetings"],
                        summary: "Schedule meeting",
                        security: [{ cookieAuth: [] }],
                        requestBody: { required: true },
                        responses: { "201": { description: "Meeting created" }, "409": { description: "Conflict" } },
                    },
                },
                "/api/meetings/my": {
                    get: {
                        tags: ["Meetings"],
                        summary: "List my meetings",
                        security: [{ cookieAuth: [] }],
                        responses: { "200": { description: "Meetings" } },
                    },
                },
                "/api/meetings/{id}/accept": {
                    patch: {
                        tags: ["Meetings"],
                        summary: "Accept meeting",
                        security: [{ cookieAuth: [] }],
                        parameters: [{ in: "path", name: "id", required: true, schema: { type: "string" } }],
                        responses: { "200": { description: "Accepted" } },
                    },
                },
                "/api/meetings/{id}/reject": {
                    patch: {
                        tags: ["Meetings"],
                        summary: "Reject meeting",
                        security: [{ cookieAuth: [] }],
                        parameters: [{ in: "path", name: "id", required: true, schema: { type: "string" } }],
                        responses: { "200": { description: "Rejected" } },
                    },
                },
                "/api/meetings/{id}/cancel": {
                    delete: {
                        tags: ["Meetings"],
                        summary: "Cancel meeting",
                        security: [{ cookieAuth: [] }],
                        parameters: [{ in: "path", name: "id", required: true, schema: { type: "string" } }],
                        responses: { "200": { description: "Cancelled" } },
                    },
                },
                "/api/meetings/{id}/room": {
                    post: {
                        tags: ["Meetings"],
                        summary: "Create or get video room id",
                        security: [{ cookieAuth: [] }],
                        parameters: [{ in: "path", name: "id", required: true, schema: { type: "string" } }],
                        responses: { "200": { description: "Room id" } },
                    },
                },
                "/api/documents/upload": {
                    post: {
                        tags: ["Documents"],
                        summary: "Upload document",
                        security: [{ cookieAuth: [] }],
                        requestBody: {
                            required: true,
                            content: {
                                "multipart/form-data": {
                                    schema: {
                                        type: "object",
                                        properties: {
                                            file: { type: "string", format: "binary" },
                                            version: { type: "integer" },
                                            status: { type: "string" },
                                        },
                                    },
                                },
                            },
                        },
                        responses: { "201": { description: "Uploaded" } },
                    },
                },
                "/api/documents/my": {
                    get: {
                        tags: ["Documents"],
                        summary: "List my documents",
                        security: [{ cookieAuth: [] }],
                        responses: { "200": { description: "Documents" } },
                    },
                },
                "/api/documents/{id}": {
                    get: {
                        tags: ["Documents"],
                        summary: "Get document metadata",
                        security: [{ cookieAuth: [] }],
                        parameters: [{ in: "path", name: "id", required: true, schema: { type: "string" } }],
                        responses: { "200": { description: "Document" } },
                    },
                    delete: {
                        tags: ["Documents"],
                        summary: "Delete document",
                        security: [{ cookieAuth: [] }],
                        parameters: [{ in: "path", name: "id", required: true, schema: { type: "string" } }],
                        responses: { "200": { description: "Deleted" } },
                    },
                },
                "/api/documents/{id}/file": {
                    get: {
                        tags: ["Documents"],
                        summary: "Download/stream owned document file",
                        security: [{ cookieAuth: [] }],
                        parameters: [{ in: "path", name: "id", required: true, schema: { type: "string" } }],
                        responses: { "200": { description: "File stream" } },
                    },
                },
                "/api/documents/{id}/sign": {
                    post: {
                        tags: ["Documents"],
                        summary: "Sign document",
                        security: [{ cookieAuth: [] }],
                        parameters: [{ in: "path", name: "id", required: true, schema: { type: "string" } }],
                        requestBody: { required: true },
                        responses: { "200": { description: "Signed" } },
                    },
                },
                "/api/payments/webhook": {
                    post: {
                        tags: ["Payments"],
                        summary: "Stripe webhook endpoint",
                        responses: { "200": { description: "Webhook handled" } },
                    },
                },
                "/api/payments/deposit": {
                    post: {
                        tags: ["Payments"],
                        summary: "Create Stripe payment intent for deposit",
                        security: [{ cookieAuth: [] }],
                        requestBody: { required: true },
                        responses: { "200": { description: "Intent created" } },
                    },
                },
                "/api/payments/withdraw": {
                    post: {
                        tags: ["Payments"],
                        summary: "Withdraw from wallet",
                        security: [{ cookieAuth: [] }],
                        requestBody: { required: true },
                        responses: { "200": { description: "Withdrawn" } },
                    },
                },
                "/api/payments/transfer": {
                    post: {
                        tags: ["Payments"],
                        summary: "Transfer wallet funds",
                        security: [{ cookieAuth: [] }],
                        requestBody: { required: true },
                        responses: { "200": { description: "Transferred" } },
                    },
                },
                "/api/payments/history": {
                    get: {
                        tags: ["Payments"],
                        summary: "Payment history",
                        security: [{ cookieAuth: [] }],
                        responses: { "200": { description: "History" } },
                    },
                },
            },
        },
        apis: [],
    });
};

const setupSwagger = (app) => {
    const spec = buildSpec();

    app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(spec));
    app.get("/api/docs.json", (_req, res) => {
        res.status(200).json(spec);
    });
};

module.exports = {
    setupSwagger,
};
