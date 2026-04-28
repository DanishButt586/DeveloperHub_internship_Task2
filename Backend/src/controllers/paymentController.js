const Stripe = require("stripe");
const Transaction = require("../models/Transaction");
const User = require("../models/User");

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

const normalizeTransaction = (txnDoc) => {
    const transaction = txnDoc.toJSON();

    if (transaction.userId && typeof transaction.userId === "object") {
        transaction.user = {
            id: transaction.userId._id ? transaction.userId._id.toString() : transaction.userId.id,
            name: transaction.userId.name,
            email: transaction.userId.email,
            role: transaction.userId.role,
        };
        transaction.userId = transaction.user.id;
    }

    if (transaction.recipientId && typeof transaction.recipientId === "object") {
        transaction.recipient = {
            id: transaction.recipientId._id
                ? transaction.recipientId._id.toString()
                : transaction.recipientId.id,
            name: transaction.recipientId.name,
            email: transaction.recipientId.email,
            role: transaction.recipientId.role,
        };
        transaction.recipientId = transaction.recipient.id;
    }

    return transaction;
};

const deposit = async (req, res, next) => {
    try {
        const amount = Number(req.body.amount);
        const currency = String(req.body.currency || "usd").toLowerCase();

        if (!stripe) {
            return res.status(500).json({
                success: false,
                message: "Stripe is not configured. Add STRIPE_SECRET_KEY in .env.",
            });
        }

        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(amount * 100),
            currency,
            automatic_payment_methods: { enabled: true },
            metadata: {
                userId: req.user.id,
                purpose: "wallet_deposit",
            },
        });

        const transaction = await Transaction.create({
            userId: req.user.id,
            type: "DEPOSIT",
            amount,
            currency: currency.toUpperCase(),
            status: "PENDING",
            stripePaymentIntentId: paymentIntent.id,
        });

        return res.status(200).json({
            success: true,
            message: "Payment intent created.",
            clientSecret: paymentIntent.client_secret,
            transaction: normalizeTransaction(transaction),
        });
    } catch (error) {
        return next(error);
    }
};

const handleStripeWebhook = async (req, res, next) => {
    try {
        if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) {
            return res.status(500).send("Stripe webhook not configured.");
        }

        const signature = req.headers["stripe-signature"];
        if (!signature) {
            return res.status(400).send("Missing Stripe signature.");
        }

        const event = stripe.webhooks.constructEvent(
            req.body,
            signature,
            process.env.STRIPE_WEBHOOK_SECRET,
        );

        if (event.type === "payment_intent.succeeded") {
            const paymentIntent = event.data.object;

            const transaction = await Transaction.findOne({
                stripePaymentIntentId: paymentIntent.id,
            });

            if (transaction && transaction.status !== "COMPLETED") {
                const updateResult = await Transaction.updateOne(
                    { _id: transaction.id, status: { $ne: "COMPLETED" } },
                    { status: "COMPLETED" },
                );

                if (updateResult.modifiedCount === 1) {
                    await User.updateOne(
                        { _id: transaction.userId },
                        { $inc: { walletBalance: Number(transaction.amount || 0) } },
                    );
                }
            }
        }

        return res.status(200).json({ received: true });
    } catch (error) {
        return next(error);
    }
};

const withdraw = async (req, res, next) => {
    try {
        const amount = Number(req.body.amount);
        const currency = String(req.body.currency || "USD").toUpperCase();

        if (!Number.isFinite(amount) || amount <= 0) {
            return res.status(400).json({
                success: false,
                message: "Amount must be a positive number.",
            });
        }

        const user = await User.findOneAndUpdate(
            {
                _id: req.user.id,
                walletBalance: { $gte: amount },
            },
            {
                $inc: { walletBalance: -amount },
            },
            {
                new: true,
            },
        );

        if (!user) {
            return res.status(400).json({
                success: false,
                message: "Insufficient balance for withdrawal.",
            });
        }

        const transaction = await Transaction.create({
            userId: req.user.id,
            type: "WITHDRAW",
            amount,
            currency,
            status: "COMPLETED",
        });

        return res.status(200).json({
            success: true,
            message: "Withdrawal processed in mock mode.",
            transaction: normalizeTransaction(transaction),
            balance: user.walletBalance,
        });
    } catch (error) {
        return next(error);
    }
};

const transfer = async (req, res, next) => {
    try {
        const amount = Number(req.body.amount);
        const currency = String(req.body.currency || "USD").toUpperCase();
        const recipientId = req.body.recipientId;

        if (!Number.isFinite(amount) || amount <= 0) {
            return res.status(400).json({
                success: false,
                message: "Amount must be a positive number.",
            });
        }

        const recipient = await User.findById(recipientId).select("_id");

        if (!recipient) {
            return res.status(404).json({
                success: false,
                message: "Recipient not found.",
            });
        }

        if (req.user.id.toString() === recipient.id.toString()) {
            return res.status(400).json({
                success: false,
                message: "Cannot transfer to the same account.",
            });
        }

        const sender = await User.findOneAndUpdate(
            {
                _id: req.user.id,
                walletBalance: { $gte: amount },
            },
            {
                $inc: { walletBalance: -amount },
            },
            {
                new: true,
            },
        );

        if (!sender) {
            return res.status(400).json({
                success: false,
                message: "Insufficient balance for transfer.",
            });
        }

        const recipientUpdate = await User.updateOne(
            { _id: recipient.id },
            { $inc: { walletBalance: amount } },
        );

        if (recipientUpdate.modifiedCount !== 1) {
            await User.updateOne({ _id: sender.id }, { $inc: { walletBalance: amount } });
            return res.status(500).json({
                success: false,
                message: "Transfer failed. Sender balance restored.",
            });
        }

        const transaction = await Transaction.create({
            userId: sender.id,
            recipientId: recipient.id,
            type: "TRANSFER",
            amount,
            currency,
            status: "COMPLETED",
        });

        return res.status(200).json({
            success: true,
            message: "Transfer completed.",
            transaction: normalizeTransaction(transaction),
            balance: sender.walletBalance,
        });
    } catch (error) {
        return next(error);
    }
};

const paymentHistory = async (req, res, next) => {
    try {
        const page = Number(req.query.page || 1);
        const limit = Math.min(Number(req.query.limit || 10), 50);
        const skip = (page - 1) * limit;

        const query = {
            $or: [{ userId: req.user.id }, { recipientId: req.user.id }],
        };

        const [transactions, total, user] = await Promise.all([
            Transaction.find(query)
                .populate("userId", "name email role")
                .populate("recipientId", "name email role")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            Transaction.countDocuments(query),
            User.findById(req.user.id).select("walletBalance"),
        ]);

        return res.status(200).json({
            success: true,
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
            balance: user?.walletBalance || 0,
            transactions: transactions.map(normalizeTransaction),
        });
    } catch (error) {
        return next(error);
    }
};

module.exports = {
    deposit,
    handleStripeWebhook,
    withdraw,
    transfer,
    paymentHistory,
};
