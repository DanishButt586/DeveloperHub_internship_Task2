const express = require("express");
const { getProfileById, updateProfile } = require("../controllers/profileController");
const { authenticate } = require("../middleware/auth");
const { authorizeRoles } = require("../middleware/role");
const { body, validate, idParamRule } = require("../middleware/validation");

const router = express.Router();

router.put(
    "/update",
    authenticate,
    authorizeRoles("investor", "entrepreneur"),
    validate([
        body("name").optional().isLength({ min: 2, max: 120 }),
        body("bio").optional().isLength({ max: 5000 }),
        body("profilePictureUrl").optional().isURL(),
        body("startupName").optional().isLength({ min: 2, max: 180 }),
        body("fundingNeeded").optional().isLength({ max: 80 }),
        body("industry").optional().isLength({ max: 120 }),
        body("location").optional().isLength({ max: 120 }),
        body("foundedYear").optional().isInt({ min: 1800, max: 2200 }),
        body("teamSize").optional().isInt({ min: 1, max: 100000 }),
    ]),
    updateProfile,
);
router.get(
    "/:id",
    authenticate,
    authorizeRoles("investor", "entrepreneur"),
    validate([idParamRule("id")]),
    getProfileById,
);

module.exports = router;
