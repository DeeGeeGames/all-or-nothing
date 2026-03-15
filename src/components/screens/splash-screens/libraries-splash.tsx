import { type ComponentType, type SVGProps } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import SplashLayout from './splash-layout';
import TypeScriptLogo from './logos/typescript.svg?react';
import ViteLogo from './logos/vite.svg?react';
import MuiLogo from './logos/mui.svg?react';
import DexieLogo from './logos/dexie.svg?react';
import NodeLogo from './logos/nodejs.svg?react';
import ElectronLogo from './logos/electronjs.svg?react';
import HowlerLogo from './logos/howlerjs.svg?react';
import jotaiLogoUrl from './logos/jotai.png';
import motionLogoUrl from './logos/motion.png';

type SvgLogoEntry = {
	type: 'svg';
	name: string;
	color: string;
	Logo: ComponentType<SVGProps<SVGSVGElement>>;
};

type ImgLogoEntry = {
	type: 'img';
	name: string;
	color: string;
	imgSrc: string;
};

type LibraryEntry = SvgLogoEntry | ImgLogoEntry;

const libraries: LibraryEntry[] = [
	{ type: 'svg', name: 'TypeScript', color: '#3178c6', Logo: TypeScriptLogo },
	{ type: 'svg', name: 'Vite', color: '#bd34fe', Logo: ViteLogo },
	{ type: 'svg', name: 'MUI', color: '#007FFF', Logo: MuiLogo },
	{ type: 'img', name: 'Motion', color: '#fff42b', imgSrc: motionLogoUrl },
	{ type: 'img', name: 'Jotai', color: '#e0e0e0', imgSrc: jotaiLogoUrl },
	{ type: 'svg', name: 'Dexie', color: '#e8a427', Logo: DexieLogo },
	{ type: 'svg', name: 'Node', color: '#539e43', Logo: NodeLogo },
	{ type: 'svg', name: 'Electron', color: '#9feaf9', Logo: ElectronLogo },
	{ type: 'svg', name: 'Howler', color: '#f7df1e', Logo: HowlerLogo },
];

function LibraryLogo({ entry }: { entry: LibraryEntry }) {
	if (entry.type === 'svg') {
		return <entry.Logo width="100%" height="100%" />;
	}
	return <img src={entry.imgSrc} width="100%" height="100%" alt={entry.name} />;
}

export default function LibrariesSplash() {
	return (
		<SplashLayout>
			<Typography
				color="#ffffff"
				fontSize={18}
				letterSpacing={2}
				sx={{ opacity: 0.85, mb: 4 }}
			>
				also with
			</Typography>
			<Box
				display="grid"
				gridTemplateColumns="repeat(3, 1fr)"
				justifyItems="center"
				gap={4}
				sx={{
					width: 'min(600px, 90vw)',
				}}
			>
				{libraries.map((entry) => (
					<Box
						key={entry.name}
						display="flex"
						flexDirection="column"
						alignItems="center"
						gap={1}
					>
						<Box sx={{ width: 'min(96px, 20vw)', height: 'min(96px, 20vw)' }}>
							<LibraryLogo entry={entry} />
						</Box>
						<Typography
							color={entry.color}
							fontSize={14}
						>
							{entry.name}
						</Typography>
					</Box>
				))}
			</Box>
		</SplashLayout>
	);
}
