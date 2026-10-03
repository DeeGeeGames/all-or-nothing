import { useCallback, useEffect, useState } from 'react';
import { Alert, Box, Container, Typography } from '@mui/material';
import { ArrowBack, Launch } from '@mui/icons-material';
import { useActiveController, useSetActiveScreen } from '@/atoms';
import { useFocusElement, useSetActiveGroup } from '@/focus/focus-atoms';
import { useGamepadManager, useKeyboardManager, useSteamInputManager } from '@/input/input-hooks';
import { InputAction, type InputEvent } from '@/input/input-types';
import { usePlatform } from '@/platform';
import { Screens } from '@/types';
import { ButtonPromptsBar } from '@/components/button-prompts';
import { games, getGameDestination, type GameListing } from '@/promotions/catalog';
import { openGameStore } from '@/promotions/open-store';
import PromotionAction from '@/promotions/promotion-action';

const GROUP = 'game-shelf';

function GameCard({ game, index }: { readonly game: GameListing; readonly index: number }) {
	const { distribution } = usePlatform();
	const [failed, setFailed] = useState(false);
	const destination = getGameDestination(game, distribution);

	async function open(inBrowser = false) {
		setFailed(!await openGameStore(game.id, inBrowser));
	}

	return (
		<Box component="article" className="game-shelf-card">
			<Box component="img" className="game-shelf-art" src={`${import.meta.env.BASE_URL}${game.artwork}`} alt={`${game.title} artwork`} />
			<Box className="game-shelf-copy">
				<Typography className="promotion-caption">{destination.caption}</Typography>
				<Typography component="h2" className="game-shelf-card-title">{game.title}</Typography>
				<Typography className="game-shelf-description">{game.description}</Typography>
				<PromotionAction id={`game-shelf-${game.id}`} group={GROUP} order={index * 2 + 1} onClick={function () { void open(); }} disabled={distribution === null} sx={{ textTransform: 'none', minHeight: 48, mt: 2, gap: 1 }}>
					{destination.label} <Launch fontSize="small" />
				</PromotionAction>
				{failed && (
					<Alert severity="info" sx={{ mt: 2 }}>
						Could not open the link.
						<PromotionAction id={`game-shelf-browser-${game.id}`} group={GROUP} order={index * 2 + 2} onClick={function () { void open(true); }} sx={{ textTransform: 'none', minHeight: 44 }}>
							{distribution === 'steam' ? 'Open in browser' : 'Try again'}
						</PromotionAction>
					</Alert>
				)}
			</Box>
		</Box>
	);
}

export default function MoreGamesScreen() {
	const setActiveScreen = useSetActiveScreen();
	const activeController = useActiveController();
	const setActiveGroup = useSetActiveGroup();
	const focus = useFocusElement();
	const goBack = useCallback(function () { setActiveScreen(Screens.Title); }, [setActiveScreen]);
	const handleInput = useCallback(function (event: InputEvent) {
		if (event.action !== InputAction.BACK) return;
		goBack();
	}, [goBack]);
	useGamepadManager(handleInput);
	useKeyboardManager(handleInput);
	useSteamInputManager(handleInput);

	useEffect(function () {
		setActiveGroup(GROUP);
		const first = games[0];
		if (!first) return;
		focus(`game-shelf-${first.id}`);
	}, [setActiveGroup, focus]);

	return (
		<Container maxWidth={false} className="game-shelf-screen">
			<Box component="header" className="game-shelf-header">
				<PromotionAction id="game-shelf-back" group={GROUP} order={0} onClick={goBack} sx={{ textTransform: 'none', minHeight: 44, gap: 1 }}>
					<ArrowBack fontSize="small" /> Back to game
				</PromotionAction>
			</Box>
			<Box className="game-shelf-heading">
				<Typography className="promotion-caption">DEEGEE GAMES</Typography>
				<Typography component="h1">More from DeeGee Games</Typography>
				<Typography>Explore our games at your own pace.</Typography>
			</Box>
			<Box className="game-shelf-grid">
				{games.map(function (game, index) { return <GameCard key={game.id} game={game} index={index} />; })}
			</Box>
			{activeController && (
				<Box component="footer" className="game-shelf-footer">
					<ButtonPromptsBar controllerType={activeController} prompts={[
						{ action: InputAction.SELECT, label: 'Open link' },
						{ action: InputAction.BACK, label: 'Back' },
					]} />
				</Box>
			)}
		</Container>
	);
}
