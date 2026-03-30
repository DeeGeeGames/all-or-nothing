import type { GameHistoryEntry } from '@/core';
import { getDb, unlockAchievement } from '@/core';
import { ACHIEVEMENTS } from './achievement-definitions';
import type { AchievementDefinition } from './achievement-types';

export
async function evaluateAchievements(
	currentGame: GameHistoryEntry,
	historyCount: number,
	activateSteamAchievement: ((id: string) => Promise<boolean>) | null,
): Promise<readonly AchievementDefinition[]> {
	const alreadyUnlocked = await getDb().achievements.toArray();
	const unlockedIds = new Set(alreadyUnlocked.map(a => a.id));

	const newlyUnlocked = ACHIEVEMENTS
		.filter(a => !unlockedIds.has(a.id))
		.filter(a => a.check(currentGame, historyCount));

	await Promise.all(
		newlyUnlocked.map(async (achievement) => {
			await unlockAchievement(achievement.id);

			if (activateSteamAchievement) {
				await activateSteamAchievement(achievement.id).catch(() => {});
			}
		}),
	);

	return newlyUnlocked;
}
