import { useRef } from 'react';
import {
	Container,
	Box,
	Fab,
	Typography,
	Paper,
} from '@mui/material';
import {
	ArrowBack as ArrowBackIcon,
	Lock as LockIcon,
	EmojiEvents as TrophyIcon,
} from '@mui/icons-material';
import { useSetActiveScreen, useActiveController } from '@/atoms';
import { Screens } from '@/types';
import { useScrollable } from '@/focus/useScrollable';
import { useBackAction } from '@/input/useBackAction';
import { InputAction } from '@/input/input-types';
import { ButtonPromptsBar } from '@/components/button-prompts';
import { useUnlockedAchievements, useAchievementDisplayList, ACHIEVEMENTS } from '@/achievements';
import { AchievementCategory } from '@/achievements';
import type { AchievementDisplayItem } from '@/achievements';

const CATEGORY_LABELS: Record<AchievementCategory, string> = {
	[AchievementCategory.Mastery]: 'Mastery',
	[AchievementCategory.Endurance]: 'Endurance',
	[AchievementCategory.Speed]: 'Speed',
	[AchievementCategory.Score]: 'Score',
};

const CATEGORY_ORDER: readonly AchievementCategory[] = [
	AchievementCategory.Mastery,
	AchievementCategory.Endurance,
	AchievementCategory.Speed,
	AchievementCategory.Score,
];

function AchievementCard({ achievement }: { readonly achievement: AchievementDisplayItem }) {
	return (
		<Paper
			sx={{
				p: 2,
				display: 'flex',
				alignItems: 'center',
				gap: 2,
				opacity: achievement.unlocked ? 1 : 0.5,
				flex: '1 1 auto',
				minWidth: { xs: '100%', sm: 'calc(50% - 8px)' },
			}}
		>
			<Box
				sx={{
					width: 48,
					height: 48,
					borderRadius: 1,
					bgcolor: achievement.unlocked ? 'primary.main' : 'action.disabledBackground',
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					flexShrink: 0,
				}}
			>
				{achievement.unlocked
					? <TrophyIcon sx={{ color: 'primary.contrastText' }} />
					: <LockIcon sx={{ color: 'action.disabled' }} />
				}
			</Box>
			<Box flex={1} minWidth={0}>
				<Typography variant="body1" fontWeight={600}>
					{achievement.name}
				</Typography>
				<Typography variant="body2" color="text.secondary">
					{achievement.description}
				</Typography>
				{achievement.unlockedAt !== null && (
					<Typography variant="caption" color="text.secondary">
						Unlocked {new Date(achievement.unlockedAt).toLocaleDateString()}
					</Typography>
				)}
			</Box>
		</Paper>
	);
}

export default
function AchievementsScreen() {
	const setActiveScreen = useSetActiveScreen();
	const activeController = useActiveController();
	const contentRef = useRef<HTMLDivElement>(null);

	useScrollable({ ref: contentRef });
	useBackAction(() => setActiveScreen(Screens.Title));

	const unlocked = useUnlockedAchievements();
	const displayList = useAchievementDisplayList(unlocked);

	const unlockedCount = unlocked?.length ?? 0;
	const totalCount = ACHIEVEMENTS.length;

	const groupedAchievements = CATEGORY_ORDER
		.map(category => ({
			category,
			label: CATEGORY_LABELS[category],
			items: displayList?.filter(a => a.category === category) ?? [],
		}))
		.filter(group => group.items.length > 0);

	return (
		<Container sx={{
			height: '100vh',
			display: 'flex',
			flexDirection: 'column',
			position: 'relative',
		}}>
			<Typography variant="h4" paddingTop={2} textAlign="center">
				Achievements
			</Typography>
			<Typography variant="subtitle1" textAlign="center" color="text.secondary">
				{unlockedCount} / {totalCount} Unlocked
			</Typography>
			<Box
				ref={contentRef}
				flex={1}
				overflow="auto"
				paddingTop={2}
				sx={{
					paddingBottom: { xs: 10, sm: 2 },
				}}
			>
				{!displayList && (
					<Typography textAlign="center" paddingTop={4} color="text.secondary">
						Loading...
					</Typography>
				)}
				{displayList && groupedAchievements.map(group => (
					<Box key={group.category} mb={3}>
						<Typography variant="overline" gutterBottom>
							{group.label}
						</Typography>
						<Box display="flex" flexWrap="wrap" gap={1}>
							{group.items.map(achievement => (
								<AchievementCard
									key={achievement.id}
									achievement={achievement}
								/>
							))}
						</Box>
					</Box>
				))}
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
