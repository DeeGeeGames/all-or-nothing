import type { GameHistoryEntry } from '@/core';

interface GenerateOptions {
	readonly count?: number;
	readonly startDate?: number;
	readonly trend?: 'improving' | 'declining' | 'flat';
}

export function generateGameHistory({
	count = 30,
	startDate = Date.now() - 30 * 24 * 60 * 60 * 1000,
	trend = 'improving',
}: GenerateOptions = {}): readonly GameHistoryEntry[] {
	const interval = (Date.now() - startDate) / count;

	return Array.from({ length: count }, (_, i): GameHistoryEntry => {
		const progress = i / Math.max(count - 1, 1);
		const trendMultipliers = { improving: progress, declining: 1 - progress, flat: 0.5 } as const;
		const trendMultiplier = trendMultipliers[trend];

		const baseScore = 2000 + trendMultiplier * 8000 + jitter(1500);
		const baseTime = 300 - trendMultiplier * 180 + jitter(40);
		const setsFound = Math.floor(8 + trendMultiplier * 16 + jitter(3));
		const misses = Math.max(0, Math.floor(8 - trendMultiplier * 6 + jitter(3)));
		const maxCombo = Math.floor(1 + trendMultiplier * 8 + jitter(2));
		const remainingCards = Math.max(0, Math.floor(12 - trendMultiplier * 12 + jitter(2)));
		const fastestScore = Math.max(1, 15 - trendMultiplier * 10 + jitter(3));

		return {
			id: crypto.randomUUID(),
			completedAt: Math.floor(startDate + i * interval),
			score: Math.max(0, Math.round(baseScore)),
			time: Math.max(30, Math.round(baseTime)),
			maxCombo: Math.max(1, maxCombo),
			remainingCards: Math.min(12, remainingCards),
			setsFound: Math.max(1, setsFound),
			misses,
			fastestScore: Math.max(1, Math.round(fastestScore)),
		};
	});
}

function jitter(magnitude: number): number {
	return (Math.random() - 0.5) * 2 * magnitude;
}
