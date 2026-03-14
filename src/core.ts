import { moveAndOverwriteItem, randomizeArray } from './utils';
import Dexie, { EntityTable } from 'dexie';
import {
	DbCollectionItemNameGameDataShuffleCount,
	DbCollectionItemNameGameDataTime,
	DbCollectionItemNameGameDataSoundEnabled,
	DbCollectionItemNameGameDataMusicEnabled,
	DbCollectionItemNameGameDataScore,
	DbCollectionItemNameGameDataScoreValue,
	DbCollectionItemNameGameDataLastMatchTime,
	DbCollectionItemNameGameDataComboCount,
	DbCollectionItemNameGameDataMaxCombo,
	DbCollectionItemNameSetOrdersDeck,
	DbCollectionItemNameSetOrdersDiscard,
	DbName,
	SavedGameKey,
} from './constants';
import type { GameCompletionData } from './platform/types';
import {
	BitwiseValue,
	Card,
	Colors,
	Counts,
	Fills,
	SetOrders,
	Shapes,
} from './types';

export
function setExists(cards: Card[]) {
	if(cards.length < 3) {
		return false;
	}

	for(let a = 0; a < cards.length - 2; a++) {
		for(let b = a + 1; b < cards.length - 1; b++) {
			for(let c = b + 1; c < cards.length; c++) {
				const cardA = cards[a];
				const cardB = cards[b];
				const cardC = cards[c];

				if(!cardA || !cardB || !cardC) {
					throw new Error(`Card index out of bounds: ${a}, ${b}, ${c}`);
				}

				if(isSet(cardA, cardB, cardC)) {
					return true;
				}
			}
		}
	}

	return false;
}

export
function isSet(a: Card, b: Card, c: Card) {
	if(import.meta.env.VITE_CHEAT) return true;

	return (
		allSameOrDifferent(a.color, b.color, c.color) &&
		allSameOrDifferent(a.fill, b.fill, c.fill) &&
		allSameOrDifferent(a.shape, b.shape, c.shape) &&
		allSameOrDifferent(a.count, b.count, c.count)
	);
}

export
function getMismatchedAttributes(a: Card, b: Card, c: Card): string[] {
	const attributes = [
		['color', a.color, b.color, c.color],
		['fill', a.fill, b.fill, c.fill],
		['shape', a.shape, b.shape, c.shape],
		['count', a.count, b.count, c.count],
	] as const;

	return attributes
		.filter(([, x, y, z]) => !allSameOrDifferent(x, y, z))
		.map(([name]) => name);
}

export
function allSameOrDifferent(a: BitwiseValue, b: BitwiseValue, c: BitwiseValue) {
	return (
		// all are the same (bits AND to 'a'")
		((a & b & c) == a) ||
		// all are different (bits OR to '111' (7)")
		((a | b | c) == 7)
	);
}

// Scoring system configuration
export const SCORE_CONFIG = {
	BASE_VALUE: 10_000,
	DECAY_PER_SECOND: 10,
	COMBO_THRESHOLD_SECONDS: 7,
	COMBO_BONUS_BASE: 500,
	INVALID_SET_PENALTY: 500,
	SHUFFLE_WITH_SET_PENALTY: 500,
	MINIMUM_VALUE: 1_000,
	ROUNDING_FACTOR: 10,
} as const;

// Pure scoring calculation functions
function roundToNearest(value: number, multiple: number) {
	return Math.round(value / multiple) * multiple;
}

export
function calculateDecayedScoreValue(currentValue: number, secondsElapsed: number) {
	const decayed = currentValue - (SCORE_CONFIG.DECAY_PER_SECOND * secondsElapsed);
	return roundToNearest(Math.max(decayed, SCORE_CONFIG.MINIMUM_VALUE), SCORE_CONFIG.ROUNDING_FACTOR);
}

export
function calculateComboBonus(comboCount: number) {
	if (comboCount === 0) return 0;

	const multiplier = comboCount === 1 ? 1 : (comboCount - 1) * 0.5 + 1;
	return roundToNearest(SCORE_CONFIG.COMBO_BONUS_BASE * multiplier, SCORE_CONFIG.ROUNDING_FACTOR);
}

export
function calculateScoreValueWithCombo(currentValue: number, comboCount: number) {
	const bonus = calculateComboBonus(comboCount);
	return roundToNearest(currentValue + bonus, SCORE_CONFIG.ROUNDING_FACTOR);
}

export
function applyPenalty(currentValue: number, penalty: number) {
	const penalized = currentValue - penalty;
	return roundToNearest(Math.max(penalized, SCORE_CONFIG.MINIMUM_VALUE), SCORE_CONFIG.ROUNDING_FACTOR);
}

export
function isComboEligible(currentTime: number, lastMatchTime: number) {
	return lastMatchTime > 0 && (currentTime - lastMatchTime) <= SCORE_CONFIG.COMBO_THRESHOLD_SECONDS;
}


const db = new Dexie(DbName) as Dexie & {
	setorders: EntityTable<
		SetOrders,
		'name'
	>;
	gamedata: EntityTable<
		{id: string; value: number;},
		'id'
	>
};
await initDb();

export
function getDb() {
	return db;
}

async function initDb() {;
// Schema declaration:
	db.version(1).stores({
		setorders: '++name, order', // primary key "id" (for the runtime!)
		gamedata: '++id, value',
	});

	if(await db.setorders.get(DbCollectionItemNameSetOrdersDeck)) {
		// Migration for existing databases that don't have max-combo
		if (!(await db.gamedata.get(DbCollectionItemNameGameDataMaxCombo))) {
			await db.gamedata.add({
				id: DbCollectionItemNameGameDataMaxCombo,
				value: 0,
			});
		}
		return;
	}

	await Promise.all([
		db.gamedata.add({
			id: DbCollectionItemNameGameDataTime,
			value: 0,
		}),
		db.gamedata.add({
			id: DbCollectionItemNameGameDataShuffleCount,
			value: 0,
		}),
		db.gamedata.add({
			id: DbCollectionItemNameGameDataSoundEnabled,
			value: 1,
		}),
		db.gamedata.add({
			id: DbCollectionItemNameGameDataMusicEnabled,
			value: 1,
		}),
		db.gamedata.add({
			id: DbCollectionItemNameGameDataScore,
			value: 0,
		}),
		db.gamedata.add({
			id: DbCollectionItemNameGameDataScoreValue,
			value: SCORE_CONFIG.BASE_VALUE,
		}),
		db.gamedata.add({
			id: DbCollectionItemNameGameDataLastMatchTime,
			value: 0,
		}),
		db.gamedata.add({
			id: DbCollectionItemNameGameDataComboCount,
			value: 0,
		}),
		db.gamedata.add({
			id: DbCollectionItemNameGameDataMaxCombo,
			value: 0,
		}),
		db.setorders.add({
			name: DbCollectionItemNameSetOrdersDeck,
			order: generateDeck(),
		}),
		db.setorders.add({
			name: DbCollectionItemNameSetOrdersDiscard,
			order: [],
		}),
	]);
}

export
async function resetGameCore() {
	localStorage.removeItem(SavedGameKey);
	await Promise.all([
		db.gamedata.update(DbCollectionItemNameGameDataTime, { value: 0 }),
		db.gamedata.update(DbCollectionItemNameGameDataShuffleCount, { value: 0 }),
		db.gamedata.update(DbCollectionItemNameGameDataScore, { value: 0 }),
		db.gamedata.update(DbCollectionItemNameGameDataScoreValue, { value: SCORE_CONFIG.BASE_VALUE }),
		db.gamedata.update(DbCollectionItemNameGameDataLastMatchTime, { value: 0 }),
		db.gamedata.update(DbCollectionItemNameGameDataComboCount, { value: 0 }),
		db.gamedata.update(DbCollectionItemNameGameDataMaxCombo, { value: 0 }),
		db.setorders.update(DbCollectionItemNameSetOrdersDeck, { order: generateDeck() }),
		db.setorders.update(DbCollectionItemNameSetOrdersDiscard, { order: [] }),
	])
}

export
async function resetComboState() {
	await Promise.all([
		db.gamedata.update(DbCollectionItemNameGameDataLastMatchTime, { value: 0 }),
		db.gamedata.update(DbCollectionItemNameGameDataComboCount, { value: 0 }),
	]);
}

export
async function updateTime(newTime: number) {
	await db.gamedata.update(DbCollectionItemNameGameDataTime, {
		value: newTime,
	});

	localStorage.setItem(SavedGameKey, newTime.toString());
}

export
async function performTimerTick(newTime: number) {
	await db.transaction('rw', db.gamedata, async () => {
		const [scoreValueData, lastMatchData, comboData] = await Promise.all([
			db.gamedata.get(DbCollectionItemNameGameDataScoreValue),
			db.gamedata.get(DbCollectionItemNameGameDataLastMatchTime),
			db.gamedata.get(DbCollectionItemNameGameDataComboCount),
		]);

		if (!(scoreValueData && lastMatchData && comboData)) {
			return;
		}

		const comboExpired = comboData.value > 0 && !isComboEligible(newTime, lastMatchData.value);
		const newScoreValue = comboExpired
			? SCORE_CONFIG.BASE_VALUE
			: calculateDecayedScoreValue(scoreValueData.value, 1);

		const writes: Promise<unknown>[] = [
			db.gamedata.update(DbCollectionItemNameGameDataTime, { value: newTime }),
			db.gamedata.update(DbCollectionItemNameGameDataScoreValue, { value: newScoreValue }),
		];

		if (comboExpired) {
			writes.push(
				db.gamedata.update(DbCollectionItemNameGameDataComboCount, { value: 0 }),
			);
		}

		await Promise.all(writes);
	});
	localStorage.setItem(SavedGameKey, newTime.toString());
}

export
async function getSoundEnabled() {
	const result = await db.gamedata.get(DbCollectionItemNameGameDataSoundEnabled);
	return result?.value === 1;
}

export
async function updateSoundEnabled(enabled: boolean) {
	await db.gamedata.update(DbCollectionItemNameGameDataSoundEnabled, {
		value: enabled ? 1 : 0,
	});
}

export
async function getMusicEnabled() {
	const result = await db.gamedata.get(DbCollectionItemNameGameDataMusicEnabled);
	return result?.value === 1;
}

export
async function updateMusicEnabled(enabled: boolean) {
	await db.gamedata.update(DbCollectionItemNameGameDataMusicEnabled, {
		value: enabled ? 1 : 0,
	});
}

// Scoring database update functions
export
async function awardMatchScore(currentTime: number) {
	return db.transaction('rw', db.gamedata, async () => {
		const [scoreData, scoreValueData, lastMatchData, comboData, maxComboData] = await Promise.all([
			db.gamedata.get(DbCollectionItemNameGameDataScore),
			db.gamedata.get(DbCollectionItemNameGameDataScoreValue),
			db.gamedata.get(DbCollectionItemNameGameDataLastMatchTime),
			db.gamedata.get(DbCollectionItemNameGameDataComboCount),
			db.gamedata.get(DbCollectionItemNameGameDataMaxCombo),
		]);

		if (!(scoreData && scoreValueData && lastMatchData && comboData && maxComboData)) {
			return null;
		}

		const isCombo = isComboEligible(currentTime, lastMatchData.value);
		const newComboCount = isCombo ? comboData.value + 1 : 0;
		const newMaxCombo = Math.max(maxComboData.value, newComboCount);
		const currentScoreValue = scoreValueData.value;
		const newScore = scoreData.value + currentScoreValue;
		const newScoreValue = calculateScoreValueWithCombo(
			currentScoreValue,
			newComboCount
		);

		await Promise.all([
			db.gamedata.update(DbCollectionItemNameGameDataScore, { value: newScore }),
			db.gamedata.update(DbCollectionItemNameGameDataScoreValue, { value: newScoreValue }),
			db.gamedata.update(DbCollectionItemNameGameDataLastMatchTime, { value: currentTime }),
			db.gamedata.update(DbCollectionItemNameGameDataComboCount, { value: newComboCount }),
			db.gamedata.update(DbCollectionItemNameGameDataMaxCombo, { value: newMaxCombo }),
		]);

		return { pointsAwarded: currentScoreValue, comboCount: newComboCount, maxCombo: newMaxCombo };
	});
}

export
async function penalizeInvalidSet() {
	return db.transaction('rw', db.gamedata, async () => {
		const scoreValueData = await db.gamedata.get(DbCollectionItemNameGameDataScoreValue);

		if (!scoreValueData) {
			return null;
		}

		const newValue = applyPenalty(scoreValueData.value, SCORE_CONFIG.INVALID_SET_PENALTY);

		await db.gamedata.update(DbCollectionItemNameGameDataScoreValue, {
			value: newValue,
		});

		return SCORE_CONFIG.INVALID_SET_PENALTY;
	});
}

export
async function penalizeUnnecessaryShuffle() {
	return db.transaction('rw', db.gamedata, async () => {
		const scoreValueData = await db.gamedata.get(DbCollectionItemNameGameDataScoreValue);

		if (!scoreValueData) {
			return null;
		}

		const newValue = applyPenalty(scoreValueData.value, SCORE_CONFIG.SHUFFLE_WITH_SET_PENALTY);

		await db.gamedata.update(DbCollectionItemNameGameDataScoreValue, {
			value: newValue,
		});

		return SCORE_CONFIG.SHUFFLE_WITH_SET_PENALTY;
	});
}

export
async function shuffleDeck() {
	await db.transaction('rw', [db.setorders, db.gamedata], async () => {
		const deck = await db.setorders.get(DbCollectionItemNameSetOrdersDeck);
		const shuffleCount = await db.gamedata.get(DbCollectionItemNameGameDataShuffleCount);

		if(!(deck && shuffleCount)) {
			return;
		}

		await Promise.all([
			db.setorders.update(DbCollectionItemNameSetOrdersDeck, {
				order: randomizeArray(deck.order),
			}),
			db.gamedata.update(DbCollectionItemNameGameDataShuffleCount, {
				value: shuffleCount.value + 1,
			}),
		]);
	});
}

export
async function discardCards(discardCardIds: string[], boardSize: number) {
	await db.transaction('rw', db.setorders, async () => {
		const deckOrder = await db.setorders.get(DbCollectionItemNameSetOrdersDeck);
		const discardPile = await db.setorders.get(DbCollectionItemNameSetOrdersDiscard);

		if(!(deckOrder && discardPile)) {
			return;
		}

		const selectedIndexes = discardCardIds.map(selectedId => deckOrder.order.indexOf(selectedId)) as [number, number, number];

		await Promise.all([
			db.setorders.update(DbCollectionItemNameSetOrdersDeck, {
				order: deckOrder.order.length > boardSize ?
					dealNewCards(deckOrder.order, selectedIndexes, boardSize):
					deckOrder.order.filter(id => !discardCardIds.includes(id)),
			}),
			db.setorders.update(DbCollectionItemNameSetOrdersDiscard, {
				order: [...discardPile.order, ...discardCardIds]
			}),
		]);
	});
}

function dealNewCards(cardOrderIds: string[], removeCardIndexes: [number, number, number], dealtCardCount: number) {
	const afterFirst = moveAndOverwriteItem(cardOrderIds, dealtCardCount, removeCardIndexes[0]);
	const afterSecond = moveAndOverwriteItem(afterFirst, dealtCardCount, removeCardIndexes[1]);
	return moveAndOverwriteItem(afterSecond, dealtCardCount, removeCardIndexes[2]);
}

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
async function getGameCompletionData(): Promise<GameCompletionData> {
	const [scoreData, timeData, maxComboData] = await Promise.all([
		db.gamedata.get(DbCollectionItemNameGameDataScore),
		db.gamedata.get(DbCollectionItemNameGameDataTime),
		db.gamedata.get(DbCollectionItemNameGameDataMaxCombo),
	]);

	return {
		score: scoreData?.value ?? 0,
		time: timeData?.value ?? 0,
		maxCombo: maxComboData?.value ?? 0,
	};
}
