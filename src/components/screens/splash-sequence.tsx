import { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useEventListener } from 'usehooks-ts';
import { useSetActiveScreen } from '@/atoms';
import { Screens } from '@/types';
import ReactSplash from './splash-screens/react-splash';
import LibrariesSplash from './splash-screens/libraries-splash';
import jotaiLogoUrl from './splash-screens/logos/jotai.png';
import motionLogoUrl from './splash-screens/logos/motion.png';

const pngUrls = [jotaiLogoUrl, motionLogoUrl];
pngUrls.forEach((url) => {
	const link = document.createElement('link');
	link.rel = 'prefetch';
	link.as = 'image';
	link.href = url;
	document.head.appendChild(link);
});

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
	const phaseRef = useRef<Phase>(phase);
	const screenIndexRef = useRef(screenIndex);
	const setActiveScreen = useSetActiveScreen();

	phaseRef.current = phase;
	screenIndexRef.current = screenIndex;

	const currentScreen = splashScreens[screenIndex];

	const beginFadeOut = useCallback((duration: number) => {
		isTransitioning.current = true;
		clearTimeout(holdTimerRef.current);
		setFadeDuration(duration);
		setPhase('fade-out');
	}, []);

	const advanceToNextScreen = useCallback(() => {
		const nextIndex = screenIndexRef.current + 1;

		if (nextIndex >= splashScreens.length) {
			setActiveScreen(Screens.Title);
			return;
		}

		setScreenIndex(nextIndex);
		setPhase('fade-in');
		setFadeDuration(FADE_SECONDS);
		isTransitioning.current = false;
	}, [setActiveScreen]);

	const handleAnimationComplete = useCallback(() => {
		if (phaseRef.current === 'fade-in') {
			setPhase('hold');
		}

		if (phaseRef.current === 'fade-out') {
			advanceToNextScreen();
		}
	}, [advanceToNextScreen]);

	const handleSkip = useCallback(() => {
		if (isTransitioning.current) return;

		if (phaseRef.current === 'fade-in') {
			const elapsed = (Date.now() - fadeStartRef.current) / 1000;
			const fraction = Math.min(elapsed / FADE_SECONDS, 1);
			beginFadeOut(Math.max((fraction * FADE_SECONDS) / 2, 0.15));
			return;
		}

		if (phaseRef.current === 'hold') {
			beginFadeOut(FADE_SECONDS / 2);
		}
	}, [beginFadeOut]);

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
	useEventListener('pointerdown', handleSkip);
	useEventListener('keydown', handleSkip);

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
