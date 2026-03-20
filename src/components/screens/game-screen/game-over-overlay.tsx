import { memo, useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Box, Typography } from '@mui/material';
import {
	RestartAlt as RestartIcon,
	ArrowBack as BackIcon,
} from '@mui/icons-material';
import FormattedTime from '@/components/formatted-time';
import FocusableButton from '@/components/focusable-button';
import { useSetActiveGroup } from '@/focus/focus-atoms';
import { useSetActiveScreen } from '@/atoms';
import { resetGame } from '@/utils';
import { getGameCompletionData } from '@/core';
import { usePlatform } from '@/platform';
import { Screens } from '@/types';
import { fireGameOverConfetti } from '@/confetti';

const FOCUS_GROUP = 'game-over';

type Grade = 'S' | 'A' | 'B' | 'C' | 'D';

interface Props {
	isGameOver: boolean;
	time: number;
	remainingCards: number;
	score: number;
	maxCombo: number;
}

const statVariants = {
	hidden: { opacity: 0, y: 20 },
	visible: { opacity: 1, y: 0 },
} as const;

function deriveGrade(score: number, remainingCards: number, maxCombo: number): Grade {
	if (remainingCards === 0 && maxCombo >= 5 && score >= 10000) return 'S';
	if (remainingCards === 0 && score >= 5000) return 'A';
	if (remainingCards <= 3 && score >= 2000) return 'B';
	if (score >= 1000) return 'C';
	return 'D';
}

const gradeColors: Record<Grade, string> = {
	S: '#ffd700',
	A: '#4caf50',
	B: '#2196f3',
	C: '#ff9800',
	D: '#9e9e9e',
};

export default memo(
function GameOverOverlay(props: Props) {
	const {
		isGameOver,
		time,
		remainingCards,
		score,
		maxCombo,
	} = props;

	const setActiveGroup = useSetActiveGroup();
	const setActiveScreen = useSetActiveScreen();
	const { service: platformService, isAvailable: isPlatformAvailable } = usePlatform();
	const [submitted, setSubmitted] = useState(false);
	const confettiFiredRef = useRef(false);

	const grade = deriveGrade(score, remainingCards, maxCombo);
	const isPerfect = remainingCards === 0;

	useEffect(() => {
		if (!isGameOver) {
			setSubmitted(false);
			confettiFiredRef.current = false;
			return;
		}

		setActiveGroup(FOCUS_GROUP);

		if (confettiFiredRef.current) return;
		confettiFiredRef.current = true;

		const cancelConfetti = fireGameOverConfetti(isPerfect);
		return cancelConfetti;
	}, [isGameOver, setActiveGroup, isPerfect]);

	useEffect(() => {
		if (!isGameOver || submitted || !isPlatformAvailable) return;

		let cancelled = false;

		getGameCompletionData()
			.then(data => platformService.submitScore(data))
			.then(success => {
				if (success && !cancelled) setSubmitted(true);
			})
			.catch(() => {});

		return () => { cancelled = true; };
	}, [isGameOver, submitted, isPlatformAvailable, platformService]);

	const handleBackToTitle = useCallback(() => {
		setActiveScreen(Screens.Title);
	}, [setActiveScreen]);

	return (
		<AnimatePresence>
			{isGameOver && (
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
					transition={{ duration: 0.4 }}
					style={{
						position: 'fixed',
						inset: 0,
						zIndex: 1300,
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						backgroundColor: 'rgba(0, 0, 0, 0.85)',
					}}
				>
					<Box
						display="flex"
						flexDirection="column"
						alignItems="center"
						gap={3}
						sx={{ maxWidth: 420, width: '100%', px: 3 }}
					>
						<motion.div
							variants={statVariants}
							initial="hidden"
							animate="visible"
							transition={{ delay: 0.2, duration: 0.5 }}
						>
							<Typography
								variant="h2"
								fontWeight="bold"
								color="white"
								textAlign="center"
							>
								{isPerfect ? 'Perfect Clear!' : 'Game Over'}
							</Typography>
						</motion.div>

						<motion.div
							variants={statVariants}
							initial="hidden"
							animate="visible"
							transition={{ delay: 0.5, duration: 0.5, type: 'spring', bounce: 0.4 }}
						>
							<Typography
								variant="h1"
								fontWeight="bold"
								textAlign="center"
								sx={{
									color: gradeColors[grade],
									textShadow: `0 0 30px ${gradeColors[grade]}80`,
									fontSize: '6rem',
								}}
							>
								{grade}
							</Typography>
						</motion.div>

						<Box
							display="flex"
							flexDirection="column"
							alignItems="center"
							gap={1}
							width="100%"
						>
							{!!remainingCards && (
								<motion.div
									variants={statVariants}
									initial="hidden"
									animate="visible"
									transition={{ delay: 0.8, duration: 0.4 }}
								>
									<Typography variant="body1" color="grey.400" textAlign="center">
										No sets in the remaining {remainingCards} cards
									</Typography>
								</motion.div>
							)}

							<motion.div
								variants={statVariants}
								initial="hidden"
								animate="visible"
								transition={{ delay: 0.9, duration: 0.4 }}
							>
								<FormattedTime label="Time: " value={time} variant="h5" />
							</motion.div>

							<motion.div
								variants={statVariants}
								initial="hidden"
								animate="visible"
								transition={{ delay: 1.0, duration: 0.4 }}
							>
								<Typography variant="h5" color="white">
									Score: {score.toLocaleString()}
								</Typography>
							</motion.div>

							<motion.div
								variants={statVariants}
								initial="hidden"
								animate="visible"
								transition={{ delay: 1.1, duration: 0.4 }}
							>
								<Typography variant="h5" color="white">
									Max Combo: {maxCombo}x
								</Typography>
							</motion.div>
						</Box>

						<motion.div
							variants={statVariants}
							initial="hidden"
							animate="visible"
							transition={{ delay: 1.4, duration: 0.4 }}
							style={{
								width: '100%',
								maxWidth: 300,
								display: 'flex',
								flexDirection: 'column',
								gap: 16,
							}}
						>
							<FocusableButton
								id="gameover-new-game"
								group={FOCUS_GROUP}
								order={0}
								startIcon={<RestartIcon />}
								onClick={resetGame}
								autoFocus
							>
								New Game
							</FocusableButton>
							<FocusableButton
								id="gameover-back-to-title"
								group={FOCUS_GROUP}
								order={1}
								startIcon={<BackIcon />}
								onClick={handleBackToTitle}
							>
								Back to Title
							</FocusableButton>
						</motion.div>
					</Box>
				</motion.div>
			)}
		</AnimatePresence>
	);
});
