const User = require("../models/User");
const RevokedToken = require("../models/RevokedToken");
const { getDashboardDataByRole } = require("../utils/dashboard");
const { sendOtpEmail } = require("../utils/otpEmail");
const { signJwt } = require("../utils/token");
const { clearAuthCookie, sendAuthCookie, verifyJwt, JWT_COOKIE_NAME } = require("../utils/token");

const FAILED_LOGIN_LIMIT = 5;
const FAILED_LOGIN_WINDOW_MS = 15 * 60 * 1000;
const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;

const failedLoginAttempts = new Map();
const pendingOtpSessions = new Map();

const normalizeEmail = (email) => String(email || "").trim().toLowerCase();

const buildOtpCode = () => String(Math.floor(100000 + Math.random() * 900000));

const getFailureState = (email) => {
    const entry = failedLoginAttempts.get(email);
    if (!entry) {
        return { count: 0, lockedUntil: null };
    }

    if (entry.lockedUntil && Date.now() > entry.lockedUntil) {
        failedLoginAttempts.delete(email);
        return { count: 0, lockedUntil: null };
    }

    return entry;
};

const recordFailedLogin = (email, ip, reason) => {
    const state = getFailureState(email);
    const nextCount = (state.count || 0) + 1;
    const nextState = {
        count: nextCount,
        lockedUntil:
            nextCount >= FAILED_LOGIN_LIMIT ? Date.now() + FAILED_LOGIN_WINDOW_MS : null,
    };

    failedLoginAttempts.set(email, nextState);

    console.warn(
        `[SuspiciousActivity] Failed login for ${email} from ${ip}. Count=${nextCount}. Reason=${reason}`,
    );

    if (nextState.lockedUntil) {
        console.warn(
            `[SuspiciousActivity] Account lockout triggered for ${email} until ${new Date(nextState.lockedUntil).toISOString()}`,
        );
    }
};

const clearFailedLoginState = (email) => {
    failedLoginAttempts.delete(email);
};

const createOtpSession = async (user) => {
    const otp = buildOtpCode();
    const otpToken = signJwt({ userId: user.id, tokenType: "otp" });
    pendingOtpSessions.set(otpToken, {
        userId: user.id,
        otp,
        expiresAt: Date.now() + OTP_TTL_MS,
        attempts: 0,
    });

    await sendOtpEmail({ email: user.email, otp });
    return otpToken;
};

const normalizeRole = (role) => {
    if (typeof role !== "string") {
        return null;
    }

    const normalizedRole = role.trim().toLowerCase();
    if (["investor", "entrepreneur"].includes(normalizedRole)) {
        return normalizedRole;
    }

    return null;
};

const extractEntrepreneurProfile = (payload) => {
    const source = payload.entrepreneurProfile || payload;

    return {
        startupName: source.startupName || "",
        pitchSummary: source.pitchSummary || "",
        fundingNeeded: source.fundingNeeded || "",
        industry: source.industry || "",
        location: source.location || "",
        foundedYear: source.foundedYear || null,
        teamSize: source.teamSize || null,
    };
};

const extractInvestorProfile = (payload) => {
    const source = payload.investorProfile || payload;

    return {
        investmentInterests: source.investmentInterests || [],
        investmentStage: source.investmentStage || [],
        portfolioCompanies: source.portfolioCompanies || [],
        totalInvestments: source.totalInvestments || 0,
        minimumInvestment: source.minimumInvestment || "",
        maximumInvestment: source.maximumInvestment || "",
    };
};

const register = async (req, res, next) => {
    try {
        const { name, email, password, role } = req.body;
        const normalizedRole = normalizeRole(role);

        if (!name || !email || !password || !normalizedRole) {
            return res.status(400).json({
                success: false,
                message: "Name, email, password, and a valid role are required.",
            });
        }

        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: "An account with this email already exists.",
            });
        }

        const userPayload = {
            name,
            email,
            password,
            role: normalizedRole,
            bio: req.body.bio || "",
            profilePictureUrl: req.body.profilePictureUrl || "",
            startupHistory: req.body.startupHistory || [],
            investmentHistory: req.body.investmentHistory || [],
            preferences: req.body.preferences || undefined,
        };

        if (normalizedRole === "entrepreneur") {
            userPayload.entrepreneurProfile = extractEntrepreneurProfile(req.body);
        }

        if (normalizedRole === "investor") {
            userPayload.investorProfile = extractInvestorProfile(req.body);
        }

        const user = await User.create(userPayload);

        sendAuthCookie(res, user.id);

        return res.status(201).json({
            success: true,
            message: "Registration successful.",
            user: user.toJSON(),
            dashboardData: getDashboardDataByRole(user),
        });
    } catch (error) {
        return next(error);
    }
};

const login = async (req, res, next) => {
    try {
        const { email, password, role } = req.body;
        const normalizedEmail = normalizeEmail(email);

        const failureState = getFailureState(normalizedEmail);
        if (failureState.lockedUntil && Date.now() < failureState.lockedUntil) {
            return res.status(423).json({
                success: false,
                message: "Too many failed login attempts. Account temporarily locked for 15 minutes.",
            });
        }

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required.",
            });
        }

        const normalizedRole = role ? normalizeRole(role) : null;
        if (role && !normalizedRole) {
            return res.status(400).json({
                success: false,
                message: "Role must be Investor or Entrepreneur.",
            });
        }

        const userWithPassword = await User.findOne({ email: normalizedEmail }).select(
            "+password",
        );

        if (!userWithPassword) {
            recordFailedLogin(normalizedEmail, req.ip, "user_not_found");
            return res.status(401).json({
                success: false,
                message: "Invalid email or password.",
            });
        }

        if (normalizedRole && userWithPassword.role !== normalizedRole) {
            recordFailedLogin(normalizedEmail, req.ip, "role_mismatch");
            return res.status(401).json({
                success: false,
                message: "Selected role does not match this account.",
            });
        }

        const isPasswordValid = await userWithPassword.comparePassword(password);
        if (!isPasswordValid) {
            recordFailedLogin(normalizedEmail, req.ip, "invalid_password");
            return res.status(401).json({
                success: false,
                message: "Invalid email or password.",
            });
        }

        const user = await User.findById(userWithPassword._id);

        clearFailedLoginState(normalizedEmail);
        const otpToken = await createOtpSession(user);

        return res.status(200).json({
            success: true,
            message: "OTP sent. Please verify to complete login.",
            otpRequired: true,
            otpToken,
        });
    } catch (error) {
        return next(error);
    }
};

const verifyOtp = async (req, res, next) => {
    try {
        const { otpToken, otp } = req.body;

        const session = pendingOtpSessions.get(otpToken);
        if (!session) {
            return res.status(401).json({
                success: false,
                message: "Invalid OTP session.",
            });
        }

        if (Date.now() > session.expiresAt) {
            pendingOtpSessions.delete(otpToken);
            return res.status(401).json({
                success: false,
                message: "OTP expired. Please login again.",
            });
        }

        if (session.attempts >= OTP_MAX_ATTEMPTS) {
            pendingOtpSessions.delete(otpToken);
            return res.status(401).json({
                success: false,
                message: "Too many invalid OTP attempts. Please login again.",
            });
        }

        if (String(otp) !== String(session.otp)) {
            session.attempts += 1;
            pendingOtpSessions.set(otpToken, session);
            return res.status(401).json({
                success: false,
                message: "Invalid OTP code.",
            });
        }

        const user = await User.findById(session.userId);
        if (!user) {
            pendingOtpSessions.delete(otpToken);
            return res.status(404).json({
                success: false,
                message: "User not found.",
            });
        }

        pendingOtpSessions.delete(otpToken);
        sendAuthCookie(res, user.id);

        return res.status(200).json({
            success: true,
            message: "Login successful.",
            user: user.toJSON(),
            dashboardData: getDashboardDataByRole(user),
        });
    } catch (error) {
        return next(error);
    }
};

const logout = async (req, res, next) => {
    try {
        const token = req.cookies[JWT_COOKIE_NAME];

        if (token) {
            try {
                const payload = verifyJwt(token);
                if (payload.jti && payload.exp) {
                    await RevokedToken.updateOne(
                        { jti: payload.jti },
                        { jti: payload.jti, expiresAt: new Date(payload.exp * 1000) },
                        { upsert: true },
                    );
                }
            } catch (_error) {
                // Ignore invalid token on logout and still clear cookie.
            }
        }

        clearAuthCookie(res);

        return res.status(200).json({
            success: true,
            message: "Logged out successfully.",
        });
    } catch (error) {
        return next(error);
    }
};

const me = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found.",
            });
        }

        return res.status(200).json({
            success: true,
            user: user.toJSON(),
            dashboardData: getDashboardDataByRole(user),
        });
    } catch (error) {
        return next(error);
    }
};

module.exports = {
    register,
    login,
    verifyOtp,
    logout,
    me,
    normalizeRole,
};
