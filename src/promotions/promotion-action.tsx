import { Box, Button, type SxProps, type Theme } from '@mui/material';
import type { ReactNode } from 'react';
import { useFocusable } from '@/focus/useFocusable';
import { useActivationGuard } from '@/hooks';
import FocusIndicator from '@/components/focus-indicator';

interface Props {
	readonly id: string;
	readonly group: string;
	readonly order: number;
	readonly onClick: () => void;
	readonly children: ReactNode;
	readonly label?: string;
	readonly sx?: SxProps<Theme>;
	readonly disabled?: boolean;
}

export default function PromotionAction({ id, group, order, onClick, children, label, sx, disabled }: Props) {
	const activate = useActivationGuard(onClick);
	const { ref, isFocused, focus } = useFocusable({ id, group, order, onSelect: activate, disabled });
	return (
		<Box ref={ref} sx={{ position: 'relative' }}>
			<FocusIndicator visible={isFocused} />
			<Button variant="text" aria-label={label} disabled={disabled} onClick={activate} onFocus={focus} sx={sx}>
				{children}
			</Button>
		</Box>
	);
}
