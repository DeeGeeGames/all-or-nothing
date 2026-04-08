import { ControllerType, GamepadButton, InputAction } from './input-types';

/**
 * Mapping of gamepad buttons to input actions for each controller type
 */
export const ControllerMappings: Record<ControllerType, Partial<Record<GamepadButton, InputAction>>> = {
	[ControllerType.XBOX]: {
		[GamepadButton.A]: InputAction.SELECT,
		[GamepadButton.B]: InputAction.BACK,
		[GamepadButton.X]: InputAction.HINT,
		[GamepadButton.Y]: InputAction.SHUFFLE,
		[GamepadButton.START]: InputAction.PAUSE,
		[GamepadButton.D_UP]: InputAction.NAVIGATE_UP,
		[GamepadButton.D_DOWN]: InputAction.NAVIGATE_DOWN,
		[GamepadButton.D_LEFT]: InputAction.NAVIGATE_LEFT,
		[GamepadButton.D_RIGHT]: InputAction.NAVIGATE_RIGHT,
	},
	[ControllerType.PLAYSTATION]: {
		[GamepadButton.A]: InputAction.SELECT, // Cross button
		[GamepadButton.B]: InputAction.BACK, // Circle button
		[GamepadButton.X]: InputAction.HINT, // Square button
		[GamepadButton.Y]: InputAction.SHUFFLE, // Triangle button
		[GamepadButton.START]: InputAction.PAUSE, // Options button
		[GamepadButton.D_UP]: InputAction.NAVIGATE_UP,
		[GamepadButton.D_DOWN]: InputAction.NAVIGATE_DOWN,
		[GamepadButton.D_LEFT]: InputAction.NAVIGATE_LEFT,
		[GamepadButton.D_RIGHT]: InputAction.NAVIGATE_RIGHT,
	},
	[ControllerType.NINTENDO_SWITCH]: {
		[GamepadButton.B]: InputAction.SELECT, // Bottom button (B on Switch)
		[GamepadButton.A]: InputAction.BACK, // Right button (A on Switch)
		[GamepadButton.Y]: InputAction.HINT, // Left button (Y on Switch)
		[GamepadButton.X]: InputAction.SHUFFLE, // Top button (X on Switch)
		[GamepadButton.START]: InputAction.PAUSE, // Plus button
		[GamepadButton.D_UP]: InputAction.NAVIGATE_UP,
		[GamepadButton.D_DOWN]: InputAction.NAVIGATE_DOWN,
		[GamepadButton.D_LEFT]: InputAction.NAVIGATE_LEFT,
		[GamepadButton.D_RIGHT]: InputAction.NAVIGATE_RIGHT,
	},
	[ControllerType.STEAMDECK]: {
		[GamepadButton.A]: InputAction.SELECT, // Bottom button (A)
		[GamepadButton.B]: InputAction.BACK, // Right button (B)
		[GamepadButton.X]: InputAction.HINT, // Left button (X)
		[GamepadButton.Y]: InputAction.SHUFFLE, // Top button (Y)
		[GamepadButton.START]: InputAction.PAUSE, // Menu button
		[GamepadButton.D_UP]: InputAction.NAVIGATE_UP,
		[GamepadButton.D_DOWN]: InputAction.NAVIGATE_DOWN,
		[GamepadButton.D_LEFT]: InputAction.NAVIGATE_LEFT,
		[GamepadButton.D_RIGHT]: InputAction.NAVIGATE_RIGHT,
	},
	[ControllerType.GENERIC]: {
		[GamepadButton.A]: InputAction.SELECT,
		[GamepadButton.B]: InputAction.BACK,
		[GamepadButton.X]: InputAction.HINT,
		[GamepadButton.Y]: InputAction.SHUFFLE,
		[GamepadButton.START]: InputAction.PAUSE,
		[GamepadButton.D_UP]: InputAction.NAVIGATE_UP,
		[GamepadButton.D_DOWN]: InputAction.NAVIGATE_DOWN,
		[GamepadButton.D_LEFT]: InputAction.NAVIGATE_LEFT,
		[GamepadButton.D_RIGHT]: InputAction.NAVIGATE_RIGHT,
	},
	[ControllerType.KEYBOARD]: {}, // Keyboard uses key mappings instead
};

/**
 * Keyboard key mappings to input actions
 */
export const KeyboardMappings: Record<string, InputAction> = {
	// Navigation - Arrow keys
	ArrowUp: InputAction.NAVIGATE_UP,
	ArrowDown: InputAction.NAVIGATE_DOWN,
	ArrowLeft: InputAction.NAVIGATE_LEFT,
	ArrowRight: InputAction.NAVIGATE_RIGHT,

	// Navigation - WASD
	w: InputAction.NAVIGATE_UP,
	W: InputAction.NAVIGATE_UP,
	s: InputAction.NAVIGATE_DOWN,
	S: InputAction.NAVIGATE_DOWN,
	a: InputAction.NAVIGATE_LEFT,
	A: InputAction.NAVIGATE_LEFT,
	d: InputAction.NAVIGATE_RIGHT,
	D: InputAction.NAVIGATE_RIGHT,

	// Actions
	Enter: InputAction.SELECT,
	' ': InputAction.SELECT, // Space key
	Escape: InputAction.BACK,

	// Game actions
	h: InputAction.HINT,
	H: InputAction.HINT,
	e: InputAction.SHUFFLE,
	E: InputAction.SHUFFLE,
	p: InputAction.PAUSE,
	P: InputAction.PAUSE,
};

/**
 * Display labels for controller buttons (for UI hints)
 */
export const ControllerButtonLabels: Record<ControllerType, Record<InputAction, string>> = {
	[ControllerType.XBOX]: {
		[InputAction.SELECT]: 'A',
		[InputAction.BACK]: 'B',
		[InputAction.HINT]: 'X',
		[InputAction.SHUFFLE]: 'Y',
		[InputAction.PAUSE]: 'Start',
		[InputAction.NAVIGATE_UP]: 'D-Pad ↑',
		[InputAction.NAVIGATE_DOWN]: 'D-Pad ↓',
		[InputAction.NAVIGATE_LEFT]: 'D-Pad ←',
		[InputAction.NAVIGATE_RIGHT]: 'D-Pad →',
	},
	[ControllerType.PLAYSTATION]: {
		[InputAction.SELECT]: '✕',
		[InputAction.BACK]: '○',
		[InputAction.HINT]: '□',
		[InputAction.SHUFFLE]: '△',
		[InputAction.PAUSE]: 'Options',
		[InputAction.NAVIGATE_UP]: 'D-Pad ↑',
		[InputAction.NAVIGATE_DOWN]: 'D-Pad ↓',
		[InputAction.NAVIGATE_LEFT]: 'D-Pad ←',
		[InputAction.NAVIGATE_RIGHT]: 'D-Pad →',
	},
	[ControllerType.NINTENDO_SWITCH]: {
		[InputAction.SELECT]: 'B',
		[InputAction.BACK]: 'A',
		[InputAction.HINT]: 'Y',
		[InputAction.SHUFFLE]: 'X',
		[InputAction.PAUSE]: '+',
		[InputAction.NAVIGATE_UP]: 'D-Pad ↑',
		[InputAction.NAVIGATE_DOWN]: 'D-Pad ↓',
		[InputAction.NAVIGATE_LEFT]: 'D-Pad ←',
		[InputAction.NAVIGATE_RIGHT]: 'D-Pad →',
	},
	[ControllerType.STEAMDECK]: {
		[InputAction.SELECT]: 'A',
		[InputAction.BACK]: 'B',
		[InputAction.HINT]: 'X',
		[InputAction.SHUFFLE]: 'Y',
		[InputAction.PAUSE]: 'Menu',
		[InputAction.NAVIGATE_UP]: 'D-Pad ↑',
		[InputAction.NAVIGATE_DOWN]: 'D-Pad ↓',
		[InputAction.NAVIGATE_LEFT]: 'D-Pad ←',
		[InputAction.NAVIGATE_RIGHT]: 'D-Pad →',
	},
	[ControllerType.KEYBOARD]: {
		[InputAction.SELECT]: 'Enter',
		[InputAction.BACK]: 'Esc',
		[InputAction.HINT]: 'H',
		[InputAction.SHUFFLE]: 'E',
		[InputAction.PAUSE]: 'P',
		[InputAction.NAVIGATE_UP]: '↑',
		[InputAction.NAVIGATE_DOWN]: '↓',
		[InputAction.NAVIGATE_LEFT]: '←',
		[InputAction.NAVIGATE_RIGHT]: '→',
	},
	[ControllerType.GENERIC]: {
		[InputAction.SELECT]: 'A',
		[InputAction.BACK]: 'B',
		[InputAction.HINT]: 'X',
		[InputAction.SHUFFLE]: 'Y',
		[InputAction.PAUSE]: 'Start',
		[InputAction.NAVIGATE_UP]: 'D-Pad ↑',
		[InputAction.NAVIGATE_DOWN]: 'D-Pad ↓',
		[InputAction.NAVIGATE_LEFT]: 'D-Pad ←',
		[InputAction.NAVIGATE_RIGHT]: 'D-Pad →',
	},
};

/**
 * Detect controller type from gamepad id string
 */
export function detectControllerType(gamepadId: string): ControllerType {
	const id = gamepadId.toLowerCase();

	// Xbox controller detection
	if (id.includes('xbox') || id.includes('xinput') || id.includes('045e')) {
		return ControllerType.XBOX;
	}

	// PlayStation controller detection
	if (id.includes('playstation') || id.includes('dualshock') || id.includes('dualsense') ||
	    id.includes('054c') || id.includes('ps3') || id.includes('ps4') || id.includes('ps5')) {
		return ControllerType.PLAYSTATION;
	}

	// Nintendo Switch controller detection
	if (id.includes('nintendo') || id.includes('switch') || id.includes('joy-con') ||
	    id.includes('joycon') || id.includes('057e')) {
		return ControllerType.NINTENDO_SWITCH;
	}

	// Steam Deck controller detection
	if (id.includes('steamdeck') || id.includes('steam deck') || id.includes('valve') ||
	    id.includes('28de')) {
		return ControllerType.STEAMDECK;
	}

	return ControllerType.GENERIC;
}
