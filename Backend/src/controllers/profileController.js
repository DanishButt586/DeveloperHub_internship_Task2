const User = require("../models/User");
const { getDashboardDataByRole } = require("../utils/dashboard");

const updateCommonFields = (user, updates) => {
    const commonFields = [
        "name",
        "bio",
        "profilePictureUrl",
        "startupHistory",
        "investmentHistory",
        "preferences",
    ];

    commonFields.forEach((fieldName) => {
        if (updates[fieldName] !== undefined) {
            user[fieldName] = updates[fieldName];
        }
    });
};

const updateEntrepreneurFields = (user, updates) => {
    const source = updates.entrepreneurProfile || updates;
    const entrepreneurFields = [
        "startupName",
        "pitchSummary",
        "fundingNeeded",
        "industry",
        "location",
        "foundedYear",
        "teamSize",
    ];

    entrepreneurFields.forEach((fieldName) => {
        if (source[fieldName] !== undefined) {
            user.entrepreneurProfile[fieldName] = source[fieldName];
        }
    });
};

const updateInvestorFields = (user, updates) => {
    const source = updates.investorProfile || updates;
    const investorFields = [
        "investmentInterests",
        "investmentStage",
        "portfolioCompanies",
        "totalInvestments",
        "minimumInvestment",
        "maximumInvestment",
    ];

    investorFields.forEach((fieldName) => {
        if (source[fieldName] !== undefined) {
            user.investorProfile[fieldName] = source[fieldName];
        }
    });
};

const getProfileById = async (req, res, next) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "Profile not found.",
            });
        }

        return res.status(200).json({
            success: true,
            profile: user.toJSON(),
        });
    } catch (error) {
        return next(error);
    }
};

const updateProfile = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "Profile not found.",
            });
        }

        updateCommonFields(user, req.body);

        if (user.role === "entrepreneur") {
            updateEntrepreneurFields(user, req.body);
        }

        if (user.role === "investor") {
            updateInvestorFields(user, req.body);
        }

        await user.save();

        return res.status(200).json({
            success: true,
            message: "Profile updated successfully.",
            profile: user.toJSON(),
            dashboardData: getDashboardDataByRole(user),
        });
    } catch (error) {
        return next(error);
    }
};

module.exports = {
    getProfileById,
    updateProfile,
};
