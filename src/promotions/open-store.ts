import { findGame, getSteamStoreUrl } from './catalog';

export async function openGameStore(id: string, inBrowser = false): Promise<boolean> {
	const game = findGame(id);
	if (!game) return false;
	try {
		if (window.electronAPI) return await window.electronAPI.openGameStore(id, inBrowser);
		window.open(getSteamStoreUrl(game), '_blank', 'noopener,noreferrer');
		return true;
	} catch {
		return false;
	}
}
