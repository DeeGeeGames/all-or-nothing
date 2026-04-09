import { useState, useEffect, useCallback, useRef } from 'react';
import { Container, Box, Typography, Button } from '@mui/material';
import { useSetActiveScreen, useUsingNavigationalInput } from '@/atoms';
import { Screens } from '@/types';
import { detectControllerType } from '@/input/controller-mappings';
import { InputAction, ControllerType } from '@/input/input-types';
import type { InputEvent } from '@/input/input-types';
import { getGamepadManager } from '@/input/gamepad-manager';
import { getKeyboardManager } from '@/input/keyboard-manager';
import { useSetPlayerRoster } from '@/multiplayer/multiplayer-atoms';
import { Player, PLAYER_COLORS, PLAYER_IDS } from '@/multiplayer/multiplayer-types';
import MultiplayerButtonPrompts from '@/components/screens/multiplayer-game-screen/multiplayer-button-prompts';
import ControllerSlot from './controller-slot';

export default function LobbyScreen() {
	const setActiveScreen = useSetActiveScreen();
	const usingNavigationalInput = useUsingNavigationalInput();
	const setPlayerRoster = useSetPlayerRoster();
	const [players, setPlayers] = useState<readonly Player[]>([]);
	const [keyboardDetected, setKeyboardDetected] = useState(false);
	const [connectedGamepads, setConnectedGamepads] = useState<ReadonlyMap<number, ControllerType>>(new Map());

	// Track connected gamepads for UI display
	useEffect(() => {
		function updateGamepads() {
			const gamepads = navigator.getGamepads();
			const connected = new Map<number, ControllerType>();
			for (const gp of gamepads) {
				if (gp) {
					connected.set(gp.index, detectControllerType(gp.id));
				}
			}
			setConnectedGamepads(connected);
		}

		window.addEventListener('gamepadconnected', updateGamepads);
		window.addEventListener('gamepaddisconnected', updateGamepads);
		updateGamepads();

		return () => {
			window.removeEventListener('gamepadconnected', updateGamepads);
			window.removeEventListener('gamepaddisconnected', updateGamepads);
		};
	}, []);

	const handleJoin = useCallback((sourceIndex: number | 'keyboard', controllerType: ControllerType) => {
		setPlayers(prev => {
			if (prev.some(p => p.sourceIndex === sourceIndex)) return prev;
			if (prev.length >= 5) return prev;

			const nextIndex = prev.length;
			const id = PLAYER_IDS[nextIndex];
			const color = PLAYER_COLORS[nextIndex];
			if (!id || !color) return prev;

			return [...prev, { id, color, sourceIndex, controllerType }];
		});
	}, []);

	const handleLeave = useCallback((sourceIndex: number | 'keyboard') => {
		setPlayers(prev => {
			const filtered = prev.filter(p => p.sourceIndex !== sourceIndex);
			// Re-assign IDs and colors to maintain order
			return filtered.map((p, i) => ({
				...p,
				id: PLAYER_IDS[i] ?? p.id,
				color: PLAYER_COLORS[i] ?? p.color,
			}));
		});
	}, []);

	const playersRef = useRef(players);
	playersRef.current = players;

	const handleStart = useCallback(() => {
		if (playersRef.current.length < 2) return;
		setPlayerRoster(playersRef.current);
		setActiveScreen(Screens.Multiplayer);
	}, [setActiveScreen, setPlayerRoster]);

	// Listen for input events via existing managers
	useEffect(() => {
		const gamepadManager = getGamepadManager();
		const keyboardManager = getKeyboardManager();

		const handleJoinRef = { current: handleJoin };
		const handleLeaveRef = { current: handleLeave };
		const handleStartRef = { current: handleStart };
		handleJoinRef.current = handleJoin;
		handleLeaveRef.current = handleLeave;
		handleStartRef.current = handleStart;

		function handleInput(event: InputEvent) {
			const sourceIndex = event.sourceIndex;
			if (sourceIndex === undefined) return;

			if (sourceIndex === 'keyboard') {
				setKeyboardDetected(true);
			}

			const isJoined = playersRef.current.some(p => p.sourceIndex === sourceIndex);

			if (event.action === InputAction.SELECT) {
				if (!isJoined) {
					handleJoinRef.current(sourceIndex, event.source);
				} else {
					handleStartRef.current();
				}
				return;
			}

			if (event.action === InputAction.BACK) {
				if (isJoined) {
					handleLeaveRef.current(sourceIndex);
				} else {
					setActiveScreen(Screens.Title);
				}
				return;
			}

			if (event.action === InputAction.PAUSE && isJoined) {
				handleStartRef.current();
			}
		}

		gamepadManager.addListener(handleInput);
		keyboardManager.addListener(handleInput);

		return () => {
			gamepadManager.removeListener(handleInput);
			keyboardManager.removeListener(handleInput);
		};
	}, [handleJoin, handleLeave, handleStart, setActiveScreen]);

	// Build available inputs list — keyboard only shown after a key is pressed
	const availableInputs = [
		...(keyboardDetected ? [{ sourceIndex: 'keyboard' as const, controllerType: ControllerType.KEYBOARD }] : []),
		...Array.from(connectedGamepads.entries()).map(([index, type]) => ({
			sourceIndex: index,
			controllerType: type,
		})),
	];

	const canStart = players.length >= 2;
	const activeControllerTypes = [...new Set(availableInputs.map(i => i.controllerType))];

	return (
		<Container maxWidth="sm" sx={{ textAlign: 'center', paddingTop: 4 }}>
			<Typography variant="h3" fontWeight={300} gutterBottom>
				Multiplayer Lobby
			</Typography>
			{activeControllerTypes.length > 0
				? <MultiplayerButtonPrompts controllerTypes={activeControllerTypes} actions={LOBBY_ACTIONS} sx={{ mb: 4 }} />
				: <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
					Press a button to join.
				</Typography>
			}

			<Box display="flex" flexDirection="column" gap={2} sx={{ mb: 4 }}>
				{availableInputs.map(input => {
					const player = players.find(p => p.sourceIndex === input.sourceIndex);
					return (
						<ControllerSlot
							key={String(input.sourceIndex)}
							sourceIndex={input.sourceIndex}
							controllerType={input.controllerType}
							playerColor={player?.color ?? null}
							playerLabel={player ? `Player ${players.indexOf(player) + 1}` : null}
							isJoined={!!player}
						/>
					);
				})}
			</Box>

			<Box display="flex" gap={2} justifyContent="center">
				{!usingNavigationalInput && (
					<Button
						variant="outlined"
						onClick={() => setActiveScreen(Screens.Title)}
					>
						Back
					</Button>
				)}
				<Button
					variant="contained"
					disabled={!canStart}
					onClick={handleStart}
				>
					Start Game ({players.length} players)
				</Button>
			</Box>

			{!canStart && players.length > 0 && (
				<Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
					Need at least 2 players to start
				</Typography>
			)}
		</Container>
	);
}

const LOBBY_ACTIONS = [
	{ action: InputAction.SELECT, label: 'Join' },
	{ action: InputAction.BACK, label: 'Leave / Back' },
	{ action: InputAction.PAUSE, label: 'Start' },
] as const;
