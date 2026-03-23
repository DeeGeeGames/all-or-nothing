import { Box, Typography, Stack } from '@mui/material';
import { ControllerType, InputAction } from '@/input/input-types';
import { ControllerButtonLabels } from '@/input/controller-mappings';
import { ButtonGlyphMap } from './button-glyph-map';
import { useSteamGlyphMap } from '@/atoms';

interface ButtonPromptProps {
	action: InputAction;
	controllerType: ControllerType;
	label: string;
}

/**
 * Display a single button prompt (e.g., "A - Select")
 */
export function ButtonPrompt({ action, controllerType, label }: ButtonPromptProps) {
	const steamGlyphs = useSteamGlyphMap();
	const steamGlyphUrl = steamGlyphs?.[action];
	const GlyphComponent = ButtonGlyphMap[controllerType]?.[action];
	const buttonLabel = ControllerButtonLabels[controllerType][action];

	if (!steamGlyphUrl && !GlyphComponent) return null;

	const glyphElement = steamGlyphUrl
		? <img src={steamGlyphUrl} width={28} height={28} alt={buttonLabel} style={{ display: 'block' }} />
		: GlyphComponent
			? <GlyphComponent width={28} height={28} viewBox="0 0 64 64" aria-label={buttonLabel} style={{ display: 'block' }} />
			: null;

	return (
		<Stack direction="row" spacing={0.5} alignItems="center">
			{glyphElement}
			<Typography variant="body2" sx={{ color: 'rgba(0, 0, 0, 0.7)' }}>
				{label}
			</Typography>
		</Stack>
	);
}

interface ButtonPromptsBarProps {
	controllerType: ControllerType;
	prompts: Array<{ action: InputAction; label: string }>;
}

/**
 * Display a bar of button prompts for current context
 */
export function ButtonPromptsBar({ controllerType, prompts }: ButtonPromptsBarProps) {
	if (controllerType === ControllerType.GENERIC) return null;

	return (
		<Box
			sx={{
				display: 'flex',
				gap: 2,
				flexWrap: 'wrap',
				p: 1,
				bgcolor: 'rgba(255, 255, 255, 0.9)',
				borderRadius: 1,
			}}
		>
			{prompts.map((prompt, index) => (
				<ButtonPrompt
					key={index}
					action={prompt.action}
					controllerType={controllerType}
					label={prompt.label}
				/>
			))}
		</Box>
	);
}
