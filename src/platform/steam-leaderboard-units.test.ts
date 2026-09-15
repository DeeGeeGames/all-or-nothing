import { describe, expect, test } from 'bun:test';
import { formatDuration } from '@/utils';
import { LeaderboardName, LeaderboardPeriod } from './types';
import type { GameCompletionData, LeaderboardEntry, LeaderboardFetchOptions } from './types';
import {
	STEAM_LEADERBOARD_BASE_NAMES,
	STEAM_LEADERBOARD_PERIODS,
	SteamLeaderboardMetric,
	fromSteamDownloadValue,
	gameSecondsToSteamTimeMilliseconds,
	isSteamLeaderboardMetric,
	resolveSteamBoardName,
	steamMetricSubmitValues,
	steamSubmitEntries,
	steamTimeMillisecondsToGameSeconds,
	toGameLeaderboardRows,
} from './steam-leaderboard-units';

const NOW = new Date(Date.UTC(2026, 8, 14));
const SIX_MINUTE_RUN: GameCompletionData = {
	score: 1500,
	time: 360,
	maxCombo: 4,
	fastestMatch: 20,
};

function keepBest(previous: number | undefined, next: number, ascending: boolean): number {
	if (previous === undefined) return next;
	if (ascending) return Math.min(previous, next);
	return Math.max(previous, next);
}

const ASCENDING_METRICS = new Set<string>([
	SteamLeaderboardMetric.time,
	SteamLeaderboardMetric.fastestMatch,
]);

function createMemorySteamPlatform(now: Date = NOW) {
	const boards = new Map<string, Map<string, number>>();

	function submitScore(data: GameCompletionData, playerName: string): boolean {
		steamSubmitEntries(data, now).forEach(entry => {
			const board = boards.get(entry.boardName) ?? new Map<string, number>();
			board.set(playerName, keepBest(
				board.get(playerName),
				entry.value,
				ASCENDING_METRICS.has(entry.metric),
			));
			boards.set(entry.boardName, board);
		});
		return true;
	}

	function fetchLeaderboard(options: LeaderboardFetchOptions): readonly LeaderboardEntry[] {
		if (!isSteamLeaderboardMetric(options.leaderboard)) return [];
		const boardName = resolveSteamBoardName(
			STEAM_LEADERBOARD_BASE_NAMES[options.leaderboard],
			options.period,
			now,
		);
		const board = boards.get(boardName);
		if (!board) return [];
		const ascending = options.leaderboard === LeaderboardName.Time
			|| options.leaderboard === LeaderboardName.FastestMatch;
		const sorted = [...board.entries()].toSorted((a, b) => ascending ? a[1] - b[1] : b[1] - a[1]);
		return toGameLeaderboardRows(
			options.leaderboard,
			sorted.map(([playerName, score], index) => ({
				rank: index + 1,
				playerName,
				score,
			})),
		);
	}

	return {
		submitScore,
		fetchLeaderboard,
		uploadedBoardNames: () => [...boards.keys()].toSorted(),
		rawScore: (boardName: string, playerName: string) => boards.get(boardName)?.get(playerName),
	};
}

describe('steam full-game time units', () => {
	test('converts whole seconds to milliseconds for Steam Time boards', () => {
		expect(gameSecondsToSteamTimeMilliseconds(360)).toBe(360000);
		expect(steamTimeMillisecondsToGameSeconds(360000)).toBe(360);
		expect(steamMetricSubmitValues(SIX_MINUTE_RUN)).toEqual({
			score: 1500,
			time: 360000,
			combo: 4,
			fastestMatch: 20,
		});
	});

	test('leaves fastest match, score, and combo in game units', () => {
		const values = steamMetricSubmitValues({
			score: 99,
			time: 12,
			maxCombo: 7,
			fastestMatch: 3,
		});
		expect(values.score).toBe(99);
		expect(values.combo).toBe(7);
		expect(values.fastestMatch).toBe(3);
		expect(fromSteamDownloadValue(LeaderboardName.FastestMatch, 20)).toBe(20);
		expect(fromSteamDownloadValue(LeaderboardName.Score, 1500)).toBe(1500);
		expect(fromSteamDownloadValue(LeaderboardName.Combo, 4)).toBe(4);
	});

	test('omits fastest match when it is not a positive time', () => {
		const entries = steamSubmitEntries({ ...SIX_MINUTE_RUN, fastestMatch: 0 }, NOW);
		expect(entries.some(entry => entry.metric === SteamLeaderboardMetric.fastestMatch)).toBe(false);
	});
});

describe('steam time board versioning', () => {
	test('submits converted time to BestTimes_v4 for every period', () => {
		const timeEntries = steamSubmitEntries(SIX_MINUTE_RUN, NOW)
			.filter(entry => entry.metric === SteamLeaderboardMetric.time);

		expect(timeEntries).toEqual([
			{ metric: 'time', boardName: 'BestTimes_v4', value: 360000 },
			{ metric: 'time', boardName: 'BestTimes_v4_Monthly_202609', value: 360000 },
			{ metric: 'time', boardName: 'BestTimes_v4_Weekly_2026W38', value: 360000 },
		]);
		expect(STEAM_LEADERBOARD_PERIODS).toEqual(['alltime', 'monthly', 'weekly']);
		expect(STEAM_LEADERBOARD_BASE_NAMES.time).toBe('BestTimes_v4');
		expect(STEAM_LEADERBOARD_BASE_NAMES.fastestMatch).toBe('FastestMatch_v3');
	});
});

describe('in-memory steam platform double', () => {
	test('round-trips a 360s run as 6:00 on every Time period and ranks with millisecond seeds', () => {
		const steam = createMemorySteamPlatform();
		steam.submitScore({ score: 1000, time: 420, maxCombo: 1, fastestMatch: 30 }, 'SeedB');
		steam.submitScore(SIX_MINUTE_RUN, 'Live');
		steam.submitScore({ score: 800, time: 360, maxCombo: 2, fastestMatch: 20 }, 'SeedA');

		const periods = [
			LeaderboardPeriod.AllTime,
			LeaderboardPeriod.Monthly,
			LeaderboardPeriod.Weekly,
		] as const;

		periods.forEach(period => {
			const timeRows = steam.fetchLeaderboard({
				leaderboard: LeaderboardName.Time,
				fetchType: 'global',
				period,
				rangeStart: 0,
				rangeEnd: 10,
			});
			expect(timeRows.map(row => ({ playerName: row.playerName, score: row.score, label: formatDuration(row.score) }))).toEqual([
				{ playerName: 'Live', score: 360, label: '6:00' },
				{ playerName: 'SeedA', score: 360, label: '6:00' },
				{ playerName: 'SeedB', score: 420, label: '7:00' },
			]);

			const fastestRows = steam.fetchLeaderboard({
				leaderboard: LeaderboardName.FastestMatch,
				fetchType: 'global',
				period,
				rangeStart: 0,
				rangeEnd: 10,
			});
			expect(fastestRows.map(row => ({ playerName: row.playerName, score: row.score, label: formatDuration(row.score) }))).toEqual([
				{ playerName: 'Live', score: 20, label: '0:20' },
				{ playerName: 'SeedA', score: 20, label: '0:20' },
				{ playerName: 'SeedB', score: 30, label: '0:30' },
			]);
		});

		expect(steam.rawScore('BestTimes_v4', 'Live')).toBe(360000);
		expect(steam.rawScore('BestTimes_v4_Monthly_202609', 'Live')).toBe(360000);
		expect(steam.rawScore('BestTimes_v4_Weekly_2026W38', 'Live')).toBe(360000);
		expect(steam.rawScore('FastestMatch_v3', 'Live')).toBe(20);
	});

	test('KeepBest on a milliseconds Time board retains a corrected value over a later slower run', () => {
		const steam = createMemorySteamPlatform();
		steam.submitScore(SIX_MINUTE_RUN, 'Player');
		steam.submitScore({ ...SIX_MINUTE_RUN, time: 400 }, 'Player');

		expect(steam.rawScore('BestTimes_v4', 'Player')).toBe(360000);
		expect(steam.fetchLeaderboard({
			leaderboard: LeaderboardName.Time,
			fetchType: 'global',
			period: LeaderboardPeriod.AllTime,
			rangeStart: 0,
			rangeEnd: 10,
		})).toEqual([
			{ rank: 1, playerName: 'Player', score: 360 },
		]);
	});

	test('unconverted seconds cannot replace a contaminated KeepBest value on an ascending board', () => {
		const contaminated = 360;
		const corrected = gameSecondsToSteamTimeMilliseconds(360);
		expect(Math.min(contaminated, corrected)).toBe(contaminated);
	});
});
