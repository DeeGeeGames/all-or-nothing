import { describe, expect, test } from 'bun:test';
import { BitwiseValues, type Card } from '@/types';
import {
	applyDailyCardPick,
	remainingUnflippedCards,
	shouldRecordDailyCompletion,
} from './daily-completion';

const One = BitwiseValues.One;
const Two = BitwiseValues.Two;
const Three = BitwiseValues.Three;

function card(
	id: string,
	fill: Card['fill'],
	color: Card['color'],
	shape: Card['shape'],
	count: Card['count'],
): Card {
	return { id, fill, color, shape, count };
}

function allSameOrDifferent(a: number, b: number, c: number) {
	return ((a & b & c) === a) || ((a | b | c) === 7);
}

function isSet(a: Card, b: Card, c: Card) {
	return (
		allSameOrDifferent(a.color, b.color, c.color) &&
		allSameOrDifferent(a.fill, b.fill, c.fill) &&
		allSameOrDifferent(a.shape, b.shape, c.shape) &&
		allSameOrDifferent(a.count, b.count, c.count)
	);
}

function hasSet(cards: Card[]) {
	if (cards.length < 3) return false;

	return cards.some((first, i) =>
		cards.slice(i + 1).some((second, j, rest) =>
			rest.slice(j + 1).some(third => isSet(first, second, third))
		)
	);
}

const SET_A = [
	card('a1', One, One, One, One),
	card('a2', One, One, One, Two),
	card('a3', One, One, One, Three),
] as const;

const SET_B = [
	card('b1', Two, Two, Two, One),
	card('b2', Two, Two, Two, Two),
	card('b3', Two, Two, Two, Three),
] as const;

const LEFTOVER = [
	card('l1', One, One, Two, One),
	card('l2', One, Two, One, One),
] as const;

function pickSet(cards: readonly Card[], ids: readonly string[]) {
	return ids.reduce(
		(state, cardId) => applyDailyCardPick({
			cards,
			selectedIds: state.kind === 'select' || state.kind === 'set' || state.kind === 'miss'
				? state.selectedIds
				: new Set(),
			flippedIds: state.kind === 'set' ? state.flippedIds : new Set(),
			setsFound: state.kind === 'set' ? state.setsFound : 0,
			cardId,
			isSet,
			hasSet,
		}),
		{ kind: 'select' as const, selectedIds: new Set<string>() },
	);
}

describe('shouldRecordDailyCompletion', () => {
	test('restore reconciles an uncredited exhausted board, not a fresh no-set board', () => {
		const exhausted = {
			alreadyCompleted: false,
			source: 'restore' as const,
			hasRemainingSet: false,
		};

		expect(shouldRecordDailyCompletion({ ...exhausted, flippedCount: 0 })).toBe(false);
		expect(shouldRecordDailyCompletion({ ...exhausted, flippedCount: 9 })).toBe(true);
		expect(shouldRecordDailyCompletion({
			...exhausted,
			alreadyCompleted: true,
			flippedCount: 9,
		})).toBe(false);
	});
});

describe('applyDailyCardPick', () => {
	test('finding a set while another remains does not complete the board', () => {
		const cards = [...SET_A, ...SET_B];
		const result = pickSet(cards, ['a1', 'a2', 'a3']);

		expect(result.kind).toBe('set');
		if (result.kind !== 'set') return;

		expect(result.completed).toBe(false);
		expect(hasSet(remainingUnflippedCards(cards, result.flippedIds))).toBe(true);
	});

	test('finding a set that leaves no remaining set completes even with unflipped cards', () => {
		const cards = [...SET_A, ...LEFTOVER];
		const result = pickSet(cards, ['a1', 'a2', 'a3']);

		expect(result.kind).toBe('set');
		if (result.kind !== 'set') return;

		expect(result.completed).toBe(true);
		expect(remainingUnflippedCards(cards, result.flippedIds)).toHaveLength(2);
		expect(hasSet(remainingUnflippedCards(cards, result.flippedIds))).toBe(false);
	});
});
