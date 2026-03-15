import { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useSetActiveScreen } from '@/atoms';
import { Screens } from '@/types';
import ReactSplash from './splash-screens/react-splash';
import LibrariesSplash from './splash-screens/libraries-splash';

const FADE_SECONDS = 1;

const splashScreens = [
	{ id: 'react', content: ReactSplash, holdDuration: 2000 },
	{ id: 'libraries', content: LibrariesSplash, holdDuration: 2000 },
];

type Phase = 'fade-in' | 'hold' | 'fade-out';

export default function SplashSequence() {
	const [screenIndex, setScreenIndex] = useState(0);
	const [phase, setPhase] = useState<Phase>('fade-in');
	const [fadeDuration, setFadeDuration] = useState(FADE_SECONDS);
	const isTransitioning = useRef(false);
	const holdTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
	const fadeStartRef = useRef(Date.now());
	const setActiveScreen = useSetActiveScreen();

	const currentScreen = splashScreens[screenIndex];

	const advanceToNextScreen = useCallback(() => {
		const nextIndex = screenIndex + 1;

		if (nextIndex >= splashScreens.length) {
			setActiveScreen(Screens.Title);
			return;
		}

		setScreenIndex(nextIndex);
		setPhase('fade-in');
		setFadeDuration(FADE_SECONDS);
		fadeStartRef.current = Date.now();
		isTransitioning.current = false;
	}, [screenIndex, setActiveScreen]);

	const handleAnimationComplete = useCallback(() => {
		if (phase === 'fade-in') {
			setPhase('hold');
		}

		if (phase === 'fade-out') {
			advanceToNextScreen();
		}
	}, [phase, advanceToNextScreen]);

	const beginFadeOut = useCallback((duration: number) => {
		isTransitioning.current = true;
		clearTimeout(holdTimerRef.current);
		setFadeDuration(duration);
		setPhase('fade-out');
	}, []);

	const handleSkip = useCallback(() => {
		if (isTransitioning.current) return;

		if (phase === 'fade-in') {
			const elapsed = (Date.now() - fadeStartRef.current) / 1000;
			const fraction = Math.min(elapsed / FADE_SECONDS, 1);
			beginFadeOut(Math.max(fraction * FADE_SECONDS, 0.15));
			return;
		}

		if (phase === 'hold') {
			beginFadeOut(FADE_SECONDS);
		}
	}, [phase, beginFadeOut]);

	// Hold timer
	useEffect(() => {
		if (phase !== 'hold') return;
		if (!currentScreen) return;

		holdTimerRef.current = setTimeout(() => {
			beginFadeOut(FADE_SECONDS);
		}, currentScreen.holdDuration);

		return () => clearTimeout(holdTimerRef.current);
	}, [phase, currentScreen, beginFadeOut]);

	// Track fade-in start time
	useEffect(() => {
		if (phase === 'fade-in') {
			fadeStartRef.current = Date.now();
		}
	}, [phase]);

	// Skip input listeners
	useEffect(() => {
		const handler = () => handleSkip();

		document.addEventListener('click', handler);
		document.addEventListener('touchstart', handler, { passive: true });
		document.addEventListener('keydown', handler);

		return () => {
			document.removeEventListener('click', handler);
			document.removeEventListener('touchstart', handler);
			document.removeEventListener('keydown', handler);
		};
	}, [handleSkip]);

	const opacity = phase === 'fade-out' ? 0 : 1;
	const Content = currentScreen?.content;

	if (!Content) return null;

	return (
		<motion.div
			key={screenIndex}
			initial={{ opacity: 0 }}
			animate={{ opacity }}
			transition={{ duration: fadeDuration, ease: 'easeInOut' }}
			onAnimationComplete={handleAnimationComplete}
			style={{ position: 'fixed', inset: 0, zIndex: 1 }}
		>
			<Content />
		</motion.div>
	);
}
