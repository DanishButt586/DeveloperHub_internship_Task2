const express = require("express");
const {
    scheduleMeeting,
    getMyMeetings,
    acceptMeeting,
    rejectMeeting,
    cancelMeeting,
    createMeetingRoom,
} = require("../controllers/meetingController");
const { authenticate } = require("../middleware/auth");
const { authorizeRoles } = require("../middleware/role");
const { body, validate, idParamRule } = require("../middleware/validation");

const router = express.Router();

const hasTimezoneOffset = (value) => {
    return /([zZ]|[+-]\d{2}:\d{2})$/.test(String(value || ""));
};

router.post(
    "/schedule",
    authenticate,
    authorizeRoles("investor", "entrepreneur"),
    validate([
        body("title").isLength({ min: 2, max: 180 }).withMessage("title must be 2-180 chars."),
        body("inviteeId").isMongoId().withMessage("inviteeId must be a valid user id."),
        body("startTime").isISO8601().withMessage("startTime must be a valid ISO date."),
        body("endTime").isISO8601().withMessage("endTime must be a valid ISO date."),
        body("startTime")
            .custom((value) => hasTimezoneOffset(value))
            .withMessage("startTime must include timezone offset (e.g. Z or +05:30)."),
        body("endTime")
            .custom((value) => hasTimezoneOffset(value))
            .withMessage("endTime must include timezone offset (e.g. Z or +05:30)."),
        body("meetingLink").optional().isString().isLength({ max: 500 }),
        body("description").optional().isString().isLength({ max: 4000 }),
    ]),
    scheduleMeeting,
);
router.get("/my", authenticate, authorizeRoles("investor", "entrepreneur"), getMyMeetings);
router.patch(
    "/:id/accept",
    authenticate,
    authorizeRoles("investor", "entrepreneur"),
    validate([idParamRule("id")]),
    acceptMeeting,
);
router.patch(
    "/:id/reject",
    authenticate,
    authorizeRoles("investor", "entrepreneur"),
    validate([idParamRule("id")]),
    rejectMeeting,
);
router.delete(
    "/:id/cancel",
    authenticate,
    authorizeRoles("investor", "entrepreneur"),
    validate([idParamRule("id")]),
    cancelMeeting,
);
router.post(
    "/:id/room",
    authenticate,
    authorizeRoles("investor", "entrepreneur"),
    validate([idParamRule("id")]),
    createMeetingRoom,
);

module.exports = router;
