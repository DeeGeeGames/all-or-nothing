import { useState, useEffect, useCallback, useRef } from 'react';
import {
	Container,
	Box,
	Fab,
	Typography,
	Tabs,
	Tab,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	Paper,
	CircularProgress,
	ToggleButtonGroup,
	ToggleButton,
} from '@mui/material';
import {
	ArrowBack as ArrowBackIcon,
	EmojiEvents as EmojiEventsIcon,
	AccessTime as AccessTimeIcon,
	Whatshot as WhatshotIcon,
} from '@mui/icons-material';
import { useSetActiveScreen, useActiveController } from '@/atoms';
import { Screens } from '@/types';
import { useBackAction } from '@/input/useBackAction';
import { useGamepadManager, useKeyboardManager } from '@/input/input-hooks';
import { InputAction } from '@/input/input-types';
import type { InputEvent } from '@/input/input-types';
import { ButtonPromptsBar } from '@/components/button-prompts';
import { formatDuration } from '@/utils';
import {
	usePlatform,
	LeaderboardName,
	LeaderboardFetchType,
	LeaderboardPeriod,
} from '@/platform';
import type { LeaderboardEntry } from '@/platform';

const metricTabs = [
	{ label: 'Score', icon: <EmojiEventsIcon />, leaderboard: LeaderboardName.Score, valueHeader: 'Score' },
	{ label: 'Time', icon: <AccessTimeIcon />, leaderboard: LeaderboardName.Time, valueHeader: 'Time' },
	{ label: 'Combo', icon: <WhatshotIcon />, leaderboard: LeaderboardName.Combo, valueHeader: 'Max Combo' },
] as const;

const periodOptions = [
	{ label: 'All-Time', value: LeaderboardPeriod.AllTime },
	{ label: 'Monthly', value: LeaderboardPeriod.Monthly },
	{ label: 'Weekly', value: LeaderboardPeriod.Weekly },
] as const;

const metricCycle: Partial<Record<InputAction, 1 | -1>> = {
	[InputAction.SHUFFLE]: 1,
	[InputAction.HINT]: -1,
};

const periodCycle: Partial<Record<InputAction, 1 | -1>> = {
	[InputAction.NAVIGATE_RIGHT]: 1,
	[InputAction.NAVIGATE_LEFT]: -1,
};

const scrollMap: Partial<Record<InputAction, number>> = {
	[InputAction.NAVIGATE_UP]: -250,
	[InputAction.NAVIGATE_DOWN]: 250,
};

function formatValue(value: number, leaderboard: LeaderboardName): string {
	if (leaderboard === LeaderboardName.Time) {
		return formatDuration(value);
	}
	return value.toLocaleString();
}

function cycleIndex(prev: number, direction: number, length: number): number {
	return (prev + direction + length) % length;
}

export default
function LeaderboardScreen() {
	const setActiveScreen = useSetActiveScreen();
	const activeController = useActiveController();
	const contentRef = useRef<HTMLDivElement>(null);
	const { service: platformService } = usePlatform();
	const [metricIndex, setMetricIndex] = useState(0);
	const [periodIndex, setPeriodIndex] = useState(0);
	const [entries, setEntries] = useState<readonly LeaderboardEntry[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [playerName, setPlayerName] = useState<string | null>(null);

	useBackAction(() => setActiveScreen(Screens.Title));

	useEffect(() => {
		platformService.getPlayerName().then(setPlayerName);
	}, [platformService]);

	const inputHandlerRef = useRef<(event: InputEvent) => void>(() => {});
	inputHandlerRef.current = (event: InputEvent) => {
		const metricDir = metricCycle[event.action];
		if (metricDir !== undefined) {
			setMetricIndex(prev => cycleIndex(prev, metricDir, metricTabs.length));
			return;
		}

		const periodDir = periodCycle[event.action];
		if (periodDir !== undefined) {
			setPeriodIndex(prev => cycleIndex(prev, periodDir, periodOptions.length));
			return;
		}

		const scroll = scrollMap[event.action];
		if (scroll !== undefined) {
			contentRef.current?.scrollBy({ top: scroll, behavior: 'smooth' });
		}
	};

	const stableInputHandler = useCallback((event: InputEvent) => {
		inputHandlerRef.current(event);
	}, []);

	useGamepadManager(stableInputHandler);
	useKeyboardManager(stableInputHandler);

	// Safe: indices are always valid within their respective arrays
	const currentMetric = metricTabs[metricIndex] as (typeof metricTabs)[number];
	const currentPeriod = periodOptions[periodIndex] as (typeof periodOptions)[number];

	useEffect(() => {
		let stale = false;
		setLoading(true);
		setError(null);

		platformService.fetchLeaderboard({
			leaderboard: currentMetric.leaderboard,
			fetchType: LeaderboardFetchType.Global,
			period: currentPeriod.value,
			rangeStart: 0,
			rangeEnd: 10,
		})
			.then(result => { if (!stale) setEntries(result); })
			.catch(() => { if (!stale) setError('Failed to load leaderboard data.'); })
			.finally(() => { if (!stale) setLoading(false); });

		return () => { stale = true; };
	}, [platformService, currentMetric, currentPeriod]);

	const handleMetricChange = useCallback((_: React.SyntheticEvent, newValue: number) => {
		setMetricIndex(newValue);
	}, []);

	const handlePeriodChange = useCallback((_: React.MouseEvent<HTMLElement>, value: string | null) => {
		if (value === null) return;
		const idx = periodOptions.findIndex(p => p.value === value);
		if (idx >= 0) setPeriodIndex(idx);
	}, []);

	return (
		<Container sx={{
			height: '100vh',
			display: 'flex',
			flexDirection: 'column',
			position: 'relative',
		}}>
			<Typography variant="h4" paddingTop={2} textAlign="center">
				Leaderboards
			</Typography>

			{activeController ? (
				<Box paddingTop={1} textAlign="center">
					<Typography variant="subtitle1" color="text.secondary">
						{currentMetric.label} — {currentPeriod.label}
					</Typography>
				</Box>
			) : (
				<>
					<Box paddingTop={1}>
						<Tabs
							value={metricIndex}
							onChange={handleMetricChange}
							centered
						>
							{metricTabs.map(({ label, icon }) => (
								<Tab key={label} label={label} icon={icon} iconPosition="start" />
							))}
						</Tabs>
					</Box>
					<Box display="flex" justifyContent="center" paddingTop={1}>
						<ToggleButtonGroup
							value={currentPeriod.value}
							exclusive
							onChange={handlePeriodChange}
							size="small"
						>
							{periodOptions.map(({ label, value }) => (
								<ToggleButton key={value} value={value}>{label}</ToggleButton>
							))}
						</ToggleButtonGroup>
					</Box>
				</>
			)}

			<Box
				ref={contentRef}
				flex={1}
				overflow="auto"
				paddingBottom={2}
				paddingTop={1}
				display="flex"
				justifyContent="center"
			>
				{loading && (
					<Box display="flex" justifyContent="center" alignItems="center" paddingTop={4}>
						<CircularProgress />
					</Box>
				)}
				{error && (
					<Typography color="error" textAlign="center" paddingTop={4}>
						{error}
					</Typography>
				)}
				{!loading && !error && entries.length === 0 && (
					<Typography textAlign="center" paddingTop={4}>
						No entries yet. Be the first!
					</Typography>
				)}
				{!loading && !error && entries.length > 0 && (
					<TableContainer component={Paper} sx={{ maxWidth: 600 }}>
						<Table>
							<TableHead>
								<TableRow>
									<TableCell width={60}>Rank</TableCell>
									<TableCell>Player</TableCell>
									<TableCell align="right">{currentMetric.valueHeader}</TableCell>
								</TableRow>
							</TableHead>
							<TableBody>
								{entries.map((entry) => (
									<TableRow
										key={entry.rank}
										sx={entry.playerName === playerName ? {
											backgroundColor: 'action.selected',
										} : undefined}
									>
										<TableCell width={60}>{entry.rank}</TableCell>
										<TableCell>{entry.playerName}</TableCell>
										<TableCell align="right">
											{formatValue(entry.score, currentMetric.leaderboard)}
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</TableContainer>
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
							{ action: InputAction.HINT, label: 'Prev Metric' },
							{ action: InputAction.SHUFFLE, label: 'Next Metric' },
							{ action: InputAction.NAVIGATE_LEFT, label: 'Prev Period' },
							{ action: InputAction.NAVIGATE_RIGHT, label: 'Next Period' },
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
