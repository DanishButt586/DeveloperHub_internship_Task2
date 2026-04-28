const mongoose = require("mongoose");

const documentSchema = new mongoose.Schema(
    {
        uploadedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        fileName: {
            type: String,
            required: true,
            trim: true,
            maxlength: 255,
        },
        fileType: {
            type: String,
            required: true,
            trim: true,
        },
        fileUrl: {
            type: String,
            required: true,
            trim: true,
        },
        storedFileName: {
            type: String,
            required: true,
            trim: true,
        },
        fileSize: {
            type: Number,
            default: 0,
        },
        version: {
            type: Number,
            default: 1,
            min: 1,
        },
        status: {
            type: String,
            enum: ["DRAFT", "REVIEWED", "SIGNED"],
            default: "DRAFT",
        },
        signatureImage: {
            type: String,
            trim: true,
            default: "",
        },
    },
    {
        timestamps: true,
    },
);

documentSchema.index({ uploadedBy: 1, createdAt: -1 });

documentSchema.set("toJSON", {
    transform: (_, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
    },
});

module.exports = mongoose.model("Document", documentSchema);
