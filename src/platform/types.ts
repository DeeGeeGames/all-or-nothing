import type { Enum } from '@/types';

export
const LeaderboardName = {
	Score: 'score',
	Time: 'time',
	Combo: 'combo',
	FastestMatch: 'fastestMatch',
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
const LeaderboardPeriod = {
	AllTime: 'alltime',
	Monthly: 'monthly',
	Weekly: 'weekly',
} as const;

export
type LeaderboardPeriod = Enum<typeof LeaderboardPeriod>;

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
	readonly period: LeaderboardPeriod;
	readonly rangeStart: number;
	readonly rangeEnd: number;
}

export
interface GameCompletionData {
	readonly score: number;
	readonly time: number;
	readonly maxCombo: number;
	readonly fastestMatch: number;
}

export const CurrentGameSaveVersion = 4 as const;

export
interface GameSaveData {
	readonly version: 1 | 2 | 3 | typeof CurrentGameSaveVersion;
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
	readonly achievements?: readonly { readonly id: string; readonly unlockedAt: number }[];
	readonly runId?: string;
	readonly completed?: boolean;
	readonly historyEntryId?: string | null;
	readonly scoreSubmitted?: boolean;
}

export
interface PlatformService {
	init(): Promise<boolean>;
	submitScore(data: GameCompletionData): Promise<boolean>;
	fetchLeaderboard(options: LeaderboardFetchOptions): Promise<readonly LeaderboardEntry[]>;
	getPlayerName(): Promise<string | null>;
	activateAchievement(achievementId: string): Promise<boolean>;
	cloudSave(data: GameSaveData): Promise<boolean>;
	cloudLoad(): Promise<GameSaveData | null>;
}
