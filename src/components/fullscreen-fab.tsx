import { Fab } from '@mui/material';
import {
	Fullscreen as FullscreenIcon,
	FullscreenExit as FullscreenExitIcon,
} from '@mui/icons-material';
import { useIsFullscreen, useSetFullscreen, useActiveController } from '@/atoms';

export default
function FullscreenFab() {
	const isFullscreen = useIsFullscreen();
	const setFullscreen = useSetFullscreen();
	const activeController = useActiveController();

	if (activeController !== null) return null;

	return (
		<Fab
			aria-label="Toggle fullscreen"
			size="small"
			color="primary"
			onClick={() => setFullscreen(!isFullscreen)}
			sx={{
				position: 'fixed',
				bottom: 16,
				left: 16,
			}}
		>
			{isFullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
		</Fab>
	);
}
