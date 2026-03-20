import type { FunctionComponent, SVGProps } from 'react';
import type { BitwiseValue } from '@/types';

export interface MusicTrack {
	readonly src: string;
	readonly volume: number;
}

export interface GameTheme {
	readonly name: string;
	readonly colors: Readonly<Record<BitwiseValue, string>>;
	readonly colorNames: Readonly<Record<BitwiseValue, string>>;
	readonly shapes: Readonly<Record<BitwiseValue, FunctionComponent<SVGProps<SVGSVGElement>>>>;
	readonly shapeNames: Readonly<Record<BitwiseValue, string>>;
	readonly music: readonly MusicTrack[];
	readonly titleMusic: MusicTrack;
	readonly cardBack: string;
	readonly cardFace: string;
	readonly background: {
		readonly body: string;
		readonly gameScreen: string;
	};
}
