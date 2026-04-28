const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        type: {
            type: String,
            enum: ["DEPOSIT", "WITHDRAW", "TRANSFER"],
            required: true,
            index: true,
        },
        amount: {
            type: Number,
            required: true,
            min: 0,
        },
        currency: {
            type: String,
            required: true,
            uppercase: true,
            trim: true,
            default: "USD",
        },
        status: {
            type: String,
            enum: ["PENDING", "COMPLETED", "FAILED"],
            default: "PENDING",
            index: true,
        },
        stripePaymentIntentId: {
            type: String,
            trim: true,
            default: undefined,
        },
        recipientId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
            index: true,
        },
    },
    {
        timestamps: { createdAt: true, updatedAt: false },
    },
);

transactionSchema.index({ userId: 1, createdAt: -1 });
transactionSchema.index({ recipientId: 1, createdAt: -1 });
transactionSchema.index({ stripePaymentIntentId: 1 }, { unique: true, sparse: true });

transactionSchema.set("toJSON", {
    transform: (_, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
    },
});

module.exports = mongoose.model("Transaction", transactionSchema);
