import {
	ControllerType,
	InputAction,
	InputEvent,
	InputListener,
} from './input-types';

type GlyphListener = (glyphs: Readonly<Record<string, string>> | null) => void;

export class SteamInputManager {
	private listeners: InputListener[] = [];
	private glyphListeners: GlyphListener[] = [];
	private initialized = false;

	public async init(): Promise<boolean> {
		const api = window.electronAPI?.steam;
		if (!api) return false;

		try {
			const success = await api.initInput();
			if (!success) return false;

			api.onInputEvent((data) => {
				const event: InputEvent = {
					action: data.action as InputAction,
					source: data.controllerType as ControllerType,
					timestamp: Date.now(),
				};
				this.listeners.forEach(listener => listener(event));
			});

			api.onGlyphMap((data) => {
				this.glyphListeners.forEach(listener => listener(data.glyphs));
			});

			this.initialized = true;
			return true;
		} catch {
			return false;
		}
	}

	public destroy(): void {
		const api = window.electronAPI?.steam;
		if (api) {
			api.offInputEvent();
			api.offGlyphMap();
			api.shutdownInput();
		}
		this.glyphListeners = [];
		this.listeners = [];
		this.initialized = false;
	}

	public addListener(listener: InputListener): this {
		this.listeners.push(listener);
		return this;
	}

	public removeListener(listener: InputListener): this {
		this.listeners = this.listeners.filter(l => l !== listener);
		return this;
	}

	public addGlyphListener(listener: GlyphListener): this {
		this.glyphListeners.push(listener);
		return this;
	}

	public removeGlyphListener(listener: GlyphListener): this {
		this.glyphListeners = this.glyphListeners.filter(l => l !== listener);
		return this;
	}

	public isInitialized(): boolean {
		return this.initialized;
	}
}

let steamInputManager: SteamInputManager | null = null;

export function getSteamInputManager(): SteamInputManager {
	if (!steamInputManager) {
		steamInputManager = new SteamInputManager();
	}
	return steamInputManager;
}
