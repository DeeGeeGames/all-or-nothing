import type { PlatformService } from './types';

export function createNoopPlatformService(): PlatformService {
	return {
		init: async () => false,
		submitScore: async () => false,
		fetchLeaderboard: async () => [],
		getPlayerName: async () => null,
		activateAchievement: async () => false,
		cloudSave: async () => false,
		cloudLoad: async () => null,
	};
}
