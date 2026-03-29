import type { GameHistoryEntry } from '@/core';
import type { PersonalBests, AggregateStats, ChartDataPoint } from './stats-types';

export function computePersonalBests(entries: readonly GameHistoryEntry[]): PersonalBests {
	return entries.reduce<PersonalBests>(
		(bests, entry) => ({
			bestScore: Math.max(bests.bestScore, entry.score),
			bestTime: bests.bestTime === 0
				? entry.time
				: Math.min(bests.bestTime, entry.time),
			bestMaxCombo: Math.max(bests.bestMaxCombo, entry.maxCombo),
			bestFastestMatch: entry.fastestScore > 0
				? (bests.bestFastestMatch === 0
					? entry.fastestScore
					: Math.min(bests.bestFastestMatch, entry.fastestScore))
				: bests.bestFastestMatch,
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
			averageMatchSpeed: 0,
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
		averageMatchSpeed: totals.matchSpeedCount > 0 ? totals.matchSpeedSum / totals.matchSpeedCount : 0,
	};
}

function computeRollingAverage(
	values: readonly number[],
	index: number,
	windowSize: number,
): number | null {
	if (index < windowSize - 1) return null;

	const window = values.slice(index - windowSize + 1, index + 1);
	return window.reduce((sum, v) => sum + v, 0) / windowSize;
}

export function toChartData(entries: readonly GameHistoryEntry[], windowSize = 5): readonly ChartDataPoint[] {
	const scores = entries.map(e => e.score);
	const times = entries.map(e => e.time);
	const avgMatchTimes = entries.map(e => e.setsFound > 0 ? e.time / e.setsFound : 0);
	const fastestMatches = entries.map(e => e.fastestScore);
	const accuracies = entries.map(e => {
		const total = e.setsFound + e.misses;
		return total > 0 ? (e.setsFound / total) * 100 : 0;
	});

	return entries.map((entry, i) => ({
		gameNumber: i + 1,
		date: entry.completedAt,
		score: entry.score,
		time: entry.time,
		avgMatchTime: avgMatchTimes[i] ?? 0,
		fastestMatch: entry.fastestScore,
		accuracy: accuracies[i] ?? 0,
		scoreAvg: computeRollingAverage(scores, i, windowSize),
		timeAvg: computeRollingAverage(times, i, windowSize),
		avgMatchTimeAvg: computeRollingAverage(avgMatchTimes, i, windowSize),
		fastestMatchAvg: computeRollingAverage(fastestMatches, i, windowSize),
		accuracyAvg: computeRollingAverage(accuracies, i, windowSize),
	}));
}

export function formatDuration(seconds: number): string {
	const minutes = Math.floor(seconds / 60);
	const remainingSeconds = Math.floor(seconds % 60);
	return `${minutes}:${String(remainingSeconds).padStart(2, '0')}`;
}
