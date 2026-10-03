import { createUuid } from './uuid';

export const CurrentGameRunId = 'current' as const;

export
interface GameRunState {
	readonly runId: string;
	readonly completed: boolean;
	readonly historyEntryId: string | null;
	readonly scoreSubmitted: boolean;
}

export
interface GameRunRecord extends GameRunState {
	readonly id: typeof CurrentGameRunId;
}

export
interface SavedRunFields {
	readonly deck: readonly string[];
	readonly runId?: string;
	readonly completed?: boolean;
	readonly historyEntryId?: string | null;
	readonly scoreSubmitted?: boolean;
}

/**
 * Older saves (cloud v1–v3, or a local DB from before run metadata) have no
 * completion flag. An empty deck is the only board state that can be inferred
 * as finished. A leftover board with cards may be an in-progress run or a
 * finished "No sets" run; those are treated as in-progress so a genuine
 * unfinished continue still works. Historical completion cannot always be
 * inferred from the deck.
 */
export
function migrateLegacyRun(
	deckLength: number,
	createId: () => string = createRunId,
): GameRunState {
	return {
		runId: createId(),
		completed: deckLength === 0,
		historyEntryId: null,
		scoreSubmitted: false,
	};
}

export
function createNewRun(createId: () => string = createRunId): GameRunState {
	return {
		runId: createId(),
		completed: false,
		historyEntryId: null,
		scoreSubmitted: false,
	};
}

export
function resolveRunFromSave(
	data: SavedRunFields,
	createId: () => string = createRunId,
): GameRunState {
	if (typeof data.runId === 'string' && data.runId.length > 0) {
		return {
			runId: data.runId,
			completed: data.completed === true,
			historyEntryId: data.historyEntryId || null,
			scoreSubmitted: data.scoreSubmitted === true,
		};
	}

	return migrateLegacyRun(data.deck.length, createId);
}

export
function applyCompletion(run: GameRunState, historyEntryId: string): GameRunState {
	if (run.completed) {
		return run;
	}

	return {
		...run,
		completed: true,
		historyEntryId,
	};
}

export
function markScoreSubmitted(run: GameRunState): GameRunState {
	if (!run.completed || run.scoreSubmitted) {
		return run;
	}

	return {
		...run,
		scoreSubmitted: true,
	};
}

export
function canMutateGameplay(run: GameRunState): boolean {
	return !run.completed;
}

export
function shouldRecordHistory(run: GameRunState): boolean {
	return !run.completed;
}

export
function shouldSubmitScore(run: GameRunState): boolean {
	return run.completed && !run.scoreSubmitted;
}

export
function toRunRecord(run: GameRunState): GameRunRecord {
	return {
		id: CurrentGameRunId,
		...run,
	};
}

export
function fromRunRecord(record: GameRunRecord): GameRunState {
	return {
		runId: record.runId,
		completed: record.completed,
		historyEntryId: record.historyEntryId,
		scoreSubmitted: record.scoreSubmitted,
	};
}

function createRunId() {
	return createUuid();
}
