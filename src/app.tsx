import './styles.css';
import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';

import TitleScreen from './components/screens/title-screen';
import { Screens } from './types';
import { lazy, Suspense, useMemo, useEffect } from 'react';
import Loader from './components/loader';
import { useGamepadManager, useKeyboardManager } from './input/input-hooks';
import { useEventListener } from 'usehooks-ts';
import { InputEvent, NavigationDirection, PrimaryInputAction } from './input/input-types';
import { isIn } from './utils';
import {
	useActiveScreen,
	useSetActiveController,
	useUsingNavigationalInput,
	useLoadAudioSettings,
	useSetupDebugUtilities,
} from './atoms';
import { useNavigate, useSelectCurrent } from './focus/focus-atoms';
import { useInitializeThemes, useGameTheme } from './themes';

const Game = lazy(() => import('./components/screens/game-screen'));
const About = lazy(() => import('./components/screens/about-screen'));
const Help = lazy(() => import('./components/screens/help-screen'));
const Leaderboard = lazy(() => import('./components/screens/leaderboard-screen'));
const Tutorial = lazy(() => import('./components/screens/tutorial-screen'));
const Lobby = lazy(() => import('./components/screens/lobby-screen'));
const MultiplayerGame = lazy(() => import('./components/screens/multiplayer-game-screen'));
const Daily = lazy(() => import('./components/screens/daily-screen'));
const SplashSequence = lazy(() => import('./components/screens/splash-sequence'));

const ScreenComponents = {
	[Screens.Splash]: SplashSequence,
	[Screens.Title]: TitleScreen,
	[Screens.Game]: Game,
	[Screens.About]: About,
	[Screens.Help]: Help,
	[Screens.Leaderboard]: Leaderboard,
	[Screens.Tutorial]: Tutorial,
	[Screens.Lobby]: Lobby,
	[Screens.Multiplayer]: MultiplayerGame,
	[Screens.Daily]: Daily,
} as const;

export default
function App() {
	const activeScreen = useActiveScreen();
	const setActiveController = useSetActiveController();
	const usingNavigationalInput = useUsingNavigationalInput();
	const navigate = useNavigate();
	const selectCurrent = useSelectCurrent();
	const loadAudioSettings = useLoadAudioSettings();

	useSetupDebugUtilities();
	useInitializeThemes();

	const gameTheme = useGameTheme();

	useEffect(() => {
		document.body.style.background = gameTheme.background.body;
	}, [gameTheme]);

	const ActiveScreenComponent = ScreenComponents[activeScreen];

	useEffect(() => {
		loadAudioSettings();
	}, [loadAudioSettings]);

	const actionHandlers = useMemo(() => ({
		[PrimaryInputAction.NAVIGATE_UP]: () => navigate(NavigationDirection.UP),
		[PrimaryInputAction.NAVIGATE_DOWN]: () => navigate(NavigationDirection.DOWN),
		[PrimaryInputAction.NAVIGATE_LEFT]: () => navigate(NavigationDirection.LEFT),
		[PrimaryInputAction.NAVIGATE_RIGHT]: () => navigate(NavigationDirection.RIGHT),
		[PrimaryInputAction.SELECT]: () => selectCurrent(),
	} as const), [navigate, selectCurrent]);

	useGamepadManager(handleInput);
	useKeyboardManager(handleInput);
	useEventListener('mousedown', handleMouseOrTouch);
	useEventListener('touchstart', handleMouseOrTouch);

	function handleInput(event: InputEvent) {
		setActiveController(event.source);

		if (!usingNavigationalInput) return;

		const { action } = event;
		if (!isIn(action, PrimaryInputAction)) return;

		actionHandlers[action]();
	}

	function handleMouseOrTouch() {
		setActiveController(null);
	}

	return (
		<Suspense fallback={<Loader/>}>
			<ActiveScreenComponent />
		</Suspense>
	);
}
