import { useRef } from 'react';
import { Box } from '@mui/material';
import { AnimatePresence, motion } from 'framer-motion';
import FocusableButton from '@/components/focusable-button';
import { type MenuId, type MenuHandlers, buildMenuItems } from './menu-definitions';

const buttonContainerVariants = {
	hidden: {},
	visible: {
		transition: {
			staggerChildren: 0.1,
			delayChildren: 1.2,
		},
	},
} as const;

const buttonVariants = {
	hidden: { opacity: 0, y: 10 },
	visible: {
		opacity: 1,
		y: 0,
		transition: { duration: 0.3, ease: 'easeOut' },
	},
} as const;

const SLIDE_DISTANCE = 80;

const slideVariants = {
	enter: (direction: 'forward' | 'back') => ({
		x: direction === 'forward' ? SLIDE_DISTANCE : -SLIDE_DISTANCE,
		opacity: 0,
	}),
	visible: {
		x: 0,
		opacity: 1,
		transition: { duration: 0.2, ease: 'easeOut' as const },
	},
	exit: (direction: 'forward' | 'back') => ({
		x: direction === 'forward' ? -SLIDE_DISTANCE : SLIDE_DISTANCE,
		opacity: 0,
		transition: { duration: 0.15, ease: 'easeIn' as const },
	}),
};

export const MAX_MENU_BUTTONS = 5;
export const MENU_ANIM_DURATION_MS = (
	buttonContainerVariants.visible.transition.delayChildren +
	buttonContainerVariants.visible.transition.staggerChildren * (MAX_MENU_BUTTONS - 1) +
	buttonVariants.visible.transition.duration
) * 1000;

interface Props {
	readonly activeMenu: MenuId;
	readonly direction: 'forward' | 'back';
	readonly menuAnimDone: boolean;
	readonly splashComplete: boolean;
	readonly isPlatformReady: boolean;
	readonly prefersReducedMotion: boolean | null;
	readonly animKey: number;
	readonly savedGameTime: number;
	readonly dailyStreak: number;
	readonly showLeaderboard: boolean;
	readonly handlers: MenuHandlers;
	readonly navigateTo: (menuId: MenuId) => void;
	readonly goBack: () => void;
	readonly focusTarget: string | null;
}

export default
function MenuButtons({
	activeMenu,
	direction,
	menuAnimDone,
	splashComplete,
	isPlatformReady,
	prefersReducedMotion,
	animKey,
	savedGameTime,
	dailyStreak,
	showLeaderboard,
	handlers,
	navigateTo,
	goBack,
	focusTarget,
}: Props) {
	const hasNavigatedRef = useRef(false);

	const items = buildMenuItems(activeMenu, {
		savedGameTime,
		dailyStreak,
		showLeaderboard,
		handlers,
		navigateTo: (menuId) => {
			hasNavigatedRef.current = true;
			navigateTo(menuId);
		},
		goBack,
		focusTarget,
	});

	const initialState = (prefersReducedMotion || splashComplete) ? false as const : 'hidden' as const;
	const skipSlide = !hasNavigatedRef.current || !!prefersReducedMotion;

	return (
		<Box display="inline-block" width={300}>
			<motion.div
				key={`buttons-${animKey}`}
				variants={buttonContainerVariants}
				initial={menuAnimDone ? false : initialState}
				animate={(isPlatformReady && splashComplete) ? 'visible' : initialState}
				style={menuAnimDone ? undefined : { pointerEvents: 'none' }}
			>
				<AnimatePresence mode="wait" custom={direction}>
					<motion.div
						key={activeMenu}
						custom={direction}
						variants={prefersReducedMotion ? undefined : slideVariants}
						initial={skipSlide ? false : 'enter'}
						animate="visible"
						exit="exit"
					>
						<Box display="flex" flexDirection="column" gap={2}>
							{items.map((item, index) => (
								<motion.div
									key={item.id}
									variants={buttonVariants}
									initial={menuAnimDone ? false : undefined}
								>
									<FocusableButton
										id={item.id}
										group="menu"
										order={index}
										startIcon={item.icon}
										onClick={item.onClick}
										disabled={item.disabled}
										autoFocus={item.autoFocus}
									>
										{item.label}
									</FocusableButton>
								</motion.div>
							))}
						</Box>
					</motion.div>
				</AnimatePresence>
			</motion.div>
		</Box>
	);
}
