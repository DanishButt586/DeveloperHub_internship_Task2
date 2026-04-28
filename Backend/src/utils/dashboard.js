const getInvestorDashboardData = (user) => {
    const industries = user.preferences?.industries || [];
    const investmentHistory = user.investmentHistory || [];

    return {
        dashboardType: "Investor",
        summary: {
            trackedIndustries: industries.length,
            totalInvestments: investmentHistory.length,
            activePortfolio: user.investorProfile?.portfolioCompanies?.length || 0,
        },
        highlights: [
            "Review trending startups in your selected industries.",
            "Prioritize follow-ups on founders with matching stage preferences.",
            "Track portfolio performance and update your investment thesis.",
        ],
    };
};

const getEntrepreneurDashboardData = (user) => {
    const startupHistory = user.startupHistory || [];
    const investmentHistory = user.investmentHistory || [];

    return {
        dashboardType: "Entrepreneur",
        summary: {
            startupsBuilt: startupHistory.length,
            investorEngagements: investmentHistory.length,
            profileStrength: user.bio ? "Strong" : "Needs Improvement",
        },
        highlights: [
            "Keep your pitch summary and traction data current.",
            "Update investor preferences to improve matching quality.",
            "Share milestones regularly to increase investor interest.",
        ],
    };
};

const getDashboardDataByRole = (user) => {
    if (user.role === "investor") {
        return getInvestorDashboardData(user);
    }

    return getEntrepreneurDashboardData(user);
};

module.exports = {
    getDashboardDataByRole,
};
