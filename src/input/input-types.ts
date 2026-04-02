import { Enum } from "@/types";
import { pick } from "@/utils";

/**
 * Unified input action types for controller and keyboard
 */
export const InputAction = {
	SELECT: 'SELECT',
	BACK: 'BACK',
	PAUSE: 'PAUSE',
	HINT: 'HINT',
	SHUFFLE: 'SHUFFLE',
	NAVIGATE_UP: 'NAVIGATE_UP',
	NAVIGATE_DOWN: 'NAVIGATE_DOWN',
	NAVIGATE_LEFT: 'NAVIGATE_LEFT',
	NAVIGATE_RIGHT: 'NAVIGATE_RIGHT',
} as const;
export type InputAction = Enum<typeof InputAction>

export const PrimaryInputAction = pick(InputAction,
	'NAVIGATE_UP',
	'NAVIGATE_DOWN',
	'NAVIGATE_LEFT',
	'NAVIGATE_RIGHT',
	'SELECT',
);
export type PrimaryInputAction = Enum<typeof PrimaryInputAction>;

/**
 * Controller types supported by the application
 */
export const ControllerType = {
	XBOX: 'xbox',
	PLAYSTATION: 'playstation',
	NINTENDO_SWITCH: 'switch',
	STEAMDECK: 'steamdeck',
	KEYBOARD: 'keyboard',
	GENERIC: 'generic',
} as const;
export type ControllerType = Enum<typeof ControllerType>;

/**
 * Input event emitted when a button/key is pressed
 */
export interface InputEvent {
	action: InputAction;
	source: ControllerType;
	sourceIndex?: number | 'keyboard';
	timestamp: number;
}

/**
 * Button state for tracking pressed/released states
 */
export interface ButtonState {
	pressed: boolean;
	justPressed: boolean; // True only on the frame the button was pressed
	justReleased: boolean; // True only on the frame the button was released
}

/**
 * Navigation direction for 2D grid and 1D list navigation
 */
export const NavigationDirection = {
	UP: 'UP',
	DOWN: 'DOWN',
	LEFT: 'LEFT',
	RIGHT: 'RIGHT',
} as const;
export type NavigationDirection = Enum<typeof NavigationDirection>;

/**
 * Maps navigation InputActions to NavigationDirections
 */
export const InputActionToDirection: Partial<Record<InputAction, NavigationDirection>> = {
	[InputAction.NAVIGATE_UP]: NavigationDirection.UP,
	[InputAction.NAVIGATE_DOWN]: NavigationDirection.DOWN,
	[InputAction.NAVIGATE_LEFT]: NavigationDirection.LEFT,
	[InputAction.NAVIGATE_RIGHT]: NavigationDirection.RIGHT,
} as const;

/**
 * Input listener callback type
 */
export type InputListener = (event: InputEvent) => void;

/**
 * Gamepad button indices (standard mapping)
 */
export const GamepadButton = {
	A: 0, // Bottom button (Cross on PS)
	B: 1, // Right button (Circle on PS)
	X: 2, // Left button (Square on PS)
	Y: 3, // Top button (Triangle on PS)
	LB: 4, // Left bumper
	RB: 5, // Right bumper
	LT: 6, // Left trigger
	RT: 7, // Right trigger
	SELECT: 8, // Select/Share/Minus
	START: 9, // Start/Options/Plus
	L_STICK: 10, // Left stick press
	R_STICK: 11, // Right stick press
	D_UP: 12, // D-pad up
	D_DOWN: 13, // D-pad down
	D_LEFT: 14, // D-pad left
	D_RIGHT: 15, // D-pad right
	HOME: 16,
} as const;
export type GamepadButton = Enum<typeof GamepadButton>;

/**
 * Gamepad axis indices
 */
export const GamepadAxis = {
	LEFT_STICK_X: 0,
	LEFT_STICK_Y: 1,
	RIGHT_STICK_X: 2,
	RIGHT_STICK_Y: 3,
} as const;
export type GamepadAxis = Enum<typeof GamepadAxis>
