import { useState, useCallback, useEffect, useRef } from 'react';
import { Card, Screens } from '@/types';
import { isSet, setExists } from '@/core';
import { generateDailyBoard } from '@/daily/daily-board';
import { getPacificDate, formatPacificDate } from '@/daily/pacific-date';
import {
	formatDate,
	getDailyStreakData,
	isDailyCompletedOn,
	recordDailyCompletion,
} from '@/daily/daily-streaks';
import { saveDailyBoardState, loadDailyBoardState, clearDailyBoardState } from '@/daily/daily-board-state';
import {
	applyDailyCardPick,
	remainingUnflippedCards,
	shouldRecordDailyCompletion,
} from '@/daily/daily-completion';
import { useSetActiveScreen, useActiveController } from '@/atoms';
import { useSoundEffects } from '@/hooks';
import { useSetActiveGroup } from '@/focus/focus-atoms';
import { useBackAction } from '@/input/useBackAction';
import { getGamepadManager } from '@/input/gamepad-manager';
import { getKeyboardManager } from '@/input/keyboard-manager';
import { InputAction, InputEvent } from '@/input/input-types';
import PlatformButton from '@/components/platform-button';
import FixedBottomLeftContainer from '@/components/fixed-bottom-left-container';
import DailyCardArea from './daily-card-area';
import {
	Shuffle as ShuffleIcon,
	Replay as ReplayIcon,
	ArrowBack as ArrowBackIcon,
} from '@mui/icons-material';
import {
	Box,
	Button,
	Container,
	Stack,
	Typography,
} from '@mui/material';
import { useGameTheme } from '@/themes';
import { noisePattern } from '@/constants';

function initDailyState() {
	// Capture the Pacific date at mount. A screen left open across midnight
	// must still complete this board, not the next day's challenge.
	const boardDateObj = getPacificDate();
	const boardDate = formatDate(boardDateObj);
	const cards = generateDailyBoard(boardDateObj);
	const saved = loadDailyBoardState(boardDate);
	const savedFlippedCardIds = saved?.flippedCardIds ?? new Set<string>();
	const savedSetsFound = saved?.setsFound ?? 0;
	const alreadyCompleted = isDailyCompletedOn(boardDate);
	const hasRemainingSet = setExists(remainingUnflippedCards(cards, savedFlippedCardIds));
	const shouldReconcile = shouldRecordDailyCompletion({
		alreadyCompleted,
		source: 'restore',
		hasRemainingSet,
		flippedCount: savedFlippedCardIds.size,
	});
	const streakData = shouldReconcile
		? recordDailyCompletion(boardDate)
		: getDailyStreakData();

	return {
		cards,
		boardDate,
		dateLabel: formatPacificDate(boardDateObj),
		savedFlippedCardIds,
		savedSetsFound,
		streakRecorded: alreadyCompleted || shouldReconcile,
		streak: streakData.currentStreak,
	};
}

export default
function DailyScreen() {
	const [initialState] = useState(initDailyState);
	const { cards, boardDate, dateLabel, savedFlippedCardIds, savedSetsFound } = initialState;
	const [selectedCardIds, setSelectedCardIds] = useState<ReadonlySet<string>>(new Set());
	const [flippedCardIds, setFlippedCardIds] = useState<ReadonlySet<string>>(savedFlippedCardIds);
	const [setsFound, setSetsFound] = useState(savedSetsFound);
	const [streakRecorded, setStreakRecorded] = useState(initialState.streakRecorded);
	const [streak, setStreak] = useState(initialState.streak);
	const setActiveScreen = useSetActiveScreen();
	const setActiveGroup = useSetActiveGroup();
	const activeController = useActiveController();
	const playSound = useSoundEffects();
	const gameTheme = useGameTheme();

	const remainingHasSet = setExists(remainingUnflippedCards(cards, flippedCardIds));
	const noSetsDisabled = streakRecorded && !remainingHasSet;
	const resetDisabled = setsFound === 0;

	// Set focus group for controller navigation
	useEffect(() => {
		setActiveGroup('daily-cards');
	}, [setActiveGroup]);

	const handleBack = useCallback(() => {
		setActiveScreen(Screens.Title);
	}, [setActiveScreen]);

	// Controller: BACK action returns to title
	useBackAction(handleBack);

	const handleCardSelected = useCallback((card: Card) => {
		const result = applyDailyCardPick({
			cards,
			selectedIds: selectedCardIds,
			flippedIds: flippedCardIds,
			setsFound,
			cardId: card.id ?? '',
			isSet,
			hasSet: setExists,
		});

		if (result.kind === 'noop') return;

		setSelectedCardIds(result.selectedIds);

		if (result.kind === 'miss') {
			playSound('flip1');
			return;
		}

		if (result.kind !== 'set') return;

		playSound('success');
		setFlippedCardIds(result.flippedIds);
		setSetsFound(result.setsFound);
		saveDailyBoardState(boardDate, result.flippedIds, result.setsFound);

		if (!result.completed) return;

		const streakData = recordDailyCompletion(boardDate);
		setStreak(streakData.currentStreak);
		setStreakRecorded(true);
	}, [boardDate, cards, flippedCardIds, playSound, selectedCardIds, setsFound]);

	const handleNoSets = useCallback(() => {
		if (noSetsDisabled) return;

		if (remainingHasSet) {
			playSound('flip1');
			return;
		}

		const streakData = recordDailyCompletion(boardDate);
		setStreak(streakData.currentStreak);
		setStreakRecorded(true);
	}, [boardDate, noSetsDisabled, playSound, remainingHasSet]);

	const handleReset = useCallback(() => {
		setFlippedCardIds(new Set());
		setSetsFound(0);
		setSelectedCardIds(new Set());
		clearDailyBoardState(boardDate);
	}, [boardDate]);

	// Controller: SHUFFLE action triggers "No Sets", HINT action triggers "Reset"
	const inputHandlerRef = useRef<(event: InputEvent) => void>(() => {});
	inputHandlerRef.current = (event: InputEvent) => {
		if (event.action === InputAction.SHUFFLE) {
			handleNoSets();
		}

		if (event.action === InputAction.HINT) {
			handleReset();
		}
	};

	useEffect(() => {
		const gamepadManager = getGamepadManager();
		const keyboardManager = getKeyboardManager();

		const handleInput = (event: InputEvent) => {
			inputHandlerRef.current(event);
		};

		gamepadManager.addListener(handleInput);
		keyboardManager.addListener(handleInput);

		return () => {
			gamepadManager.removeListener(handleInput);
			keyboardManager.removeListener(handleInput);
		};
	}, []);

	return (
		<Box
			sx={{
				position: 'fixed',
				top: 0,
				left: 0,
				width: '100vw',
				height: '100vh',
				background: `
					url("${noisePattern}"),
					radial-gradient(ellipse at center, rgba(0,0,0,0) 0%, rgba(0,0,0,0.15) 100%),
					${gameTheme.background.gameScreen}
				`,
				backgroundSize: '200px 200px, 100% 100%, 100% 100%',
				backgroundPosition: '0 0, center, center',
				overflow: 'auto',
			}}
		>
			<Container maxWidth="xl">
				<Box
					display="flex"
					justifyContent="space-between"
					alignItems="center"
					paddingY={1}
				>
					<Typography variant="h6">
						Daily Board - {dateLabel}
					</Typography>
					<Box textAlign="right">
						<Typography variant="body2">
							Sets: {setsFound}
						</Typography>
						{streak > 0 && (
							<Typography variant="caption">
								Streak: {streak} day{streak !== 1 ? 's' : ''}
							</Typography>
						)}
					</Box>
				</Box>
				<DailyCardArea
					cards={cards}
					flippedCardIds={flippedCardIds}
					selectedCardIds={selectedCardIds}
					onSelected={handleCardSelected}
				/>
				{/* Controller button prompts */}
				{activeController && (
					<FixedBottomLeftContainer>
						<Stack direction="row" spacing={1}>
							<PlatformButton
								label="Back"
								action={InputAction.BACK}
								onClick={handleBack}
							/>
							<PlatformButton
								label="Reset"
								action={InputAction.HINT}
								onClick={handleReset}
								disabled={resetDisabled}
							/>
							<PlatformButton
								label="No sets"
								action={InputAction.SHUFFLE}
								onClick={handleNoSets}
								disabled={noSetsDisabled}
							/>
						</Stack>
					</FixedBottomLeftContainer>
				)}
				{/* Mouse/touch buttons */}
				{!activeController && (
					<Box
						paddingTop={3}
						paddingBottom={20}
						textAlign="center"
						display={{
							xs: 'none',
							sm: 'block',
						}}
					>
						<Stack direction="row" spacing={1} justifyContent="center">
							<Button
								size="large"
								variant="outlined"
								startIcon={<ArrowBackIcon />}
								onClick={handleBack}
							>
								Back
							</Button>
							<Button
								size="large"
								variant="outlined"
								startIcon={<ReplayIcon />}
								onClick={handleReset}
								disabled={resetDisabled}
							>
								Reset
							</Button>
							<Button
								size="large"
								variant="outlined"
								startIcon={<ShuffleIcon />}
								onClick={handleNoSets}
								disabled={noSetsDisabled}
							>
								No sets
							</Button>
						</Stack>
					</Box>
				)}
			</Container>
			{/* Mobile buttons (always shown on mobile, no controller) */}
			{!activeController && (
				<MobileButtons
					onBack={handleBack}
					onReset={handleReset}
					onNoSets={handleNoSets}
					resetDisabled={resetDisabled}
					noSetsDisabled={noSetsDisabled}
				/>
			)}
		</Box>
	);
}

// Mobile floating buttons (same pattern as game-options-mobile.tsx)
function MobileButtons({
	onBack,
	onReset,
	onNoSets,
	resetDisabled,
	noSetsDisabled,
}: {
	onBack: () => void;
	onReset: () => void;
	onNoSets: () => void;
	resetDisabled: boolean;
	noSetsDisabled: boolean;
}) {
	return (
		<Box
			sx={{
				position: 'fixed',
				bottom: 16,
				left: 0,
				right: 0,
				display: {
					xs: 'flex',
					sm: 'none',
				},
				justifyContent: 'center',
				gap: 1,
				zIndex: (theme) => theme.zIndex.speedDial,
				pointerEvents: 'none',
			}}
		>
			<Button
				variant="outlined"
				startIcon={<ArrowBackIcon />}
				sx={{ pointerEvents: 'auto' }}
				onClick={onBack}
			>
				Back
			</Button>
			<Button
				variant="outlined"
				startIcon={<ReplayIcon />}
				disabled={resetDisabled}
				sx={{ pointerEvents: 'auto' }}
				onClick={onReset}
			>
				Reset
			</Button>
			<Button
				variant="outlined"
				startIcon={<ShuffleIcon />}
				disabled={noSetsDisabled}
				sx={{ pointerEvents: 'auto' }}
				onClick={onNoSets}
			>
				No sets
			</Button>
		</Box>
	);
}
