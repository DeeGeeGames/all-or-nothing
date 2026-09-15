import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Box, Container, Typography } from '@mui/material';
import { Card, ScorePopup, createScorePopup } from '@/types';
import { isSet, setExists } from '@/core';
import { BoardCardCount } from '@/constants';
import { useIsPaused, useSetIsPaused } from '@/atoms';
import { getGamepadManager } from '@/input/gamepad-manager';
import { getKeyboardManager } from '@/input/keyboard-manager';
import { InputAction, InputActionToDirection } from '@/input/input-types';
import type { InputEvent } from '@/input/input-types';
import { useNavigatePlayer, useSelectPlayerCurrent, useInitializePlayerFocus } from '@/focus/multiplayer-focus-atoms';
import { useSoundEffects } from '@/hooks';
import type { Player, PlayerId } from '@/multiplayer/multiplayer-types';
import {
	callNoSets,
	clearPlayerSelection,
	commitDiscard,
	createMultiplayerSession,
	rematchSession,
	selectCard,
	type MultiplayerSession,
} from '@/multiplayer/multiplayer-match';
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
	const soundEffects = useSoundEffects();
	const navigatePlayer = useNavigatePlayer();
	const selectPlayerCurrent = useSelectPlayerCurrent();
	const initializePlayerFocus = useInitializePlayerFocus();
	const paused = useIsPaused();
	const setPaused = useSetIsPaused();
	const pausedRef = useRef(paused);
	pausedRef.current = paused;

	const [session, setSession] = useState(() => createMultiplayerSession(players.map(player => player.id)));
	const sessionRef = useRef(session);
	sessionRef.current = session;
	const gameOverRef = useRef(session.gameOver);
	gameOverRef.current = session.gameOver;

	const [focusInitialized, setFocusInitialized] = useState(false);
	const [scorePopups, setScorePopups] = useState<ScorePopup[]>([]);
	const pendingTimeoutsRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

	const dealtCards = useMemo(
		() => parseDealtCards(session.board.deck),
		[session.board.deck],
	);

	const sourceToPlayer = useMemo(() => {
		const map = new Map<string, Player>();
		players.forEach(player => map.set(String(player.sourceIndex), player));
		return map;
	}, [players]);

	useEffect(() => {
		if (dealtCards.length > 0 && !focusInitialized) {
			initializePlayerFocus(players.map(player => player.id));
			setFocusInitialized(true);
		}
	}, [dealtCards.length, focusInitialized, players, initializePlayerFocus]);

	useEffect(() => {
		const timeouts = pendingTimeoutsRef.current;
		return () => {
			timeouts.forEach(clearTimeout);
		};
	}, []);

	useEffect(() => {
		if (session.gameOver) {
			setPaused(false);
		}
	}, [session.gameOver, setPaused]);

	function applySession(next: MultiplayerSession) {
		sessionRef.current = next;
		gameOverRef.current = next.gameOver;
		setSession(next);
	}

	function trackTimeout(fn: () => void, ms: number) {
		const id = setTimeout(() => {
			pendingTimeoutsRef.current.delete(id);
			fn();
		}, ms);
		pendingTimeoutsRef.current.add(id);
	}

	function notifyScore(playerId: PlayerId, delta: number) {
		const player = players.find(item => item.id === playerId);
		const variant: 'reward' | 'penalty' = delta > 0 ? 'reward' : 'penalty';
		setScorePopups(prev => [...prev, createScorePopup(variant, Math.abs(delta), 0, player?.color)]);
	}

	const removeScorePopup = useCallback((id: string) => {
		setScorePopups(prev => prev.filter(popup => popup.id !== id));
	}, []);

	const handleCardSelected = useCallback((cardId: string, playerId: PlayerId) => {
		const current = sessionRef.current;
		const result = selectCard(
			current,
			playerId,
			cardId,
			ids => selectionIsSet(ids, parseDealtCards(current.board.deck)),
		);

		if (result.kind === 'noop') {
			return;
		}

		applySession(result.session);

		if (result.kind === 'valid-set') {
			notifyScore(playerId, 1);
			soundEffects('success');
			const generation = result.session.board.generation;
			trackTimeout(() => {
				applySession(commitDiscard(sessionRef.current, result.cardIds, generation));
			}, 1100);
			return;
		}

		if (result.kind === 'invalid-set') {
			notifyScore(playerId, -1);
			const generation = result.session.board.generation;
			trackTimeout(() => {
				applySession(clearPlayerSelection(sessionRef.current, playerId, generation));
			}, 800);
		}
	}, [players, soundEffects]);

	const handleCardSelectedRef = useRef(handleCardSelected);
	handleCardSelectedRef.current = handleCardSelected;

	const handleNoSetCall = useCallback((playerId: PlayerId) => {
		const current = sessionRef.current;
		const result = callNoSets(
			current,
			playerId,
			setExists(parseDealtCards(current.board.deck)),
		);

		if (result.kind === 'noop') {
			return;
		}

		applySession(result.session);
		notifyScore(playerId, result.kind === 'penalty' ? -1 : 1);
	}, [players]);

	const handleNoSetCallRef = useRef(handleNoSetCall);
	handleNoSetCallRef.current = handleNoSetCall;

	useEffect(() => {
		const gamepadManager = getGamepadManager();
		const keyboardManager = getKeyboardManager();

		function handleInput(event: InputEvent) {
			if (gameOverRef.current) {
				return;
			}

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

	const handleRematch = useCallback(() => {
		pendingTimeoutsRef.current.forEach(clearTimeout);
		pendingTimeoutsRef.current.clear();
		setPaused(false);
		setFocusInitialized(false);
		setScorePopups([]);
		applySession(rematchSession(sessionRef.current));
	}, [setPaused]);

	if (session.gameOver) {
		return (
			<MultiplayerResults
				players={players}
				scores={session.scores}
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
			<MultiplayerScoreboard players={players} scores={session.scores} />
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
					key={session.board.generation}
					cards={dealtCards}
					players={players}
					selections={session.selections}
					discardingCardIds={session.discardingCardIds}
					onCardSelected={(cardId, playerId) => handleCardSelectedRef.current(cardId, playerId)}
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
					{session.board.deck.length} cards left
				</Typography>
				<MultiplayerButtonPrompts
					controllerTypes={players.map(player => player.controllerType)}
					actions={GAME_ACTIONS}
				/>
			</Box>
			<MultiplayerPauseDialog onQuit={onQuit} />
		</Container>
	);
}

function parseDealtCards(deck: readonly string[]): Card[] {
	return deck.slice(0, BoardCardCount).map(id => ({ id, ...JSON.parse(id) }));
}

function selectionIsSet(cardIds: readonly [string, string, string], dealt: readonly Card[]): boolean {
	const cards = cardIds
		.map(id => dealt.find(card => card.id === id))
		.filter((card): card is Card => !!card);

	if (cards.length !== 3) {
		return false;
	}

	const [a, b, c] = cards;
	if (!a || !b || !c) {
		return false;
	}

	return isSet(a, b, c);
}
