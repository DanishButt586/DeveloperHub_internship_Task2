const fs = require("fs");
const path = require("path");
const multer = require("multer");

const uploadsDir = path.resolve(__dirname, "../../uploads");

if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

const allowedMimeTypes = new Set([
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const allowedExtensions = new Set([".pdf", ".docx"]);

const storage = multer.diskStorage({
    destination: (_req, _file, callback) => {
        callback(null, uploadsDir);
    },
    filename: (_req, file, callback) => {
        const safeOriginalName = file.originalname.replace(/[^a-zA-Z0-9_.-]/g, "_");
        callback(null, `${Date.now()}-${safeOriginalName}`);
    },
});

const fileFilter = (_req, file, callback) => {
    const extension = path.extname(file.originalname || "").toLowerCase();

    if (!allowedMimeTypes.has(file.mimetype) || !allowedExtensions.has(extension)) {
        callback(new Error("Only PDF and DOCX files are allowed."));
        return;
    }

    callback(null, true);
};

const uploadDocument = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 20 * 1024 * 1024,
    },
});

module.exports = {
    uploadDocument,
    uploadsDir,
};
