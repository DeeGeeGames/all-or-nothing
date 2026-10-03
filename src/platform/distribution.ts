export type Distribution = 'web' | 'standalone' | 'steam';

export function getDesktopDistribution(steamAppId: string | undefined, hasSteamMarker: boolean, expectedAppId: number): 'steam' | 'standalone' {
	return hasSteamMarker || steamAppId === String(expectedAppId) ? 'steam' : 'standalone';
}

interface DistributionBridge {
	readonly getDistribution: () => Promise<unknown>;
}

export async function resolveDistribution(bridge?: DistributionBridge): Promise<Distribution | null> {
	if (!bridge) return 'web';
	try {
		const distribution = await bridge.getDistribution();
		return distribution === 'standalone' || distribution === 'steam' ? distribution : null;
	} catch {
		return null;
	}
}

export function shouldShowSteamPromotion(distribution: Distribution | null): boolean {
	return distribution === 'web' || distribution === 'standalone';
}
