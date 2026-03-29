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
} from '@mui/material';
import {
	ArrowBack as ArrowBackIcon,
	EmojiEvents as EmojiEventsIcon,
	AccessTime as AccessTimeIcon,
	Whatshot as WhatshotIcon,
} from '@mui/icons-material';
import { useSetActiveScreen, useActiveController } from '@/atoms';
import { Screens } from '@/types';
import { useScrollable } from '@/focus/useScrollable';
import { useBackAction } from '@/input/useBackAction';
import { InputAction } from '@/input/input-types';
import { ButtonPromptsBar } from '@/components/button-prompts';
import { formatDuration } from '@/utils';
import {
	usePlatform,
	LeaderboardName,
	LeaderboardFetchType,
} from '@/platform';
import type { LeaderboardEntry } from '@/platform';

const tabConfig = [
	{ label: 'Score', icon: <EmojiEventsIcon />, leaderboard: LeaderboardName.Score, valueHeader: 'Score' },
	{ label: 'Time', icon: <AccessTimeIcon />, leaderboard: LeaderboardName.Time, valueHeader: 'Time' },
	{ label: 'Combo', icon: <WhatshotIcon />, leaderboard: LeaderboardName.Combo, valueHeader: 'Max Combo' },
] as const;

function formatValue(value: number, leaderboard: LeaderboardName): string {
	if (leaderboard === LeaderboardName.Time) {
		return formatDuration(value);
	}
	return value.toLocaleString();
}

export default
function LeaderboardScreen() {
	const setActiveScreen = useSetActiveScreen();
	const activeController = useActiveController();
	const contentRef = useRef<HTMLDivElement>(null);
	const { service: platformService } = usePlatform();
	const [activeTab, setActiveTab] = useState(0);
	const [entries, setEntries] = useState<readonly LeaderboardEntry[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [playerName, setPlayerName] = useState<string | null>(null);

	useScrollable({ ref: contentRef });
	useBackAction(() => setActiveScreen(Screens.Title));

	useEffect(() => {
		platformService.getPlayerName().then(setPlayerName);
	}, [platformService]);

	const currentTab = tabConfig[activeTab];

	const fetchData = useCallback(async () => {
		if (!currentTab) return;

		setLoading(true);
		setError(null);

		try {
			const result = await platformService.fetchLeaderboard({
				leaderboard: currentTab.leaderboard,
				fetchType: LeaderboardFetchType.Global,
				rangeStart: 0,
				rangeEnd: 10,
			});
			setEntries(result);
		} catch {
			setError('Failed to load leaderboard data.');
		} finally {
			setLoading(false);
		}
	}, [platformService, currentTab]);

	useEffect(() => {
		void fetchData();
	}, [fetchData]);

	const handleTabChange = useCallback((_: React.SyntheticEvent, newValue: number) => {
		setActiveTab(newValue);
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
			<Box paddingTop={1}>
				<Tabs
					value={activeTab}
					onChange={handleTabChange}
					centered
				>
					{tabConfig.map(({ label, icon }) => (
						<Tab key={label} label={label} icon={icon} iconPosition="start" />
					))}
				</Tabs>
			</Box>
			<Box
				ref={contentRef}
				flex={1}
				overflow="auto"
				paddingBottom={2}
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
				{!loading && !error && entries.length > 0 && currentTab && (
					<TableContainer component={Paper} sx={{ maxWidth: 600 }}>
						<Table>
							<TableHead>
								<TableRow>
									<TableCell width={60}>Rank</TableCell>
									<TableCell>Player</TableCell>
									<TableCell align="right">{currentTab.valueHeader}</TableCell>
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
											{formatValue(entry.score, currentTab.leaderboard)}
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
