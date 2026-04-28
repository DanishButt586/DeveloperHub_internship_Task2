const { Server } = require("socket.io");
const User = require("../models/User");
const Meeting = require("../models/Meeting");
const RevokedToken = require("../models/RevokedToken");
const { JWT_COOKIE_NAME, verifyJwt } = require("../utils/token");

const roomMembers = new Map();

const parseCookies = (cookieHeader = "") => {
    const cookies = {};
    cookieHeader.split(";").forEach((pair) => {
        const [rawKey, ...rawValueParts] = pair.split("=");
        const key = String(rawKey || "").trim();
        if (!key) {
            return;
        }

        cookies[key] = decodeURIComponent(rawValueParts.join("=").trim());
    });
    return cookies;
};

const getMembersArray = (roomId) => {
    return Array.from(roomMembers.get(roomId) || []);
};

const removeSocketFromRoom = (socket, roomId) => {
    const members = roomMembers.get(roomId);
    if (members) {
        members.delete(socket.id);
        if (members.size === 0) {
            roomMembers.delete(roomId);
        }
    }

    socket.leave(roomId);
};

const initSignalingServer = (httpServer, corsOptions) => {
    const io = new Server(httpServer, {
        cors: corsOptions,
    });

    io.use(async (socket, next) => {
        try {
            const cookies = parseCookies(socket.handshake.headers.cookie || "");
            const token = cookies[JWT_COOKIE_NAME];

            if (!token) {
                return next(new Error("Authentication required."));
            }

            const payload = verifyJwt(token);

            if (payload.jti) {
                const isRevoked = await RevokedToken.exists({ jti: payload.jti });
                if (isRevoked) {
                    return next(new Error("Session revoked."));
                }
            }

            const user = await User.findById(payload.userId).select("_id role");
            if (!user) {
                return next(new Error("Authentication failed."));
            }

            socket.data.userId = user.id;
            return next();
        } catch (_error) {
            return next(new Error("Invalid or expired session."));
        }
    });

    io.on("connection", (socket) => {
        socket.on("join-room", async ({ roomId }) => {
            if (!roomId || typeof roomId !== "string") {
                return;
            }

            const meeting = await Meeting.findOne({ roomId }).select("hostId inviteeId");
            if (!meeting) {
                socket.emit("room-denied", { message: "Meeting room not found." });
                return;
            }

            const userId = socket.data.userId?.toString();
            const isParticipant =
                meeting.hostId.toString() === userId || meeting.inviteeId.toString() === userId;

            if (!isParticipant) {
                socket.emit("room-denied", { message: "Not authorized for this room." });
                return;
            }

            if (socket.data.roomId && socket.data.roomId !== roomId) {
                removeSocketFromRoom(socket, socket.data.roomId);
                socket.to(socket.data.roomId).emit("user-left", { socketId: socket.id });
            }

            socket.join(roomId);
            socket.data.roomId = roomId;

            const members = roomMembers.get(roomId) || new Set();
            members.add(socket.id);
            roomMembers.set(roomId, members);

            socket.emit("room-users", {
                users: getMembersArray(roomId).filter((memberId) => memberId !== socket.id),
            });

            socket.to(roomId).emit("user-joined", { socketId: socket.id });
        });

        socket.on("offer", ({ roomId, targetId, offer }) => {
            if (!roomId || !targetId || !offer) {
                return;
            }

            if (socket.data.roomId !== roomId) {
                return;
            }

            const members = roomMembers.get(roomId);
            if (!members || !members.has(targetId)) {
                return;
            }

            io.to(targetId).emit("offer", {
                roomId,
                from: socket.id,
                offer,
            });
        });

        socket.on("answer", ({ roomId, targetId, answer }) => {
            if (!roomId || !targetId || !answer) {
                return;
            }

            if (socket.data.roomId !== roomId) {
                return;
            }

            const members = roomMembers.get(roomId);
            if (!members || !members.has(targetId)) {
                return;
            }

            io.to(targetId).emit("answer", {
                roomId,
                from: socket.id,
                answer,
            });
        });

        socket.on("ice-candidate", ({ roomId, targetId, candidate }) => {
            if (!roomId || !targetId || !candidate) {
                return;
            }

            if (socket.data.roomId !== roomId) {
                return;
            }

            const members = roomMembers.get(roomId);
            if (!members || !members.has(targetId)) {
                return;
            }

            io.to(targetId).emit("ice-candidate", {
                roomId,
                from: socket.id,
                candidate,
            });
        });

        socket.on("user-left", ({ roomId }) => {
            const activeRoomId = roomId || socket.data.roomId;
            if (!activeRoomId) {
                return;
            }

            const members = roomMembers.get(activeRoomId);
            if (members) {
                members.delete(socket.id);
                if (members.size === 0) {
                    roomMembers.delete(activeRoomId);
                }
            }

            socket.leave(activeRoomId);
            socket.to(activeRoomId).emit("user-left", { socketId: socket.id });
            socket.data.roomId = null;
        });

        socket.on("disconnect", () => {
            const roomId = socket.data.roomId;
            if (!roomId) {
                return;
            }

            const members = roomMembers.get(roomId);
            if (members) {
                members.delete(socket.id);
                if (members.size === 0) {
                    roomMembers.delete(roomId);
                } else {
                    roomMembers.set(roomId, members);
                }
            }

            socket.to(roomId).emit("user-left", { socketId: socket.id });
        });
    });

    return io;
};

module.exports = {
    initSignalingServer,
};
