const express = require("express");
const {
    uploadDocument,
    getMyDocuments,
    getDocumentById,
    streamDocumentFile,
    signDocument,
    deleteDocument,
} = require("../controllers/documentController");
const { authenticate } = require("../middleware/auth");
const { authorizeRoles } = require("../middleware/role");
const { uploadDocument: uploadDocumentMiddleware } = require("../middleware/upload");
const { body, validate, idParamRule } = require("../middleware/validation");

const router = express.Router();

router.post(
    "/upload",
    authenticate,
    authorizeRoles("investor", "entrepreneur"),
    uploadDocumentMiddleware.single("file"),
    validate([
        body("version").optional().isInt({ min: 1 }).withMessage("version must be >= 1."),
        body("status")
            .optional()
            .isIn(["DRAFT", "REVIEWED", "SIGNED"])
            .withMessage("invalid status."),
    ]),
    uploadDocument,
);
router.get("/my", authenticate, authorizeRoles("investor", "entrepreneur"), getMyDocuments);
router.get(
    "/:id",
    authenticate,
    authorizeRoles("investor", "entrepreneur"),
    validate([idParamRule("id")]),
    getDocumentById,
);
router.get(
    "/:id/file",
    authenticate,
    authorizeRoles("investor", "entrepreneur"),
    validate([idParamRule("id")]),
    streamDocumentFile,
);
router.post(
    "/:id/sign",
    authenticate,
    authorizeRoles("investor", "entrepreneur"),
    validate([
        idParamRule("id"),
        body("signatureImage")
            .isString()
            .withMessage("signatureImage is required.")
            .isLength({ min: 20 })
            .withMessage("signatureImage must be a base64 data URL."),
    ]),
    signDocument,
);
router.delete(
    "/:id",
    authenticate,
    authorizeRoles("investor", "entrepreneur"),
    validate([idParamRule("id")]),
    deleteDocument,
);

module.exports = router;
