import { useEffect, useRef, useCallback } from 'react';
import { getGamepadManager } from './gamepad-manager';
import { getKeyboardManager } from './keyboard-manager';
import { getSteamInputManager } from './steam-input-manager';
import { InputEvent } from './input-types';

type InputListener = (event: InputEvent) => void;

// Reference counting for manager lifecycle
// These track how many components are using each manager
let gamepadInitCount = 0;
let keyboardInitCount = 0;
let steamInputInitCount = 0;
let steamInputActive = false;

// Callbacks to notify all useGamepadManager consumers when Steam Input activates
const steamInputActivatedCallbacks: Set<() => void> = new Set();

/**
 * Hook to manage Steam Input with automatic lifecycle handling.
 * Only activates in Electron/Steam environments. No-op in web/PWA builds.
 * Must be called before useGamepadManager in the component tree.
 *
 * @param listener - Callback function to receive Steam Input events
 */
export
function useSteamInputManager(
	listener: InputListener,
	onGlyphs?: (glyphs: Readonly<Record<string, string>> | null) => void,
): void {
	const listenerRef = useRef(listener);

	useEffect(() => {
		listenerRef.current = listener;
	}, [listener]);

	const stableListener = useCallback((event: InputEvent) => {
		listenerRef.current(event);
	}, []);

	const glyphRef = useRef(onGlyphs);

	useEffect(() => {
		glyphRef.current = onGlyphs;
	}, [onGlyphs]);

	const stableGlyphListener = useCallback((glyphs: Readonly<Record<string, string>> | null) => {
		glyphRef.current?.(glyphs);
	}, []);

	useEffect(() => {
		// No-op in non-Electron environments
		if (!window.electronAPI) return;

		const manager = getSteamInputManager();

		if (!steamInputInitCount) {
			manager.init().then(success => {
				if (success) {
					steamInputActive = true;
					steamInputActivatedCallbacks.forEach(cb => cb());
					steamInputActivatedCallbacks.clear();
				}
			});
		}

		steamInputInitCount++;
		manager.addListener(stableListener);
		manager.addGlyphListener(stableGlyphListener);

		return () => {
			manager.removeListener(stableListener);
			manager.removeGlyphListener(stableGlyphListener);
			steamInputInitCount--;

			if (!steamInputInitCount) {
				manager.destroy();
				steamInputActive = false;
			}
		};
	}, [stableListener, stableGlyphListener]);
}

/**
 * Hook to manage gamepad input with automatic lifecycle handling.
 * Handles init/destroy and listener registration/cleanup.
 * Safe to use in multiple components via reference counting.
 * Automatically disabled when Steam Input is active to prevent double-input.
 *
 * @param listener - Callback function to receive gamepad input events
 */
export
function useGamepadManager(listener: InputListener): void {
	const listenerRef = useRef(listener);

	useEffect(() => {
		listenerRef.current = listener;
	}, [listener]);

	const stableListener = useCallback((event: InputEvent) => {
		listenerRef.current(event);
	}, []);

	useEffect(() => {
		// Skip if Steam Input is already active
		if (steamInputActive) return;

		const manager = getGamepadManager();

		if (!gamepadInitCount) manager.init();

		gamepadInitCount++;

		manager.addListener(stableListener);

		// If Steam Input activates later, tear down this consumer's gamepad listener
		const teardown = () => {
			manager.removeListener(stableListener);
			gamepadInitCount--;
			if (!gamepadInitCount) manager.destroy();
		};

		steamInputActivatedCallbacks.add(teardown);

		return () => {
			steamInputActivatedCallbacks.delete(teardown);
			teardown();
		};
	}, [stableListener]);
}

/**
 * Hook to manage keyboard input with automatic lifecycle handling.
 * Handles init/destroy and listener registration/cleanup.
 * Safe to use in multiple components via reference counting.
 *
 * @param listener - Callback function to receive keyboard input events
 */
export
function useKeyboardManager(listener: InputListener): void {
	// Store listener in ref to allow changes without re-initialization
	const listenerRef = useRef(listener);

	// Update ref when listener changes (no effect re-run needed)
	useEffect(() => {
		listenerRef.current = listener;
	}, [listener]);

	// Create stable callback that uses the ref
	const stableListener = useCallback((event: InputEvent) => {
		listenerRef.current(event);
	}, []);

	useEffect(() => {
		const manager = getKeyboardManager();

		// Only init on first consumer to avoid duplicate event listeners
		if (!keyboardInitCount) manager.init();

		keyboardInitCount++;

		manager.addListener(stableListener);

		return () => {
			manager.removeListener(stableListener);
			keyboardInitCount--;

			// Only destroy when last consumer unmounts
			if (!keyboardInitCount) manager.destroy();
		};
	}, [stableListener]); // Only depends on stable callback
}
