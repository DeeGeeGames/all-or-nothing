import { atom, useAtomValue, useSetAtom } from 'jotai';
import { useEffect } from 'react';
import { Screens } from './types';
import { ControllerType } from './input/input-types';
import { getSoundEnabled, getMusicEnabled, updateSoundEnabled, updateMusicEnabled } from './core';
import { useClearFocus } from './focus/focus-atoms';

const soundAtom = atom(true);

export
function useIsSoundEnabled() {
	return useAtomValue(soundAtom);
}

const setSoundAtom = atom(
	null,
	async (_get, set, enabled: boolean) => {
		set(soundAtom, enabled);
		await updateSoundEnabled(enabled);
	}
);

export
function useSetIsSoundEnabled() {
	return useSetAtom(setSoundAtom);
}

const musicAtom = atom(true);

export
function useIsMusicEnabled() {
	return useAtomValue(musicAtom);
}

const setMusicAtom = atom(
	null,
	async (_get, set, enabled: boolean) => {
		set(musicAtom, enabled);
		await updateMusicEnabled(enabled);
	}
);

export
function useSetIsMusicEnabled() {
	return useSetAtom(setMusicAtom);
}

const loadAudioSettingsAtom = atom(
	null,
	async (_get, set) => {
		const [soundEnabled, musicEnabled] = await Promise.all([
			getSoundEnabled(),
			getMusicEnabled(),
		]);
		set(soundAtom, soundEnabled);
		set(musicAtom, musicEnabled);
	}
);

export
function useLoadAudioSettings() {
	return useSetAtom(loadAudioSettingsAtom);
}

const activeControllerAtom = atom<ControllerType | null>(null);
const forcedPlatformAtom = atom<ControllerType | null>(null);

export
function useActiveController() {
	const forcedPlatform = useAtomValue(forcedPlatformAtom);
	const activeController = useAtomValue(activeControllerAtom);
	const clearFocus = useClearFocus();
	const currentControls = forcedPlatform || activeController;

	useEffect(() => {
		if(currentControls) return;

		clearFocus();
	}, [currentControls])

	return currentControls;
}

export
function useSetActiveController() {
	return useSetAtom(activeControllerAtom);
}

export
function useSetForcedPlatform() {
	return useSetAtom(forcedPlatformAtom);
}

const pausedAtom = atom(false);

const activeScreenAtom = atom<Screens>(Screens.Splash);

export
function useActiveScreen() {
	return useAtomValue(activeScreenAtom);
}

export
function useSetActiveScreen() {
	return useSetAtom(activeScreenAtom);
}

const splashCompleteAtom = atom(false);

export
function useSplashComplete() {
	return useAtomValue(splashCompleteAtom);
}

export
function useSetSplashComplete() {
	return useSetAtom(splashCompleteAtom);
}

export
function useIsPaused() {
	return useAtomValue(pausedAtom);
}

export
function useSetIsPaused() {
	return useSetAtom(pausedAtom);
}

const usingNavigationalInputAtom = atom(get => get(activeControllerAtom) !== null);

export
function useUsingNavigationalInput() {
	return useAtomValue(usingNavigationalInputAtom);
}

// Debug Utilities
// TODO: Does this need to be a hook or can it be just a global fn?
export
function useSetupDebugUtilities() {
	const setForcedPlatform = useSetForcedPlatform();

	useEffect(() => {
		const validPlatforms = Object.values(ControllerType);

		window.forcePlatform = (platform?: string) => {
			if (platform === undefined || platform === 'mouse') {
				setForcedPlatform(null);
				return;
			}

			if (!validPlatforms.includes(platform as ControllerType)) {
				throw new Error(
					`Invalid platform '${platform}'. Valid options: ${validPlatforms.join(', ')}, mouse`
				);
			}

			setForcedPlatform(platform as ControllerType);
		};

		return () => {
			delete window.forcePlatform;
		};
	}, [setForcedPlatform]);
}
