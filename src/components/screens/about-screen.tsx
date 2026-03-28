import { Box, Container, Fab, Typography, Button } from '@mui/material';
import {
	MusicNote as MusicNoteIcon,
	ArrowBack as ArrowBackIcon,
	GitHub as GitHubIcon,
	GraphicEq as GraphicEqIcon,
	Launch as LaunchIcon,
} from '@mui/icons-material';
import { useSetActiveScreen, useActiveController } from '@/atoms';
import { Screens } from '@/types';
import { useScrollable } from '@/focus/useScrollable';
import { useBackAction } from '@/input/useBackAction';
import { InputAction } from '@/input/input-types';
import { ButtonPromptsBar } from '@/components/button-prompts';
import { useRef } from 'react';

export default
function AboutScreen() {
	const setActiveScreen = useSetActiveScreen();
	const activeController = useActiveController();
	const contentRef = useRef<HTMLDivElement>(null);

	useScrollable({ ref: contentRef });
	useBackAction(() => setActiveScreen(Screens.Title));

	return (
		<Container sx={{
			height: '100vh',
			display: 'flex',
			flexDirection: 'column',
			position: 'relative',
		}}>
			<Typography
				fontWeight={100}
				variant="h1"
				fontSize={40}
				paddingTop={2}
				textAlign="center"
			>
				All <em>or</em> Nothing
			</Typography>
			<Typography textAlign="center">
				version {__APP_VERSION__}
			</Typography>
			<Typography textAlign="center">
				By David Granado
			</Typography>
			<Box
				ref={contentRef}
				flex={1}
				overflow="auto"
				paddingBottom={2}
			>
				<Box maxWidth={400} margin="0 auto" textAlign="center">
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
				</Box>
			</Box>
			{activeController && (
				<Box
					sx={{
						position: 'fixed',
						bottom: 16,
						left: 16,
					}}
				>
					<ButtonPromptsBar
						controllerType={activeController}
						prompts={[
							{ action: InputAction.BACK, label: 'Back' },
						]}
					/>
				</Box>
			)}
			{!activeController && (
				<Fab
					color="primary"
					aria-label="back"
					onClick={() => setActiveScreen(Screens.Title)}
					sx={{
						position: 'fixed',
						bottom: 16,
						right: 16,
					}}
				>
					<ArrowBackIcon />
				</Fab>
			)}
		</Container>
	);
}
