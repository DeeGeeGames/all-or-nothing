import Typography from '@mui/material/Typography';
import SplashLayout from './splash-layout';

const responsiveSize = 'min(240px, 50vw)';

export default function ReactSplash() {
	return (
		<SplashLayout>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				viewBox="-11.5 -10.23174 23 20.46348"
				style={{ width: responsiveSize, height: responsiveSize }}
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
				fontSize={18}
				letterSpacing={2}
				sx={{ opacity: 0.85 }}
			>
				Built with React
			</Typography>
		</SplashLayout>
	);
}
