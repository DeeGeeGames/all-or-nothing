import { useState, useRef, useMemo, useCallback } from 'react';
import {
	Container,
	Box,
	Fab,
	Typography,
	Paper,
	ToggleButtonGroup,
	ToggleButton,
	useMediaQuery,
} from '@mui/material';
import {
	ArrowBack as ArrowBackIcon,
	EmojiEvents as EmojiEventsIcon,
	AccessTime as AccessTimeIcon,
	Whatshot as WhatshotIcon,
	Speed as SpeedIcon,
	SportsScore as SportsScoreIcon,
	Functions as FunctionsIcon,
	Percent as PercentIcon,
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import {
	ResponsiveContainer,
	LineChart,
	Line,
	XAxis,
	YAxis,
	Tooltip,
	CartesianGrid,
} from 'recharts';
import { useSetActiveScreen, useActiveController } from '@/atoms';
import { Screens } from '@/types';
import { useScrollable } from '@/focus/useScrollable';
import { useBackAction } from '@/input/useBackAction';
import { useGamepadManager, useKeyboardManager } from '@/input/input-hooks';
import { InputAction } from '@/input/input-types';
import type { InputEvent } from '@/input/input-types';
import { ButtonPromptsBar } from '@/components/button-prompts';
import { useGameHistory, usePersonalBests, useAggregateStats, useChartData } from '@/stats/stats-queries';
import type { ChartDataPoint } from '@/stats/stats-types';
import { formatDuration } from '@/stats/stats-utils';

const rangeFilters = ['last10', 'last25', 'all'] as const;
type RangeFilter = typeof rangeFilters[number];

const rangeFilterLimits: Record<RangeFilter, number | null> = {
	last10: 10,
	last25: 25,
	all: null,
};

const rangeFilterLabels: Record<RangeFilter, string> = {
	last10: 'Last 10',
	last25: 'Last 25',
	all: 'All',
};

const filterCycleDirection: Partial<Record<InputAction, 1 | -1>> = {
	[InputAction.SHUFFLE]: 1,
	[InputAction.HINT]: -1,
};

function applyRangeFilter(data: readonly ChartDataPoint[], filter: RangeFilter): readonly ChartDataPoint[] {
	const limit = rangeFilterLimits[filter];
	if (limit === null || data.length <= limit) return data;
	return data.slice(data.length - limit);
}

function StatCard({ label, value, icon, compact }: {
	readonly label: string;
	readonly value: string;
	readonly icon: React.ReactNode;
	readonly compact?: boolean;
}) {
	return (
		<Paper
			sx={{
				p: compact ? 1.5 : 2,
				display: 'flex',
				alignItems: 'center',
				gap: 1.5,
				flex: '1 1 auto',
				minWidth: { xs: 'calc(50% - 8px)', sm: 'auto' },
			}}
		>
			<Box sx={{ color: 'text.secondary', display: 'flex' }}>{icon}</Box>
			<Box>
				<Typography variant="caption" color="text.secondary">{label}</Typography>
				<Typography
					variant={compact ? 'body1' : 'h6'}
					sx={{ fontVariantNumeric: 'tabular-nums', fontWeight: compact ? 600 : undefined }}
				>
					{value}
				</Typography>
			</Box>
		</Paper>
	);
}

function StatsChart({ title, data, dataKey, avgKey, color, height, formatValue }: {
	readonly title: string;
	readonly data: readonly ChartDataPoint[];
	readonly dataKey: keyof ChartDataPoint;
	readonly avgKey: keyof ChartDataPoint;
	readonly color: string;
	readonly height: number;
	readonly formatValue?: (value: number) => string;
}) {
	const showDots = data.length <= 20;
	const formatter = formatValue ?? ((v: number) => v.toLocaleString());

	return (
		<Paper sx={{ p: 2, mb: 2 }}>
			<Typography variant="h6" gutterBottom>{title}</Typography>
			<ResponsiveContainer width="100%" height={height}>
				<LineChart data={data}>
					<CartesianGrid strokeDasharray="3 3" opacity={0.3} />
					<XAxis dataKey="gameNumber" />
					<YAxis tickFormatter={(v: number) => formatter(v)} />
					<Tooltip
						labelFormatter={(gameNum) => {
							const point = data[Number(gameNum) - 1];
							return point ? new Date(point.date).toLocaleDateString() : '';
						}}
						formatter={(value) => [formatter(Number(value))]}
					/>
					<Line
						type="monotone"
						dataKey={dataKey}
						stroke={color}
						dot={showDots}
						strokeWidth={2}
					/>
					<Line
						type="monotone"
						dataKey={avgKey}
						stroke={color}
						dot={false}
						strokeWidth={2}
						strokeDasharray="5 5"
						opacity={0.6}
						connectNulls={false}
					/>
				</LineChart>
			</ResponsiveContainer>
		</Paper>
	);
}

export default
function StatsScreen() {
	const setActiveScreen = useSetActiveScreen();
	const activeController = useActiveController();
	const contentRef = useRef<HTMLDivElement>(null);
	const theme = useTheme();
	const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
	const [rangeFilter, setRangeFilter] = useState<RangeFilter>('all');

	useScrollable({ ref: contentRef });
	useBackAction(() => setActiveScreen(Screens.Title));

	const inputHandlerRef = useRef<(event: InputEvent) => void>(() => {});
	inputHandlerRef.current = (event: InputEvent) => {
		const direction = filterCycleDirection[event.action];
		if (direction === undefined) return;

		setRangeFilter(prev => {
			const idx = rangeFilters.indexOf(prev);
			return rangeFilters[(idx + direction + rangeFilters.length) % rangeFilters.length] ?? 'all';
		});
	};

	const stableInputHandler = useCallback((event: InputEvent) => {
		inputHandlerRef.current(event);
	}, []);

	useGamepadManager(stableInputHandler);
	useKeyboardManager(stableInputHandler);

	const history = useGameHistory();
	const personalBests = usePersonalBests(history);
	const aggregateStats = useAggregateStats(history);
	const allChartData = useChartData(history);

	const chartData = useMemo(
		() => allChartData ? applyRangeFilter(allChartData, rangeFilter) : [],
		[allChartData, rangeFilter],
	);

	function handleRangeChange(_: React.MouseEvent<HTMLElement>, value: RangeFilter | null) {
		if (value !== null) setRangeFilter(value);
	}

	const hasGames = history !== undefined && history.length > 0;
	const hasChartData = chartData.length >= 2;
	const chartHeight = isMobile ? 200 : 250;

	return (
		<Container sx={{
			height: '100vh',
			display: 'flex',
			flexDirection: 'column',
			position: 'relative',
		}}>
			<Typography variant="h4" paddingTop={2} textAlign="center">
				Stats
			</Typography>
			<Box
				ref={contentRef}
				flex={1}
				overflow="auto"
				paddingTop={2}
				sx={{
					paddingBottom: { xs: 10, sm: 2 },
				}}
			>
				{!hasGames && (
					<Typography textAlign="center" paddingTop={4} color="text.secondary">
						No games completed yet. Play a game to see your stats!
					</Typography>
				)}
				{hasGames && personalBests && aggregateStats && (
					<>
						<Typography variant="overline" gutterBottom>Personal Bests</Typography>
						<Box display="flex" flexWrap="wrap" gap={1} mb={3}>
							<StatCard
								label="Best Score"
								value={personalBests.bestScore.toLocaleString()}
								icon={<EmojiEventsIcon />}
								compact={isMobile}
							/>
							<StatCard
								label="Best Time"
								value={formatDuration(personalBests.bestTime)}
								icon={<AccessTimeIcon />}
								compact={isMobile}
							/>
							<StatCard
								label="Best Combo"
								value={`${personalBests.bestMaxCombo}x`}
								icon={<WhatshotIcon />}
								compact={isMobile}
							/>
							<StatCard
								label="Fastest Match"
								value={personalBests.bestFastestMatch > 0 ? formatDuration(personalBests.bestFastestMatch) : '-'}
								icon={<SpeedIcon />}
								compact={isMobile}
							/>
						</Box>

						<Typography variant="overline" gutterBottom>Aggregates</Typography>
						<Box display="flex" flexWrap="wrap" gap={1} mb={3}>
							<StatCard
								label="Games Played"
								value={aggregateStats.totalGamesPlayed.toLocaleString()}
								icon={<SportsScoreIcon />}
								compact={isMobile}
							/>
							<StatCard
								label="Sets Found"
								value={aggregateStats.totalSetsFound.toLocaleString()}
								icon={<FunctionsIcon />}
								compact={isMobile}
							/>
							<StatCard
								label="Perfect Clear %"
								value={`${aggregateStats.perfectClearRate.toFixed(1)}%`}
								icon={<PercentIcon />}
								compact={isMobile}
							/>
							<StatCard
								label="Accuracy"
								value={`${aggregateStats.accuracy.toFixed(1)}%`}
								icon={<PercentIcon />}
								compact={isMobile}
							/>
							<StatCard
								label="Mean Score"
								value={Math.round(aggregateStats.meanScore).toLocaleString()}
								icon={<EmojiEventsIcon />}
								compact={isMobile}
							/>
							<StatCard
								label="Mean Time"
								value={formatDuration(aggregateStats.meanTime)}
								icon={<AccessTimeIcon />}
								compact={isMobile}
							/>
							<StatCard
								label="Avg Match Speed"
								value={formatDuration(aggregateStats.meanMatchSpeed)}
								icon={<SpeedIcon />}
								compact={isMobile}
							/>
						</Box>

						{!hasChartData && (
							<Typography textAlign="center" paddingTop={2} color="text.secondary">
								Play more games to see trends.
							</Typography>
						)}

						{hasChartData && (
							<>
								{activeController ? (
									<Typography textAlign="center" mb={2} color="text.secondary">
										Showing: {rangeFilterLabels[rangeFilter]}
									</Typography>
								) : (
									<Box display="flex" justifyContent="center" mb={2}>
										<ToggleButtonGroup
											value={rangeFilter}
											exclusive
											onChange={handleRangeChange}
											size="small"
											fullWidth={isMobile}
										>
											<ToggleButton value="last10">Last 10</ToggleButton>
											<ToggleButton value="last25">Last 25</ToggleButton>
											<ToggleButton value="all">All</ToggleButton>
										</ToggleButtonGroup>
									</Box>
								)}

								<StatsChart
									title="Score"
									data={chartData}
									dataKey="score"
									avgKey="scoreAvg"
									color={theme.palette.primary.main}
									height={chartHeight}
								/>
								<StatsChart
									title="Completion Time"
									data={chartData}
									dataKey="time"
									avgKey="timeAvg"
									color={theme.palette.secondary.main}
									height={chartHeight}
									formatValue={formatDuration}
								/>
								<StatsChart
									title="Avg Match Time"
									data={chartData}
									dataKey="avgMatchTime"
									avgKey="avgMatchTimeAvg"
									color={theme.palette.success.main}
									height={chartHeight}
									formatValue={formatDuration}
								/>
								<StatsChart
									title="Fastest Match"
									data={chartData}
									dataKey="fastestMatch"
									avgKey="fastestMatchAvg"
									color={theme.palette.warning.main}
									height={chartHeight}
									formatValue={formatDuration}
								/>
								<StatsChart
									title="Accuracy"
									data={chartData}
									dataKey="accuracy"
									avgKey="accuracyAvg"
									color={theme.palette.info.main}
									height={chartHeight}
									formatValue={(v) => `${v.toFixed(1)}%`}
								/>
							</>
						)}
					</>
				)}
			</Box>
			{activeController && (
				<Box
					sx={{
						position: 'fixed',
						bottom: 16,
						left: 16,
					}}
				>
					<ButtonPromptsBar
						controllerType={activeController}
						prompts={[
							{ action: InputAction.HINT, label: 'Prev Filter' },
							{ action: InputAction.SHUFFLE, label: 'Next Filter' },
							{ action: InputAction.BACK, label: 'Back' },
						]}
					/>
				</Box>
			)}
			{!activeController && (
				<Fab
					color="primary"
					aria-label="back"
					onClick={() => setActiveScreen(Screens.Title)}
					sx={{
						position: 'fixed',
						bottom: 16,
						right: 16,
					}}
				>
					<ArrowBackIcon />
				</Fab>
			)}
		</Container>
	);
}
