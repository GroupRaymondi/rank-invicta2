export const getRankingPeriod = () => {
    const now = new Date();
    const currentDay = now.getDay(); // 0 = Sunday, 6 = Saturday
    const currentHour = now.getHours();

    // Target reset time: Saturday 22:00 (10 PM)

    let startDate = new Date(now);
    startDate.setHours(22, 0, 0, 0);

    if (currentDay === 6) { // Saturday
        if (currentHour < 22) {
            // Before 10 PM on Saturday: Start date is LAST Saturday
            startDate.setDate(startDate.getDate() - 7);
        }
        // If >= 22, startDate is already today at 22:00, which is correct
    } else {
        // Not Saturday
        // Calculate days to go back to reach the most recent Saturday
        // If Sunday (0), go back 1 day.
        // If Monday (1), go back 2 days.
        // ...
        // If Friday (5), go back 6 days.
        const daysToGoBack = (currentDay + 1) % 7;
        // Wait, let's trace:
        // Sunday (0): want Saturday (6). 0 - 6 = -6? No.
        // Logic: (currentDay + 7 - 6) % 7?
        // Sunday (0): (0 + 1) = 1 day back. Correct.
        // Monday (1): (1 + 1) = 2 days back. Correct.
        // Friday (5): (5 + 1) = 6 days back. Correct.

        startDate.setDate(startDate.getDate() - (currentDay + 1));
    }

    return {
        startDate,
        endDate: now
    };
};
