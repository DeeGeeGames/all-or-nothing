import { type ReactNode } from 'react';
import {
	PlayArrow as PlayArrowIcon,
	RotateLeft as RotateLeftIcon,
	Info as InfoIcon,
	QuestionMark as QuestionMarkIcon,
	Leaderboard as LeaderboardIcon,
	School as SchoolIcon,
	Groups as GroupsIcon,
	Today as TodayIcon,
	ExitToApp as ExitToAppIcon,
	BarChart as BarChartIcon,
	EmojiEvents as EmojiEventsIcon,
	ArrowBack as ArrowBackIcon,
	MoreHoriz as MoreHorizIcon,
} from '@mui/icons-material';
import type { Enum } from '@/types';
import FormattedTime from '@/components/formatted-time';

export const MenuId = {
	Main: 'main',
	SinglePlayer: 'single-player',
	HowToPlay: 'how-to-play',
	Extra: 'extra',
} as const;

export type MenuId = Enum<typeof MenuId>;

export interface MenuItem {
	readonly id: string;
	readonly label: ReactNode;
	readonly icon: ReactNode;
	readonly onClick: () => void;
	readonly disabled?: boolean;
	readonly autoFocus?: boolean;
	readonly visible?: boolean;
}

export interface MenuHandlers {
	readonly handleContinue: () => void;
	readonly handleNewGame: () => void;
	readonly handleDaily: () => void;
	readonly handleMultiplayer: () => void;
	readonly handleLeaderboard: () => void;
	readonly handleStats: () => void;
	readonly handleAchievements: () => void;
	readonly handleHowToPlay: () => void;
	readonly handleTutorial: () => void;
	readonly handleAbout: () => void;
	readonly handleQuit: () => void;
}

interface BuildDeps {
	readonly savedGameTime: number;
	readonly dailyStreak: number;
	readonly showLeaderboard: boolean;
	readonly handlers: MenuHandlers;
	readonly navigateTo: (menuId: MenuId) => void;
	readonly goBack: () => void;
	readonly focusTarget: string | null;
}

export const subMenuOpenerIds: Partial<Record<MenuId, string>> = {
	[MenuId.SinglePlayer]: 'menu-single-player',
	[MenuId.HowToPlay]: 'menu-how-to-play',
	[MenuId.Extra]: 'menu-extra',
} as const;

const menuBuilders: Record<MenuId, (deps: BuildDeps) => readonly MenuItem[]> = {
	[MenuId.Main]: (deps) => [
		{
			id: 'menu-single-player',
			label: 'Single Player',
			icon: <PlayArrowIcon />,
			onClick: () => deps.navigateTo(MenuId.SinglePlayer),
			autoFocus: deps.focusTarget === 'menu-single-player' || !deps.focusTarget,
		},
		{
			id: 'menu-multiplayer',
			label: 'Local Multiplayer',
			icon: <GroupsIcon />,
			onClick: deps.handlers.handleMultiplayer,
			autoFocus: deps.focusTarget === 'menu-multiplayer',
		},
		{
			id: 'menu-how-to-play',
			label: 'How to Play',
			icon: <QuestionMarkIcon />,
			onClick: () => deps.navigateTo(MenuId.HowToPlay),
			autoFocus: deps.focusTarget === 'menu-how-to-play',
		},
		{
			id: 'menu-extra',
			label: 'Extra',
			icon: <MoreHorizIcon />,
			onClick: () => deps.navigateTo(MenuId.Extra),
			autoFocus: deps.focusTarget === 'menu-extra',
		},
		{
			id: 'menu-quit',
			label: 'Quit to Desktop',
			icon: <ExitToAppIcon />,
			onClick: deps.handlers.handleQuit,
			visible: !!window.electronAPI,
			autoFocus: deps.focusTarget === 'menu-quit',
		},
	],

	[MenuId.SinglePlayer]: (deps) => [
		{
			id: 'menu-daily',
			label: `Daily Board${deps.dailyStreak > 0 ? ` (${deps.dailyStreak} day streak)` : ''}`,
			icon: <TodayIcon />,
			onClick: deps.handlers.handleDaily,
			autoFocus: true,
		},
		{
			id: 'menu-continue',
			label: <>Continue {!!deps.savedGameTime && <FormattedTime label=" - " value={deps.savedGameTime} />}</>,
			icon: <RotateLeftIcon />,
			onClick: deps.handlers.handleContinue,
			disabled: !deps.savedGameTime,
		},
		{
			id: 'menu-new-game',
			label: 'New Game',
			icon: <PlayArrowIcon />,
			onClick: deps.handlers.handleNewGame,
		},
		{
			id: 'menu-back',
			label: 'Back',
			icon: <ArrowBackIcon />,
			onClick: deps.goBack,
		},
	],

	[MenuId.HowToPlay]: (deps) => [
		{
			id: 'menu-tutorial',
			label: 'Tutorial',
			icon: <SchoolIcon />,
			onClick: deps.handlers.handleTutorial,
			autoFocus: true,
		},
		{
			id: 'menu-instructions',
			label: 'Instructions',
			icon: <QuestionMarkIcon />,
			onClick: deps.handlers.handleHowToPlay,
		},
		{
			id: 'menu-back',
			label: 'Back',
			icon: <ArrowBackIcon />,
			onClick: deps.goBack,
		},
	],

	[MenuId.Extra]: (deps) => [
		{
			id: 'menu-leaderboard',
			label: 'Leaderboards',
			icon: <LeaderboardIcon />,
			onClick: deps.handlers.handleLeaderboard,
			visible: deps.showLeaderboard,
		},
		{
			id: 'menu-stats',
			label: 'Stats',
			icon: <BarChartIcon />,
			onClick: deps.handlers.handleStats,
			autoFocus: true,
		},
		{
			id: 'menu-achievements',
			label: 'Achievements',
			icon: <EmojiEventsIcon />,
			onClick: deps.handlers.handleAchievements,
		},
		{
			id: 'menu-about',
			label: 'About',
			icon: <InfoIcon />,
			onClick: deps.handlers.handleAbout,
		},
		{
			id: 'menu-back',
			label: 'Back',
			icon: <ArrowBackIcon />,
			onClick: deps.goBack,
		},
	],
};

export function buildMenuItems(menuId: MenuId, deps: BuildDeps): readonly MenuItem[] {
	const builder = menuBuilders[menuId];
	return builder(deps).filter((item) => item.visible !== false);
}
