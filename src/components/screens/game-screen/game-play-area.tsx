import { useState, useEffect, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useAnimatedNumber } from '@/useAnimatedNumber';
import { useIsPaused, useSetIsPaused } from '@/atoms';
import { Card, ScorePopup, createScorePopup } from '@/types';
import AdLinkSection from '@/components/ad-link-section';
import GameOverOverlay from './game-over-overlay';
import {
	discardCards,
	getMismatchedAttributes,
	isSet,
	setExists,
	shuffleDeck,
	awardMatchScore,
	penalizeInvalidSet,
	penalizeUnnecessaryShuffle,
	resetComboState,
} from '@/core';
import GameTimer from './game-timer';
import GameScore from './game-score';
import GameOptions from './game-options';
import GameOptionsMobile from './game-options-mobile';
import GameCardArea from './game-card-area';
import GameComboIndicator from './game-combo-indicator';
import GameScorePopups from './game-score-popups';
import {
	Box,
	Container,
	Typography,
} from '@mui/material';
import { useSoundEffects } from '@/hooks';
import { getGamepadManager } from '@/input/gamepad-manager';
import { getKeyboardManager } from '@/input/keyboard-manager';
import { InputAction, InputEvent } from '@/input/input-types';
import { BoardCardCount } from '@/constants';
import { useDeck, useTime, useScore, useShuffleCount, useDeckOrder, useDiscardPile, useMaxCombo } from '@/game-queries';

const {
	VITE_AD_CONTENT_URL = '',
} = import.meta.env;

export default
function GamePlayArea() {
	const deck = useDeck();
	const time = useTime();
	const score = useScore();
	const maxCombo = useMaxCombo();
	const soundEffects = useSoundEffects();
	const shuffleCount = useShuffleCount();
	const paused = useIsPaused();
	const setIsPaused = useSetIsPaused();
	const [selectedCards, setSelectedCards] = useState<string[]>([]);
	const [mismatchingCards, setMismatchingCards] = useState<string[]>([]);
	const [discardingCards, setDiscardingCards] = useState<string[]>([]);
	const [scorePopups, setScorePopups] = useState<ScorePopup[]>([]);
	const [gameGeneration, setGameGeneration] = useState(0);
	const [manualGameComplete, setManualGameComplete] = useState(false);
	const prevDiscardLengthRef = useRef<number | null>(null);
	const discardTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);
	const deckOrder = useDeckOrder();
	const discardPile = useDiscardPile();
	const dealtCards = deck?.slice(0, BoardCardCount);
	const animatedCardsLeft = useAnimatedNumber(deck.length);
	const canShuffle = deck.length > 0 && discardingCards.length === 0;

	const deckLoaded = !!deckOrder;
	const gameComplete = useMemo(() => (
		deckLoaded && (manualGameComplete || deck.length === 0)
	), [deckLoaded, manualGameComplete, deck.length]);

	// Reset combo state when the game screen mounts (continuing a game should not preserve combo)
	useEffect(() => {
		resetComboState();
		return () => clearTimeout(discardTimeoutRef.current);
	}, []);

	// Detect new game start (discard pile reset) and clear local state
	useEffect(() => {
		const currentLength = discardPile?.order.length ?? null;
		const prevLength = prevDiscardLengthRef.current;

		// Discard pile going from non-empty to empty only happens on game reset
		if (prevLength !== null && prevLength > 0 && currentLength === 0) {
			setSelectedCards([]);
			setDiscardingCards([]);
			setManualGameComplete(false);
			setGameGeneration(g => g + 1);
		}

		prevDiscardLengthRef.current = currentLength;
	}, [discardPile?.order.length]);

	// Keep input handler in a ref so listeners don't need re-registration
	// when paused/canShuffle/dealtCards change
	const gameInputHandlerRef = useRef<(event: InputEvent) => void>(() => {});
	gameInputHandlerRef.current = (event: InputEvent) => {
		const { action } = event;

		if (action === InputAction.PAUSE) {
			setIsPaused(!paused);
		}

		if (action === InputAction.SHUFFLE && !paused && canShuffle) {
			handleReshuffle();
		}
	};

	// Register listeners once; the ref always points to the latest handler
	useEffect(() => {
		const gamepadManager = getGamepadManager();
		const keyboardManager = getKeyboardManager();

		const handleGameInput = (event: InputEvent) => {
			gameInputHandlerRef.current(event);
		};

		gamepadManager.addListener(handleGameInput);
		keyboardManager.addListener(handleGameInput);

		return () => {
			gamepadManager.removeListener(handleGameInput);
			keyboardManager.removeListener(handleGameInput);
		};
	}, []);

	return (
		<>
			<Container
				maxWidth="xl"
				sx={{
					position: 'relative',
					padding: 0,
					marginTop: {
						xs: 0,
						sm: 5,
					},
					height: {
						xs: '100vh',
						sm: 'auto',
					},
					display: {
						xs: 'flex',
						sm: 'block',
					},
					flexDirection: {
						xs: 'column',
						sm: 'row',
					},
				}}
			>
				<Box
					sx={{
						position: 'relative',
						flexGrow: {
							xs: 1,
							sm: 'unset',
						},
						flexShrink: {
							xs: 1,
							sm: 'unset',
						},
						minHeight: {
							xs: 0,
							sm: 'auto',
						},
						overflowY: 'visible',
						paddingTop: {
							xs: 2,
							sm: 0,
						},
						paddingBottom: {
							xs: 2,
							sm: 0,
						},
					}}
				>
					<GameCardArea
						key={gameGeneration}
						shuffleCount={shuffleCount}
						cards={dealtCards}
						selectedCards={selectedCards}
						mismatchingCardIds={mismatchingCards}
						discardingCardIds={discardingCards}
						paused={paused}
						onSelected={card => card.id && toggleSelected(card.id)}
						onMismatchAnimationComplete={() => {
							setMismatchingCards([]);
							setSelectedCards([]);
						}}
						onDiscardAnimationComplete={cardIds => {
							setDiscardingCards(prev => prev.filter(id => !cardIds.includes(id)));
						}}
					/>
					<GameScorePopups
						popups={scorePopups}
						onComplete={removeScorePopup}
					/>
				</Box>
				<GameComboIndicator />
				<Box
					paddingX={1}
					display="flex"
					justifyContent="space-between"
					alignItems="center"
					sx={{
						paddingTop: {
							xs: 2,
							sm: 1,
						},
						paddingBottom: {
							xs: 2,
							sm: 0,
						},
						marginBottom: {
							xs: '72px',
							sm: 0,
						},
						flexShrink: {
							xs: 0,
							sm: 'unset',
						},
					}}
				>
					<GameTimer gameComplete={gameComplete} />
					<GameScore gameComplete={gameComplete} />
					<Typography variant="h5" sx={{ fontVariantNumeric: 'tabular-nums' }}>
						<motion.span>{animatedCardsLeft}</motion.span> cards left
					</Typography>
				</Box>
				<GameOptions
					canShuffle={canShuffle}
					onReshuffle={handleReshuffle}
					/>
			</Container>
			<GameOptionsMobile
				canShuffle={canShuffle}
				onReshuffle={handleReshuffle}
			/>
			<GameOverOverlay
				remainingCards={dealtCards.length}
				isGameOver={gameComplete}
				time={time}
				score={score}
				maxCombo={maxCombo}
			/>
			{VITE_AD_CONTENT_URL && (
				<AdLinkSection
					open={gameComplete || paused}
					contentUrl={VITE_AD_CONTENT_URL}
				/>
			)}
		</>
	);

	function removeScorePopup(id: string) {
		setScorePopups(prev => prev.filter(p => p.id !== id));
	}

	async function handleReshuffle() {
		if (!(dealtCards && deckOrder)) {
			return;
		}

		const hasSet = setExists(dealtCards);
		const deckExhausted = deckOrder.order.length <= BoardCardCount;

		if (hasSet) {
			const penalty = await penalizeUnnecessaryShuffle();
			if (penalty !== null) {
				setScorePopups(prev => [...prev, createScorePopup('penalty', penalty)]);
			}
			if (deckExhausted) return;
		} else {
			const result = await awardMatchScore(time);
			if (result) {
				setScorePopups(prev => [...prev, createScorePopup('reward', result.pointsAwarded, result.comboCount)]);
			}
			if (deckExhausted) {
				setManualGameComplete(true);
				return;
			}
		}

		setSelectedCards([]);
		await shuffleDeck();
	}
	async function toggleSelected(cardId: string) {
		if(!(deckOrder && dealtCards)) {
			return;
		}

		const selected = selectedCards.includes(cardId);

		if (!selected && selectedCards.length >= 3) {
			return;
		}

		const newSelectedCardIds = selected ?
			selectedCards.filter(id => id !== cardId):
			[...selectedCards, cardId];

		if (newSelectedCardIds.length !== 3) {
			setSelectedCards(newSelectedCardIds);
			return;
		}

		const newSelectedCards = dealtCards.filter(
			card => !!card.id && newSelectedCardIds.includes(card.id)
		) as [Card, Card, Card];

		if(isSet(...newSelectedCards)) {
			const result = await awardMatchScore(time);
			if (result) {
				setScorePopups(prev => [...prev, createScorePopup('reward', result.pointsAwarded, result.comboCount)]);
			}
			setDiscardingCards(prev => [...prev, ...newSelectedCardIds]);
			// Delay DB removal so convergence animation plays while cards
			// are still grid items (avoids popLayout z-index issues).
			// Timing: 350ms glow delay + 700ms animation + 50ms buffer
			discardTimeoutRef.current = setTimeout(() => {
				discardCards(newSelectedCardIds, BoardCardCount);
			}, 1100);
			soundEffects('success');
			setSelectedCards([]);
		} else {
			const mismatched = getMismatchedAttributes(...newSelectedCards);
			const penalty = await penalizeInvalidSet();
			if (penalty !== null) {
				setScorePopups(prev => [...prev, createScorePopup('penalty', penalty, 0, undefined, mismatched)]);
			}
			setMismatchingCards(newSelectedCardIds);
		}
	}
}

