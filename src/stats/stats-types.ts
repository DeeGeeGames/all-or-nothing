export interface PersonalBests {
	readonly bestScore: number;
	readonly bestTime: number;
	readonly bestMaxCombo: number;
	readonly bestFastestMatch: number;
}

export interface AggregateStats {
	readonly totalGamesPlayed: number;
	readonly totalSetsFound: number;
	readonly perfectClearRate: number;
	readonly accuracy: number;
	readonly meanScore: number;
	readonly meanTime: number;
	readonly averageMatchSpeed: number;
}

export interface ChartDataPoint {
	readonly gameNumber: number;
	readonly date: number;
	readonly score: number;
	readonly time: number;
	readonly avgMatchTime: number;
	readonly fastestMatch: number;
	readonly accuracy: number;
	readonly scoreAvg: number | null;
	readonly timeAvg: number | null;
	readonly avgMatchTimeAvg: number | null;
	readonly fastestMatchAvg: number | null;
	readonly accuracyAvg: number | null;
}
