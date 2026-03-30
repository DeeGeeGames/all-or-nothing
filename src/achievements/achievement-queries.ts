import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo } from 'react';
import { getDb } from '@/core';
import { ACHIEVEMENTS } from './achievement-definitions';
import type { AchievementCategory, UnlockedAchievement } from './achievement-types';

export function useUnlockedAchievements(): readonly UnlockedAchievement[] | undefined {
	return useLiveQuery(() => getDb().achievements.toArray());
}

export interface AchievementDisplayItem {
	readonly id: string;
	readonly name: string;
	readonly description: string;
	readonly category: AchievementCategory;
	readonly unlocked: boolean;
	readonly unlockedAt: number | null;
}

export function useAchievementDisplayList(
	unlocked: readonly UnlockedAchievement[] | undefined,
): readonly AchievementDisplayItem[] | undefined {
	return useMemo(() => {
		if (!unlocked) return undefined;

		const unlockedMap = new Map(unlocked.map(a => [a.id, a.unlockedAt]));

		return ACHIEVEMENTS.map(def => ({
			id: def.id,
			name: def.name,
			description: def.description,
			category: def.category,
			unlocked: unlockedMap.has(def.id),
			unlockedAt: unlockedMap.get(def.id) ?? null,
		}));
	}, [unlocked]);
}
