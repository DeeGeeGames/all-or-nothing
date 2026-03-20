import confetti from 'canvas-confetti';

export
function fireConvergenceConfetti(
	center: { x: number; y: number },
	colors: string[],
) {
	confetti({
		particleCount: 80,
		spread: 360,
		origin: center,
		colors,
		startVelocity: 30,
		gravity: 0.8,
		ticks: 80,
		disableForReducedMotion: true,
	});
}

/**
 * Fire small particle trail bursts along card paths during convergence.
 * Returns a cleanup function to cancel pending timeouts.
 */
const trailColors = ['#ff8f00', '#ffc107', '#ffab00'] as const;

export
function fireConvergenceTrails(
	cardPositions: ReadonlyArray<{ x: number; y: number }>,
	center: { x: number; y: number },
): () => void {
	const trailSteps = 6;
	const stepInterval = 60; // ms between trail bursts
	const timeouts: ReturnType<typeof setTimeout>[] = [];

	cardPositions.forEach((start) => {
		Array.from({ length: trailSteps }, (_, step) => {
			const t = (step + 1) / (trailSteps + 1);
			const trailX = start.x + (center.x - start.x) * t;
			const trailY = start.y + (center.y - start.y) * t;

			const timeout = setTimeout(() => {
				confetti({
					particleCount: 15,
					spread: 50,
					origin: { x: trailX, y: trailY },
					colors: [...trailColors],
					startVelocity: 12,
					gravity: 0.5,
					ticks: 60,
					scalar: 0.8,
					disableForReducedMotion: true,
				});
			}, step * stepInterval);

			timeouts.push(timeout);
		});
	});

	return () => timeouts.forEach(clearTimeout);
}

const celebrationColors = ['#ffd700', '#ff6b6b', '#4ecdc4', '#45b7d1', '#96e6a1'] as const;

const sideBursts = [
	{ angle: 60, x: 0 },
	{ angle: 120, x: 1 },
] as const;

export
function fireGameOverConfetti(isPerfect: boolean): () => void {
	const duration = isPerfect ? 3000 : 1500;
	const end = Date.now() + duration;
	const particleCount = isPerfect ? 8 : 4;
	let rafId = 0;

	const frame = () => {
		sideBursts.forEach(({ angle, x }) => {
			confetti({
				particleCount,
				angle,
				spread: 55,
				origin: { x, y: 0.7 },
				colors: [...celebrationColors],
				disableForReducedMotion: true,
			});
		});

		if (Date.now() < end) {
			rafId = requestAnimationFrame(frame);
		}
	};

	confetti({
		particleCount: isPerfect ? 150 : 80,
		spread: 100,
		origin: { x: 0.5, y: 0.4 },
		colors: [...celebrationColors],
		startVelocity: 45,
		gravity: 0.8,
		ticks: 100,
		disableForReducedMotion: true,
	});

	rafId = requestAnimationFrame(frame);

	return () => cancelAnimationFrame(rafId);
}
