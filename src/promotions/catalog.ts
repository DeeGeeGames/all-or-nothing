export interface GameListing {
	readonly id: string;
	readonly title: string;
	readonly description: string;
	readonly steamAppId: number;
	readonly artwork: string;
	readonly webUrl?: string;
}

export const steamEdition: GameListing = {
	id: 'all-or-nothing',
	title: 'All or Nothing',
	description: 'Minimalist logic, pattern matching card game.',
	steamAppId: 4537590,
	artwork: 'assets/promotions/all-or-nothing.svg',
	webUrl: 'https://allornothing.app/',
} as const;

// Add Math Marsh here when its store listing is ready.
export const games: readonly GameListing[] = [steamEdition];

export function getSteamStoreUrl(game: GameListing): string {
	return `https://store.steampowered.com/app/${game.steamAppId}/`;
}

export function findGame(id: unknown): GameListing | undefined {
	return games.find(function (game) { return game.id === id; });
}

export function getGameDestination(game: GameListing, distribution: 'web' | 'standalone' | 'steam' | null) {
	if (distribution === 'steam' && game.id === steamEdition.id && game.webUrl) {
		return { kind: 'web', url: game.webUrl, label: 'Play free on web', caption: 'ALSO AVAILABLE FREE ON WEB' } as const;
	}
	return { kind: 'steam', url: getSteamStoreUrl(game), label: 'View on Steam', caption: 'AVAILABLE ON STEAM' } as const;
}
