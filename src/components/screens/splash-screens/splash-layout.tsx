import { type ReactNode } from 'react';
import Box from '@mui/material/Box';

interface SplashLayoutProps {
	children: ReactNode;
}

export default function SplashLayout({ children }: SplashLayoutProps) {
	return (
		<Box
			display="flex"
			flexDirection="column"
			alignItems="center"
			justifyContent="center"
			height="100vh"
			width="100vw"
			bgcolor="#000"
			gap={3}
		>
			{children}
		</Box>
	);
}
