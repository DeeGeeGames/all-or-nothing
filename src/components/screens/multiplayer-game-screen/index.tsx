import { useEffect, useCallback } from 'react';
import { useSetActiveScreen } from '@/atoms';
import { Screens } from '@/types';
import { useMusic } from '@/components/music-toggle';
import { useClearMultiplayerFocus } from '@/focus/multiplayer-focus-atoms';
import { usePlayerRoster } from '@/multiplayer/multiplayer-atoms';
import MultiplayerPlayArea from './multiplayer-play-area';

export default function MultiplayerGameScreen() {
	const setActiveScreen = useSetActiveScreen();
	const clearMultiplayerFocus = useClearMultiplayerFocus();
	useMusic();
	const players = usePlayerRoster();

	useEffect(() => {
		if (players.length === 0) {
			setActiveScreen(Screens.Title);
		}
	}, [setActiveScreen, players.length]);

	const handleQuit = useCallback(() => {
		clearMultiplayerFocus();
		setActiveScreen(Screens.Title);
	}, [setActiveScreen, clearMultiplayerFocus]);

	if (players.length === 0) {
		return null;
	}

	return (
		<MultiplayerPlayArea
			players={players}
			onQuit={handleQuit}
		/>
	);
}
