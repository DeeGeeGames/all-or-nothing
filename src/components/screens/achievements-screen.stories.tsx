import type { Meta, StoryObj } from '@storybook/react-vite';
import { useEffect, useState } from 'react';
import { getDb } from '@/core';
import { ACHIEVEMENTS } from '@/achievements';
import type { UnlockedAchievement } from '@/achievements';
import AchievementsScreen from './achievements-screen';

const meta: Meta<typeof AchievementsScreen> = {
	title: 'Screens/AchievementsScreen',
	component: AchievementsScreen,
};

export default meta;
type Story = StoryObj<typeof AchievementsScreen>;

function SeedDecorator({
	achievements,
	children,
}: {
	readonly achievements: readonly UnlockedAchievement[];
	readonly children: React.ReactNode;
}) {
	const [ready, setReady] = useState(false);

	useEffect(() => {
		const db = getDb();
		const ids = achievements.map(a => a.id);

		db.achievements.bulkPut([...achievements])
			.then(() => setReady(true));

		return () => {
			db.achievements.bulkDelete(ids);
		};
	}, [achievements]);

	if (!ready) return null;
	return <>{children}</>;
}

function withAchievements(achievements: readonly UnlockedAchievement[]) {
	return (Story: React.ComponentType) => (
		<SeedDecorator achievements={achievements}>
			<Story />
		</SeedDecorator>
	);
}

function unlockAll(): readonly UnlockedAchievement[] {
	const baseTime = new Date('2026-01-15').getTime();
	return ACHIEVEMENTS.map((a, i) => ({
		id: a.id,
		unlockedAt: baseTime + i * 86_400_000,
	}));
}

function unlockByIds(ids: readonly string[]): readonly UnlockedAchievement[] {
	const baseTime = new Date('2026-02-01').getTime();
	return ids.map((id, i) => ({
		id,
		unlockedAt: baseTime + i * 86_400_000,
	}));
}

export const NoneUnlocked: Story = {
	decorators: [withAchievements([])],
};

export const AllUnlocked: Story = {
	decorators: [withAchievements(unlockAll())],
};

export const FewUnlocked: Story = {
	decorators: [
		withAchievements(unlockByIds([
			'PERFECT_CLEAR',
			'COMBO_5',
			'GAMES_10',
		])),
	],
};

export const MostUnlocked: Story = {
	decorators: [
		withAchievements(
			unlockAll().filter((_, i) => i < ACHIEVEMENTS.length - 2),
		),
	],
};

export const OnePerCategory: Story = {
	decorators: [
		withAchievements(unlockByIds([
			'COMBO_5',
			'GAMES_10',
			'FAST_MATCH_20',
			'SCORE_50K',
		])),
	],
};
