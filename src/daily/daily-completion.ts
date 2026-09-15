import type { Card } from '@/types';

export type DailyCompletionSource = 'no-sets' | 'set-found' | 'restore';

export type DailyCardPickResult =
	| { readonly kind: 'noop' }
	| { readonly kind: 'select'; readonly selectedIds: ReadonlySet<string> }
	| { readonly kind: 'miss'; readonly selectedIds: ReadonlySet<string> }
	| {
		readonly kind: 'set';
		readonly selectedIds: ReadonlySet<string>;
		readonly flippedIds: ReadonlySet<string>;
		readonly setsFound: number;
		readonly completed: boolean;
	};

export
function remainingUnflippedCards(
	cards: readonly Card[],
	flippedIds: ReadonlySet<string>,
): Card[] {
	return cards.filter(card => !flippedIds.has(card.id ?? ''));
}

export
function shouldRecordDailyCompletion(input: {
	readonly alreadyCompleted: boolean;
	readonly source: DailyCompletionSource;
	readonly hasRemainingSet: boolean;
	readonly flippedCount: number;
}): boolean {
	if (input.alreadyCompleted) return false;
	if (input.hasRemainingSet) return false;
	if (input.source === 'restore') return input.flippedCount > 0;
	return true;
}

export
function applyDailyCardPick(input: {
	readonly cards: readonly Card[];
	readonly selectedIds: ReadonlySet<string>;
	readonly flippedIds: ReadonlySet<string>;
	readonly setsFound: number;
	readonly cardId: string;
	readonly isSet: (a: Card, b: Card, c: Card) => boolean;
	readonly hasSet: (cards: Card[]) => boolean;
}): DailyCardPickResult {
	const { cards, selectedIds, flippedIds, setsFound, cardId, isSet, hasSet } = input;
	if (!cardId || flippedIds.has(cardId)) {
		return { kind: 'noop' };
	}

	if (selectedIds.has(cardId)) {
		return {
			kind: 'select',
			selectedIds: new Set([...selectedIds].filter(id => id !== cardId)),
		};
	}

	const nextSelected = new Set([...selectedIds, cardId]);
	if (nextSelected.size !== 3) {
		return { kind: 'select', selectedIds: nextSelected };
	}

	const selectedCards = cards.filter(card => nextSelected.has(card.id ?? ''));
	const [first, second, third] = selectedCards;
	if (selectedCards.length !== 3 || !first || !second || !third || !isSet(first, second, third)) {
		return { kind: 'miss', selectedIds: new Set() };
	}

	const nextFlipped = new Set([...flippedIds, ...nextSelected]);
	return {
		kind: 'set',
		selectedIds: new Set(),
		flippedIds: nextFlipped,
		setsFound: setsFound + 1,
		completed: !hasSet(remainingUnflippedCards(cards, nextFlipped)),
	};
}
