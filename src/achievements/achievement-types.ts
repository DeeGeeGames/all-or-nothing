import type { Enum } from '@/types';
import type { GameHistoryEntry } from '@/core';

export const AchievementCategory = {
	Mastery: 'mastery',
	Endurance: 'endurance',
	Speed: 'speed',
	Score: 'score',
} as const;

export type AchievementCategory = Enum<typeof AchievementCategory>;

export interface AchievementDefinition {
	readonly id: string;
	readonly name: string;
	readonly description: string;
	readonly category: AchievementCategory;
	readonly check: (
		currentGame: GameHistoryEntry,
		historyCount: number,
	) => boolean;
}

export interface UnlockedAchievement {
	readonly id: string;
	readonly unlockedAt: number;
}
