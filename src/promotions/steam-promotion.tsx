import { useState } from 'react';
import { Alert, Box, Typography } from '@mui/material';
import { Close, Launch } from '@mui/icons-material';
import { usePlatform } from '@/platform';
import { shouldShowSteamPromotion } from '@/platform/distribution';
import { useFocusElement } from '@/focus/focus-atoms';
import { steamEdition } from './catalog';
import { openGameStore } from './open-store';
import { useSteamPromotionDismissed } from './state';
import PromotionAction from './promotion-action';

export default function SteamPromotion({ enabled }: { readonly enabled: boolean }) {
	const { distribution } = usePlatform();
	const [dismissed, setDismissed] = useSteamPromotionDismissed();
	const [failed, setFailed] = useState(false);
	const focus = useFocusElement();
	if (dismissed || !shouldShowSteamPromotion(distribution)) return null;

	async function openStore() {
		setFailed(!await openGameStore(steamEdition.id));
	}

	function dismiss() {
		focus('menu-single-player');
		setDismissed(true);
	}

	return (
		<Box component="aside" className="steam-promotion" aria-label="All or Nothing on Steam">
			<Box component="img" src={`${import.meta.env.BASE_URL}${steamEdition.artwork}`} alt="" className="steam-promotion-art" />
			<Box className="steam-promotion-copy">
				<Typography className="promotion-caption">{steamEdition.title} · STEAM EDITION</Typography>
				<Typography component="h2" className="steam-promotion-title">Also available on Steam</Typography>
				<Typography className="steam-promotion-description">Enjoy All or Nothing on Steam.</Typography>
				<PromotionAction id="promotion-steam" group="menu" order={10} onClick={openStore} disabled={!enabled} sx={{ p: '6px 0', minHeight: 44, textTransform: 'none', gap: 0.75 }}>
					View on Steam <Launch sx={{ fontSize: 16 }} />
				</PromotionAction>
			</Box>
			<PromotionAction id="promotion-dismiss" group="menu" order={11} label="Hide Steam promotion" onClick={dismiss} disabled={!enabled} sx={{ minWidth: 44, minHeight: 44, p: 0, color: 'text.secondary' }}>
				<Close fontSize="small" />
			</PromotionAction>
			{failed && <Alert severity="info" sx={{ gridColumn: '1 / -1' }}>Could not open Steam. Select “View on Steam” to try again.</Alert>}
		</Box>
	);
}
