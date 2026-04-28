const fs = require("fs/promises");
const path = require("path");
const Document = require("../models/Document");

const getSecureFileUrl = (req, documentId) => {
    return `${req.protocol}://${req.get("host")}/api/documents/${documentId}/file`;
};

const assertSafeStoredFile = async (file) => {
    const descriptor = await fs.open(file.path, "r");
    try {
        const headerBuffer = Buffer.alloc(8);
        await descriptor.read(headerBuffer, 0, 8, 0);

        const isPdf =
            file.mimetype === "application/pdf" &&
            headerBuffer.slice(0, 5).toString("ascii") === "%PDF-";

        const isDocx =
            file.mimetype ===
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document" &&
            headerBuffer[0] === 0x50 &&
            headerBuffer[1] === 0x4b;

        if (!isPdf && !isDocx) {
            const error = new Error("Uploaded file content does not match an allowed type.");
            error.statusCode = 400;
            throw error;
        }
    } finally {
        await descriptor.close();
    }
};

const ensureOwner = (document, userId) => {
    return document.uploadedBy.toString() === userId.toString();
};

const normalizeDocument = (req, document) => {
    const result = document.toJSON();

    if (result.uploadedBy && typeof result.uploadedBy === "object") {
        result.uploadedBy = result.uploadedBy._id
            ? result.uploadedBy._id.toString()
            : result.uploadedBy.id;
    }

    result.fileUrl = getSecureFileUrl(req, result.id);

    return result;
};

const uploadDocument = async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "A document file is required.",
            });
        }

        try {
            await assertSafeStoredFile(req.file);
        } catch (validationError) {
            await fs.unlink(req.file.path).catch(() => undefined);
            throw validationError;
        }

        const parsedVersion = Number(req.body.version || 1);
        const status = ["DRAFT", "REVIEWED", "SIGNED"].includes(req.body.status)
            ? req.body.status
            : "DRAFT";

        const document = await Document.create({
            uploadedBy: req.user.id,
            fileName: req.file.originalname,
            fileType: req.file.mimetype,
            fileUrl: "",
            storedFileName: req.file.filename,
            fileSize: req.file.size,
            version: Number.isFinite(parsedVersion) && parsedVersion > 0 ? parsedVersion : 1,
            status,
        });

        document.fileUrl = getSecureFileUrl(req, document.id);
        await document.save();

        return res.status(201).json({
            success: true,
            message: "Document uploaded successfully.",
            document: normalizeDocument(req, document),
        });
    } catch (error) {
        return next(error);
    }
};

const getMyDocuments = async (req, res, next) => {
    try {
        const documents = await Document.find({ uploadedBy: req.user.id }).sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            documents: documents.map((document) => normalizeDocument(req, document)),
        });
    } catch (error) {
        return next(error);
    }
};

const getDocumentById = async (req, res, next) => {
    try {
        const document = await Document.findById(req.params.id);

        if (!document) {
            return res.status(404).json({
                success: false,
                message: "Document not found.",
            });
        }

        if (!ensureOwner(document, req.user.id)) {
            return res.status(403).json({
                success: false,
                message: "You are not authorized to view this document.",
            });
        }

        return res.status(200).json({
            success: true,
            document: normalizeDocument(req, document),
        });
    } catch (error) {
        return next(error);
    }
};

const signDocument = async (req, res, next) => {
    try {
        const { signatureImage } = req.body;

        if (!signatureImage || typeof signatureImage !== "string") {
            return res.status(400).json({
                success: false,
                message: "signatureImage (base64 string) is required.",
            });
        }

        if (!signatureImage.startsWith("data:image/")) {
            return res.status(400).json({
                success: false,
                message: "signatureImage must be a valid base64 data URL image.",
            });
        }

        const document = await Document.findById(req.params.id);

        if (!document) {
            return res.status(404).json({
                success: false,
                message: "Document not found.",
            });
        }

        if (!ensureOwner(document, req.user.id)) {
            return res.status(403).json({
                success: false,
                message: "You are not authorized to sign this document.",
            });
        }

        document.signatureImage = signatureImage;
        document.status = "SIGNED";
        await document.save();

        return res.status(200).json({
            success: true,
            message: "Document signed successfully.",
            document: normalizeDocument(req, document),
        });
    } catch (error) {
        return next(error);
    }
};

const streamDocumentFile = async (req, res, next) => {
    try {
        const document = await Document.findById(req.params.id);

        if (!document) {
            return res.status(404).json({
                success: false,
                message: "Document not found.",
            });
        }

        if (!ensureOwner(document, req.user.id)) {
            return res.status(403).json({
                success: false,
                message: "You are not authorized to access this document file.",
            });
        }

        const uploadFilePath = path.resolve(__dirname, `../../uploads/${document.storedFileName}`);
        res.type(document.fileType);
        return res.sendFile(uploadFilePath);
    } catch (error) {
        return next(error);
    }
};

const deleteDocument = async (req, res, next) => {
    try {
        const document = await Document.findById(req.params.id);

        if (!document) {
            return res.status(404).json({
                success: false,
                message: "Document not found.",
            });
        }

        if (!ensureOwner(document, req.user.id)) {
            return res.status(403).json({
                success: false,
                message: "You are not authorized to delete this document.",
            });
        }

        const uploadFilePath = path.resolve(__dirname, `../../uploads/${document.storedFileName}`);
        await fs.unlink(uploadFilePath).catch(() => undefined);

        await document.deleteOne();

        return res.status(200).json({
            success: true,
            message: "Document deleted successfully.",
        });
    } catch (error) {
        return next(error);
    }
};

module.exports = {
    uploadDocument,
    getMyDocuments,
    getDocumentById,
    streamDocumentFile,
    signDocument,
    deleteDocument,
};
