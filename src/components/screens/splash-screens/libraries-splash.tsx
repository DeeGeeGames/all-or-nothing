import { type ReactNode } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

interface LibraryEntry {
	name: string;
	color: string;
	logo: ReactNode;
}

const libraries: LibraryEntry[] = [
	{
		name: 'TypeScript',
		color: '#3178c6',
		logo: (
			<svg viewBox="0 0 128 128" width={48} height={48}>
				<rect width="128" height="128" rx="10" fill="#3178c6" />
				<path d="M82.8 89.2c2.2 3.6 5.4 6.2 10 7.8 4.6 1.6 9.6 1.8 14.2.4 3-1 5.2-2.6 6.6-5 1.4-2.4 2-5 1.8-7.8-.2-2.6-1.2-4.8-2.8-6.6-1.8-2-4.2-3.6-7.2-5-2.2-1-4-2-5.4-3-1.4-1-2.2-2.2-2.4-3.4-.2-1.4.2-2.6 1-3.6 1-1 2.4-1.6 4.2-1.6 2 0 3.6.6 4.8 1.6 1.2 1.2 2 2.6 2.4 4.4l8.4-4.8c-1.4-3.6-3.8-6.4-7.2-8.2-3.4-1.8-7.2-2.6-11.4-2.2-3.6.4-6.8 1.4-9.4 3.4-2.6 1.8-4.4 4.2-5.2 7-.8 2.8-.6 5.8.6 8.4 1.2 2.6 3.2 4.6 5.8 6.2 2 1.2 4.4 2.4 7 3.4 1.8.8 3.2 1.6 4 2.6.8 1 1.2 2.2 1 3.4-.2 1.4-.8 2.4-2 3.2-1.2.8-2.8 1.2-4.6 1-2.4-.2-4.4-1-5.8-2.6-1.4-1.6-2.4-3.4-2.8-5.6l-8.6 4.6zM57 55.4h12.4v38.4h9.4V55.4H91V47H57v8.4z" fill="#fff" />
			</svg>
		),
	},
	{
		name: 'Vite',
		color: '#bd34fe',
		logo: (
			<svg viewBox="0 0 410 404" width={48} height={48}>
				<path d="M399.641 59.525l-183.998 329.02c-3.799 6.793-13.559 6.967-17.592.314L7.575 59.566c-4.478-7.397 2.266-16.252 10.553-14.22l190.903 46.715c1.262.309 2.564.32 3.831.031L393.321 45.18c8.252-1.886 14.791 6.89 10.32 14.345z" fill="url(#vite-grad-a)" />
				<path d="M292.965 1.474l-133.26 26.224c-2.254.444-3.907 2.377-3.955 4.672l-6.2 194.809c-.065 2.025 1.632 3.684 3.655 3.572l39.007-2.161c2.238-.124 4.04 1.88 3.697 4.113l-11.473 74.72c-.378 2.461 1.795 4.537 4.197 4.009l14.895-3.276c2.405-.53 4.582 1.553 4.196 4.019l-18.2 116.27c-.547 3.496 4.114 5.253 5.896 2.223l1.19-2.024 131.622-239.853c1.266-2.308-.568-5.088-3.158-4.787l-40.12 4.662c-2.39.278-4.326-1.944-3.743-4.297l22.636-91.42c.59-2.381-1.395-4.658-3.81-4.37z" fill="url(#vite-grad-b)" />
				<defs>
					<linearGradient id="vite-grad-a" x1="6.007" y1="32.094" x2="235" y2="344" gradientUnits="userSpaceOnUse">
						<stop stopColor="#41D1FF" /><stop offset="1" stopColor="#BD34FE" />
					</linearGradient>
					<linearGradient id="vite-grad-b" x1="194.651" y1="8.818" x2="236.076" y2="292.989" gradientUnits="userSpaceOnUse">
						<stop stopColor="#FFBD4F" /><stop offset="1" stopColor="#FF9640" />
					</linearGradient>
				</defs>
			</svg>
		),
	},
	{
		name: 'MUI',
		color: '#007FFF',
		logo: (
			<svg viewBox="0 0 36 32" width={48} height={43} fill="#007FFF">
				<path d="M30.343 21.976a1 1 0 00.502-.864l.018-5.787a1 1 0 01.502-.864l3.137-1.802a1 1 0 011.498.867v10.521a1 1 0 01-.502.867l-11.839 6.8a1 1 0 01-.994.001l-9.291-5.314a1 1 0 01-.504-.868v-5.305c0-.006.007-.01.013-.007.005.003.012 0 .012-.007v-.006c0-.004.002-.008.006-.01l7.652-4.396c.007-.004.004-.015-.004-.015a.008.008 0 01-.008-.008v-5.26a.006.006 0 00-.009-.005L8.503 12.06a1 1 0 01-1.006-.001L.497 8.143a1 1 0 01-.497-.866V1.003A1 1 0 011.5.136l7.503 4.304a1 1 0 001.006.001L17.509.136a1 1 0 011.006.001l7.496 4.304c.003.002.006.005.009.007.003-.002.006-.005.009-.007l7.496-4.304a1 1 0 011.498.867v15.433a1 1 0 01-.502.867l-3.997 2.293a1 1 0 01-1.502-.866z" />
			</svg>
		),
	},
	{
		name: 'framer motion',
		color: '#ff0055',
		logo: (
			<svg viewBox="0 0 14 21" width={32} height={48} fill="none">
				<path d="M0 0h14v7H7L0 0z" fill="#ff0055" />
				<path d="M0 0l7 7h7v7H0V0z" fill="#cc00aa" />
				<path d="M0 14h7l7 7H0v-7z" fill="#7700ff" />
			</svg>
		),
	},
	{
		name: 'Jotai',
		color: '#e0e0e0',
		logo: (
			<svg viewBox="0 0 100 100" width={48} height={48}>
				<circle cx="50" cy="40" r="30" fill="#1a1a2e" stroke="#e0e0e0" strokeWidth="3" />
				<circle cx="38" cy="34" r="5" fill="#fff" />
				<circle cx="62" cy="34" r="5" fill="#fff" />
				<circle cx="38" cy="34" r="2.5" fill="#1a1a2e" />
				<circle cx="62" cy="34" r="2.5" fill="#1a1a2e" />
				<path d="M40 50 Q50 58 60 50" stroke="#fff" strokeWidth="2.5" fill="none" strokeLinecap="round" />
				<path d="M35 70 Q50 85 65 70" stroke="#e0e0e0" strokeWidth="3" fill="none" strokeLinecap="round" />
			</svg>
		),
	},
	{
		name: 'Dexie',
		color: '#e8a427',
		logo: (
			<svg viewBox="0 0 100 100" width={48} height={48}>
				<rect x="10" y="15" width="80" height="70" rx="12" fill="#e8a427" opacity="0.9" />
				<rect x="22" y="30" width="56" height="8" rx="3" fill="#fff" opacity="0.7" />
				<rect x="22" y="44" width="40" height="8" rx="3" fill="#fff" opacity="0.7" />
				<rect x="22" y="58" width="48" height="8" rx="3" fill="#fff" opacity="0.7" />
			</svg>
		),
	},
	{
		name: 'Node',
		color: '#539e43',
		logo: (
			<svg viewBox="0 0 256 289" width={42} height={48}>
				<path d="M128 288.464c-3.975 0-7.685-1.06-11.13-2.915l-35.247-20.936c-5.3-2.915-2.65-3.975-1.06-4.505 7.155-2.385 8.48-2.915 15.9-7.155.795-.53 1.855-.265 2.65.265l27.032 16.166c1.06.53 2.385.53 3.18 0l105.74-61.217c1.06-.53 1.59-1.59 1.59-2.915V83.08c0-1.325-.53-2.385-1.59-2.915L128.53 19.167c-1.06-.53-2.385-.53-3.18 0L19.875 80.165c-1.06.53-1.59 1.855-1.59 2.915v122.17c0 1.06.53 2.385 1.59 2.915l28.887 16.695c15.635 7.95 25.44-1.325 25.44-10.6V93.15c0-1.59 1.325-3.18 3.18-3.18h13.25c1.59 0 3.18 1.325 3.18 3.18v121.11c0 20.935-11.395 33.126-31.27 33.126-6.095 0-10.865 0-24.38-6.625L10.6 225.296C4.24 221.585 0 214.695 0 207.275V85.105c0-7.42 4.24-14.31 10.6-18.02L116.34 5.868c6.095-3.445 14.31-3.445 20.405 0L243.4 67.085c6.36 3.71 10.6 10.6 10.6 18.02v122.17c0 7.42-4.24 14.31-10.6 18.02L137.66 286.514c-3.18 1.325-6.625 1.95-9.66 1.95z" fill="#539e43" />
			</svg>
		),
	},
	{
		name: 'Electron',
		color: '#9feaf9',
		logo: (
			<svg viewBox="-11.5 -10.23174 23 20.46348" width={48} height={48}>
				<circle cx="0" cy="0" r="2.05" fill="#9feaf9" />
				<g stroke="#9feaf9" strokeWidth="0.8" fill="none">
					<ellipse rx="11" ry="4.2" />
					<ellipse rx="11" ry="4.2" transform="rotate(60)" />
					<ellipse rx="11" ry="4.2" transform="rotate(120)" />
				</g>
			</svg>
		),
	},
	{
		name: 'Howler',
		color: '#f7df1e',
		logo: (
			<svg viewBox="0 0 100 100" width={48} height={48}>
				<circle cx="50" cy="50" r="40" fill="#1a1a1a" stroke="#f7df1e" strokeWidth="3" />
				<path d="M35 45 Q38 30 42 45 Q46 30 50 45 Q54 30 58 45 Q62 30 65 45" stroke="#f7df1e" strokeWidth="3" fill="none" strokeLinecap="round" />
				<path d="M35 55 Q38 70 42 55 Q46 70 50 55 Q54 70 58 55 Q62 70 65 55" stroke="#f7df1e" strokeWidth="3" fill="none" strokeLinecap="round" />
			</svg>
		),
	},
	{
		name: 'canvas-confetti',
		color: '#ff6b6b',
		logo: (
			<svg viewBox="0 0 100 100" width={48} height={48}>
				<rect x="15" y="25" width="12" height="6" rx="2" fill="#ff6b6b" transform="rotate(-30 21 28)" />
				<rect x="45" y="10" width="10" height="5" rx="2" fill="#ffd93d" transform="rotate(15 50 12)" />
				<rect x="70" y="20" width="14" height="6" rx="2" fill="#6bcb77" transform="rotate(-45 77 23)" />
				<rect x="25" y="55" width="11" height="5" rx="2" fill="#4d96ff" transform="rotate(20 30 57)" />
				<rect x="55" y="45" width="13" height="6" rx="2" fill="#ff6b6b" transform="rotate(-15 61 48)" />
				<rect x="75" y="60" width="10" height="5" rx="2" fill="#ffd93d" transform="rotate(35 80 62)" />
				<rect x="35" y="75" width="12" height="5" rx="2" fill="#6bcb77" transform="rotate(-10 41 77)" />
				<rect x="60" y="78" width="9" height="4" rx="2" fill="#4d96ff" transform="rotate(25 64 80)" />
			</svg>
		),
	},
];

export default function LibrariesSplash() {
	return (
		<Box
			display="flex"
			flexDirection="column"
			alignItems="center"
			justifyContent="center"
			height="100vh"
			width="100vw"
			bgcolor="#000"
		>
			<Box
				display="flex"
				flexWrap="wrap"
				justifyContent="center"
				maxWidth={500}
				gap={4}
			>
				{libraries.map(({ name, color, logo }) => (
					<Box
						key={name}
						display="flex"
						flexDirection="column"
						alignItems="center"
						width={90}
						gap={0.5}
					>
						{logo}
						<Typography
							color={color}
							fontFamily="'Roboto', sans-serif"
							fontSize={11}
						>
							{name}
						</Typography>
					</Box>
				))}
			</Box>
		</Box>
	);
}
