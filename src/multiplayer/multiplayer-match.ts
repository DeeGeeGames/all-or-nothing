import { BoardCardCount } from '@/constants';
import {
	CanonicalDeckSize,
	applyDiscard,
	asCardTriple,
	generateDeck,
	shuffleOrder,
} from '@/deck';
import type { PlayerId } from './multiplayer-types';

export
interface MultiplayerBoard {
	readonly generation: number;
	readonly deck: readonly string[];
	readonly discard: readonly string[];
}

export
interface MultiplayerSession {
	readonly board: MultiplayerBoard;
	readonly playerIds: readonly PlayerId[];
	readonly scores: ReadonlyMap<PlayerId, number>;
	readonly selections: ReadonlyMap<PlayerId, readonly string[]>;
	readonly discardingCardIds: readonly string[];
	readonly gameOver: boolean;
}

export
interface CardSelectResult {
	readonly session: MultiplayerSession;
	readonly kind: 'noop' | 'partial' | 'valid-set' | 'invalid-set';
	readonly playerId: PlayerId;
	readonly cardIds: readonly string[];
}

export
interface NoSetsResult {
	readonly session: MultiplayerSession;
	readonly kind: 'noop' | 'penalty' | 'shuffle' | 'game-over';
	readonly playerId: PlayerId;
}

export
function createMultiplayerSession(
	playerIds: readonly PlayerId[],
	createDeck: () => readonly string[] = generateDeck,
	generation = 0,
): MultiplayerSession {
	return {
		board: {
			generation,
			deck: createDeck(),
			discard: [],
		},
		playerIds,
		scores: zeroScores(playerIds),
		selections: new Map(),
		discardingCardIds: [],
		gameOver: false,
	};
}

export
function rematchSession(
	session: MultiplayerSession,
	createDeck: () => readonly string[] = generateDeck,
): MultiplayerSession {
	return createMultiplayerSession(
		session.playerIds,
		createDeck,
		session.board.generation + 1,
	);
}

export
function selectCard(
	session: MultiplayerSession,
	playerId: PlayerId,
	cardId: string,
	checkSet: (cardIds: readonly [string, string, string]) => boolean,
	boardSize = BoardCardCount,
): CardSelectResult {
	const noop = {
		session,
		kind: 'noop' as const,
		playerId,
		cardIds: [] as const,
	};

	if (session.gameOver) {
		return noop;
	}

	if (session.discardingCardIds.includes(cardId)) {
		return noop;
	}

	const playerCards = session.selections.get(playerId) ?? [];
	if (playerCards.includes(cardId)) {
		const nextCards = playerCards.filter(id => id !== cardId);
		return {
			session: withSelection(session, playerId, nextCards),
			kind: 'partial',
			playerId,
			cardIds: nextCards,
		};
	}

	if (playerCards.length >= 3) {
		return noop;
	}

	const dealt = session.board.deck.slice(0, boardSize);
	if (!dealt.includes(cardId)) {
		return noop;
	}

	const newSelection = [...playerCards, cardId];
	const triple = asCardTriple(newSelection);
	if (!triple) {
		return {
			session: withSelection(session, playerId, newSelection),
			kind: 'partial',
			playerId,
			cardIds: newSelection,
		};
	}

	if (!checkSet(triple)) {
		return {
			session: addScore(withSelection(session, playerId, newSelection), playerId, -1),
			kind: 'invalid-set',
			playerId,
			cardIds: triple,
		};
	}

	const cleared = clearCardsFromAllSelections(session, triple);
	const scored = addScore(cleared, playerId, 1);

	return {
		session: {
			...scored,
			discardingCardIds: [...scored.discardingCardIds, ...triple],
		},
		kind: 'valid-set',
		playerId,
		cardIds: triple,
	};
}

export
function callNoSets(
	session: MultiplayerSession,
	playerId: PlayerId,
	hasSet: boolean,
	boardSize = BoardCardCount,
): NoSetsResult {
	if (session.gameOver) {
		return { session, kind: 'noop', playerId };
	}

	if (hasSet) {
		return {
			session: addScore(session, playerId, -1),
			kind: 'penalty',
			playerId,
		};
	}

	const awarded = addScore(session, playerId, 1);
	if (awarded.board.deck.length <= boardSize) {
		return {
			session: { ...awarded, gameOver: true },
			kind: 'game-over',
			playerId,
		};
	}

	return {
		session: {
			...awarded,
			selections: new Map(),
			board: {
				...awarded.board,
				deck: shuffleOrder(awarded.board.deck),
			},
		},
		kind: 'shuffle',
		playerId,
	};
}

export
function commitDiscard(
	session: MultiplayerSession,
	cardIds: readonly string[],
	generation: number,
	boardSize = BoardCardCount,
): MultiplayerSession {
	if (session.board.generation !== generation) {
		return session;
	}

	if (session.gameOver) {
		return session;
	}

	const nextBoard = applyDiscard(session.board.deck, session.board.discard, cardIds, boardSize);
	const next = {
		...session,
		board: {
			...session.board,
			deck: nextBoard.deck,
			discard: nextBoard.discard,
		},
		discardingCardIds: session.discardingCardIds.filter(id => !cardIds.includes(id)),
	};

	return completeIfBoardEmpty(next);
}

export
function clearPlayerSelection(
	session: MultiplayerSession,
	playerId: PlayerId,
	generation: number,
): MultiplayerSession {
	if (session.board.generation !== generation) {
		return session;
	}

	if (session.gameOver) {
		return session;
	}

	return withSelection(session, playerId, []);
}

export
function completeIfBoardEmpty(session: MultiplayerSession): MultiplayerSession {
	if (session.gameOver || session.board.deck.length > 0) {
		return session;
	}

	return { ...session, gameOver: true };
}

export
function isCompleteCanonicalDeck(deck: readonly string[]): boolean {
	return deck.length === CanonicalDeckSize && new Set(deck).size === CanonicalDeckSize;
}

function zeroScores(playerIds: readonly PlayerId[]): ReadonlyMap<PlayerId, number> {
	return new Map(playerIds.map(id => [id, 0]));
}

function addScore(
	session: MultiplayerSession,
	playerId: PlayerId,
	delta: number,
): MultiplayerSession {
	const scores = new Map(session.scores);
	scores.set(playerId, (scores.get(playerId) ?? 0) + delta);
	return { ...session, scores };
}

function withSelection(
	session: MultiplayerSession,
	playerId: PlayerId,
	cardIds: readonly string[],
): MultiplayerSession {
	const selections = new Map(session.selections);
	selections.set(playerId, cardIds);
	return { ...session, selections };
}

function clearCardsFromAllSelections(
	session: MultiplayerSession,
	cardIds: readonly string[],
): MultiplayerSession {
	const removed = new Set(cardIds);
	const selections = new Map(
		[...session.selections].map(([id, cards]) => [
			id,
			cards.filter(cardId => !removed.has(cardId)),
		] as const),
	);
	return { ...session, selections };
}
