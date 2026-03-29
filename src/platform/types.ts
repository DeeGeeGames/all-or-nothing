import type { Enum } from '@/types';

export
const LeaderboardName = {
	Score: 'score',
	Time: 'time',
	Combo: 'combo',
} as const;

export
type LeaderboardName = Enum<typeof LeaderboardName>;

export
const LeaderboardFetchType = {
	Global: 'global',
	AroundUser: 'around-user',
	Friends: 'friends',
} as const;

export
type LeaderboardFetchType = Enum<typeof LeaderboardFetchType>;

export
interface LeaderboardEntry {
	readonly rank: number;
	readonly playerName: string;
	readonly score: number;
}

export
interface LeaderboardFetchOptions {
	readonly leaderboard: LeaderboardName;
	readonly fetchType: LeaderboardFetchType;
	readonly rangeStart: number;
	readonly rangeEnd: number;
}

export
interface GameCompletionData {
	readonly score: number;
	readonly time: number;
	readonly maxCombo: number;
}

export
interface GameSaveData {
	readonly version: 1 | 2;
	readonly savedAt: number;
	readonly deck: readonly string[];
	readonly discard: readonly string[];
	readonly time: number;
	readonly misses: number;
	readonly fastestScore: number;
	readonly score: number;
	readonly scoreValue: number;
	readonly lastMatchTime: number;
	readonly comboCount: number;
	readonly maxCombo: number;
}

export
interface PlatformService {
	init(): Promise<boolean>;
	submitScore(data: GameCompletionData): Promise<boolean>;
	fetchLeaderboard(options: LeaderboardFetchOptions): Promise<readonly LeaderboardEntry[]>;
	getPlayerName(): Promise<string | null>;
	cloudSave(data: GameSaveData): Promise<boolean>;
	cloudLoad(): Promise<GameSaveData | null>;
}
