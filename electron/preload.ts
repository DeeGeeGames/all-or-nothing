import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
	platform: 'electron' as const,
	quit: (): void => { ipcRenderer.send('app:quit'); },
	steam: {
		init: (): Promise<boolean> => ipcRenderer.invoke('steam:init'),
		submitScore: (data: { score: number; time: number; maxCombo: number }): Promise<boolean> => ipcRenderer.invoke('steam:submitScore', data),
		fetchLeaderboard: (options: { leaderboard: string; fetchType: string; rangeStart: number; rangeEnd: number }): Promise<Array<{ rank: number; playerName: string; score: number }>> => ipcRenderer.invoke('steam:fetchLeaderboard', options),
		getPlayerName: (): Promise<string | null> => ipcRenderer.invoke('steam:getPlayerName'),
		initInput: (): Promise<boolean> => ipcRenderer.invoke('steam:initInput'),
		shutdownInput: (): Promise<void> => ipcRenderer.invoke('steam:shutdownInput'),
		onInputEvent: (callback: (event: { action: string; controllerType: string }) => void): void => {
			ipcRenderer.on('steam:inputEvent', (_event, data) => callback(data));
		},
		offInputEvent: (): void => {
			ipcRenderer.removeAllListeners('steam:inputEvent');
		},
		onGlyphMap: (callback: (data: { glyphs: Record<string, string> | null }) => void): void => {
			ipcRenderer.on('steam:glyphMap', (_event, data) => callback(data));
		},
		offGlyphMap: (): void => {
			ipcRenderer.removeAllListeners('steam:glyphMap');
		},
		cloudSave: (data: string): Promise<boolean> => ipcRenderer.invoke('steam:cloudSave', data),
		cloudLoad: (): Promise<string | null> => ipcRenderer.invoke('steam:cloudLoad'),
	},
});
