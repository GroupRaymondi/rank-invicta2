import { getRankingPeriod } from './src/lib/dateUtils';

console.log('--- Testing Ranking Period Logic ---');

const mockDate = (dateString: string) => {
    const fixedDate = new Date(dateString);
    const originalDate = Date;

    // @ts-ignore
    global.Date = class extends originalDate {
        constructor(...args: any[]) {
            if (args.length === 0) {
                super(fixedDate.getTime());
            } else {
                // @ts-ignore
                super(...args);
            }
        }
        static now() {
            return fixedDate.getTime();
        }
    } as any;

    return () => {
        // @ts-ignore
        globalThis.Date = originalDate;
    };
};

const formatDate = (date: Date) => {
    return date.toLocaleString('pt-BR', {
        weekday: 'short',
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric'
    });
};

const testPeriod = (dateStr: string, expectedStartStr: string) => {
    const restore = mockDate(dateStr);
    const { startDate, endDate } = getRankingPeriod();

    console.log(`Testing: ${formatDate(new Date(dateStr))}`);
    console.log(`Start:   ${formatDate(startDate)}`);
    console.log(`End:     ${formatDate(endDate)}`);

    const expectedStart = new Date(expectedStartStr);

    // Allow 1 second tolerance
    if (Math.abs(startDate.getTime() - expectedStart.getTime()) <= 1000) {
        console.log('✅ PASS');
    } else {
        console.log('❌ FAIL');
        console.log(`Expected Start: ${formatDate(expectedStart)}`);
        console.log(`Diff: ${startDate.getTime() - expectedStart.getTime()}ms`);
    }
    restore();
    console.log('---');
};

// Test 1: Today (Tuesday Jan 27 2026)
// Expect Start Date: Saturday Jan 24 2026 22:00
testPeriod('2026-01-27T12:00:00', '2026-01-24T22:00:00');

// Test 2: Saturday Before 22:00 (Jan 24 21:00)
// Expect Start Date: Saturday Jan 17 22:00 (Previous week)
testPeriod('2026-01-24T21:00:00', '2026-01-17T22:00:00');

// Test 3: Saturday After 22:00 (Jan 24 23:00)
// Expect Start Date: Saturday Jan 24 22:00 (Current week reset)
testPeriod('2026-01-24T23:00:00', '2026-01-24T22:00:00');
