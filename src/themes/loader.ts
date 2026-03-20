import type { FunctionComponent, SVGProps } from 'react';
import { createElement } from 'react';
import type { BitwiseValue } from '@/types';
import type { GameTheme, MusicTrack } from './types';
import { defaultTheme } from './default';

interface ThemeSchedule {
	readonly startMonth: number;
	readonly startDay: number;
	readonly endMonth: number;
	readonly endDay: number;
}

interface MusicManifestEntry {
	readonly file: string;
	readonly volume: number;
}

export interface ThemeManifestEntry {
	readonly name: string;
	readonly schedule: ThemeSchedule;
	readonly colors?: Readonly<Record<string, string>>;
	readonly colorNames?: Readonly<Record<string, string>>;
	readonly shapeNames?: Readonly<Record<string, string>>;
	readonly shapes?: Readonly<Record<string, string>>;
	readonly music?: readonly MusicManifestEntry[];
	readonly cardBack?: string;
	readonly cardFace?: string;
	readonly background?: {
		readonly body?: string;
		readonly gameScreen?: string;
	};
}

const bitwiseKeys: readonly BitwiseValue[] = [1, 2, 4];

let manifestCache: readonly ThemeManifestEntry[] | null = null;
const themeCache = new Map<string, GameTheme>();

function createSvgComponent(svgText: string): FunctionComponent<SVGProps<SVGSVGElement>> {
	const innerContent = svgText
		.replace(/<svg[^>]*>/, '')
		.replace(/<\/svg>\s*$/, '')
		.trim();

	return function DynamicSvgShape(props: SVGProps<SVGSVGElement>) {
		return createElement('svg', {
			...props,
			dangerouslySetInnerHTML: { __html: innerContent },
		});
	};
}

export
async function fetchManifest(): Promise<readonly ThemeManifestEntry[]> {
	if (manifestCache) return manifestCache;

	const response = await fetch(`${import.meta.env.BASE_URL}themes/manifest.json`);
	const data: readonly ThemeManifestEntry[] = await response.json();
	manifestCache = data;
	return data;
}

export
async function loadTheme(entry: ThemeManifestEntry): Promise<GameTheme> {
	const cached = themeCache.get(entry.name);
	if (cached) return cached;

	const shapes = entry.shapes
		? await loadShapes(entry.name, entry.shapes)
		: defaultTheme.shapes;

	const basePath = `${import.meta.env.BASE_URL}themes/${entry.name}/`;

	const music: readonly MusicTrack[] = entry.music
		? entry.music.map(track => ({ src: `${basePath}${track.file}`, volume: track.volume }))
		: defaultTheme.music;

	const cardBack = entry.cardBack
		? await loadSvgBackground(entry.name, entry.cardBack)
		: defaultTheme.cardBack;

	const cardFace = entry.cardFace
		? await loadSvgBackground(entry.name, entry.cardFace)
		: defaultTheme.cardFace;

	const mergeBitwiseRecord = (
		source: Readonly<Record<string, string>> | undefined,
		fallback: Readonly<Record<BitwiseValue, string>>,
	): Record<BitwiseValue, string> =>
		Object.fromEntries(
			bitwiseKeys.map(key => [key, source?.[String(key)] ?? fallback[key]]),
		) as Record<BitwiseValue, string>;

	const theme: GameTheme = {
		name: entry.name,
		colors: mergeBitwiseRecord(entry.colors, defaultTheme.colors),
		colorNames: mergeBitwiseRecord(entry.colorNames, defaultTheme.colorNames),
		shapes,
		shapeNames: mergeBitwiseRecord(entry.shapeNames, defaultTheme.shapeNames),
		music,
		titleMusic: defaultTheme.titleMusic,
		cardBack,
		cardFace,
		background: {
			body: entry.background?.body ?? defaultTheme.background.body,
			gameScreen: entry.background?.gameScreen ?? defaultTheme.background.gameScreen,
		},
	};

	themeCache.set(entry.name, theme);
	return theme;
}

async function loadShapes(
	themeName: string,
	shapeEntries: Readonly<Record<string, string>>,
): Promise<Readonly<Record<BitwiseValue, FunctionComponent<SVGProps<SVGSVGElement>>>>> {
	const basePath = `${import.meta.env.BASE_URL}themes/${themeName}/`;

	const resolved = await Promise.all(
		bitwiseKeys.map(async (key): Promise<[BitwiseValue, FunctionComponent<SVGProps<SVGSVGElement>>]> => {
			const filename = shapeEntries[String(key)];

			if (!filename) return [key, defaultTheme.shapes[key]];

			const svgText = await fetch(`${basePath}${filename}`).then(r => r.text());
			return [key, createSvgComponent(svgText)];
		}),
	);

	return Object.fromEntries(resolved) as Record<BitwiseValue, FunctionComponent<SVGProps<SVGSVGElement>>>;
}

async function loadSvgBackground(themeName: string, filename: string): Promise<string> {
	const basePath = `${import.meta.env.BASE_URL}themes/${themeName}/`;
	const svgText = await fetch(`${basePath}${filename}`).then(r => r.text());
	return `url("data:image/svg+xml;base64,${btoa(svgText)}") center / cover no-repeat`;
}

export
function getScheduledEntry(manifest: readonly ThemeManifestEntry[], date: Date = new Date()): ThemeManifestEntry | undefined {
	const month = date.getMonth() + 1;
	const day = date.getDate();

	return manifest.find(entry => {
		const { startMonth, startDay, endMonth, endDay } = entry.schedule;

		if (startMonth <= endMonth) {
			if (month < startMonth || month > endMonth) return false;
			if (month === startMonth && day < startDay) return false;
			if (month === endMonth && day > endDay) return false;
			return true;
		}

		// Year-boundary range (e.g., Dec 20 – Jan 5)
		if (month > startMonth || (month === startMonth && day >= startDay)) return true;
		if (month < endMonth || (month === endMonth && day <= endDay)) return true;
		return false;
	});
}
