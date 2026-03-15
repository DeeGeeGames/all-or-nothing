import PlayingCard from '../playing-card';
import { BitwiseValue, Card, Screens } from '../../types';
import { resetGame, randomChoice } from '../../utils';
import { useSetActiveScreen, useActiveController, useSplashComplete, useSetSplashComplete } from '../../atoms';
import { useSetActiveGroup } from '@/focus/focus-atoms';
import { useGameTheme } from '@/themes';
import { fireConvergenceConfetti } from '@/confetti';
import FormattedTime from '../formatted-time';
import { SavedGameKey, TutorialCompletedKey } from '@/constants';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useGamepadManager, useKeyboardManager } from '@/input/input-hooks';
import { InputEvent, InputAction } from '@/input/input-types';
import { motion, useReducedMotion } from 'framer-motion';
import {
	RotateLeft as RotateLeftIcon,
	PlayArrow as PlayArrowIcon,
	Info as InfoIcon,
	QuestionMark as QuestionMarkIcon,
	Leaderboard as LeaderboardIcon,
	School as SchoolIcon,
	Groups as GroupsIcon,
	Today as TodayIcon,
} from '@mui/icons-material';
import {
	Container,
	Box,
	Typography,
	keyframes,
	Dialog,
	DialogTitle,
	DialogContent,
	DialogContentText,
	DialogActions,
} from "@mui/material";
import FocusableButton from '@/components/focusable-button';
import PlatformButton from '@/components/platform-button';
import { usePlatform } from '@/platform';
import { getCurrentStreak } from '@/daily/daily-streaks';

// --- Title text animation constants ---

const titleSegments = [
	{ text: 'All ', italic: false },
	{ text: 'or', italic: true },
	{ text: ' Nothing', italic: false },
] as const;

const shimmerAnimation = keyframes`
	0%, 20% {
		background-position: 200% center;
	}
	80%, 100% {
		background-position: -200% center;
	}
`;

const shimmerSx = {
	background: 'linear-gradient(90deg, rgba(0,0,0,0.87) 40%, rgba(255,255,255,0.9) 50%, rgba(0,0,0,0.87) 60%)',
	backgroundSize: '200% auto',
	backgroundClip: 'text',
	WebkitBackgroundClip: 'text',
	WebkitTextFillColor: 'transparent',
	backgroundPosition: '200% center',
	animation: `${shimmerAnimation} 5s ease-in-out 2s infinite`,
} as const;

const titleContainerVariants = {
	hidden: {},
	visible: {
		transition: {
			staggerChildren: 0.04,
			delayChildren: 0.4,
		},
	},
} as const;

const charVariants = {
	hidden: { opacity: 0, y: 20 },
	visible: {
		opacity: 1,
		y: 0,
		transition: { duration: 0.3, ease: 'easeOut' },
	},
} as const;

const buttonContainerVariants = {
	hidden: {},
	visible: {
		transition: {
			staggerChildren: 0.1,
			delayChildren: 1.2,
		},
	},
} as const;

const buttonVariants = {
	hidden: { opacity: 0, y: 10 },
	visible: {
		opacity: 1,
		y: 0,
		transition: { duration: 0.3, ease: 'easeOut' },
	},
} as const;

// --- Demo match loop constants ---

type DemoPhase = 'waiting' | 'dealing' | 'idle' | 'selecting' | 'matched' | 'empty';

const CARD_WIDTH = 100;
const SELECTION_INTERVAL = 600;
const SELECTION_PAUSE = 500;

const timedPhases: Partial<Record<DemoPhase, { duration: number; next: DemoPhase }>> = {
	dealing: { duration: 1000, next: 'idle' },
	idle: { duration: 1500, next: 'selecting' },
	matched: { duration: 1200, next: 'empty' },
	empty: { duration: 1000, next: 'dealing' },
};

const demoCardInitial = { y: -300, opacity: 0, x: 0, scale: 1 } as const;

const demoCardAnimations = ([0, 1, 2] as const).map((index) => ({
	dealing: {
		y: 0,
		x: 0,
		opacity: 1,
		scale: 1,
		transition: { duration: 0.5, delay: index * 0.15, ease: 'easeOut' as const },
	},
	idle: {
		y: 0,
		x: 0,
		opacity: 1,
		scale: 1,
	},
	selecting: {
		y: 0,
		x: 0,
		opacity: 1,
		scale: 1,
	},
	empty: {
		x: 0,
		y: 0,
		opacity: 0,
		scale: 0,
		transition: { duration: 0 },
	},
}));

function matchedAnimation(offset: number) {
	return {
		x: [0, offset, offset],
		y: 0,
		scale: [1, 0.8, 0],
		opacity: [1, 1, 0],
		transition: {
			delay: 0.35,
			duration: 0.7,
			times: [0, 0.6, 1],
			ease: 'easeInOut' as const,
		},
	};
}

function measureConvergenceOffsets(container: HTMLElement | null): readonly [number, number, number] {
	if (!container) return [0, 0, 0];

	const centers = [0, 1, 2].map(i => {
		const el = container.querySelector(`[data-demo-card="${i}"]`);
		if (!el) return null;
		const rect = el.getBoundingClientRect();
		return rect.left + rect.width / 2;
	});

	const validCenters = centers.filter((c): c is number => c !== null);
	if (validCenters.length < 3) return [0, 0, 0];

	const centerX = validCenters.reduce((sum, x) => sum + x, 0) / 3;

	return [
		centerX - (validCenters[0] ?? 0),
		centerX - (validCenters[1] ?? 0),
		centerX - (validCenters[2] ?? 0),
	] as const;
}

// --- Component ---

export default function Landing() {
	const splashComplete = useSplashComplete();
	const setSplashComplete = useSetSplashComplete();
	const [savedGameTime] = useState(getSavedGameTime);
	const [demoCards, setDemoCards] = useState(generateValidSet);
	const [phase, setPhase] = useState<DemoPhase>(splashComplete ? 'dealing' : 'waiting');
	const [selectedCount, setSelectedCount] = useState(0);
	const [measuredOffsets, setMeasuredOffsets] = useState<readonly [number, number, number]>([0, 0, 0]);
	const setActiveScreen = useSetActiveScreen();
	const setActiveGroup = useSetActiveGroup();
	const prefersReducedMotion = useReducedMotion();
	const gameTheme = useGameTheme();
	const activeController = useActiveController();
	const { isAvailable: showLeaderboard, isReady: isPlatformReady } = usePlatform();
	const [showFirstTimePrompt, setShowFirstTimePrompt] = useState(false);
	const [dailyStreak] = useState(getCurrentStreak);
	const containerRef = useRef<HTMLDivElement>(null);
	const confettiTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

	// Set focus group based on whether the tutorial prompt is open
	useEffect(() => {
		setActiveGroup(showFirstTimePrompt ? 'tutorial-prompt' : 'menu');
	}, [setActiveGroup, showFirstTimePrompt]);

	// Timed phase transitions (dealing, idle, matched, empty)
	useEffect(() => {
		if (prefersReducedMotion) return;

		const timedPhase = timedPhases[phase];
		if (!timedPhase) return;

		const timeout = setTimeout(() => {
			if (timedPhase.next === 'dealing') {
				setDemoCards(generateValidSet());
			}

			if (timedPhase.next === 'selecting') {
				setSelectedCount(0);
			}

			setPhase(timedPhase.next);
		}, timedPhase.duration);

		return () => clearTimeout(timeout);
	}, [phase, prefersReducedMotion]);

	// Selecting phase: raise cards one by one
	useEffect(() => {
		if (phase !== 'selecting' || prefersReducedMotion) return;

		if (selectedCount >= 3) {
			const timeout = setTimeout(() => {
				setMeasuredOffsets(measureConvergenceOffsets(containerRef.current));
				setPhase('matched');
			}, SELECTION_PAUSE);
			return () => clearTimeout(timeout);
		}

		const timeout = setTimeout(
			() => setSelectedCount(prev => prev + 1),
			SELECTION_INTERVAL,
		);
		return () => clearTimeout(timeout);
	}, [phase, selectedCount, prefersReducedMotion]);

	// Confetti trigger during matched phase
	useEffect(() => {
		if (phase !== 'matched' || prefersReducedMotion) return;

		confettiTimeoutRef.current = setTimeout(() => {
			const el = containerRef.current;
			if (!el) return;

			const rect = el.getBoundingClientRect();
			const center = {
				x: (rect.left + rect.width / 2) / window.innerWidth,
				y: (rect.top + rect.height / 2) / window.innerHeight,
			};
			const colors = demoCards.map(card => gameTheme.colors[card.color]);

			fireConvergenceConfetti(center, colors);
		}, 770);

		return () => clearTimeout(confettiTimeoutRef.current);
	}, [phase, prefersReducedMotion, demoCards, gameTheme.colors]);

	// Stable callback refs for button handlers
	const handleContinue = useCallback(() => {
		setActiveScreen(Screens.Game);
	}, [setActiveScreen]);

	const handleNewGame = useCallback(async () => {
		if (!localStorage.getItem(TutorialCompletedKey)) {
			setShowFirstTimePrompt(true);
			return;
		}

		await resetGame();
		setActiveScreen(Screens.Game);
	}, [setActiveScreen]);

	const handleDaily = useCallback(() => {
		setActiveScreen(Screens.Daily);
	}, [setActiveScreen]);

	const handleMultiplayer = useCallback(() => {
		setActiveScreen(Screens.Lobby);
	}, [setActiveScreen]);

	const handleLeaderboard = useCallback(() => {
		setActiveScreen(Screens.Leaderboard);
	}, [setActiveScreen]);

	const handleHowToPlay = useCallback(() => {
		setActiveScreen(Screens.Help);
	}, [setActiveScreen]);

	const handleTutorial = useCallback(() => {
		setActiveScreen(Screens.Tutorial);
	}, [setActiveScreen]);

	const handleAbout = useCallback(() => {
		setActiveScreen(Screens.About);
	}, [setActiveScreen]);

	const handlePromptSkip = useCallback(async () => {
		setShowFirstTimePrompt(false);
		localStorage.setItem(TutorialCompletedKey, '1');
		await resetGame();
		setActiveScreen(Screens.Game);
	}, [setActiveScreen]);

	const handlePromptAccept = useCallback(() => {
		setShowFirstTimePrompt(false);
		localStorage.setItem(TutorialCompletedKey, '1');
		setActiveScreen(Screens.Tutorial);
	}, [setActiveScreen]);

	// Handle controller/keyboard input for the tutorial prompt dialog
	const promptInputRef = useRef<(event: InputEvent) => void>(() => {});
	promptInputRef.current = (event: InputEvent) => {
		if (!showFirstTimePrompt) return;

		if (event.action === InputAction.SELECT) {
			handlePromptAccept();
		}

		if (event.action === InputAction.BACK) {
			handlePromptSkip();
		}
	};

	const stablePromptInputHandler = useCallback((event: InputEvent) => {
		promptInputRef.current(event);
	}, []);

	useGamepadManager(stablePromptInputHandler);
	useKeyboardManager(stablePromptInputHandler);

	const handleFadeInComplete = useCallback(() => {
		if (splashComplete) return;
		setSplashComplete(true);
		setPhase('dealing');
	}, [splashComplete, setSplashComplete]);

	const initialState = (prefersReducedMotion || splashComplete) ? false as const : 'hidden' as const;
	const isMatched = phase === 'matched';
	const isSelecting = phase === 'selecting';

	return (
		<motion.div
			initial={{ opacity: splashComplete ? 1 : 0 }}
			animate={{ opacity: 1 }}
			transition={splashComplete ? { duration: 0 } : { duration: 1, ease: 'easeInOut' }}
			onAnimationComplete={handleFadeInComplete}
		>
		<Container sx={{textAlign: 'center'}}>
			<Box
				ref={containerRef}
				paddingTop={10}
				height={200}
				display="flex"
				justifyContent="center"
				gap={2}
			>
				{demoCards.map((card, index) => {
				const staticAnimations = demoCardAnimations[index];
				if (!staticAnimations) return null;

				const animate = prefersReducedMotion || phase === 'waiting'
					? undefined
					: phase === 'matched'
						? matchedAnimation(measuredOffsets[index] ?? 0)
						: staticAnimations[phase];

				return (
					<motion.div
						data-demo-card={index}
						key={`${card.color}-${card.shape}-${card.fill}-${card.count}-${index}`}
						initial={prefersReducedMotion ? false : demoCardInitial}
						animate={animate}
					>
						<PlayingCard
							width={CARD_WIDTH}
							card={card}
							raised={(isSelecting && index < selectedCount) || isMatched}
							spin={isMatched}
							flipped={isMatched}
						/>
					</motion.div>
				);
				})}
			</Box>
			<Box paddingY={7}>
				<motion.div
					variants={titleContainerVariants}
					initial={initialState}
					animate="visible"
				>
					<Typography
						fontWeight={100}
						variant="h1"
						fontSize={40}
						sx={prefersReducedMotion ? {} : shimmerSx}
					>
						{titleSegments.flatMap(({ text, italic }, segIndex) =>
							[...text].map((char, charIndex) => (
								<motion.span
									key={`${segIndex}-${charIndex}`}
									variants={charVariants}
									style={{
										fontStyle: italic ? 'italic' : 'normal',
										display: char === ' ' ? 'inline' : 'inline-block',
									}}
								>
									{char === ' ' ? '\u00A0' : char}
								</motion.span>
							))
						)}
					</Typography>
				</motion.div>
			</Box>
			<Box
				display="inline-block"
				width={300}
			>
				<motion.div
					variants={buttonContainerVariants}
					initial={initialState}
					animate={(isPlatformReady && splashComplete) ? 'visible' : initialState}
				>
					<Box display="flex" flexDirection="column" gap={2}>
						<motion.div variants={buttonVariants}>
							<FocusableButton
								id="menu-daily"
								group="menu"
								order={0}
								startIcon={<TodayIcon />}
								onClick={handleDaily}
								autoFocus={!savedGameTime}
							>
								Daily Board{dailyStreak > 0 ? ` (${dailyStreak} day streak)` : ''}
							</FocusableButton>
						</motion.div>
						<motion.div variants={buttonVariants}>
							<FocusableButton
								id="menu-continue"
								group="menu"
								order={1}
								disabled={!savedGameTime}
								startIcon={<RotateLeftIcon/>}
								onClick={handleContinue}
							>
								Continue {!!savedGameTime && <FormattedTime label=" - " value={savedGameTime} />}
							</FocusableButton>
						</motion.div>
						<motion.div variants={buttonVariants}>
							<FocusableButton
								id="menu-new-game"
								group="menu"
								order={2}
								startIcon={<PlayArrowIcon />}
								onClick={handleNewGame}
							>
								New Game
							</FocusableButton>
						</motion.div>
						<motion.div variants={buttonVariants}>
							<FocusableButton
								id="menu-multiplayer"
								group="menu"
								order={3}
								startIcon={<GroupsIcon />}
								onClick={handleMultiplayer}
							>
								Local Multiplayer
							</FocusableButton>
						</motion.div>
						{showLeaderboard && (
							<motion.div variants={buttonVariants}>
								<FocusableButton
									id="menu-leaderboard"
									group="menu"
									order={4}
									startIcon={<LeaderboardIcon />}
									onClick={handleLeaderboard}
								>
									Leaderboards
								</FocusableButton>
							</motion.div>
						)}
						<motion.div variants={buttonVariants}>
							<FocusableButton
								id="menu-tutorial"
								group="menu"
								order={showLeaderboard ? 5 : 4}
								startIcon={<SchoolIcon />}
								onClick={handleTutorial}
							>
								Tutorial
							</FocusableButton>
						</motion.div>
						<motion.div variants={buttonVariants}>
							<FocusableButton
								id="menu-how-to-play"
								group="menu"
								order={showLeaderboard ? 6 : 5}
								startIcon={<QuestionMarkIcon />}
								onClick={handleHowToPlay}
							>
								How to Play
							</FocusableButton>
						</motion.div>
						<motion.div variants={buttonVariants}>
							<FocusableButton
								id="menu-about"
								group="menu"
								order={showLeaderboard ? 7 : 6}
								startIcon={<InfoIcon />}
								onClick={handleAbout}
							>
								About
							</FocusableButton>
						</motion.div>
					</Box>
				</motion.div>
			</Box>
			<Dialog open={showFirstTimePrompt} onClose={handlePromptSkip}>
				<DialogTitle>Welcome!</DialogTitle>
				<DialogContent>
					<DialogContentText>
						Would you like a quick tutorial to learn how to play?
					</DialogContentText>
				</DialogContent>
				<DialogActions>
					{!activeController && (
						<>
							<FocusableButton
								id="tutorial-prompt-skip"
								group="tutorial-prompt"
								order={0}
								onClick={handlePromptSkip}
							>
								Skip
							</FocusableButton>
							<FocusableButton
								id="tutorial-prompt-accept"
								group="tutorial-prompt"
								order={1}
								onClick={handlePromptAccept}
								autoFocus
							>
								Yes, show me
							</FocusableButton>
						</>
					)}
					{!!activeController && (
						<>
							<PlatformButton
								label="Skip"
								action={InputAction.BACK}
								onClick={handlePromptSkip}
							/>
							<PlatformButton
								label="Yes, show me"
								action={InputAction.SELECT}
								onClick={handlePromptAccept}
							/>
						</>
					)}
				</DialogActions>
			</Dialog>
		</Container>
		</motion.div>
	);
}

// --- Helpers ---

function getSavedGameTime() {
	return +(localStorage.getItem(SavedGameKey) || '0');
}

function generateRandomCard(): Card {
	return {
		color: chooseRandomAttribute(),
		count: chooseRandomAttribute(),
		shape: chooseRandomAttribute(),
		fill: chooseRandomAttribute(),
	};
}

function chooseRandomAttribute() {
	return randomChoice<1 | 2 | 4>(1, 2, 4);
}

function completeAttribute(a: BitwiseValue, b: BitwiseValue): BitwiseValue {
	if (a === b) return a;

	const third = 7 - a - b;

	if (third !== 1 && third !== 2 && third !== 4) {
		throw new Error(`Invalid attribute completion: ${a}, ${b}`);
	}

	return third;
}

function generateValidSet(): [Card, Card, Card] {
	const card1 = generateRandomCard();
	const card2 = generateRandomCard();
	const card3: Card = {
		color: completeAttribute(card1.color, card2.color),
		shape: completeAttribute(card1.shape, card2.shape),
		fill: completeAttribute(card1.fill, card2.fill),
		count: completeAttribute(card1.count, card2.count),
	};

	return [card1, card2, card3];
}
