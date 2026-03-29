import type { PlatformService, LeaderboardFetchOptions, GameCompletionData, GameSaveData } from './types';

export function createSteamPlatformService(): PlatformService {
	const api = window.electronAPI?.steam;

	return {
		async init() {
			if (!api) return false;
			try {
				return await api.init();
			} catch {
				console.warn('Steam initialization failed');
				return false;
			}
		},

		async submitScore(data: GameCompletionData) {
			if (!api) return false;
			try {
				return await api.submitScore(data);
			} catch {
				console.warn('Score submission failed');
				return false;
			}
		},

		async fetchLeaderboard(options: LeaderboardFetchOptions) {
			if (!api) return [];
			try {
				return await api.fetchLeaderboard(options);
			} catch {
				console.warn('Leaderboard fetch failed');
				return [];
			}
		},

		async getPlayerName() {
			if (!api) return null;
			try {
				return await api.getPlayerName() ?? null;
			} catch {
				return null;
			}
		},

		async cloudSave(data: GameSaveData) {
			if (!api) return false;
			try {
				return await api.cloudSave(JSON.stringify(data));
			} catch {
				return false;
			}
		},

		async cloudLoad() {
			if (!api) return null;
			try {
				const json = await api.cloudLoad();
				if (!json) return null;
				const parsed: unknown = JSON.parse(json);
				if (
					typeof parsed !== 'object' ||
					parsed === null
				) return null;
				const version = (parsed as { version?: unknown }).version;
				if (version === 1) {
					const v1 = parsed as Record<string, unknown>;
					return {
						...v1,
						version: 1,
						misses: 0,
						fastestScore: 0,
					} as GameSaveData;
				}
				if (version === 2) return parsed as GameSaveData;
				return null;
			} catch {
				return null;
			}
		},
	};
}
