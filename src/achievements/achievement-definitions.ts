import { AchievementCategory } from './achievement-types';
import type { AchievementDefinition } from './achievement-types';

export const ACHIEVEMENTS: readonly AchievementDefinition[] = [
	{
		id: 'PERFECT_CLEAR',
		name: 'Perfect Clear',
		description: 'Clear all cards without making a mistake',
		category: AchievementCategory.Mastery,
		check: (game) => game.remainingCards === 0 && game.misses === 0,
	},
	{
		id: 'COMBO_5',
		name: 'Hot Streak',
		description: 'Reach a 5x combo',
		category: AchievementCategory.Mastery,
		check: (game) => game.maxCombo >= 5,
	},
	{
		id: 'COMBO_10',
		name: 'On Fire',
		description: 'Reach a 10x combo',
		category: AchievementCategory.Mastery,
		check: (game) => game.maxCombo >= 10,
	},
	{
		id: 'COMBO_15',
		name: 'Unstoppable',
		description: 'Reach a 15x combo',
		category: AchievementCategory.Mastery,
		check: (game) => game.maxCombo >= 15,
	},

	{
		id: 'GAMES_10',
		name: 'Getting Started',
		description: 'Complete 10 games',
		category: AchievementCategory.Endurance,
		check: (_game, historyCount) => historyCount >= 10,
	},
	{
		id: 'GAMES_50',
		name: 'Dedicated',
		description: 'Complete 50 games',
		category: AchievementCategory.Endurance,
		check: (_game, historyCount) => historyCount >= 50,
	},
	{
		id: 'GAMES_100',
		name: 'Centurion',
		description: 'Complete 100 games',
		category: AchievementCategory.Endurance,
		check: (_game, historyCount) => historyCount >= 100,
	},
	{
		id: 'GAMES_500',
		name: 'Veteran',
		description: 'Complete 500 games',
		category: AchievementCategory.Endurance,
		check: (_game, historyCount) => historyCount >= 500,
	},

	{
		id: 'FAST_MATCH_20',
		name: 'Quick Hands',
		description: 'Find a set in under 20 seconds',
		category: AchievementCategory.Speed,
		check: (game) => game.fastestScore > 0 && game.fastestScore < 20,
	},
	{
		id: 'FAST_MATCH_15',
		name: 'Lightning Reflexes',
		description: 'Find a set in under 15 seconds',
		category: AchievementCategory.Speed,
		check: (game) => game.fastestScore > 0 && game.fastestScore < 15,
	},
	{
		id: 'FAST_MATCH_10',
		name: 'Speed Demon',
		description: 'Find a set in under 10 seconds',
		category: AchievementCategory.Speed,
		check: (game) => game.fastestScore > 0 && game.fastestScore < 10,
	},
	{
		id: 'FAST_MATCH_5',
		name: 'Blink',
		description: 'Find a set in under 5 seconds',
		category: AchievementCategory.Speed,
		check: (game) => game.fastestScore > 0 && game.fastestScore < 5,
	},
	{
		id: 'FAST_MATCH_3',
		name: 'Instant',
		description: 'Find a set in under 3 seconds',
		category: AchievementCategory.Speed,
		check: (game) => game.fastestScore > 0 && game.fastestScore < 3,
	},

	{
		id: 'SCORE_50K',
		name: 'High Roller',
		description: 'Score over 50,000 points in a single game',
		category: AchievementCategory.Score,
		check: (game) => game.score >= 50_000,
	},
	{
		id: 'SCORE_100K',
		name: 'Six Figures',
		description: 'Score over 100,000 points in a single game',
		category: AchievementCategory.Score,
		check: (game) => game.score >= 100_000,
	},
	{
		id: 'SCORE_200K',
		name: 'Score Legend',
		description: 'Score over 200,000 points in a single game',
		category: AchievementCategory.Score,
		check: (game) => game.score >= 200_000,
	},
];
