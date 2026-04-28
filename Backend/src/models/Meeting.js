const mongoose = require("mongoose");

const meetingSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true,
            maxlength: 200,
        },
        description: {
            type: String,
            trim: true,
            default: "",
            maxlength: 2000,
        },
        hostId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        inviteeId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        startTime: {
            type: Date,
            required: true,
            index: true,
        },
        endTime: {
            type: Date,
            required: true,
            index: true,
        },
        status: {
            type: String,
            enum: ["PENDING", "ACCEPTED", "REJECTED", "CANCELLED"],
            default: "PENDING",
            index: true,
        },
        meetingLink: {
            type: String,
            trim: true,
            default: "",
            maxlength: 1000,
        },
        roomId: {
            type: String,
            trim: true,
            default: "",
            index: true,
        },
    },
    {
        timestamps: { createdAt: true, updatedAt: false },
    },
);

meetingSchema.index({ hostId: 1, status: 1, startTime: 1, endTime: 1 });
meetingSchema.index({ inviteeId: 1, status: 1, startTime: 1, endTime: 1 });
meetingSchema.index({ roomId: 1 }, { unique: true, sparse: true });

meetingSchema.set("toJSON", {
    transform: (_, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
    },
});

module.exports = mongoose.model("Meeting", meetingSchema);
