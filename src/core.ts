import Dexie, { EntityTable } from 'dexie';
import { applyDiscard, generateDeck, shuffleOrder } from './deck';
import {
	DbCollectionItemNameGameDataMisses,
	DbCollectionItemNameGameDataFastestScore,
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
	DbCollectionItemNameGameRun,
	DbName,
	SavedGameKey,
} from './constants';
import {
	CurrentGameSaveVersion,
	type GameCompletionData,
	type GameSaveData,
} from './platform/types';
import type { UnlockedAchievement } from './achievements/achievement-types';
import {
	applyCompletion,
	canMutateGameplay,
	createNewRun,
	fromRunRecord,
	markScoreSubmitted,
	migrateLegacyRun,
	resolveRunFromSave,
	shouldRecordHistory,
	toRunRecord,
	type GameRunRecord,
	type GameRunState,
} from './game-run';
import { createScoreSubmissionCoordinator } from './score-submission';

export
interface GameHistoryEntry {
	readonly id: string;
	readonly completedAt: number;
	readonly score: number;
	readonly time: number;
	readonly maxCombo: number;
	readonly remainingCards: number;
	readonly setsFound: number;
	readonly misses: number;
	readonly fastestScore: number;
	readonly scoreSubmitted?: boolean;
}
import {
	BitwiseValue,
	Card,
	SetOrders,
} from './types';

export { generateCanonicalDeck, generateDeck } from './deck';

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
	>;
	gamehistory: EntityTable<
		GameHistoryEntry,
		'id'
	>;
	achievements: EntityTable<
		UnlockedAchievement,
		'id'
	>;
	gamerun: EntityTable<
		GameRunRecord,
		'id'
	>;
};
await initDb();

export
function getDb() {
	return db;
}

async function initDb() {
	db.version(1).stores({
		setorders: '++name, order',
		gamedata: '++id, value',
	});

	db.version(2).stores({
		setorders: '++name, order',
		gamedata: '++id, value',
		gamehistory: '++id, completedAt',
	}).upgrade(async tx => {
		const gamedata = tx.table('gamedata');
		const oldEntry = await gamedata.get('shuffle-count');
		await gamedata.add({ id: DbCollectionItemNameGameDataMisses, value: 0 });
		await gamedata.add({ id: DbCollectionItemNameGameDataFastestScore, value: 0 });
		if (oldEntry) {
			await gamedata.delete('shuffle-count');
		}
	});

	db.version(3).stores({
		setorders: '++name, order',
		gamedata: '++id, value',
		gamehistory: '++id, completedAt',
		achievements: '++id, unlockedAt',
	});

	db.version(4).stores({
		setorders: '++name, order',
		gamedata: '++id, value',
		gamehistory: '++id, completedAt',
		achievements: '++id, unlockedAt',
		gamerun: 'id',
	}).upgrade(async tx => {
		const deck = await tx.table('setorders').get(DbCollectionItemNameSetOrdersDeck) as SetOrders | undefined;
		const deckLength = deck?.order.length ?? 1;
		await tx.table('gamerun').add(toRunRecord(migrateLegacyRun(deckLength)));
	});

	if(await db.setorders.get(DbCollectionItemNameSetOrdersDeck)) {
		// Migration for existing databases that don't have max-combo
		if (!(await db.gamedata.get(DbCollectionItemNameGameDataMaxCombo))) {
			await db.gamedata.add({
				id: DbCollectionItemNameGameDataMaxCombo,
				value: 0,
			});
		}
		if (!(await db.gamerun.get(DbCollectionItemNameGameRun))) {
			const deck = await db.setorders.get(DbCollectionItemNameSetOrdersDeck);
			await db.gamerun.add(toRunRecord(migrateLegacyRun(deck?.order.length ?? 1)));
		}
		return;
	}

	await Promise.all([
		db.gamedata.add({
			id: DbCollectionItemNameGameDataTime,
			value: 0,
		}),
		db.gamedata.add({
			id: DbCollectionItemNameGameDataMisses,
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
		db.gamedata.add({
			id: DbCollectionItemNameGameDataFastestScore,
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
		db.gamerun.add(toRunRecord(createNewRun())),
	]);
}

export
async function resetGameCore() {
	localStorage.removeItem(SavedGameKey);
	await Promise.all([
		db.gamedata.update(DbCollectionItemNameGameDataTime, { value: 0 }),
		db.gamedata.update(DbCollectionItemNameGameDataMisses, { value: 0 }),
		db.gamedata.update(DbCollectionItemNameGameDataScore, { value: 0 }),
		db.gamedata.update(DbCollectionItemNameGameDataScoreValue, { value: SCORE_CONFIG.BASE_VALUE }),
		db.gamedata.update(DbCollectionItemNameGameDataLastMatchTime, { value: 0 }),
		db.gamedata.update(DbCollectionItemNameGameDataComboCount, { value: 0 }),
		db.gamedata.update(DbCollectionItemNameGameDataMaxCombo, { value: 0 }),
		db.gamedata.update(DbCollectionItemNameGameDataFastestScore, { value: 0 }),
		db.setorders.update(DbCollectionItemNameSetOrdersDeck, { order: generateDeck() }),
		db.setorders.update(DbCollectionItemNameSetOrdersDiscard, { order: [] }),
		db.gamerun.put(toRunRecord(createNewRun())),
	])
}

export
async function resetComboState() {
	await db.transaction('rw', db.gamedata, db.gamerun, async () => {
		if (!(await isRunMutable())) {
			return;
		}

		await Promise.all([
			db.gamedata.update(DbCollectionItemNameGameDataLastMatchTime, { value: 0 }),
			db.gamedata.update(DbCollectionItemNameGameDataComboCount, { value: 0 }),
		]);
	});
}

export
async function exportGameState(): Promise<GameSaveData> {
	const [deck, discard, time, misses, score, scoreValue, lastMatchTime, comboCount, maxCombo, fastestScore, achievements, run] =
		await Promise.all([
			db.setorders.get(DbCollectionItemNameSetOrdersDeck),
			db.setorders.get(DbCollectionItemNameSetOrdersDiscard),
			db.gamedata.get(DbCollectionItemNameGameDataTime),
			db.gamedata.get(DbCollectionItemNameGameDataMisses),
			db.gamedata.get(DbCollectionItemNameGameDataScore),
			db.gamedata.get(DbCollectionItemNameGameDataScoreValue),
			db.gamedata.get(DbCollectionItemNameGameDataLastMatchTime),
			db.gamedata.get(DbCollectionItemNameGameDataComboCount),
			db.gamedata.get(DbCollectionItemNameGameDataMaxCombo),
			db.gamedata.get(DbCollectionItemNameGameDataFastestScore),
			db.achievements.toArray(),
			getCurrentRun(),
		]);
	return {
		version: CurrentGameSaveVersion,
		savedAt: Date.now(),
		deck: deck?.order ?? [],
		discard: discard?.order ?? [],
		time: time?.value ?? 0,
		misses: misses?.value ?? 0,
		score: score?.value ?? 0,
		scoreValue: scoreValue?.value ?? SCORE_CONFIG.BASE_VALUE,
		lastMatchTime: lastMatchTime?.value ?? 0,
		comboCount: comboCount?.value ?? 0,
		maxCombo: maxCombo?.value ?? 0,
		fastestScore: fastestScore?.value ?? 0,
		achievements: achievements.map(a => ({ id: a.id, unlockedAt: a.unlockedAt })),
		runId: run.runId,
		completed: run.completed,
		historyEntryId: run.historyEntryId,
		scoreSubmitted: run.scoreSubmitted,
	};
}

export
async function importGameState(data: GameSaveData): Promise<void> {
	await Promise.all([
		db.setorders.put({ name: DbCollectionItemNameSetOrdersDeck, order: [...data.deck] }),
		db.setorders.put({ name: DbCollectionItemNameSetOrdersDiscard, order: [...data.discard] }),
		db.gamedata.put({ id: DbCollectionItemNameGameDataTime, value: data.time }),
		db.gamedata.put({ id: DbCollectionItemNameGameDataMisses, value: data.misses }),
		db.gamedata.put({ id: DbCollectionItemNameGameDataFastestScore, value: data.fastestScore }),
		db.gamedata.put({ id: DbCollectionItemNameGameDataScore, value: data.score }),
		db.gamedata.put({ id: DbCollectionItemNameGameDataScoreValue, value: data.scoreValue }),
		db.gamedata.put({ id: DbCollectionItemNameGameDataLastMatchTime, value: data.lastMatchTime }),
		db.gamedata.put({ id: DbCollectionItemNameGameDataComboCount, value: data.comboCount }),
		db.gamedata.put({ id: DbCollectionItemNameGameDataMaxCombo, value: data.maxCombo }),
		db.gamerun.put(toRunRecord(resolveRunFromSave(data))),
	]);
	localStorage.setItem(SavedGameKey, String(data.time));

	if (data.achievements) {
		const existing = await db.achievements.toArray();
		const existingIds = new Set(existing.map(a => a.id));

		const newAchievements = data.achievements
			.filter(a => !existingIds.has(a.id))
			.map(a => ({ id: a.id, unlockedAt: a.unlockedAt }));

		if (newAchievements.length > 0) {
			await db.achievements.bulkAdd(newAchievements);
		}
	}
}

export
async function updateTime(newTime: number) {
	if (!(await isRunMutable())) {
		return;
	}

	await db.gamedata.update(DbCollectionItemNameGameDataTime, {
		value: newTime,
	});

	localStorage.setItem(SavedGameKey, newTime.toString());
}

export
async function performTimerTick(newTime: number) {
	await db.transaction('rw', db.gamedata, db.gamerun, async () => {
		if (!(await isRunMutable())) {
			return;
		}

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

	if (!(await isRunMutable())) {
		return;
	}

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
	return db.transaction('rw', db.gamedata, db.gamerun, async () => {
		if (!(await isRunMutable())) {
			return null;
		}

		return applyMatchPayout(currentTime);
	});
}

async function applyMatchPayout(currentTime: number) {
	const [scoreData, scoreValueData, lastMatchData, comboData, maxComboData, fastestScoreData] = await Promise.all([
		db.gamedata.get(DbCollectionItemNameGameDataScore),
		db.gamedata.get(DbCollectionItemNameGameDataScoreValue),
		db.gamedata.get(DbCollectionItemNameGameDataLastMatchTime),
		db.gamedata.get(DbCollectionItemNameGameDataComboCount),
		db.gamedata.get(DbCollectionItemNameGameDataMaxCombo),
		db.gamedata.get(DbCollectionItemNameGameDataFastestScore),
	]);

	if (!(scoreData && scoreValueData && lastMatchData && comboData && maxComboData && fastestScoreData)) {
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

	const scoreDelta = currentTime - lastMatchData.value;
	const currentFastest = fastestScoreData.value;
	const newFastestScore = currentFastest === 0
		? scoreDelta
		: Math.min(currentFastest, scoreDelta);

	await Promise.all([
		db.gamedata.update(DbCollectionItemNameGameDataScore, { value: newScore }),
		db.gamedata.update(DbCollectionItemNameGameDataScoreValue, { value: newScoreValue }),
		db.gamedata.update(DbCollectionItemNameGameDataLastMatchTime, { value: currentTime }),
		db.gamedata.update(DbCollectionItemNameGameDataComboCount, { value: newComboCount }),
		db.gamedata.update(DbCollectionItemNameGameDataMaxCombo, { value: newMaxCombo }),
		db.gamedata.update(DbCollectionItemNameGameDataFastestScore, { value: newFastestScore }),
	]);

	return { pointsAwarded: currentScoreValue, comboCount: newComboCount, maxCombo: newMaxCombo };
}

export
async function penalizeInvalidSet() {
	return db.transaction('rw', db.gamedata, db.gamerun, async () => {
		if (!(await isRunMutable())) {
			return null;
		}

		const [scoreValueData, missesData] = await Promise.all([
			db.gamedata.get(DbCollectionItemNameGameDataScoreValue),
			db.gamedata.get(DbCollectionItemNameGameDataMisses),
		]);

		if (!(scoreValueData && missesData)) {
			return null;
		}

		const newValue = applyPenalty(scoreValueData.value, SCORE_CONFIG.INVALID_SET_PENALTY);

		await Promise.all([
			db.gamedata.update(DbCollectionItemNameGameDataScoreValue, { value: newValue }),
			db.gamedata.update(DbCollectionItemNameGameDataMisses, { value: missesData.value + 1 }),
		]);

		return SCORE_CONFIG.INVALID_SET_PENALTY;
	});
}

export
async function penalizeUnnecessaryShuffle() {
	return db.transaction('rw', db.gamedata, db.gamerun, async () => {
		if (!(await isRunMutable())) {
			return null;
		}

		const [scoreValueData, missesData] = await Promise.all([
			db.gamedata.get(DbCollectionItemNameGameDataScoreValue),
			db.gamedata.get(DbCollectionItemNameGameDataMisses),
		]);

		if (!(scoreValueData && missesData)) {
			return null;
		}

		const newValue = applyPenalty(scoreValueData.value, SCORE_CONFIG.SHUFFLE_WITH_SET_PENALTY);

		await Promise.all([
			db.gamedata.update(DbCollectionItemNameGameDataScoreValue, { value: newValue }),
			db.gamedata.update(DbCollectionItemNameGameDataMisses, { value: missesData.value + 1 }),
		]);

		return SCORE_CONFIG.SHUFFLE_WITH_SET_PENALTY;
	});
}

export
async function shuffleDeck() {
	return db.transaction('rw', db.setorders, db.gamerun, async () => {
		if (!(await isRunMutable())) {
			return;
		}

		const deck = await db.setorders.get(DbCollectionItemNameSetOrdersDeck);

		if (!deck) {
			return;
		}

		await db.setorders.update(DbCollectionItemNameSetOrdersDeck, {
			order: shuffleOrder(deck.order),
		});
	});
}

export
async function discardCards(discardCardIds: string[], boardSize: number) {
	await db.transaction('rw', db.setorders, db.gamerun, async () => {
		if (!(await isRunMutable())) {
			return;
		}

		const deckOrder = await db.setorders.get(DbCollectionItemNameSetOrdersDeck);
		const discardPile = await db.setorders.get(DbCollectionItemNameSetOrdersDiscard);

		if(!(deckOrder && discardPile)) {
			return;
		}

		const next = applyDiscard(deckOrder.order, discardPile.order, discardCardIds, boardSize);

		await Promise.all([
			db.setorders.update(DbCollectionItemNameSetOrdersDeck, {
				order: [...next.deck],
			}),
			db.setorders.update(DbCollectionItemNameSetOrdersDiscard, {
				order: [...next.discard],
			}),
		]);
	});
}

export
async function getGameCompletionData(): Promise<GameCompletionData> {
	const [scoreData, timeData, maxComboData, fastestScoreData] = await Promise.all([
		db.gamedata.get(DbCollectionItemNameGameDataScore),
		db.gamedata.get(DbCollectionItemNameGameDataTime),
		db.gamedata.get(DbCollectionItemNameGameDataMaxCombo),
		db.gamedata.get(DbCollectionItemNameGameDataFastestScore),
	]);

	return {
		score: scoreData?.value ?? 0,
		time: timeData?.value ?? 0,
		maxCombo: maxComboData?.value ?? 0,
		fastestMatch: fastestScoreData?.value ?? 0,
	};
}

export
interface RecordedCompletion {
	readonly entry: GameHistoryEntry;
	readonly isNew: boolean;
}

export
async function recordGameCompletion(remainingCards: number): Promise<RecordedCompletion> {
	return db.transaction(
		'rw',
		db.gamedata,
		db.setorders,
		db.gamehistory,
		db.gamerun,
		async () => persistCompletion(remainingCards),
	);
}

export
async function completeNoSetsRun(
	currentTime: number,
	remainingCards: number,
): Promise<RecordedCompletion & {
	readonly payout: Awaited<ReturnType<typeof applyMatchPayout>>;
}> {
	return db.transaction('rw', db.gamedata, db.setorders, db.gamehistory, db.gamerun, async () => {
		if (!(await isRunMutable())) {
			const recorded = await persistCompletion(remainingCards);
			return { ...recorded, payout: null };
		}

		const payout = await applyMatchPayout(currentTime);
		const recorded = await persistCompletion(remainingCards);
		return { ...recorded, payout };
	});
}

const coordinateScoreSubmission = createScoreSubmissionCoordinator();

export
function submitRunScore(
	entry: GameHistoryEntry,
	submit: (data: GameCompletionData) => Promise<boolean>,
): Promise<boolean> {
	return coordinateScoreSubmission(
		{
			runId: entry.id,
			score: completionDataFromHistory(entry),
		},
		submit,
		{
			isSubmitted: isRunScoreSubmitted,
			markSubmitted: markRunScoreSubmitted,
		},
	);
}

function completionDataFromHistory(entry: GameHistoryEntry): GameCompletionData {
	return {
		score: entry.score,
		time: entry.time,
		maxCombo: entry.maxCombo,
		fastestMatch: entry.fastestScore,
	};
}

async function isRunScoreSubmitted(runId: string) {
	const [entry, run] = await Promise.all([
		db.gamehistory.get(runId),
		getCurrentRun(),
	]);
	return entry?.scoreSubmitted === true || (run.runId === runId && run.scoreSubmitted);
}

async function markRunScoreSubmitted(runId: string) {
	await db.transaction('rw', db.gamehistory, db.gamerun, async () => {
		const [entry, run] = await Promise.all([
			db.gamehistory.get(runId),
			getCurrentRun(),
		]);
		const historyUpdate = entry
			? db.gamehistory.update(runId, { scoreSubmitted: true })
			: Promise.resolve(0);
		const currentRunUpdate = run.runId === runId
			? db.gamerun.put(toRunRecord(markScoreSubmitted(run)))
			: Promise.resolve();

		await Promise.all([historyUpdate, currentRunUpdate]);
	});
}

export
async function getCurrentRun(): Promise<GameRunState> {
	const record = await db.gamerun.get(DbCollectionItemNameGameRun);
	if (record) {
		return fromRunRecord(record);
	}

	const deck = await db.setorders.get(DbCollectionItemNameSetOrdersDeck);
	const run = migrateLegacyRun(deck?.order.length ?? 1);
	await db.gamerun.put(toRunRecord(run));
	return run;
}

async function isRunMutable() {
	return canMutateGameplay(await getCurrentRun());
}

async function persistCompletion(remainingCards: number): Promise<RecordedCompletion> {
	const run = await getCurrentRun();
	const existing = await loadExistingHistory(run);
	if (existing) {
		if (shouldRecordHistory(run)) {
			await db.gamerun.put(toRunRecord(applyCompletion(run, existing.id)));
		}
		return { entry: existing, isNew: false };
	}

	if (!shouldRecordHistory(run)) {
		return {
			entry: await buildHistoryEntry(run.runId, remainingCards),
			isNew: false,
		};
	}

	const entry = await buildHistoryEntry(run.runId, remainingCards);
	await db.gamehistory.add(entry);
	await db.gamerun.put(toRunRecord(applyCompletion(run, entry.id)));
	return { entry, isNew: true };
}

async function loadExistingHistory(run: GameRunState) {
	if (run.historyEntryId) {
		const linked = await db.gamehistory.get(run.historyEntryId);
		if (linked) {
			return linked;
		}
	}

	return db.gamehistory.get(run.runId);
}

async function buildHistoryEntry(id: string, remainingCards: number): Promise<GameHistoryEntry> {
	const [scoreData, timeData, maxComboData, missesData, fastestScoreData, discardPile] = await Promise.all([
		db.gamedata.get(DbCollectionItemNameGameDataScore),
		db.gamedata.get(DbCollectionItemNameGameDataTime),
		db.gamedata.get(DbCollectionItemNameGameDataMaxCombo),
		db.gamedata.get(DbCollectionItemNameGameDataMisses),
		db.gamedata.get(DbCollectionItemNameGameDataFastestScore),
		db.setorders.get(DbCollectionItemNameSetOrdersDiscard),
	]);

	return {
		id,
		completedAt: Date.now(),
		score: scoreData?.value ?? 0,
		time: timeData?.value ?? 0,
		maxCombo: maxComboData?.value ?? 0,
		remainingCards,
		setsFound: Math.floor((discardPile?.order.length ?? 0) / 3),
		misses: missesData?.value ?? 0,
		fastestScore: fastestScoreData?.value ?? 0,
		scoreSubmitted: false,
	};
}

export
async function unlockAchievement(id: string): Promise<UnlockedAchievement> {
	const entry: UnlockedAchievement = { id, unlockedAt: Date.now() };
	await db.achievements.add(entry);
	return entry;
}
