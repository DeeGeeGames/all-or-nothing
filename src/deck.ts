import { moveAndOverwriteItem, randomizeArray } from './utils';
import {
	Colors,
	Counts,
	Fills,
	Shapes,
} from './types';

export const CanonicalDeckSize = 81;

export
function generateCanonicalDeck(): string[] {
	return Object.values(Fills).flatMap(fill =>
		Object.values(Colors).flatMap(color =>
			Object.values(Shapes).flatMap(shape =>
				Object.values(Counts).map(count =>
					JSON.stringify({ fill, color, shape, count })
				)
			)
		)
	);
}

export
function generateDeck() {
	return randomizeArray(generateCanonicalDeck());
}

export
function shuffleOrder(deck: readonly string[]): string[] {
	return randomizeArray([...deck]);
}

export
function applyDiscard(
	deck: readonly string[],
	discard: readonly string[],
	discardCardIds: readonly string[],
	boardSize: number,
): { readonly deck: readonly string[]; readonly discard: readonly string[] } {
	const triple = asCardTriple(discardCardIds);
	if (!triple) {
		return { deck, discard };
	}

	const [firstId, secondId, thirdId] = triple;
	const selectedIndexes: [number, number, number] = [
		deck.indexOf(firstId),
		deck.indexOf(secondId),
		deck.indexOf(thirdId),
	];

	if (selectedIndexes.some(index => index < 0)) {
		return { deck, discard };
	}

	if (deck.length <= boardSize) {
		return {
			deck: deck.filter(id => !discardCardIds.includes(id)),
			discard: [...discard, firstId, secondId, thirdId],
		};
	}

	return {
		deck: dealNewCards(deck, selectedIndexes, boardSize),
		discard: [...discard, firstId, secondId, thirdId],
	};
}

export
function asCardTriple(ids: readonly string[]): readonly [string, string, string] | null {
	if (ids.length !== 3) {
		return null;
	}

	const [first, second, third] = ids;
	if (first === undefined || second === undefined || third === undefined) {
		return null;
	}

	return [first, second, third];
}

function dealNewCards(
	cardOrderIds: readonly string[],
	removeCardIndexes: readonly [number, number, number],
	dealtCardCount: number,
): string[] {
	const afterFirst = moveAndOverwriteItem([...cardOrderIds], dealtCardCount, removeCardIndexes[0]);
	const afterSecond = moveAndOverwriteItem(afterFirst, dealtCardCount, removeCardIndexes[1]);
	return moveAndOverwriteItem(afterSecond, dealtCardCount, removeCardIndexes[2]);
}
