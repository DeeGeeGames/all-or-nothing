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
import { useBackAction } from '@/input/useBackAction';
import { InputAction } from '@/input/input-types';
import { ButtonPromptsBar } from '@/components/button-prompts';
import { useFocusable } from '@/focus/useFocusable';
import { useSetActiveGroup } from '@/focus/focus-atoms';
import { useActivationGuard } from '@/hooks';
import FocusIndicator from '@/components/focus-indicator';
import { ReactNode, useEffect } from 'react';

const ABOUT_GROUP = 'about-links';

interface FocusableLinkButtonProps {
	id: string;
	order: number;
	href: string;
	startIcon: ReactNode;
	children: ReactNode;
	autoFocus?: boolean;
}

function FocusableLinkButton({ id, order, href, startIcon, children, autoFocus }: FocusableLinkButtonProps) {
	const handleActivation = useActivationGuard(() => {
		window.open(href, '_blank');
	});

	const { ref, isFocused } = useFocusable({
		id,
		group: ABOUT_GROUP,
		order,
		onSelect: handleActivation,
		autoFocus,
	});

	return (
		<Box sx={{ position: 'relative' }} ref={ref}>
			<FocusIndicator visible={isFocused} />
			<Button
				fullWidth
				startIcon={startIcon}
				endIcon={<LaunchIcon />}
				onClick={handleActivation}
			>
				{children}
			</Button>
		</Box>
	);
}

export default
function AboutScreen() {
	const setActiveScreen = useSetActiveScreen();
	const activeController = useActiveController();
	const setActiveGroup = useSetActiveGroup();

	useEffect(() => {
		setActiveGroup(ABOUT_GROUP);
	}, [setActiveGroup]);

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
				flex={1}
				overflow="auto"
				paddingBottom={2}
			>
				<Box maxWidth={400} margin="0 auto" textAlign="center">
					<Box paddingTop={5}>
						<FocusableLinkButton
							id="about-github"
							order={0}
							href="https://github.com/david0178418/all-or-nothing"
							startIcon={<GitHubIcon/>}
							autoFocus
						>
							Github Repo
						</FocusableLinkButton>
					</Box>
					<Box paddingTop={3}>
						<Typography component="em">
							Theme for a One-Handed Piano Concerto
						</Typography>
						<Typography component="em">
							Little Prelude and Fugue
						</Typography>
						<FocusableLinkButton
							id="about-cubworth"
							order={1}
							href="https://www.youtube.com/channel/UC3edSSIDJPTZmBM-m9_G3Nw"
							startIcon={<MusicNoteIcon/>}
						>
							by Sir Cubworth
						</FocusableLinkButton>
					</Box>
					<Box paddingTop={3}>
						<Typography component="em">
							No.9_Esther's Waltz
						</Typography>
						<FocusableLinkButton
							id="about-abrami"
							order={2}
							href="https://www.youtube.com/channel/UCOFrldzxeKGG8fTpN5_d75Q"
							startIcon={<MusicNoteIcon/>}
						>
							By Esther Abrami
						</FocusableLinkButton>
					</Box>
					<Box paddingTop={3}>
						<Typography component="em">
							Baroque Coffee House
						</Typography>
						<FocusableLinkButton
							id="about-maxwell"
							order={3}
							href="https://www.youtube.com/watch?v=Spo9h2opVAs&list=RDSpo9h2opVAs"
							startIcon={<MusicNoteIcon/>}
						>
							By Doug Maxwell/Media Right Productions
						</FocusableLinkButton>
					</Box>
					<Box paddingTop={3}>
						<Typography component="em">
							Sonatina No 2 in F Major Allegro
						</Typography>
						<FocusableLinkButton
							id="about-cummins"
							order={4}
							href="https://www.youtube.com/channel/UCKgGBUFCIZjmC-Lqy8kmJ5w"
							startIcon={<MusicNoteIcon/>}
						>
							By Joel Cummins
						</FocusableLinkButton>
					</Box>
					<Box paddingTop={3}>
						<FocusableLinkButton
							id="about-floraphonic"
							order={5}
							href="https://pixabay.com/sound-effects/book-foley-turn-pages-7-189812/"
							startIcon={<GraphicEqIcon/>}
						>
							Sounds by floraphonic
						</FocusableLinkButton>
					</Box>
					<Box paddingTop={3}>
						<FocusableLinkButton
							id="about-updatepelgo"
							order={6}
							href="https://pixabay.com/sound-effects/success-221935/"
							startIcon={<GraphicEqIcon/>}
						>
							Also by updatepelgo
						</FocusableLinkButton>
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
							{ action: InputAction.SELECT, label: 'Open' },
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
