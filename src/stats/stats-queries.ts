import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { getDb } from '@/core';
import type { GameHistoryEntry } from '@/core';
import { computePersonalBests, computeAggregateStats, toChartData } from './stats-utils';
import type { PersonalBests, AggregateStats, ChartDataPoint } from './stats-types';

const db = getDb();

export function useGameHistory(): readonly GameHistoryEntry[] | undefined {
	return useLiveQuery(
		() => db.gamehistory.orderBy('completedAt').limit(200).toArray(),
	);
}

export function usePersonalBests(history: readonly GameHistoryEntry[] | undefined): PersonalBests | undefined {
	return useMemo(
		() => history ? computePersonalBests(history) : undefined,
		[history],
	);
}

export function useAggregateStats(history: readonly GameHistoryEntry[] | undefined): AggregateStats | undefined {
	return useMemo(
		() => history ? computeAggregateStats(history) : undefined,
		[history],
	);
}

export function useChartData(history: readonly GameHistoryEntry[] | undefined): readonly ChartDataPoint[] | undefined {
	return useMemo(
		() => history ? toChartData(history) : undefined,
		[history],
	);
}
