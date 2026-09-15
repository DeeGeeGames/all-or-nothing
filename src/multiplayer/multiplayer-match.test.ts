import { describe, expect, test } from 'bun:test';
import {
	CanonicalDeckSize,
	generateCanonicalDeck,
} from '@/deck';
import { CurrentGameSaveVersion, type GameSaveData } from '@/platform/types';
import {
	callNoSets,
	clearPlayerSelection,
	commitDiscard,
	completeIfBoardEmpty,
	createMultiplayerSession,
	isCompleteCanonicalDeck,
	rematchSession,
	selectCard,
	type MultiplayerSession,
} from './multiplayer-match';
import type { PlayerId } from './multiplayer-types';

const PLAYERS = ['p1', 'p2'] as const satisfies readonly PlayerId[];
const ALWAYS_SET = () => true;
const NEVER_SET = () => false;
const NO_SETS_LEFTOVER = [
	JSON.stringify({ fill: 1, color: 1, shape: 1, count: 1 }),
	JSON.stringify({ fill: 1, color: 1, shape: 1, count: 2 }),
	JSON.stringify({ fill: 2, color: 1, shape: 1, count: 1 }),
] as const;

function sessionWith(
	overrides: Partial<MultiplayerSession> & {
		readonly deck?: readonly string[];
		readonly discard?: readonly string[];
		readonly generation?: number;
	} = {},
): MultiplayerSession {
	const base = createMultiplayerSession(PLAYERS, () => [...generateCanonicalDeck()]);
	const {
		deck,
		discard,
		generation,
		board,
		...rest
	} = overrides;

	return {
		...base,
		...rest,
		board: board ?? {
			generation: generation ?? base.board.generation,
			deck: deck ?? base.board.deck,
			discard: discard ?? base.board.discard,
		},
	};
}

function threeDealt(session: MultiplayerSession): readonly [string, string, string] {
	const [a, b, c] = session.board.deck;
	if (a === undefined || b === undefined || c === undefined) {
		throw new Error('expected a dealt triple');
	}
	return [a, b, c];
}

function snapshotSave(overrides: Partial<GameSaveData> = {}): GameSaveData {
	return {
		version: CurrentGameSaveVersion,
		savedAt: 1_700_000_000_000,
		deck: generateCanonicalDeck().slice(20, 70),
		discard: generateCanonicalDeck().slice(0, 9),
		time: 77,
		misses: 3,
		fastestScore: 2,
		score: 12_345,
		scoreValue: 8_500,
		lastMatchTime: 10,
		comboCount: 2,
		maxCombo: 4,
		runId: 'sp-run',
		completed: false,
		historyEntryId: null,
		scoreSubmitted: false,
		...overrides,
	};
}

function createRecordingCloud() {
	const payloads: GameSaveData[] = [];
	return {
		payloads,
		async cloudSave(data: GameSaveData) {
			payloads.push(structuredClone(data));
			return true;
		},
	};
}

describe('createMultiplayerSession', () => {
	test('starts a full isolated match without sharing the seed array', () => {
		const seed = generateCanonicalDeck();
		const session = createMultiplayerSession(PLAYERS, () => seed);

		expect(session.gameOver).toBe(false);
		expect(session.board.generation).toBe(0);
		expect(isCompleteCanonicalDeck(session.board.deck)).toBe(true);
		expect(session.board.discard).toEqual([]);
		expect(session.scores.get('p1')).toBe(0);
		expect(session.scores.get('p2')).toBe(0);

		const after = commitDiscard(session, threeDealt(session), session.board.generation);
		expect(seed).toEqual(generateCanonicalDeck());
		expect(after.board.deck).not.toEqual(seed);
	});
});

describe('selectCard', () => {
	test('awards a set, clears overlapping selections, and waits to discard', () => {
		const session = sessionWith();
		const [first, second, third] = threeDealt(session);
		const withP2 = selectCard(session, 'p2', first, NEVER_SET).session;
		const afterTwo = selectCard(
			selectCard(withP2, 'p1', first, NEVER_SET).session,
			'p1',
			second,
			NEVER_SET,
		).session;
		const found = selectCard(afterTwo, 'p1', third, ALWAYS_SET);

		expect(found.kind).toBe('valid-set');
		expect(found.session.scores.get('p1')).toBe(1);
		expect(found.session.selections.get('p1')).toEqual([]);
		expect(found.session.selections.get('p2')).toEqual([]);
		expect(found.session.discardingCardIds).toEqual([first, second, third]);
		expect(found.session.board.deck).toEqual(session.board.deck);
		expect(found.session.board.discard).toEqual([]);
	});

	test('penalizes an invalid set without touching the board', () => {
		const session = sessionWith();
		const [first, second, third] = threeDealt(session);
		const afterTwo = selectCard(
			selectCard(session, 'p1', first, NEVER_SET).session,
			'p1',
			second,
			NEVER_SET,
		).session;
		const invalid = selectCard(afterTwo, 'p1', third, NEVER_SET);

		expect(invalid.kind).toBe('invalid-set');
		expect(invalid.session.scores.get('p1')).toBe(-1);
		expect(invalid.session.board).toEqual(session.board);
		expect(invalid.session.discardingCardIds).toEqual([]);
	});

	test('ignores selection after the match is over', () => {
		const session = sessionWith({ gameOver: true });
		const [first] = threeDealt(session);
		const result = selectCard(session, 'p1', first, ALWAYS_SET);

		expect(result.kind).toBe('noop');
		expect(result.session).toBe(session);
	});
});

describe('callNoSets', () => {
	test('penalizes a false call when a set is present', () => {
		const session = sessionWith();
		const result = callNoSets(session, 'p2', true);

		expect(result.kind).toBe('penalty');
		expect(result.session.scores.get('p2')).toBe(-1);
		expect(result.session.gameOver).toBe(false);
		expect(result.session.board).toEqual(session.board);
	});

	test('ends the match on a valid leftover-card no-sets call', () => {
		const leftover = sessionWith({ deck: NO_SETS_LEFTOVER, discard: generateCanonicalDeck().slice(0, 78) });
		const result = callNoSets(leftover, 'p1', false);

		expect(result.kind).toBe('game-over');
		expect(result.session.gameOver).toBe(true);
		expect(result.session.scores.get('p1')).toBe(1);
		expect(result.session.board.deck).toEqual([...NO_SETS_LEFTOVER]);
	});

	test('shuffles remaining cards when the deck is not exhausted', () => {
		const session = sessionWith();
		const result = callNoSets(session, 'p1', false);

		expect(result.kind).toBe('shuffle');
		expect(result.session.gameOver).toBe(false);
		expect(result.session.scores.get('p1')).toBe(1);
		expect(result.session.board.discard).toEqual([]);
		expect(result.session.board.generation).toBe(session.board.generation);
		expect([...result.session.board.deck].sort()).toEqual([...session.board.deck].sort());
	});

	test('ignores no-sets input on the results screen', () => {
		const session = sessionWith({ gameOver: true, deck: NO_SETS_LEFTOVER });
		const result = callNoSets(session, 'p1', false);

		expect(result.kind).toBe('noop');
		expect(result.session).toBe(session);
	});
});

describe('commitDiscard', () => {
	test('applies an in-generation discard and ends a cleared board', () => {
		const session = sessionWith({ deck: generateCanonicalDeck().slice(0, 3) });
		const cardIds = threeDealt(session);
		const next = commitDiscard(session, cardIds, session.board.generation);

		expect(next.board.deck).toEqual([]);
		expect(next.board.discard).toEqual([...cardIds]);
		expect(next.gameOver).toBe(true);
	});

	test('ignores a discard from a previous match generation', () => {
		const session = sessionWith();
		const cardIds = threeDealt(session);
		const rematch = rematchSession(session, () => [...generateCanonicalDeck()].reverse());
		const stale = commitDiscard(rematch, cardIds, session.board.generation);

		const rematchLead = [...generateCanonicalDeck()].reverse()[0];
		expect(stale).toBe(rematch);
		expect(stale.board.deck[0]).toBe(rematchLead);
	});

	test('ignores a late discard after results', () => {
		const session = sessionWith({ gameOver: true, deck: NO_SETS_LEFTOVER });
		const next = commitDiscard(session, [...NO_SETS_LEFTOVER], session.board.generation);

		expect(next).toBe(session);
	});
});

describe('clearPlayerSelection', () => {
	test('does not clear a new match selection from a stale penalty timeout', () => {
		const selected = selectCard(sessionWith(), 'p1', generateCanonicalDeck()[0] ?? '', NEVER_SET).session;
		const rematch = rematchSession(selected, () => generateCanonicalDeck());
		const stale = clearPlayerSelection(rematch, 'p1', selected.board.generation);
		const next = selectCard(rematch, 'p1', generateCanonicalDeck()[1] ?? '', NEVER_SET).session;
		const staleAfterSelect = clearPlayerSelection(next, 'p1', selected.board.generation);

		expect(stale.selections.get('p1')).toBeUndefined();
		expect(staleAfterSelect.selections.get('p1')).toEqual([generateCanonicalDeck()[1] ?? '']);
	});
});

describe('rematchSession', () => {
	test('deals a fresh 81-card game after a full clear', () => {
		const empty = completeIfBoardEmpty(sessionWith({
			deck: [],
			discard: generateCanonicalDeck(),
			gameOver: true,
			scores: new Map([['p1', 4], ['p2', 2]]),
		}));
		const next = rematchSession(empty, () => generateCanonicalDeck());

		expect(empty.gameOver).toBe(true);
		expect(isCompleteCanonicalDeck(next.board.deck)).toBe(true);
		expect(next.board.discard).toEqual([]);
		expect(next.gameOver).toBe(false);
		expect(next.scores.get('p1')).toBe(0);
		expect(next.scores.get('p2')).toBe(0);
		expect(next.board.generation).toBe(empty.board.generation + 1);
		expect(next.playerIds).toEqual(PLAYERS);
	});

	test('deals a fresh 81-card game after a leftover no-sets finish', () => {
		const leftover = sessionWith({
			deck: NO_SETS_LEFTOVER,
			discard: generateCanonicalDeck().slice(0, 78),
			gameOver: true,
		});
		const first = rematchSession(leftover, () => [...generateCanonicalDeck()].reverse());
		const second = rematchSession(first, () => generateCanonicalDeck());

		expect(first.board.deck).toHaveLength(CanonicalDeckSize);
		expect(first.board.deck).not.toEqual([...NO_SETS_LEFTOVER]);
		expect(first.board.discard).toEqual([]);
		expect(second.board.generation).toBe(leftover.board.generation + 2);
		expect(isCompleteCanonicalDeck(second.board.deck)).toBe(true);
		expect(second.discardingCardIds).toEqual([]);
		expect(second.selections.size).toBe(0);
	});

	test('rapid rematch does not overlap: each call yields one complete new board', () => {
		const finished = sessionWith({ gameOver: true, deck: [] });
		const first = rematchSession(finished, () => generateCanonicalDeck());
		const second = rematchSession(first, () => [...generateCanonicalDeck()].reverse());

		expect(isCompleteCanonicalDeck(first.board.deck)).toBe(true);
		expect(isCompleteCanonicalDeck(second.board.deck)).toBe(true);
		expect(second.board.generation).toBe(first.board.generation + 1);
		expect(second.board.deck).not.toEqual(first.board.deck);
	});
});

describe('single-player isolation', () => {
	test('multiplayer play, shuffle, finish, and rematch leave a frozen single-player save untouched', () => {
		const saved = snapshotSave();
		const frozen = structuredClone(saved);
		const session = createMultiplayerSession(PLAYERS, () => generateCanonicalDeck());
		const [a, b, c] = threeDealt(session);
		const found = selectCard(
			selectCard(selectCard(session, 'p1', a, NEVER_SET).session, 'p1', b, NEVER_SET).session,
			'p1',
			c,
			ALWAYS_SET,
		).session;
		const discarded = commitDiscard(found, [a, b, c], found.board.generation);
		const shuffled = callNoSets(discarded, 'p2', false).session;
		const finished = callNoSets(
			sessionWith({
				...shuffled,
				deck: NO_SETS_LEFTOVER,
				discard: shuffled.board.discard,
			}),
			'p1',
			false,
		).session;
		rematchSession(finished, () => [...generateCanonicalDeck()].reverse());

		expect(saved).toEqual(frozen);
		expect(saved.deck).toHaveLength(50);
		expect(saved.time).toBe(77);
		expect(saved.score).toBe(12_345);
		expect(saved.runId).toBe('sp-run');
		expect(finished.board.deck).not.toEqual(saved.deck);
	});

	test('cloud save records the single-player snapshot, not the multiplayer board', async () => {
		const saved = snapshotSave({
			deck: generateCanonicalDeck().slice(10, 40),
			discard: generateCanonicalDeck().slice(40, 46),
			time: 19,
			score: 2222,
			comboCount: 5,
			maxCombo: 5,
		});
		const cloud = createRecordingCloud();
		const multiplayer = createMultiplayerSession(PLAYERS, () => [...generateCanonicalDeck()].reverse());
		const afterSet = commitDiscard(
			selectCard(multiplayer, 'p1', multiplayer.board.deck[0] ?? '', ALWAYS_SET).session,
			threeDealt(multiplayer),
			multiplayer.board.generation,
		);
		const afterRematch = rematchSession(afterSet, () => generateCanonicalDeck());

		await cloud.cloudSave(saved);

		expect(cloud.payloads).toHaveLength(1);
		expect(cloud.payloads[0]).toEqual(saved);
		expect(cloud.payloads[0]?.deck).not.toEqual(afterRematch.board.deck);
		expect(cloud.payloads[0]?.discard).not.toEqual(afterSet.board.discard);
		expect(cloud.payloads[0]?.time).toBe(19);
		expect(cloud.payloads[0]?.score).toBe(2222);
	});
});
