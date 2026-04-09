import {
	ControllerType,
	GamepadAxis,
	GamepadButton,
	InputAction,
	InputEvent,
	InputListener,
} from './input-types';
import { ControllerMappings, detectControllerType } from './controller-mappings';

/**
 * Threshold for analog stick input to be considered a directional press
 */
const ANALOG_THRESHOLD = 0.5;

/**
 * Deadzone for analog stick to prevent drift
 */
const ANALOG_DEADZONE = 0.15;

/**
 * Manages gamepad input using the browser Gamepad API
 */
export class GamepadManager {
	private listeners: InputListener[] = [];
	private previousButtonStates: Map<number, boolean[]> = new Map();
	private previousAxisStates: Map<number, { x: boolean; y: boolean }> = new Map();
	private animationFrameId: number | null = null;
	private connectedGamepads: Map<number, Gamepad> = new Map();
	private controllerTypes: Map<number, ControllerType> = new Map();
	private onControllerConnected: ((type: ControllerType, index: number) => void) | null = null;
	private onControllerDisconnected: ((index: number) => void) | null = null;

	constructor() {
		this.handleGamepadConnected = this.handleGamepadConnected.bind(this);
		this.handleGamepadDisconnected = this.handleGamepadDisconnected.bind(this);
		this.poll = this.poll.bind(this);
	}

	/**
	 * Initialize the gamepad manager
	 */
	public init() {
		window.addEventListener('gamepadconnected', this.handleGamepadConnected);
		window.addEventListener('gamepaddisconnected', this.handleGamepadDisconnected);

		// Check for already connected gamepads
		const gamepads = navigator.getGamepads();
		for (const gamepad of gamepads) {
			if (gamepad) {
				this.handleGamepadConnected({ gamepad } as GamepadEvent);
			}
		}

		return this;
	}

	/**
	 * Clean up the gamepad manager
	 */
	public destroy(): void {
		window.removeEventListener('gamepadconnected', this.handleGamepadConnected);
		window.removeEventListener('gamepaddisconnected', this.handleGamepadDisconnected);
		this.stopPolling();
		this.listeners = [];
	}

	/**
	 * Add an input listener
	 */
	public addListener(listener: InputListener) {
		this.listeners.push(listener);
		return this;
	}

	/**
	 * Remove an input listener
	 */
	public removeListener(listener: InputListener) {
		this.listeners = this.listeners.filter(l => l !== listener);
		return this;
	}

	/**
	 * Set callback for controller connection
	 */
	public setOnControllerConnected(callback: (type: ControllerType, index: number) => void) {
		this.onControllerConnected = callback;
		return this;
	}

	/**
	 * Set callback for controller disconnection
	 */
	public setOnControllerDisconnected(callback: ((index: number) => void) | null) {
		this.onControllerDisconnected = callback;

		return this;
	}

	/**
	 * Get the first connected controller's type (backward compatible)
	 */
	public getControllerType(): ControllerType | null {
		if (this.connectedGamepads.size === 0) return null;
		const firstIndex = this.getConnectedGamepadIndexes()[0];
		if (firstIndex === undefined) return null;
		return this.controllerTypes.get(firstIndex) ?? null;
	}

	/**
	 * Get the controller type for a specific gamepad index
	 */
	public getControllerTypeForIndex(index: number): ControllerType | null {
		return this.controllerTypes.get(index) ?? null;
	}

	/**
	 * Get all connected gamepad indices
	 */
	public getConnectedGamepadIndexes(): number[] {
		return Array.from(this.connectedGamepads.keys());
	}

	/**
	 * Handle gamepad connection
	 */
	private handleGamepadConnected(event: GamepadEvent): void {
		const gamepad = event.gamepad;
		const controllerType = detectControllerType(gamepad.id);
		console.log('Gamepad connected:', gamepad.id);
		console.log('Detected controller type:', controllerType);

		this.connectedGamepads.set(gamepad.index, gamepad);
		this.controllerTypes.set(gamepad.index, controllerType);

		// Initialize button states for this gamepad
		this.previousButtonStates.set(gamepad.index, new Array(gamepad.buttons.length).fill(false));
		this.previousAxisStates.set(gamepad.index, { x: false, y: false });

		this.startPolling();

		if (this.onControllerConnected) {
			this.onControllerConnected(controllerType, gamepad.index);
		}
	}

	/**
	 * Handle gamepad disconnection
	 */
	private handleGamepadDisconnected(event: GamepadEvent): void {
		const gamepad = event.gamepad;
		console.log('Gamepad disconnected:', gamepad.id);

		this.connectedGamepads.delete(gamepad.index);
		this.controllerTypes.delete(gamepad.index);
		this.previousButtonStates.delete(gamepad.index);
		this.previousAxisStates.delete(gamepad.index);

		if (this.connectedGamepads.size === 0) {
			this.stopPolling();
		}

		if (this.onControllerDisconnected) {
			this.onControllerDisconnected(gamepad.index);
		}
	}

	/**
	 * Start polling for gamepad input
	 */
	private startPolling(): void {
		if (!this.animationFrameId) {
			this.poll();
		}
	}

	/**
	 * Stop polling for gamepad input
	 */
	private stopPolling(): void {
		if (this.animationFrameId) {
			cancelAnimationFrame(this.animationFrameId);
			this.animationFrameId = null;
		}
	}

	/**
	 * Poll gamepad state and emit input events
	 */
	private poll(): void {
		if (this.connectedGamepads.size === 0) {
			return;
		}

		// Get fresh gamepad state (must be called each frame)
		const gamepads = navigator.getGamepads();

		this.connectedGamepads.forEach((_, index) => {
			const gamepad = gamepads[index];
			if (!gamepad) return;

			this.processButtons(gamepad);
			this.processAnalogStick(gamepad);
		});

		this.animationFrameId = requestAnimationFrame(this.poll);
	}

	/**
	 * Process button presses
	 */
	private processButtons(gamepad: Gamepad): void {
		const previousStates = this.previousButtonStates.get(gamepad.index) || [];
		const controllerType = this.controllerTypes.get(gamepad.index) ?? ControllerType.GENERIC;
		const mapping = ControllerMappings[controllerType];

		gamepad.buttons.forEach((button, index) => {
			const isPressed = button.pressed;
			const wasPressed = previousStates[index] || false;

			// Button just pressed (rising edge)
			if (isPressed && !wasPressed) {
				if (index === GamepadButton.HOME) {
					window.electronAPI?.steam.activateOverlay();
					return;
				}

				const action = mapping[index as GamepadButton];
				if (action) {
					this.emitInputEvent(action, gamepad.index);
				}
			}

			previousStates[index] = isPressed;
		});

		this.previousButtonStates.set(gamepad.index, previousStates);
	}

	/**
	 * Process analog stick as directional input
	 */
	private processAnalogStick(gamepad: Gamepad): void {
		const axes = gamepad.axes;
		if (axes.length < 2) return;

		const previousState = this.previousAxisStates.get(gamepad.index) || { x: false, y: false };

		// Left stick X-axis (left/right)
		const xAxis = axes[GamepadAxis.LEFT_STICK_X];

		if(typeof xAxis === 'undefined') return;

		const xPressed = Math.abs(xAxis) > ANALOG_DEADZONE && Math.abs(xAxis) > ANALOG_THRESHOLD;

		if (xPressed && !previousState.x) {
			if (xAxis < 0) {
				this.emitInputEvent(InputAction.NAVIGATE_LEFT, gamepad.index);
			} else {
				this.emitInputEvent(InputAction.NAVIGATE_RIGHT, gamepad.index);
			}
		}

		// Left stick Y-axis (up/down)
		const yAxis = axes[GamepadAxis.LEFT_STICK_Y];

		if(typeof yAxis === 'undefined') return;

		const yPressed = Math.abs(yAxis) > ANALOG_DEADZONE && Math.abs(yAxis) > ANALOG_THRESHOLD;

		if (yPressed && !previousState.y) {
			if (yAxis < 0) {
				this.emitInputEvent(InputAction.NAVIGATE_UP, gamepad.index);
			} else {
				this.emitInputEvent(InputAction.NAVIGATE_DOWN, gamepad.index);
			}
		}

		this.previousAxisStates.set(gamepad.index, {
			x: xPressed,
			y: yPressed,
		});
	}

	/**
	 * Emit an input event to all listeners
	 */
	private emitInputEvent(action: InputAction, gamepadIndex: number): void {
		const event: InputEvent = {
			action,
			source: this.controllerTypes.get(gamepadIndex) ?? ControllerType.GENERIC,
			sourceIndex: gamepadIndex,
			timestamp: Date.now(),
		};

		this.listeners.forEach(listener => listener(event));
	}
}

// Singleton instance
let gamepadManager: GamepadManager | null = null;

/**
 * Get the singleton gamepad manager instance
 */
export function getGamepadManager(): GamepadManager {
	if (!gamepadManager) {
		gamepadManager = new GamepadManager();
	}
	return gamepadManager;
}
