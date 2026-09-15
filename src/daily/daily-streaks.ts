import { getPacificDate } from './pacific-date';

const STREAK_STORAGE_KEY = 'daily-streak-data';

export interface DailyStreakData {
	readonly currentStreak: number;
	readonly lastCompletionDate: string;
}

type StreakReader = Pick<Storage, 'getItem'>;
type StreakWriter = Pick<Storage, 'getItem' | 'setItem'>;

export
function formatDate(date: Date): string {
	return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function todayPacific(): string {
	return formatDate(getPacificDate());
}

function isDailyStreakData(value: unknown): value is DailyStreakData {
	if (typeof value !== 'object' || value === null) return false;
	if (!('currentStreak' in value) || !('lastCompletionDate' in value)) return false;
	return typeof value.currentStreak === 'number' && typeof value.lastCompletionDate === 'string';
}

function parseDailyStreakData(raw: string | null): DailyStreakData | null {
	if (!raw) return null;

	try {
		const parsed: unknown = JSON.parse(raw);
		return isDailyStreakData(parsed) ? parsed : null;
	} catch {
		return null;
	}
}

function emptyStreak(): DailyStreakData {
	return { currentStreak: 0, lastCompletionDate: '' };
}

function readStoredStreak(storage: StreakReader): DailyStreakData {
	return parseDailyStreakData(storage.getItem(STREAK_STORAGE_KEY)) ?? emptyStreak();
}

function daysBetween(dateStrA: string, dateStrB: string): number {
	const a = new Date(dateStrA + 'T00:00:00');
	const b = new Date(dateStrB + 'T00:00:00');
	return Math.round(Math.abs(a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24));
}

export
function getDailyStreakData(
	today: string = todayPacific(),
	storage: StreakReader = localStorage,
): DailyStreakData {
	const data = readStoredStreak(storage);
	if (!data.lastCompletionDate) {
		return data;
	}

	const gap = daysBetween(today, data.lastCompletionDate);
	if (gap > 1) {
		return { currentStreak: 0, lastCompletionDate: data.lastCompletionDate };
	}

	return data;
}

export
function recordDailyCompletion(
	completionDate: string,
	storage: StreakWriter = localStorage,
): DailyStreakData {
	const existing = readStoredStreak(storage);
	if (existing.lastCompletionDate === completionDate) {
		return existing;
	}

	if (existing.lastCompletionDate > completionDate) {
		return existing;
	}

	const gap = existing.lastCompletionDate
		? daysBetween(completionDate, existing.lastCompletionDate)
		: Infinity;
	const updated: DailyStreakData = {
		currentStreak: gap === 1 ? existing.currentStreak + 1 : 1,
		lastCompletionDate: completionDate,
	};

	storage.setItem(STREAK_STORAGE_KEY, JSON.stringify(updated));
	return updated;
}

export
function isDailyCompletedOn(
	date: string,
	storage: StreakReader = localStorage,
): boolean {
	return readStoredStreak(storage).lastCompletionDate === date;
}

export
function isDailyCompletedToday(
	today: string = todayPacific(),
	storage: StreakReader = localStorage,
): boolean {
	return isDailyCompletedOn(today, storage);
}

export
function getCurrentStreak(
	today: string = todayPacific(),
	storage: StreakReader = localStorage,
): number {
	return getDailyStreakData(today, storage).currentStreak;
}
