import { resetGame } from '@/utils';
import { resetComboState } from '@/core';
import { Screens } from '../types';
import {
	useSetActiveScreen,
	useSetIsPaused,
	useIsSoundEnabled,
	useSetIsSoundEnabled,
	useIsMusicEnabled,
	useSetIsMusicEnabled,
	useIsFullscreen,
	useSetFullscreen,
} from '../atoms';
import {
	PlayArrow as PlayArrowIcon,
	RestartAlt as RestartIcon,
	ArrowBack as BackIcon,
	VolumeUp as VolumeUpIcon,
	VolumeOff as VolumeOffIcon,
	MusicNote as MusicNoteIcon,
	MusicOff as MusicOffIcon,
	Fullscreen as FullscreenIcon,
	FullscreenExit as FullscreenExitIcon,
} from '@mui/icons-material';
import HelpDialogTrigger from './help-dialog-trigger';
import { useCallback } from 'react';
import { useIsMobilePwa } from '@/hooks';
import FocusableButton from '@/components/focusable-button';
import SharedPauseDialog from '@/components/shared-pause-dialog';

const FOCUS_GROUP = 'pause-dialog';

export default
function PauseDialog() {
	const setPaused = useSetIsPaused();
	const setActiveScreen = useSetActiveScreen();
	const isSoundEnabled = useIsSoundEnabled();
	const setIsSoundEnabled = useSetIsSoundEnabled();
	const isMusicEnabled = useIsMusicEnabled();
	const setIsMusicEnabled = useSetIsMusicEnabled();
	const isFullscreen = useIsFullscreen();
	const setFullscreen = useSetFullscreen();
	const isMobilePwa = useIsMobilePwa();

	const handleUnpause = useCallback(async () => {
		await resetComboState();
		setPaused(false);
	}, [setPaused]);

	const handleNewGame = useCallback(async () => {
		await resetGame();
		setPaused(false);
	}, [setPaused]);

	const handleBackToTitle = useCallback(() => {
		setActiveScreen(Screens.Title);
		setPaused(false);
	}, [setActiveScreen, setPaused]);

	const handleClose = useCallback(() => {
		setPaused(false);
	}, [setPaused]);

	const handleToggleSound = useCallback(() => {
		setIsSoundEnabled(!isSoundEnabled);
	}, [isSoundEnabled, setIsSoundEnabled]);

	const handleToggleMusic = useCallback(() => {
		setIsMusicEnabled(!isMusicEnabled);
	}, [isMusicEnabled, setIsMusicEnabled]);

	const handleToggleFullscreen = useCallback(() => {
		setFullscreen(!isFullscreen);
	}, [isFullscreen, setFullscreen]);

	return (
		<SharedPauseDialog
			focusGroup={FOCUS_GROUP}
			onClose={handleClose}
		>
			<FocusableButton
				id="pause-unpause"
				group={FOCUS_GROUP}
				order={0}
				startIcon={<PlayArrowIcon />}
				onClick={handleUnpause}
				autoFocus
			>
				Unpause
			</FocusableButton>
			<FocusableButton
				id="pause-new-game"
				group={FOCUS_GROUP}
				order={1}
				startIcon={<RestartIcon />}
				onClick={handleNewGame}
			>
				New Game
			</FocusableButton>
			<HelpDialogTrigger
				id="pause-help"
				order={2}
			/>
			<FocusableButton
				id="pause-sound"
				group={FOCUS_GROUP}
				order={3}
				startIcon={isSoundEnabled ? <VolumeUpIcon /> : <VolumeOffIcon />}
				onClick={handleToggleSound}
			>
				Sound: {isSoundEnabled ? 'On' : 'Off'}
			</FocusableButton>
			<FocusableButton
				id="pause-music"
				group={FOCUS_GROUP}
				order={4}
				startIcon={isMusicEnabled ? <MusicNoteIcon /> : <MusicOffIcon />}
				onClick={handleToggleMusic}
			>
				Music: {isMusicEnabled ? 'On' : 'Off'}
			</FocusableButton>
			{!isMobilePwa && (
				<FocusableButton
					id="pause-fullscreen"
					group={FOCUS_GROUP}
					order={5}
					startIcon={isFullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
					onClick={handleToggleFullscreen}
				>
					Fullscreen: {isFullscreen ? 'On' : 'Off'}
				</FocusableButton>
			)}
			<FocusableButton
				id="pause-back"
				group={FOCUS_GROUP}
				order={5}
				startIcon={<BackIcon />}
				onClick={handleBackToTitle}
			>
				Back to Title Screen
			</FocusableButton>
		</SharedPauseDialog>
	);
}
