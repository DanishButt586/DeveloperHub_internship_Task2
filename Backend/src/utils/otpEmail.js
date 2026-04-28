const nodemailer = require("nodemailer");

let cachedTransporter;

const canUseSmtp = () => {
    return Boolean(process.env.SMTP_HOST && process.env.SMTP_PORT);
};

const getTransporter = () => {
    if (!canUseSmtp()) {
        return null;
    }

    if (!cachedTransporter) {
        const smtpPort = Number(process.env.SMTP_PORT);
        cachedTransporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: smtpPort,
            secure: smtpPort === 465,
            auth:
                process.env.SMTP_USER && process.env.SMTP_PASS
                    ? {
                        user: process.env.SMTP_USER,
                        pass: process.env.SMTP_PASS,
                    }
                    : undefined,
        });
    }

    return cachedTransporter;
};

const sendOtpEmail = async ({ email, otp }) => {
    const transporter = getTransporter();

    if (!transporter) {
        console.log("[OTP] SMTP not configured. OTP email send skipped.");
        return;
    }

    await transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: email,
        subject: "Your Nexus login verification code",
        text: `Use this OTP to complete your login: ${otp}. This code expires in 10 minutes.`,
    });
};

module.exports = {
    sendOtpEmail,
};
