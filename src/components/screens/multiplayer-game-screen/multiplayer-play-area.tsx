import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Box, Container, Typography } from '@mui/material';
import { Card, ScorePopup, createScorePopup } from '@/types';
import {
	isSet,
	setExists,
	shuffleDeck,
	discardCards,
} from '@/core';
import { BoardCardCount } from '@/constants';
import { useIsPaused, useSetIsPaused } from '@/atoms';
import { useDeck, useDeckOrder } from '@/game-queries';
import { getGamepadManager } from '@/input/gamepad-manager';
import { getKeyboardManager } from '@/input/keyboard-manager';
import { InputAction, InputActionToDirection } from '@/input/input-types';
import type { InputEvent } from '@/input/input-types';
import { useNavigatePlayer, useSelectPlayerCurrent, useInitializePlayerFocus } from '@/focus/multiplayer-focus-atoms';
import { useSoundEffects } from '@/hooks';
import type { Player, PlayerId } from '@/multiplayer/multiplayer-types';
import MultiplayerCardArea from './multiplayer-card-area';
import MultiplayerScoreboard from './multiplayer-scoreboard';
import MultiplayerButtonPrompts from './multiplayer-button-prompts';
import MultiplayerResults from './multiplayer-results';
import MultiplayerPauseDialog from './multiplayer-pause-dialog';
import GameScorePopups from '@/components/screens/game-screen/game-score-popups';

const GAME_ACTIONS = [
	{ action: InputAction.SELECT, label: 'Select' },
	{ action: InputAction.SHUFFLE, label: 'No Sets' },
	{ action: InputAction.PAUSE, label: 'Pause' },
] as const;

interface MultiplayerPlayAreaProps {
	players: readonly Player[];
	onQuit: () => void;
}

export default function MultiplayerPlayArea({ players, onQuit }: MultiplayerPlayAreaProps) {
	const deck = useDeck();
	const deckOrder = useDeckOrder();
	const soundEffects = useSoundEffects();
	const navigatePlayer = useNavigatePlayer();
	const selectPlayerCurrent = useSelectPlayerCurrent();
	const initializePlayerFocus = useInitializePlayerFocus();
	const paused = useIsPaused();
	const setPaused = useSetIsPaused();
	const pausedRef = useRef(paused);
	pausedRef.current = paused;

	const [scores, setScores] = useState<ReadonlyMap<PlayerId, number>>(() => {
		const initial = new Map<PlayerId, number>();
		players.forEach(p => initial.set(p.id, 0));
		return initial;
	});
	const [selections, setSelections] = useState<ReadonlyMap<PlayerId, readonly string[]>>(new Map());
	const [discardingCards, setDiscardingCards] = useState<readonly string[]>([]);
	const [gameOver, setGameOver] = useState(false);
	const [focusInitialized, setFocusInitialized] = useState(false);
	const [scorePopups, setScorePopups] = useState<ScorePopup[]>([]);

	// Track pending timeouts for cleanup
	const pendingTimeoutsRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

	const dealtCards = deck.slice(0, BoardCardCount);

	// Build sourceIndex -> PlayerId mapping
	const sourceToPlayer = useMemo(() => {
		const map = new Map<string, Player>();
		players.forEach(p => map.set(String(p.sourceIndex), p));
		return map;
	}, [players]);

	// Initialize focus for all players once cards are available
	useEffect(() => {
		if (dealtCards.length > 0 && !focusInitialized) {
			const playerIds = players.map(p => p.id);
			initializePlayerFocus(playerIds);
			setFocusInitialized(true);
		}
	}, [dealtCards.length, focusInitialized, players, initializePlayerFocus]);

	// Cleanup all pending timeouts on unmount
	useEffect(() => {
		const timeouts = pendingTimeoutsRef.current;
		return () => {
			timeouts.forEach(clearTimeout);
		};
	}, []);

	function trackTimeout(fn: () => void, ms: number) {
		const id = setTimeout(() => {
			pendingTimeoutsRef.current.delete(id);
			fn();
		}, ms);
		pendingTimeoutsRef.current.add(id);
	}

	function scoreAndNotify(playerId: PlayerId, delta: number) {
		setScores(s => {
			const newScores = new Map(s);
			newScores.set(playerId, (newScores.get(playerId) ?? 0) + delta);
			return newScores;
		});

		const player = players.find(p => p.id === playerId);
		const variant: 'reward' | 'penalty' = delta > 0 ? 'reward' : 'penalty';
		setScorePopups(prev => [...prev, createScorePopup(variant, Math.abs(delta), 0, player?.color)]);
	}

	const removeScorePopup = useCallback((id: string) => {
		setScorePopups(prev => prev.filter(p => p.id !== id));
	}, []);

	const handleCardSelected = useCallback((cardId: string, playerId: PlayerId) => {
		if (discardingCards.includes(cardId)) return;

		setSelections(prev => {
			const playerCards = [...(prev.get(playerId) ?? [])];
			const cardIndex = playerCards.indexOf(cardId);

			if (cardIndex >= 0) {
				const updated = new Map(prev);
				updated.set(playerId, playerCards.filter(id => id !== cardId));
				return updated;
			}

			if (playerCards.length >= 3) return prev;

			const newSelection = [...playerCards, cardId];

			if (newSelection.length !== 3) {
				const updated = new Map(prev);
				updated.set(playerId, newSelection);
				return updated;
			}

			// 3 cards selected — validate
			const selectedCards = newSelection
				.map(id => dealtCards.find(c => c.id === id))
				.filter((c): c is Card => !!c);

			if (selectedCards.length !== 3) {
				const updated = new Map(prev);
				updated.set(playerId, []);
				return updated;
			}

			const [cardA, cardB, cardC] = selectedCards as [Card, Card, Card];

			if (isSet(cardA, cardB, cardC)) {
				const updated = new Map(prev);
				updated.set(playerId, []);

				// Clear other players' selections of these cards
				for (const [pid, pCards] of updated) {
					if (pid !== playerId) {
						const filtered = pCards.filter(id => !newSelection.includes(id));
						if (filtered.length !== pCards.length) {
							updated.set(pid, filtered);
						}
					}
				}

				scoreAndNotify(playerId, 1);
				setDiscardingCards(prev => [...prev, ...newSelection]);
				soundEffects('success');

				trackTimeout(() => {
					discardCards([...newSelection], BoardCardCount);
					setDiscardingCards(prev => prev.filter(id => !newSelection.includes(id)));
				}, 1100);

				return updated;
			}

			// Invalid set — penalize
			scoreAndNotify(playerId, -1);

			trackTimeout(() => {
				setSelections(prev => {
					const updated = new Map(prev);
					updated.set(playerId, []);
					return updated;
				});
			}, 800);

			const updated = new Map(prev);
			updated.set(playerId, newSelection);
			return updated;
		});
	}, [dealtCards, discardingCards, soundEffects]);

	const handleCardSelectedRef = useRef(handleCardSelected);
	handleCardSelectedRef.current = handleCardSelected;

	const handleNoSetCall = useCallback((playerId: PlayerId) => {
		const hasSet = setExists(dealtCards);
		const deckExhausted = (deckOrder?.order.length ?? 0) <= BoardCardCount;

		if (hasSet) {
			scoreAndNotify(playerId, -1);
			return;
		}

		scoreAndNotify(playerId, 1);

		if (deckExhausted) {
			setGameOver(true);
			return;
		}

		setSelections(new Map());
		shuffleDeck();
	}, [dealtCards, deckOrder]);

	const handleNoSetCallRef = useRef(handleNoSetCall);
	handleNoSetCallRef.current = handleNoSetCall;

	// Input handling
	useEffect(() => {
		const gamepadManager = getGamepadManager();
		const keyboardManager = getKeyboardManager();

		function handleInput(event: InputEvent) {
			if (event.action === InputAction.PAUSE) {
				setPaused(!pausedRef.current);
				return;
			}

			if (pausedRef.current) return;

			const sourceKey = String(event.sourceIndex ?? event.source);
			const player = sourceToPlayer.get(sourceKey);
			if (!player) return;

			const direction = InputActionToDirection[event.action];
			if (direction) {
				navigatePlayer({ playerId: player.id, direction });
				return;
			}

			if (event.action === InputAction.SELECT) {
				selectPlayerCurrent(player.id);
				return;
			}

			if (event.action === InputAction.SHUFFLE) {
				handleNoSetCallRef.current(player.id);
				return;
			}
		}

		gamepadManager.addListener(handleInput);
		gamepadManager.setOnControllerDisconnected(() => setPaused(true));
		keyboardManager.addListener(handleInput);

		return () => {
			gamepadManager.removeListener(handleInput);
			gamepadManager.setOnControllerDisconnected(null);
			keyboardManager.removeListener(handleInput);
		};
	}, [sourceToPlayer, navigatePlayer, selectPlayerCurrent, setPaused]);

	// Auto-end when board is cleared
	useEffect(() => {
		if (deck.length === 0 && focusInitialized) {
			setGameOver(true);
		}
	}, [deck.length, focusInitialized]);

	const handleRematch = useCallback(() => {
		setScores(() => {
			const initial = new Map<PlayerId, number>();
			players.forEach(p => initial.set(p.id, 0));
			return initial;
		});
		setSelections(new Map());
		setDiscardingCards([]);
		setGameOver(false);
		setFocusInitialized(false);
		setScorePopups([]);
	}, [players]);

	if (gameOver) {
		return (
			<MultiplayerResults
				players={players}
				scores={scores}
				onRematch={handleRematch}
				onQuit={onQuit}
			/>
		);
	}

	return (
		<Container
			maxWidth="xl"
			sx={{
				position: 'relative',
				padding: 0,
				marginTop: { xs: 0, sm: 5 },
				height: { xs: '100vh', sm: 'auto' },
				display: { xs: 'flex', sm: 'block' },
				flexDirection: { xs: 'column', sm: 'row' },
			}}
		>
			<MultiplayerScoreboard players={players} scores={scores} />
			<Box
				sx={{
					position: 'relative',
					flexGrow: { xs: 1, sm: 'unset' },
					flexShrink: { xs: 1, sm: 'unset' },
					minHeight: { xs: 0, sm: 'auto' },
					overflowY: 'visible',
					paddingTop: { xs: 2, sm: 0 },
					paddingBottom: { xs: 2, sm: 0 },
				}}
			>
				<MultiplayerCardArea
					cards={dealtCards}
					players={players}
					selections={selections}
					discardingCardIds={discardingCards}
					onCardSelected={(cardId, playerId) => handleCardSelectedRef.current(cardId, playerId as PlayerId)}
				/>
				<GameScorePopups popups={scorePopups} onComplete={removeScorePopup} />
			</Box>
			<Box
				paddingX={1}
				display="flex"
				justifyContent="space-between"
				alignItems="center"
				sx={{
					paddingTop: { xs: 2, sm: 1 },
					paddingBottom: { xs: 2, sm: 0 },
					marginBottom: { xs: '72px', sm: 0 },
					flexShrink: { xs: 0, sm: 'unset' },
				}}
			>
				<Typography variant="h5">
					{deck.length} cards left
				</Typography>
				<MultiplayerButtonPrompts
					controllerTypes={players.map(p => p.controllerType)}
					actions={GAME_ACTIONS}
				/>
			</Box>
			<MultiplayerPauseDialog onQuit={onQuit} />
		</Container>
	);
}
