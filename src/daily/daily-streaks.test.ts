import { describe, expect, test } from 'bun:test';
import {
	getCurrentStreak,
	getDailyStreakData,
	isDailyCompletedOn,
	recordDailyCompletion,
} from './daily-streaks';
import { loadDailyBoardState } from './daily-board-state';

function createMemoryStorage(initial: Record<string, string> = {}) {
	const data: Record<string, string> = { ...initial };

	return {
		getItem(key: string) {
			return Object.hasOwn(data, key) ? data[key] ?? null : null;
		},
		setItem(key: string, value: string) {
			data[key] = value;
		},
		removeItem(key: string) {
			delete data[key];
		},
	};
}

describe('recordDailyCompletion', () => {
	test('credits a date once and grows a consecutive Pacific streak', () => {
		const storage = createMemoryStorage();

		expect(recordDailyCompletion('2026-09-13', storage)).toEqual({
			currentStreak: 1,
			lastCompletionDate: '2026-09-13',
		});
		expect(recordDailyCompletion('2026-09-13', storage)).toEqual({
			currentStreak: 1,
			lastCompletionDate: '2026-09-13',
		});
		expect(recordDailyCompletion('2026-09-14', storage)).toEqual({
			currentStreak: 2,
			lastCompletionDate: '2026-09-14',
		});
	});

	test('a missed Pacific day restarts the streak at 1', () => {
		const storage = createMemoryStorage();
		recordDailyCompletion('2026-09-13', storage);
		recordDailyCompletion('2026-09-14', storage);

		expect(recordDailyCompletion('2026-09-16', storage)).toEqual({
			currentStreak: 1,
			lastCompletionDate: '2026-09-16',
		});
		expect(getCurrentStreak('2026-09-18', storage)).toBe(0);
	});

	test('does not move lastCompletionDate backward or revoke a later credit', () => {
		const storage = createMemoryStorage();
		recordDailyCompletion('2026-09-14', storage);
		recordDailyCompletion('2026-09-15', storage);

		expect(recordDailyCompletion('2026-09-14', storage)).toEqual({
			currentStreak: 2,
			lastCompletionDate: '2026-09-15',
		});
		expect(isDailyCompletedOn('2026-09-15', storage)).toBe(true);
	});

	test('reads the stored streak when recording after display expiry would have zeroed it', () => {
		const storage = createMemoryStorage({
			'daily-streak-data': JSON.stringify({
				currentStreak: 5,
				lastCompletionDate: '2026-09-13',
			}),
		});

		expect(getDailyStreakData('2026-09-15', storage).currentStreak).toBe(0);
		expect(recordDailyCompletion('2026-09-14', storage)).toEqual({
			currentStreak: 6,
			lastCompletionDate: '2026-09-14',
		});
		expect(getCurrentStreak('2026-09-15', storage)).toBe(6);
	});
});

describe('daily board state keys', () => {
	test('loads the pre-change JSON shape for a pinned date', () => {
		const storage = createMemoryStorage({
			'daily-board-state-2026-09-14': JSON.stringify({
				flippedCardIds: ['daily-0', 'daily-1', 'daily-2'],
				setsFound: 1,
			}),
		});

		expect(loadDailyBoardState('2026-09-14', storage)).toEqual({
			flippedCardIds: new Set(['daily-0', 'daily-1', 'daily-2']),
			setsFound: 1,
		});
		expect(loadDailyBoardState('2026-09-15', storage)).toBeNull();
	});
});
