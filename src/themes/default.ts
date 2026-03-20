import type { GameTheme } from './types';
import TriangleSvg from '@/components/playing-card/assets/shapes/default/triangle.svg?react';
import CircleSvg from '@/components/playing-card/assets/shapes/default/circle.svg?react';
import SquareSvg from '@/components/playing-card/assets/shapes/default/square.svg?react';
import song1 from '@/components/music-toggle/Little Prelude and Fugue - Sir Cubworth.mp3';
import song2 from '@/components/music-toggle/No.9_Esther\'s Waltz - Esther Abrami.mp3';
import song3 from '@/components/music-toggle/Sonatina No 2 in F Major Allegro - Joel Cummins.mp3';
import song4 from '@/components/music-toggle/Theme for a One-Handed Piano Concerto - Sir Cubworth.mp3';
import titleSong from '@/components/music-toggle/Baroque Coffee House - Doug Maxwell_Media Right Productions.mp3';

export const defaultTheme: GameTheme = {
	name: 'default',
	colors: {
		1: '#C92020',
		2: '#17B321',
		4: '#8A00A6',
	},
	colorNames: {
		1: 'Red',
		2: 'Green',
		4: 'Purple',
	},
	shapes: {
		1: TriangleSvg,
		2: CircleSvg,
		4: SquareSvg,
	},
	shapeNames: {
		1: 'Triangle',
		2: 'Circle',
		4: 'Square',
	},
	music: [
		{ src: song1, volume: 0.3 },
		{ src: song2, volume: 0.2 },
		{ src: song3, volume: 0.1 },
		{ src: song4, volume: 0.2 },
	],
	titleMusic: { src: titleSong, volume: 0.2 },
	cardBack: 'repeating-linear-gradient(45deg, #606dbc, #606dbc 10px, #465298 10px, #465298 20px)',
	cardFace: 'white',
	background: {
		body: 'linear-gradient(135deg, #d8d8d8 0%, #c0c0c0 100%)',
		gameScreen: 'radial-gradient(ellipse at center, #c8d5c8 0%, #a8b8a8 100%)',
	},
};
