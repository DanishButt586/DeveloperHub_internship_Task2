const mongoose = require("mongoose");
const { randomUUID } = require("crypto");
const Meeting = require("../models/Meeting");
const User = require("../models/User");
const { sendMeetingInviteEmail, sendMeetingStatusEmail } = require("../utils/meetingEmail");

const ACTIVE_CONFLICT_STATUSES = ["PENDING", "ACCEPTED"];

const buildConflictError = (meeting) => {
    const error = new Error("Time slot conflict detected for one or more participants.");
    error.statusCode = 409;
    error.code = "CONFLICT";
    error.details = {
        clashingMeeting: meeting,
    };
    return error;
};

const normalizeMeeting = (meetingDoc) => {
    const meeting = meetingDoc.toJSON();

    if (meeting.hostId && typeof meeting.hostId === "object") {
        meeting.host = {
            id: meeting.hostId._id ? meeting.hostId._id.toString() : meeting.hostId.id,
            name: meeting.hostId.name,
            email: meeting.hostId.email,
            role: meeting.hostId.role,
        };
        meeting.hostId = meeting.host.id;
    }

    if (meeting.inviteeId && typeof meeting.inviteeId === "object") {
        meeting.invitee = {
            id: meeting.inviteeId._id ? meeting.inviteeId._id.toString() : meeting.inviteeId.id,
            name: meeting.inviteeId.name,
            email: meeting.inviteeId.email,
            role: meeting.inviteeId.role,
        };
        meeting.inviteeId = meeting.invitee.id;
    }

    return meeting;
};

const assertValidScheduleInput = ({ title, inviteeId, startTime, endTime }, hostId) => {
    if (!title || !inviteeId || !startTime || !endTime) {
        const error = new Error("title, inviteeId, startTime and endTime are required.");
        error.statusCode = 400;
        throw error;
    }

    if (!mongoose.Types.ObjectId.isValid(inviteeId)) {
        const error = new Error("inviteeId must be a valid user id.");
        error.statusCode = 400;
        throw error;
    }

    if (hostId.toString() === inviteeId.toString()) {
        const error = new Error("You cannot schedule a meeting with yourself.");
        error.statusCode = 400;
        throw error;
    }

    const start = new Date(startTime);
    const end = new Date(endTime);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        const error = new Error("Invalid startTime or endTime.");
        error.statusCode = 400;
        throw error;
    }

    if (start >= end) {
        const error = new Error("endTime must be after startTime.");
        error.statusCode = 400;
        throw error;
    }
};

const findConflict = async ({ participantIds, startTime, endTime }) => {
    const conflict = await Meeting.findOne({
        status: { $in: ACTIVE_CONFLICT_STATUSES },
        $or: [
            { hostId: { $in: participantIds } },
            { inviteeId: { $in: participantIds } },
        ],
        startTime: { $lt: endTime },
        endTime: { $gt: startTime },
    })
        .populate("hostId", "name email role")
        .populate("inviteeId", "name email role")
        .sort({ startTime: 1 });

    return conflict;
};

const scheduleMeeting = async (req, res, next) => {
    try {
        const { title, description, inviteeId, startTime, endTime, meetingLink } = req.body;
        const hostId = req.user.id;

        assertValidScheduleInput({ title, inviteeId, startTime, endTime }, hostId);

        const invitee = await User.findById(inviteeId).select("name email role");
        if (!invitee) {
            return res.status(404).json({
                success: false,
                message: "Invitee user not found.",
            });
        }

        const start = new Date(startTime);
        const end = new Date(endTime);

        const conflict = await findConflict({
            participantIds: [hostId, inviteeId],
            startTime: start,
            endTime: end,
        });

        if (conflict) {
            const conflictError = buildConflictError(normalizeMeeting(conflict));
            return res.status(409).json({
                success: false,
                code: conflictError.code,
                message: conflictError.message,
                details: conflictError.details,
            });
        }

        const meeting = await Meeting.create({
            title,
            description: description || "",
            hostId,
            inviteeId,
            startTime: start,
            endTime: end,
            meetingLink: meetingLink || "",
            status: "PENDING",
        });

        const populatedMeeting = await Meeting.findById(meeting.id)
            .populate("hostId", "name email role")
            .populate("inviteeId", "name email role");

        sendMeetingInviteEmail({
            inviteeEmail: invitee.email,
            hostName: req.user.name,
            meeting,
        }).catch((emailError) => {
            console.error("Meeting invite email failed:", emailError.message);
        });

        return res.status(201).json({
            success: true,
            message: "Meeting scheduled successfully.",
            meeting: normalizeMeeting(populatedMeeting),
        });
    } catch (error) {
        return next(error);
    }
};

const getMyMeetings = async (req, res, next) => {
    try {
        const userId = req.user.id;

        const meetings = await Meeting.find({
            $or: [{ hostId: userId }, { inviteeId: userId }],
        })
            .populate("hostId", "name email role")
            .populate("inviteeId", "name email role")
            .sort({ startTime: 1 });

        return res.status(200).json({
            success: true,
            meetings: meetings.map(normalizeMeeting),
        });
    } catch (error) {
        return next(error);
    }
};

const updateMeetingStatus = async ({ req, res, next, status, allowedActor }) => {
    try {
        const meeting = await Meeting.findById(req.params.id)
            .populate("hostId", "name email role")
            .populate("inviteeId", "name email role");

        if (!meeting) {
            return res.status(404).json({
                success: false,
                message: "Meeting not found.",
            });
        }

        const currentUserId = req.user.id.toString();
        const hostUserId = meeting.hostId._id.toString();
        const inviteeUserId = meeting.inviteeId._id.toString();

        const actorAllowed =
            allowedActor === "invitee"
                ? currentUserId === inviteeUserId
                : currentUserId === hostUserId || currentUserId === inviteeUserId;

        if (!actorAllowed) {
            return res.status(403).json({
                success: false,
                message: "You are not authorized to update this meeting.",
            });
        }

        if (meeting.status === "CANCELLED") {
            return res.status(400).json({
                success: false,
                message: "Cancelled meetings cannot be updated.",
            });
        }

        if (meeting.status === status) {
            return res.status(200).json({
                success: true,
                message: `Meeting is already ${status}.`,
                meeting: normalizeMeeting(meeting),
            });
        }

        meeting.status = status;
        await meeting.save();

        const recipientEmail =
            currentUserId === hostUserId ? meeting.inviteeId.email : meeting.hostId.email;

        sendMeetingStatusEmail({
            recipientEmail,
            meeting,
            status,
            actorName: req.user.name,
        }).catch((emailError) => {
            console.error("Meeting status email failed:", emailError.message);
        });

        return res.status(200).json({
            success: true,
            message: `Meeting ${status.toLowerCase()} successfully.`,
            meeting: normalizeMeeting(meeting),
        });
    } catch (error) {
        return next(error);
    }
};

const acceptMeeting = async (req, res, next) => {
    return updateMeetingStatus({ req, res, next, status: "ACCEPTED", allowedActor: "invitee" });
};

const rejectMeeting = async (req, res, next) => {
    return updateMeetingStatus({ req, res, next, status: "REJECTED", allowedActor: "invitee" });
};

const cancelMeeting = async (req, res, next) => {
    return updateMeetingStatus({ req, res, next, status: "CANCELLED", allowedActor: "participant" });
};

const createMeetingRoom = async (req, res, next) => {
    try {
        const meeting = await Meeting.findById(req.params.id);

        if (!meeting) {
            return res.status(404).json({
                success: false,
                message: "Meeting not found.",
            });
        }

        const currentUserId = req.user.id.toString();
        const isParticipant =
            meeting.hostId.toString() === currentUserId ||
            meeting.inviteeId.toString() === currentUserId;

        if (!isParticipant) {
            return res.status(403).json({
                success: false,
                message: "You are not authorized to create a room for this meeting.",
            });
        }

        if (!meeting.roomId) {
            meeting.roomId = randomUUID();
            await meeting.save();
        }

        return res.status(200).json({
            success: true,
            roomId: meeting.roomId,
            meetingId: meeting.id,
        });
    } catch (error) {
        return next(error);
    }
};

module.exports = {
    scheduleMeeting,
    getMyMeetings,
    acceptMeeting,
    rejectMeeting,
    cancelMeeting,
    createMeetingRoom,
};
