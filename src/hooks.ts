import { useCallback, useEffect, useRef, useState } from 'react'
import { useMediaQuery } from '@mui/material';
import useSound from 'use-sound';
import { useIsSoundEnabled } from './atoms';
import soundfx from './soundfx.mp3';

export { useInterval } from 'usehooks-ts';

export function useIsMobilePwa() {
	return useMediaQuery('(display-mode: standalone) and (hover: none)');
}

export function useActivationGuard(handler: () => void) {
	const isActivatingRef = useRef(false);

	return useCallback(() => {
		if (isActivatingRef.current) {
			return;
		}

		isActivatingRef.current = true;
		handler();

		setTimeout(() => {
			isActivatingRef.current = false;
		}, 100);
	}, [handler]);
}

const SpriteMap: Record<string, [number, number]> = {
	deal1: [0, 120],
	deal2: [1350, 50],
	deal3: [250, 170],
	deal4: [1830, 100],
	flip1: [1500, 130],
	flip2: [2100, 100],
	flip3: [2200, 100],
	success: [8600, 900],
} as const;

export function useSoundEffects() {
	const isSoundEnabled = useIsSoundEnabled();
	const [play] = useSound(soundfx, {
		sprite: SpriteMap,
	});

	return (id: keyof typeof SpriteMap) => {
		if(!isSoundEnabled) {
			return;
		}

		play({id});
	};
}

export function useDebouncedValue<T>(value: T, delay = 250) {
	const [debouncedValue, setDebouncedValue] = useState(value);

	useEffect(() => {
		const handler = setTimeout(() => {
			setDebouncedValue(value);
		}, delay);
		return () => clearTimeout(handler);
	}, [value, delay]);
	return debouncedValue;
}
