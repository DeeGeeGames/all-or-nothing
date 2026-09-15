import { describe, expect, test } from 'bun:test';
import {
	CanonicalDeckSize,
	applyDiscard,
	generateCanonicalDeck,
	generateDeck,
	shuffleOrder,
} from './deck';

const BOARD_SIZE = 12;

function firstTriple(deck: readonly string[]): readonly [string, string, string] {
	const [first, second, third] = deck;
	if (first === undefined || second === undefined || third === undefined) {
		throw new Error('expected at least three cards');
	}
	return [first, second, third];
}

describe('generateCanonicalDeck', () => {
	test('contains 81 unique cards', () => {
		const deck = generateCanonicalDeck();

		expect(deck).toHaveLength(CanonicalDeckSize);
		expect(new Set(deck).size).toBe(CanonicalDeckSize);
	});
});

describe('applyDiscard', () => {
	test('does not mutate the input deck or discard', () => {
		const deck = generateCanonicalDeck();
		const discard: string[] = [];
		const snapshot = { deck: [...deck], discard: [...discard] };
		const cardIds = deck.slice(0, 3);

		applyDiscard(deck, discard, cardIds, BOARD_SIZE);

		expect(deck).toEqual(snapshot.deck);
		expect(discard).toEqual(snapshot.discard);
	});

	test('replaces board cards from the undealt deck when cards remain', () => {
		const deck = generateCanonicalDeck();
		const cardIds = firstTriple(deck);
		const incoming = deck.slice(12, 15);

		const next = applyDiscard(deck, [], cardIds, BOARD_SIZE);

		expect(next.discard).toEqual(cardIds);
		expect(next.deck).toHaveLength(deck.length - 3);
		expect(next.deck.slice(0, 3)).toEqual(incoming);
		expect(cardIds.every(id => !next.deck.includes(id))).toBe(true);
	});

	test('removes the cards without dealing when the board is the rest of the deck', () => {
		const deck = generateCanonicalDeck().slice(0, BOARD_SIZE);
		const cardIds = firstTriple(deck);

		const next = applyDiscard(deck, ['already'], cardIds, BOARD_SIZE);

		expect(next.deck).toHaveLength(BOARD_SIZE - 3);
		expect(next.discard).toEqual(['already', ...cardIds]);
		expect(cardIds.every(id => !next.deck.includes(id))).toBe(true);
	});

	test('leaves state unchanged for an incomplete or unknown selection', () => {
		const deck = generateCanonicalDeck();

		expect(applyDiscard(deck, [], deck.slice(0, 2), BOARD_SIZE)).toEqual({
			deck,
			discard: [],
		});
		expect(applyDiscard(deck, [], ['missing-a', 'missing-b', 'missing-c'], BOARD_SIZE)).toEqual({
			deck,
			discard: [],
		});
	});
});

describe('shuffleOrder', () => {
	test('returns a permutation and leaves the input unchanged', () => {
		const deck = generateCanonicalDeck();
		const shuffled = shuffleOrder(deck);

		expect(shuffled).toHaveLength(deck.length);
		expect([...shuffled].sort()).toEqual([...deck].sort());
		expect(deck).toEqual(generateCanonicalDeck());
	});
});

describe('generateDeck', () => {
	test('is a shuffled complete canonical deck', () => {
		const deck = generateDeck();

		expect(deck).toHaveLength(CanonicalDeckSize);
		expect(new Set(deck).size).toBe(CanonicalDeckSize);
		expect([...deck].sort()).toEqual([...generateCanonicalDeck()].sort());
	});
});
