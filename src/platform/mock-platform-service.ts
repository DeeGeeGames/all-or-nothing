import type { PlatformService, LeaderboardFetchOptions, LeaderboardEntry } from './types';
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

const MOCK_DATA: Record<string, readonly LeaderboardEntry[]> = {
	[LeaderboardName.Score]: generateEntries(10, (rank) =>
		Math.round((160_000 - rank * 12_000) / 10) * 10,
	),
	[LeaderboardName.Time]: generateEntries(10, (rank) =>
		90 + rank * 45,
	),
	[LeaderboardName.Combo]: generateEntries(10, (rank) =>
		Math.max(18 - rank * 2, 1),
	),
};

export function createMockPlatformService(): PlatformService {
	return {
		init: async () => true,
		submitScore: async () => true,
		getPlayerName: async () => MOCK_PLAYER_NAME,
		fetchLeaderboard: async (options: LeaderboardFetchOptions) =>
			MOCK_DATA[options.leaderboard] ?? [],
		cloudSave: async () => true,
		cloudLoad: async () => null,
	};
}
