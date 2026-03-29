import { useState, useCallback, useRef, useMemo } from 'react';
import {
	Container,
	Box,
	Fab,
	Typography,
	Paper,
	ToggleButtonGroup,
	ToggleButton,
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
import { InputAction } from '@/input/input-types';
import { ButtonPromptsBar } from '@/components/button-prompts';
import { useGameHistory, usePersonalBests, useAggregateStats, useChartData } from '@/stats/stats-queries';
import type { ChartDataPoint } from '@/stats/stats-types';
import { formatDuration } from '@/stats/stats-utils';

type RangeFilter = 'last10' | 'last25' | 'all';

const rangeFilterLimits: Record<RangeFilter, number | null> = {
	last10: 10,
	last25: 25,
	all: null,
};

function applyRangeFilter(data: readonly ChartDataPoint[], filter: RangeFilter): readonly ChartDataPoint[] {
	const limit = rangeFilterLimits[filter];
	if (limit === null || data.length <= limit) return data;
	return data.slice(data.length - limit);
}

function StatCard({ label, value, icon }: {
	readonly label: string;
	readonly value: string;
	readonly icon: React.ReactNode;
}) {
	return (
		<Paper
			sx={{
				p: 2,
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
				<Typography variant="h6" sx={{ fontVariantNumeric: 'tabular-nums' }}>{value}</Typography>
			</Box>
		</Paper>
	);
}

function StatsChart({ title, data, dataKey, avgKey, color, formatValue }: {
	readonly title: string;
	readonly data: readonly ChartDataPoint[];
	readonly dataKey: keyof ChartDataPoint;
	readonly avgKey: keyof ChartDataPoint;
	readonly color: string;
	readonly formatValue?: (value: number) => string;
}) {
	const showDots = data.length <= 20;
	const formatter = formatValue ?? ((v: number) => v.toLocaleString());

	return (
		<Paper sx={{ p: 2, mb: 2 }}>
			<Typography variant="h6" gutterBottom>{title}</Typography>
			<ResponsiveContainer width="100%" height={250}>
				<LineChart data={data as ChartDataPoint[]}>
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
	const [rangeFilter, setRangeFilter] = useState<RangeFilter>('all');

	useScrollable({ ref: contentRef });
	useBackAction(() => setActiveScreen(Screens.Title));

	const history = useGameHistory();
	const personalBests = usePersonalBests(history);
	const aggregateStats = useAggregateStats(history);
	const allChartData = useChartData(history);

	const chartData = useMemo(
		() => allChartData ? applyRangeFilter(allChartData, rangeFilter) : undefined,
		[allChartData, rangeFilter],
	);

	const handleRangeChange = useCallback((_: React.MouseEvent<HTMLElement>, value: RangeFilter | null) => {
		if (value !== null) setRangeFilter(value);
	}, []);

	const hasGames = history !== undefined && history.length > 0;
	const hasChartData = chartData !== undefined && chartData.length >= 2;

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
				paddingBottom={2}
				paddingTop={2}
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
							/>
							<StatCard
								label="Best Time"
								value={formatDuration(personalBests.bestTime)}
								icon={<AccessTimeIcon />}
							/>
							<StatCard
								label="Best Combo"
								value={`${personalBests.bestMaxCombo}x`}
								icon={<WhatshotIcon />}
							/>
							<StatCard
								label="Fastest Match"
								value={personalBests.bestFastestMatch > 0 ? formatDuration(personalBests.bestFastestMatch) : '-'}
								icon={<SpeedIcon />}
							/>
						</Box>

						<Typography variant="overline" gutterBottom>Aggregates</Typography>
						<Box display="flex" flexWrap="wrap" gap={1} mb={3}>
							<StatCard
								label="Games Played"
								value={aggregateStats.totalGamesPlayed.toLocaleString()}
								icon={<SportsScoreIcon />}
							/>
							<StatCard
								label="Sets Found"
								value={aggregateStats.totalSetsFound.toLocaleString()}
								icon={<FunctionsIcon />}
							/>
							<StatCard
								label="Perfect Clear %"
								value={`${aggregateStats.perfectClearRate.toFixed(1)}%`}
								icon={<PercentIcon />}
							/>
							<StatCard
								label="Accuracy"
								value={`${aggregateStats.accuracy.toFixed(1)}%`}
								icon={<PercentIcon />}
							/>
							<StatCard
								label="Mean Score"
								value={Math.round(aggregateStats.meanScore).toLocaleString()}
								icon={<EmojiEventsIcon />}
							/>
							<StatCard
								label="Mean Time"
								value={formatDuration(aggregateStats.meanTime)}
								icon={<AccessTimeIcon />}
							/>
							<StatCard
								label="Avg Match Speed"
								value={formatDuration(aggregateStats.averageMatchSpeed)}
								icon={<SpeedIcon />}
							/>
						</Box>

						{!hasChartData && (
							<Typography textAlign="center" paddingTop={2} color="text.secondary">
								Play more games to see trends.
							</Typography>
						)}

						{hasChartData && chartData && (
							<>
								<Box display="flex" justifyContent="center" mb={2}>
									<ToggleButtonGroup
										value={rangeFilter}
										exclusive
										onChange={handleRangeChange}
										size="small"
									>
										<ToggleButton value="last10">Last 10</ToggleButton>
										<ToggleButton value="last25">Last 25</ToggleButton>
										<ToggleButton value="all">All</ToggleButton>
									</ToggleButtonGroup>
								</Box>

								<StatsChart
									title="Score"
									data={chartData}
									dataKey="score"
									avgKey="scoreAvg"
									color={theme.palette.primary.main}
								/>
								<StatsChart
									title="Completion Time"
									data={chartData}
									dataKey="time"
									avgKey="timeAvg"
									color={theme.palette.secondary.main}
									formatValue={formatDuration}
								/>
								<StatsChart
									title="Avg Match Time"
									data={chartData}
									dataKey="avgMatchTime"
									avgKey="avgMatchTimeAvg"
									color={theme.palette.success.main}
									formatValue={formatDuration}
								/>
								<StatsChart
									title="Fastest Match"
									data={chartData}
									dataKey="fastestMatch"
									avgKey="fastestMatchAvg"
									color={theme.palette.warning.main}
									formatValue={formatDuration}
								/>
								<StatsChart
									title="Accuracy"
									data={chartData}
									dataKey="accuracy"
									avgKey="accuracyAvg"
									color={theme.palette.info.main}
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
