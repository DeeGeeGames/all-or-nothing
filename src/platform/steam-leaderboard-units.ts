export const SteamLeaderboardMetric = {
	score: 'score',
	time: 'time',
	combo: 'combo',
	fastestMatch: 'fastestMatch',
} as const;

export type SteamLeaderboardMetric = typeof SteamLeaderboardMetric[keyof typeof SteamLeaderboardMetric];

export const STEAM_LEADERBOARD_METRICS = [
	SteamLeaderboardMetric.score,
	SteamLeaderboardMetric.time,
	SteamLeaderboardMetric.combo,
	SteamLeaderboardMetric.fastestMatch,
] as const;

export const SteamLeaderboardPeriod = {
	alltime: 'alltime',
	monthly: 'monthly',
	weekly: 'weekly',
} as const;

export type SteamLeaderboardPeriod = typeof SteamLeaderboardPeriod[keyof typeof SteamLeaderboardPeriod];

export const STEAM_LEADERBOARD_PERIODS = [
	SteamLeaderboardPeriod.alltime,
	SteamLeaderboardPeriod.monthly,
	SteamLeaderboardPeriod.weekly,
] as const;

// Game, IndexedDB, GameCompletionData, and in-game leaderboard rows use whole seconds
// for full-game time and fastest match. Steam BestTimes boards are TimeMilliseconds.
// FastestMatch stays TimeSeconds. Convert only at this Steam boundary.
export const STEAM_FULL_GAME_TIME_MS_PER_GAME_SECOND = 1000 as const;

// BestTimes_v3 mixed seed milliseconds (360000 / 420000) with live second scores
// (342–3197). Ascending KeepBest keeps the contaminated smaller value, so v3 cannot
// be repaired by correcting later uploads. v4 is a clean milliseconds board.
export const STEAM_LEADERBOARD_BASE_NAMES = {
	score: 'Highscores_v3',
	time: 'BestTimes_v4',
	combo: 'MaxCombo_v3',
	fastestMatch: 'FastestMatch_v3',
} as const satisfies Record<SteamLeaderboardMetric, string>;

export interface SteamScoreSubmission {
	readonly score: number;
	readonly time: number;
	readonly maxCombo: number;
	readonly fastestMatch: number;
}

export interface SteamSubmitEntry {
	readonly metric: SteamLeaderboardMetric;
	readonly boardName: string;
	readonly value: number;
}

export interface SteamLeaderboardRow {
	readonly rank: number;
	readonly playerName: string;
	readonly score: number;
}

export function isSteamLeaderboardMetric(value: string): value is SteamLeaderboardMetric {
	return Object.hasOwn(STEAM_LEADERBOARD_BASE_NAMES, value);
}

export function isoWeek(date: Date): { readonly year: number; readonly week: number } {
	const target = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
	target.setUTCDate(target.getUTCDate() + 3 - ((target.getUTCDay() + 6) % 7));
	const jan4 = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
	const week = 1 + Math.round(((target.getTime() - jan4.getTime()) / 86400000 - 3 + ((jan4.getUTCDay() + 6) % 7)) / 7);
	return { year: target.getUTCFullYear(), week };
}

export function monthlySuffix(date: Date): string {
	return `Monthly_${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function weeklySuffix(date: Date): string {
	const { year, week } = isoWeek(date);
	return `Weekly_${year}W${String(week).padStart(2, '0')}`;
}

const PERIOD_SUFFIX: Readonly<Record<string, ((now: Date) => string) | null>> = {
	alltime: null,
	monthly: monthlySuffix,
	weekly: weeklySuffix,
};

export function resolveSteamBoardName(baseName: string, period: string, now: Date = new Date()): string {
	const resolver = PERIOD_SUFFIX[period];
	if (!resolver) return baseName;
	return `${baseName}_${resolver(now)}`;
}

export function gameSecondsToSteamTimeMilliseconds(seconds: number): number {
	return seconds * STEAM_FULL_GAME_TIME_MS_PER_GAME_SECOND;
}

export function steamTimeMillisecondsToGameSeconds(milliseconds: number): number {
	return milliseconds / STEAM_FULL_GAME_TIME_MS_PER_GAME_SECOND;
}

function passthrough(value: number): number {
	return value;
}

const TO_STEAM: Readonly<Record<SteamLeaderboardMetric, (value: number) => number>> = {
	score: passthrough,
	time: gameSecondsToSteamTimeMilliseconds,
	combo: passthrough,
	fastestMatch: passthrough,
};

const FROM_STEAM: Readonly<Record<SteamLeaderboardMetric, (value: number) => number>> = {
	score: passthrough,
	time: steamTimeMillisecondsToGameSeconds,
	combo: passthrough,
	fastestMatch: passthrough,
};

export function steamMetricSubmitValues(data: SteamScoreSubmission): Readonly<Record<SteamLeaderboardMetric, number | null>> {
	return {
		score: TO_STEAM.score(data.score),
		time: TO_STEAM.time(data.time),
		combo: TO_STEAM.combo(data.maxCombo),
		fastestMatch: data.fastestMatch > 0 ? TO_STEAM.fastestMatch(data.fastestMatch) : null,
	};
}

export function steamSubmitEntries(
	data: SteamScoreSubmission,
	now: Date = new Date(),
): readonly SteamSubmitEntry[] {
	const values = steamMetricSubmitValues(data);
	return STEAM_LEADERBOARD_PERIODS.flatMap(period =>
		STEAM_LEADERBOARD_METRICS.flatMap(metric => {
			const value = values[metric];
			if (value === null) return [];
			return [{
				metric,
				boardName: resolveSteamBoardName(STEAM_LEADERBOARD_BASE_NAMES[metric], period, now),
				value,
			}];
		}),
	);
}

export function fromSteamDownloadValue(metric: string, steamValue: number): number {
	if (!isSteamLeaderboardMetric(metric)) return steamValue;
	return FROM_STEAM[metric](steamValue);
}

export function toGameLeaderboardRows(
	metric: string,
	rows: readonly SteamLeaderboardRow[],
): readonly SteamLeaderboardRow[] {
	return rows.map(row => ({
		rank: row.rank,
		playerName: row.playerName,
		score: fromSteamDownloadValue(metric, row.score),
	}));
}
