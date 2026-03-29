import { useIsPaused } from '@/atoms';
import { useInterval } from '@/hooks';
import { performTimerTick } from '@/core';
import { useTimeout, formatDuration } from '@/utils';
import { useState } from 'react';
import { useTime } from '@/game-queries';
import { Box, Typography } from '@mui/material';
import { AccessTime } from '@mui/icons-material';

interface Props {
	gameComplete?: boolean;
}

export default
function GameTimer(props: Props) {
	const { gameComplete } = props;
	const paused = useIsPaused();
	const [passedCardRevealDelay, setPassedCardRevealDelay] = useState(false);
	const time = useTime();
	const runTimer = passedCardRevealDelay && !gameComplete && !paused;

	useTimeout(() => {
		// wait until cards reveal to run timer
		setPassedCardRevealDelay(true);
	}, 1200);

	useInterval(() => {
		const newTime = time + 1;
		performTimerTick(newTime);
	}, runTimer ? 1000 : null);

	const formattedTime = formatDuration(time);

	return (
		<Box display="flex" gap={1} alignItems="center">
			<AccessTime />
			<Typography variant="h5">
				<strong>{formattedTime}</strong>
			</Typography>
		</Box>
	);
}
