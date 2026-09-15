import { describe, expect, test } from 'bun:test';
import {
	applyCompletion,
	canMutateGameplay,
	createNewRun,
	markScoreSubmitted,
	migrateLegacyRun,
	resolveRunFromSave,
	shouldRecordHistory,
	shouldSubmitScore,
} from './game-run';

const EMPTY_DECK_TERMINAL = {
	deck: [] as const,
	remainingCards: 0,
} as const;

const NO_SETS_TERMINAL = {
	deck: [
		JSON.stringify({ fill: 1, color: 1, shape: 1, count: 1 }),
		JSON.stringify({ fill: 1, color: 1, shape: 1, count: 2 }),
		JSON.stringify({ fill: 2, color: 1, shape: 1, count: 1 }),
	],
	remainingCards: 3,
} as const;

const IN_PROGRESS_DECK = {
	deck: [
		JSON.stringify({ fill: 1, color: 1, shape: 1, count: 1 }),
		JSON.stringify({ fill: 2, color: 2, shape: 2, count: 2 }),
	],
} as const;

describe('createNewRun', () => {
	test('starts incomplete with a unique identity', () => {
		const run = createNewRun(() => 'run-1');

		expect(run).toEqual({
			runId: 'run-1',
			completed: false,
			historyEntryId: null,
			scoreSubmitted: false,
		});
		expect(canMutateGameplay(run)).toBe(true);
		expect(shouldRecordHistory(run)).toBe(true);
		expect(shouldSubmitScore(run)).toBe(false);
	});
});

describe('migrateLegacyRun', () => {
	test('infers completion only from an empty deck', () => {
		expect(migrateLegacyRun(EMPTY_DECK_TERMINAL.deck.length, () => 'legacy-empty')).toEqual({
			runId: 'legacy-empty',
			completed: true,
			historyEntryId: null,
			scoreSubmitted: false,
		});
	});

	test('does not infer completion from leftover cards, including a no-sets board', () => {
		const leftover = migrateLegacyRun(NO_SETS_TERMINAL.deck.length, () => 'legacy-nosets');
		const inProgress = migrateLegacyRun(IN_PROGRESS_DECK.deck.length, () => 'legacy-play');

		expect(leftover.completed).toBe(false);
		expect(inProgress.completed).toBe(false);
		expect(canMutateGameplay(leftover)).toBe(true);
	});
});

describe('resolveRunFromSave', () => {
	test('restores persisted run identity and terminal status from v4 saves', () => {
		const run = resolveRunFromSave({
			deck: NO_SETS_TERMINAL.deck,
			runId: 'saved-run',
			completed: true,
			historyEntryId: 'saved-run',
			scoreSubmitted: true,
		});

		expect(run).toEqual({
			runId: 'saved-run',
			completed: true,
			historyEntryId: 'saved-run',
			scoreSubmitted: true,
		});
		expect(canMutateGameplay(run)).toBe(false);
		expect(shouldRecordHistory(run)).toBe(false);
		expect(shouldSubmitScore(run)).toBe(false);
	});

	test('treats older empty-deck saves as complete without inventing a history id', () => {
		const run = resolveRunFromSave({
			deck: EMPTY_DECK_TERMINAL.deck,
		}, () => 'v3-empty');

		expect(run.completed).toBe(true);
		expect(run.historyEntryId).toBeNull();
		expect(shouldRecordHistory(run)).toBe(false);
	});

	test('treats older leftover-card saves as unfinished because completion cannot be inferred', () => {
		const run = resolveRunFromSave({
			deck: NO_SETS_TERMINAL.deck,
		}, () => 'v3-leftover');

		expect(run.completed).toBe(false);
		expect(shouldRecordHistory(run)).toBe(true);
	});
});

describe('applyCompletion', () => {
	test('records a run once and ignores later or overlapping completion requests', () => {
		const run = createNewRun(() => 'run-1');
		const first = applyCompletion(run, 'run-1');
		const second = applyCompletion(first, 'other-entry');
		const overlapping = applyCompletion(run, 'race-entry');

		expect(first).toEqual({
			runId: 'run-1',
			completed: true,
			historyEntryId: 'run-1',
			scoreSubmitted: false,
		});
		expect(second).toEqual(first);
		expect(overlapping.historyEntryId).toBe('race-entry');
		expect(shouldRecordHistory(first)).toBe(false);
		expect(canMutateGameplay(first)).toBe(false);
		expect(shouldSubmitScore(first)).toBe(true);
	});
});

describe('markScoreSubmitted', () => {
	test('retries failed submissions of the same completed result and does not resubmit after success', () => {
		const completed = applyCompletion(createNewRun(() => 'run-1'), 'run-1');

		expect(shouldSubmitScore(completed)).toBe(true);

		const submitted = markScoreSubmitted(completed);

		expect(submitted.scoreSubmitted).toBe(true);
		expect(shouldSubmitScore(submitted)).toBe(false);
		expect(markScoreSubmitted(submitted)).toEqual(submitted);
		expect(markScoreSubmitted(createNewRun(() => 'run-2')).scoreSubmitted).toBe(false);
	});
});
