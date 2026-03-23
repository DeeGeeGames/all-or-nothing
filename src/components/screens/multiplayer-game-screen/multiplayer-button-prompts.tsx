import { Box, Typography } from '@mui/material';
import type { SxProps } from '@mui/material';
import { ControllerType, InputAction } from '@/input/input-types';
import { ButtonGlyphMap, keyboardGlyphStyle } from '@/components/button-prompts/button-glyph-map';
import { useSteamGlyphMap } from '@/atoms';

interface MultiplayerButtonPromptsProps {
	controllerTypes: readonly ControllerType[];
	actions: ReadonlyArray<{ action: InputAction; label: string }>;
	sx?: SxProps;
}

export default function MultiplayerButtonPrompts({ controllerTypes, actions, sx }: MultiplayerButtonPromptsProps) {
	const uniqueTypes = [...new Set(controllerTypes)];
	const steamGlyphs = useSteamGlyphMap();

	return (
		<Box display="flex" justifyContent="center" gap={3} paddingY={1} sx={sx}>
			{actions.map(({ action, label }) => (
				<Box key={action} display="flex" alignItems="center" gap={0.5}>
					<Typography variant="body2" color="text.secondary">
						{label}:
					</Typography>
					{(() => {
						const steamGlyphUrl = steamGlyphs?.[action];
						if (steamGlyphUrl) {
							return <img src={steamGlyphUrl} width={40} height={40} alt={label} style={{ display: 'block' }} />;
						}
						return uniqueTypes.map(type => {
							const GlyphComponent = ButtonGlyphMap[type]?.[action];
							if (!GlyphComponent) return null;
							return (
								<GlyphComponent
									key={type}
									width={40}
									height={40}
									viewBox="0 0 64 64"
									style={type === ControllerType.KEYBOARD ? keyboardGlyphStyle : undefined}
								/>
							);
						});
					})()}
				</Box>
			))}
		</Box>
	);
}
