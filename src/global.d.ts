/// <reference types="vite/client" />

interface ImportMetaEnv {
	readonly BASE_URL: string;
	readonly DEV: boolean;
	readonly MODE: string;
	readonly PROD: boolean;
	readonly PUBLIC_DIR?: string;
	readonly SSR: boolean;
	readonly VITE_AD_CONTENT_URL: string;
	readonly VITE_CHEAT?: string;
	readonly VITE_MOCK_PLATFORM?: string;
	readonly VITE_GOOGLE_ANALYTICS_ID: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}

declare module 'virtual:pwa-register' {
	import type { RegisterSWOptions } from 'vite-plugin-pwa/types'

	export type { RegisterSWOptions }

	export function registerSW(options?: RegisterSWOptions): (reloadPage?: boolean) => Promise<void>
}

declare module '*.svg?react' {
	import type { FunctionComponent, SVGProps } from 'react';
	const content: FunctionComponent<SVGProps<SVGSVGElement>>;
	export default content;
}

declare const __APP_VERSION__: string;

interface ElectronSteamAPI {
	init(): Promise<boolean>;
	submitScore(data: { score: number; time: number; maxCombo: number }): Promise<boolean>;
	fetchLeaderboard(options: { leaderboard: string; fetchType: string; rangeStart: number; rangeEnd: number }): Promise<ReadonlyArray<{ rank: number; playerName: string; score: number }>>;
	getPlayerName(): Promise<string | null>;
}

interface ElectronAPI {
	readonly platform: 'electron';
	readonly quit: () => void;
	readonly steam: ElectronSteamAPI;
}

interface Window {
	electronAPI?: ElectronAPI;
	forcePlatform?: (platform?: string) => void;
	setTheme?: (name?: string) => void;
}
