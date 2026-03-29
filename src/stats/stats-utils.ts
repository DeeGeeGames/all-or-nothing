import type { GameHistoryEntry } from '@/core';
import type { PersonalBests, AggregateStats, ChartDataPoint } from './stats-types';

function minPositive(current: number, candidate: number): number {
	if (candidate <= 0) return current;
	if (current === 0) return candidate;
	return Math.min(current, candidate);
}

export function computePersonalBests(entries: readonly GameHistoryEntry[]): PersonalBests {
	return entries.reduce<PersonalBests>(
		(bests, entry) => ({
			bestScore: Math.max(bests.bestScore, entry.score),
			bestTime: minPositive(bests.bestTime, entry.time),
			bestMaxCombo: Math.max(bests.bestMaxCombo, entry.maxCombo),
			bestFastestMatch: minPositive(bests.bestFastestMatch, entry.fastestScore),
		}),
		{ bestScore: 0, bestTime: 0, bestMaxCombo: 0, bestFastestMatch: 0 },
	);
}

export function computeAggregateStats(entries: readonly GameHistoryEntry[]): AggregateStats {
	const totalGamesPlayed = entries.length;

	if (totalGamesPlayed === 0) {
		return {
			totalGamesPlayed: 0,
			totalSetsFound: 0,
			perfectClearRate: 0,
			accuracy: 0,
			meanScore: 0,
			meanTime: 0,
			meanMatchSpeed: 0,
		};
	}

	const totals = entries.reduce(
		(acc, entry) => ({
			setsFound: acc.setsFound + entry.setsFound,
			perfectClears: acc.perfectClears + (entry.remainingCards === 0 ? 1 : 0),
			score: acc.score + entry.score,
			time: acc.time + entry.time,
			misses: acc.misses + entry.misses,
			matchSpeedSum: acc.matchSpeedSum + (entry.setsFound > 0 ? entry.time / entry.setsFound : 0),
			matchSpeedCount: acc.matchSpeedCount + (entry.setsFound > 0 ? 1 : 0),
		}),
		{ setsFound: 0, perfectClears: 0, score: 0, time: 0, misses: 0, matchSpeedSum: 0, matchSpeedCount: 0 },
	);

	const totalAttempts = totals.setsFound + totals.misses;

	return {
		totalGamesPlayed,
		totalSetsFound: totals.setsFound,
		perfectClearRate: (totals.perfectClears / totalGamesPlayed) * 100,
		accuracy: totalAttempts > 0 ? (totals.setsFound / totalAttempts) * 100 : 0,
		meanScore: totals.score / totalGamesPlayed,
		meanTime: totals.time / totalGamesPlayed,
		meanMatchSpeed: totals.matchSpeedCount > 0 ? totals.matchSpeedSum / totals.matchSpeedCount : 0,
	};
}

export function toChartData(entries: readonly GameHistoryEntry[], windowSize = 5): readonly ChartDataPoint[] {
	const runningSums = { score: 0, time: 0, avgMatchTime: 0, fastestMatch: 0, accuracy: 0 };
	const valueBuffer: number[][] = [[], [], [], [], []];

	return entries.map((entry, i): ChartDataPoint => {
		const avgMatchTime = entry.setsFound > 0 ? entry.time / entry.setsFound : 0;
		const totalAttempts = entry.setsFound + entry.misses;
		const accuracy = totalAttempts > 0 ? (entry.setsFound / totalAttempts) * 100 : 0;

		const values = [entry.score, entry.time, avgMatchTime, entry.fastestScore, accuracy];

		const keys = ['score', 'time', 'avgMatchTime', 'fastestMatch', 'accuracy'] as const;
		const avgs: (number | null)[] = keys.map((key, k) => {
			runningSums[key] += values[k] ?? 0;
			valueBuffer[k]?.push(values[k] ?? 0);

			if (i < windowSize - 1) return null;

			if (i >= windowSize) {
				runningSums[key] -= valueBuffer[k]?.[i - windowSize] ?? 0;
			}

			return runningSums[key] / windowSize;
		});

		return {
			gameNumber: i + 1,
			date: entry.completedAt,
			score: entry.score,
			time: entry.time,
			avgMatchTime,
			fastestMatch: entry.fastestScore,
			accuracy,
			scoreAvg: avgs[0] ?? null,
			timeAvg: avgs[1] ?? null,
			avgMatchTimeAvg: avgs[2] ?? null,
			fastestMatchAvg: avgs[3] ?? null,
			accuracyAvg: avgs[4] ?? null,
		};
	});
}

export { formatDuration } from '@/utils';
