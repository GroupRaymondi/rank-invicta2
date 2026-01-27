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

export const getCurrentWeekOfMonth = () => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Start checking from the 1st of the month
    let checkDate = new Date(currentYear, currentMonth, 1);
    let resetsPassed = 0;

    // Loop through days until we reach "now"
    while (checkDate < now) {
        // Check if this specific point in time was a reset point
        // Reset point: Saturday at 22:00

        // We need to check if a Saturday 22:00 has passed
        if (checkDate.getDay() === 6) { // It's Saturday
            // Create the reset time for this Saturday
            const resetTime = new Date(checkDate);
            resetTime.setHours(22, 0, 0, 0);

            if (resetTime < now) {
                resetsPassed++;
            }
        }

        // Move to next day
        checkDate.setDate(checkDate.getDate() + 1);
    }

    // Week 1 is before any reset.
    // Week 2 is after 1 reset.
    // Week 3 is after 2 resets.
    // Week 4 is after 3 resets.
    // Week 5 (if exists) is after 4 resets.

    // Cap at 4 as per user request ("se na quarta semana...")
    return Math.min(resetsPassed + 1, 4);
};
