import { Box, Button, Container, Typography } from "@mui/material";
import { useSetActiveScreen, useActiveController } from "@/atoms";
import { Screens } from "@/types";
import { useBackAction } from '@/input/useBackAction';
import { InputAction } from '@/input/input-types';
import { ButtonGlyphMap } from '@/components/button-prompts/button-glyph-map';
import {
	MusicNote as MusicNoteIcon,
	ArrowBack as ArrowBackIcon,
	GitHub as GitHubIcon,
	GraphicEq as GraphicEqIcon,
	Launch as LaunchIcon,
} from "@mui/icons-material";

export default
function AboutScreen() {
	const setActiveScreen = useSetActiveScreen();
	const activeController = useActiveController();

	useBackAction(() => setActiveScreen(Screens.Title));

	const GlyphComponent = activeController
		? ButtonGlyphMap[activeController]?.[InputAction.BACK]
		: null;

	const backButtonStartIcon = GlyphComponent
		? (
			<GlyphComponent
				width={20}
				height={20}
				viewBox="0 0 64 64"
				aria-hidden="true"
				style={{ display: 'block' }}
			/>
		)
		: <ArrowBackIcon />;

	return (
		<Container sx={{textAlign: 'center', paddingTop: 10}}>
			<Typography fontWeight={100} variant="h1" fontSize={40}>
				All <em>or</em> Nothing
			</Typography>
			<Typography>
				version {__APP_VERSION__}
			</Typography>
			<Typography>
				By David Granado
			</Typography>
			<Box width={300} margin="0 auto">
				<Box paddingTop={5}>
					<Button
						fullWidth
						startIcon={<GitHubIcon/>}
						endIcon={<LaunchIcon />}
						target="_blank"
						href="https://github.com/david0178418/all-or-nothing"
					>
						Github Repo
					</Button>
				</Box>
				<Box paddingTop={3}>
					<Typography component="em">
						Theme for a One-Handed Piano Concerto
					</Typography>
					<Typography component="em">
						Little Prelude and Fugue
					</Typography>
					<Button
						fullWidth
						startIcon={<MusicNoteIcon/>}
						endIcon={<LaunchIcon />}
						target="_blank"
						href="https://www.youtube.com/channel/UC3edSSIDJPTZmBM-m9_G3Nw"
					>
						by Sir Cubworth
					</Button>
				</Box>
				<Box paddingTop={3}>
					<Typography component="em">
						No.9_Esther's Waltz
					</Typography>
					<Button
						fullWidth
						startIcon={<MusicNoteIcon/>}
						endIcon={<LaunchIcon />}
						target="_blank"
						href="https://www.youtube.com/channel/UCOFrldzxeKGG8fTpN5_d75Q"
					>
						By Esther Abrami
					</Button>
				</Box>
				<Box paddingTop={3}>
					<Typography component="em">
						Baroque Coffee House
					</Typography>
					<Button
						fullWidth
						startIcon={<MusicNoteIcon/>}
						endIcon={<LaunchIcon />}
						target="_blank"
						href="https://www.youtube.com/watch?v=Spo9h2opVAs&list=RDSpo9h2opVAs"
					>
						By Doug Maxwell/Media Right Productions
					</Button>
				</Box>
				<Box paddingTop={3}>
					<Typography component="em">
						Sonatina No 2 in F Major Allegro
					</Typography>
					<Button
						fullWidth
						startIcon={<MusicNoteIcon/>}
						endIcon={<LaunchIcon />}
						target="_blank"
						href="https://www.youtube.com/channel/UCKgGBUFCIZjmC-Lqy8kmJ5w"
					>
						By Joel Cummins
					</Button>
				</Box>
				<Box paddingTop={3}>
					<Button
						fullWidth
						startIcon={<GraphicEqIcon/>}
						endIcon={<LaunchIcon />}
						target="_blank"
						href="https://pixabay.com/sound-effects/book-foley-turn-pages-7-189812/"
					>
						Sounds by floraphonic
					</Button>
				</Box>
				<Box paddingTop={3}>
					<Button
						fullWidth
						startIcon={<GraphicEqIcon/>}
						endIcon={<LaunchIcon />}
						target="_blank"
						href="https://pixabay.com/sound-effects/success-221935/"
					>
						Also by updatepelgo
					</Button>
				</Box>
				<Box paddingTop={5}>
					<Button
						fullWidth
						startIcon={backButtonStartIcon}
						onClick={() => setActiveScreen(Screens.Title)}
					>
						Back
					</Button>
				</Box>
			</Box>
		</Container>
	);
}
