const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");

const startupHistorySchema = new mongoose.Schema(
    {
        startupName: { type: String, trim: true },
        position: { type: String, trim: true },
        foundedYear: { type: Number },
        status: { type: String, trim: true },
        summary: { type: String, trim: true },
    },
    { _id: false },
);

const investmentHistorySchema = new mongoose.Schema(
    {
        companyName: { type: String, trim: true },
        amount: { type: String, trim: true },
        stage: { type: String, trim: true },
        year: { type: Number },
        status: { type: String, trim: true },
        notes: { type: String, trim: true },
    },
    { _id: false },
);

const preferencesSchema = new mongoose.Schema(
    {
        industries: [{ type: String, trim: true }],
        stages: [{ type: String, trim: true }],
        locations: [{ type: String, trim: true }],
        communication: [{ type: String, trim: true }],
    },
    { _id: false },
);

const entrepreneurProfileSchema = new mongoose.Schema(
    {
        startupName: { type: String, trim: true, default: "" },
        pitchSummary: { type: String, trim: true, default: "" },
        fundingNeeded: { type: String, trim: true, default: "" },
        industry: { type: String, trim: true, default: "" },
        location: { type: String, trim: true, default: "" },
        foundedYear: { type: Number, default: null },
        teamSize: { type: Number, default: null },
    },
    { _id: false },
);

const investorProfileSchema = new mongoose.Schema(
    {
        investmentInterests: [{ type: String, trim: true }],
        investmentStage: [{ type: String, trim: true }],
        portfolioCompanies: [{ type: String, trim: true }],
        totalInvestments: { type: Number, default: 0 },
        minimumInvestment: { type: String, trim: true, default: "" },
        maximumInvestment: { type: String, trim: true, default: "" },
    },
    { _id: false },
);

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            minlength: 2,
            maxlength: 120,
        },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        password: {
            type: String,
            required: true,
            minlength: 8,
            select: false,
        },
        role: {
            type: String,
            enum: ["investor", "entrepreneur"],
            required: true,
            lowercase: true,
        },
        bio: {
            type: String,
            trim: true,
            default: "",
            maxlength: 2000,
        },
        profilePictureUrl: {
            type: String,
            trim: true,
            default: "",
        },
        walletBalance: {
            type: Number,
            default: 0,
            min: 0,
        },
        startupHistory: {
            type: [startupHistorySchema],
            default: [],
        },
        investmentHistory: {
            type: [investmentHistorySchema],
            default: [],
        },
        preferences: {
            type: preferencesSchema,
            default: () => ({
                industries: [],
                stages: [],
                locations: [],
                communication: [],
            }),
        },
        entrepreneurProfile: {
            type: entrepreneurProfileSchema,
            default: () => ({}),
        },
        investorProfile: {
            type: investorProfileSchema,
            default: () => ({
                investmentInterests: [],
                investmentStage: [],
                portfolioCompanies: [],
                totalInvestments: 0,
                minimumInvestment: "",
                maximumInvestment: "",
            }),
        },
    },
    {
        timestamps: true,
    },
);

userSchema.pre("save", async function hashPassword(next) {
    if (!this.isModified("password")) {
        return next();
    }

    this.password = await bcrypt.hash(this.password, 12);
    return next();
});

userSchema.methods.comparePassword = function comparePassword(candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

userSchema.set("toJSON", {
    transform: (_, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        delete ret.password;

        ret.avatarUrl =
            ret.profilePictureUrl ||
            `https://ui-avatars.com/api/?name=${encodeURIComponent(ret.name)}&background=random`;

        ret.walletBalance = Number(ret.walletBalance || 0);

        if (ret.role === "entrepreneur") {
            ret.startupName = ret.entrepreneurProfile?.startupName || "";
            ret.pitchSummary = ret.entrepreneurProfile?.pitchSummary || "";
            ret.fundingNeeded = ret.entrepreneurProfile?.fundingNeeded || "";
            ret.industry = ret.entrepreneurProfile?.industry || "";
            ret.location = ret.entrepreneurProfile?.location || "";
            ret.foundedYear = ret.entrepreneurProfile?.foundedYear;
            ret.teamSize = ret.entrepreneurProfile?.teamSize;
        }

        if (ret.role === "investor") {
            ret.investmentInterests = ret.investorProfile?.investmentInterests || [];
            ret.investmentStage = ret.investorProfile?.investmentStage || [];
            ret.portfolioCompanies = ret.investorProfile?.portfolioCompanies || [];
            ret.totalInvestments = ret.investorProfile?.totalInvestments || 0;
            ret.minimumInvestment = ret.investorProfile?.minimumInvestment || "";
            ret.maximumInvestment = ret.investorProfile?.maximumInvestment || "";
        }

        return ret;
    },
});

module.exports = mongoose.model("User", userSchema);
