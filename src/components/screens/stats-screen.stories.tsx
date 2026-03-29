import type { Meta, StoryObj } from '@storybook/react-vite';
import { useEffect, useState } from 'react';
import { getDb } from '@/core';
import type { GameHistoryEntry } from '@/core';
import { generateGameHistory } from '@/stats/generate-history';
import StatsScreen from './stats-screen';

const meta: Meta<typeof StatsScreen> = {
	title: 'Screens/StatsScreen',
	component: StatsScreen,
};

export default meta;
type Story = StoryObj<typeof StatsScreen>;

function SeedDecorator({
	entries,
	children,
}: {
	readonly entries: readonly GameHistoryEntry[];
	readonly children: React.ReactNode;
}) {
	const [ready, setReady] = useState(false);

	useEffect(() => {
		const db = getDb();
		const ids = entries.map(e => e.id);

		db.gamehistory.bulkPut([...entries])
			.then(() => setReady(true));

		return () => {
			db.gamehistory.bulkDelete(ids);
		};
	}, [entries]);

	if (!ready) return null;
	return <>{children}</>;
}

function withSeedData(entries: readonly GameHistoryEntry[]) {
	return (Story: React.ComponentType) => (
		<SeedDecorator entries={entries}>
			<Story />
		</SeedDecorator>
	);
}

export const Empty: Story = {
	decorators: [withSeedData([])],
};

export const Improving: Story = {
	decorators: [
		withSeedData(generateGameHistory({ count: 30, trend: 'improving' })),
	],
};

export const Declining: Story = {
	decorators: [
		withSeedData(generateGameHistory({ count: 30, trend: 'declining' })),
	],
};

export const Flat: Story = {
	decorators: [
		withSeedData(generateGameHistory({ count: 30, trend: 'flat' })),
	],
};

export const FewGames: Story = {
	decorators: [
		withSeedData(generateGameHistory({ count: 3, trend: 'improving' })),
	],
};

export const SingleGame: Story = {
	decorators: [
		withSeedData(generateGameHistory({ count: 1 })),
	],
};

export const ManyGames: Story = {
	decorators: [
		withSeedData(generateGameHistory({ count: 100, trend: 'improving' })),
	],
};
