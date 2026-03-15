export
type Enum<T extends object> = T[keyof T];

export
type AsyncReturnType<T extends (...args: any) => any> =
	// if T matches this signature and returns a Promise, extract
	// U (the type of the resolved promise) and use that, or...
	T extends (...args: any) => Promise<infer U> ? U :
	// if T matches this signature and returns anything else,
	// extract the return value U and use that, or...
	T extends (...args: any) => infer U ? U :
	// if everything goes to hell, return an `any`
	any;

export
type BitwiseValue = Enum<typeof BitwiseValues>;

export
const Screens = {
	Splash: 'splash',
	Title: 'title',
	Game: 'game',
	About: 'about',
	Help: 'help',
	Leaderboard: 'leaderboard',
	Tutorial: 'tutorial',
	Lobby: 'lobby',
	Multiplayer: 'multiplayer',
	Daily: 'daily',
} as const;

export
type Screens = Enum<typeof Screens>;

export
interface SetOrders {
	name: string;
	order: string[];
}

export
const BitwiseValues = {
	One: 1,
	Two: 2,
	Three: 4,
} as const;

export
const Shapes = {
	Triangle: BitwiseValues.One,
	Circle: BitwiseValues.Two,
	Square: BitwiseValues.Three,
} as const;

export
const Colors = {
	Red: BitwiseValues.One,
	Green: BitwiseValues.Two,
	Blue: BitwiseValues.Three,
} as const;

export
const Fills = {
	Outline: BitwiseValues.One,
	Solid: BitwiseValues.Two,
	Filled: BitwiseValues.Three,
} as const;

export
const FillValues = {
	[Fills.Outline]: 'outline',
	[Fills.Solid]: 'solid',
	[Fills.Filled]: 'filled',
} as const;

export
const Counts = {
	One: BitwiseValues.One,
	Two: BitwiseValues.Two,
	Three: BitwiseValues.Three,
} as const;

export
const CountValues = {
	[Counts.One]: 1,
	[Counts.Two]: 2,
	[Counts.Three]: 3,
} as const;

export
interface Card {
	id?: string;
	shape: Enum<typeof Shapes>;
	color: Enum<typeof Colors>;
	fill: Enum<typeof Fills>;
	count: Enum<typeof Counts>;
}

export
interface ScorePopup {
	id: string;
	points: number;
	comboCount: number;
	variant: 'reward' | 'penalty';
	color?: string;
	mismatchedAttributes?: string[];
}

export
function createScorePopup(
	variant: 'reward' | 'penalty',
	points: number,
	comboCount = 0,
	color?: string,
	mismatchedAttributes?: string[],
): ScorePopup {
	return {
		id: crypto.randomUUID(),
		points,
		comboCount,
		variant,
		color,
		mismatchedAttributes,
	};
}
