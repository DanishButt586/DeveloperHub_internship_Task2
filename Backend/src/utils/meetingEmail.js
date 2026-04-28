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

const sendEmail = async ({ to, subject, text }) => {
    const transporter = getTransporter();

    if (!transporter) {
        console.log("[MeetingEmailStub] SMTP not configured. Logging notification instead.");
        console.log(`[MeetingEmailStub] To: ${to}`);
        console.log(`[MeetingEmailStub] Subject: ${subject}`);
        console.log(`[MeetingEmailStub] Body: ${text}`);
        return;
    }

    await transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to,
        subject,
        text,
    });
};

const sendMeetingInviteEmail = async ({ inviteeEmail, hostName, meeting }) => {
    await sendEmail({
        to: inviteeEmail,
        subject: `New meeting invite: ${meeting.title}`,
        text: `${hostName} scheduled a meeting with you.\n\nTitle: ${meeting.title}\nStart: ${meeting.startTime.toISOString()}\nEnd: ${meeting.endTime.toISOString()}\nLink: ${meeting.meetingLink || "TBD"}\nDescription: ${meeting.description || "-"}`,
    });
};

const sendMeetingStatusEmail = async ({ recipientEmail, meeting, status, actorName }) => {
    await sendEmail({
        to: recipientEmail,
        subject: `Meeting ${status.toLowerCase()}: ${meeting.title}`,
        text: `${actorName} changed the meeting status to ${status}.\n\nTitle: ${meeting.title}\nStart: ${meeting.startTime.toISOString()}\nEnd: ${meeting.endTime.toISOString()}\nLink: ${meeting.meetingLink || "TBD"}`,
    });
};

module.exports = {
    sendMeetingInviteEmail,
    sendMeetingStatusEmail,
};
