import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
	platform: 'electron' as const,
	quit: (): void => { ipcRenderer.send('app:quit'); },
	steam: {
		init: (): Promise<boolean> => ipcRenderer.invoke('steam:init'),
		submitScore: (data: { score: number; time: number; maxCombo: number }): Promise<boolean> => ipcRenderer.invoke('steam:submitScore', data),
		fetchLeaderboard: (options: { leaderboard: string; fetchType: string; rangeStart: number; rangeEnd: number }): Promise<Array<{ rank: number; playerName: string; score: number }>> => ipcRenderer.invoke('steam:fetchLeaderboard', options),
		getPlayerName: (): Promise<string | null> => ipcRenderer.invoke('steam:getPlayerName'),
	},
});
