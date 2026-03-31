import type { PlatformService, LeaderboardFetchOptions, LeaderboardEntry, LeaderboardPeriod } from './types';
import { LeaderboardName } from './types';

const MOCK_PLAYER_NAME = 'Player';

const MOCK_NAMES = [
	'AceOfSpades', 'CardShark', 'SetMaster', 'TripleThreat',
	'WildCard', 'DeckSlayer', 'PatternPro', 'QuickDraw',
	'ComboKing', MOCK_PLAYER_NAME,
] as const;

function generateEntries(count: number, valueGenerator: (rank: number) => number): readonly LeaderboardEntry[] {
	return Array.from({ length: count }, (_, i) => ({
		rank: i + 1,
		playerName: MOCK_NAMES[i] ?? `Player${i + 1}`,
		score: valueGenerator(i + 1),
	}));
}

const PERIOD_MULTIPLIER: Readonly<Record<LeaderboardPeriod, number>> = {
	alltime: 1,
	monthly: 0.85,
	weekly: 0.7,
};

const BASE_GENERATORS: Readonly<Record<string, (rank: number) => number>> = {
	[LeaderboardName.Score]: (rank) => Math.round((160_000 - rank * 12_000) / 10) * 10,
	[LeaderboardName.Time]: (rank) => 90 + rank * 45,
	[LeaderboardName.Combo]: (rank) => Math.max(18 - rank * 2, 1),
};

export function createMockPlatformService(): PlatformService {
	return {
		init: async () => true,
		submitScore: async () => true,
		getPlayerName: async () => MOCK_PLAYER_NAME,
		fetchLeaderboard: async (options: LeaderboardFetchOptions) => {
			const generator = BASE_GENERATORS[options.leaderboard];
			if (!generator) return [];
			const multiplier = PERIOD_MULTIPLIER[options.period] ?? 1;
			return generateEntries(10, (rank) => Math.round(generator(rank) * multiplier));
		},
		activateAchievement: async () => true,
		cloudSave: async () => true,
		cloudLoad: async () => null,
	};
}
