import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

export default function ReactSplash() {
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
			<svg
				xmlns="http://www.w3.org/2000/svg"
				viewBox="-11.5 -10.23174 23 20.46348"
				width={120}
				height={120}
			>
				<circle cx="0" cy="0" r="2.05" fill="#61dafb" />
				<g stroke="#61dafb" strokeWidth="1" fill="none">
					<ellipse rx="11" ry="4.2" />
					<ellipse rx="11" ry="4.2" transform="rotate(60)" />
					<ellipse rx="11" ry="4.2" transform="rotate(120)" />
				</g>
			</svg>
			<Typography
				color="#ffffff"
				fontFamily="'Roboto', sans-serif"
				fontSize={18}
				letterSpacing={2}
				sx={{ opacity: 0.85 }}
			>
				Built with React
			</Typography>
		</Box>
	);
}
