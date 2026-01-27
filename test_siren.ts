// @ts-nocheck
import { getCurrentWeekOfMonth } from './src/lib/dateUtils';

console.log('--- Testing Siren Logic ---');

// Mock Date to test different scenarios
const originalDate = Date;

const mockDate = (dateString: string) => {
    const fixedDate = new Date(dateString);
    global.Date = class extends originalDate {
        constructor(...args: any[]) {
            super();
            if (args.length === 0) {
                return fixedDate;
            }
            return new originalDate(...args as [any]);
        }
        static now() {
            return fixedDate.getTime();
        }
    } as any;
};

const testWeek = (dateStr: string, expectedWeek: number) => {
    mockDate(dateStr);
    const week = getCurrentWeekOfMonth();
    console.log(`Date: ${dateStr} | Expected: ${expectedWeek} | Got: ${week} | ${week === expectedWeek ? 'PASS' : 'FAIL'}`);
};

try {
    // January 2026
    // 1st (Thu) -> Week 1 (0 resets)
    testWeek('2026-01-01T12:00:00', 1);

    // 3rd (Sat) 21:00 -> Week 1 (Before 22:00 reset)
    testWeek('2026-01-03T21:00:00', 1);

    // 3rd (Sat) 23:00 -> Week 2 (After 22:00 reset)
    testWeek('2026-01-03T23:00:00', 2);

    // 4th (Sun) -> Week 2
    testWeek('2026-01-04T12:00:00', 2);

    // 10th (Sat) 23:00 -> Week 3 (After 2nd reset)
    testWeek('2026-01-10T23:00:00', 3);

    // 17th (Sat) 23:00 -> Week 4 (After 3rd reset)
    testWeek('2026-01-17T23:00:00', 4);

    // 24th (Sat) 23:00 -> Week 5? But capped at 4.
    testWeek('2026-01-24T23:00:00', 4);

    // Today (27th Jan 2026) -> Should be 4 (capped)
    testWeek('2026-01-27T12:00:00', 4);

} catch (e) {
    console.error(e);
} finally {
    global.Date = originalDate;
}