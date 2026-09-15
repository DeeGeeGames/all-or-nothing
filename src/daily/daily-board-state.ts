const STORAGE_KEY_PREFIX = 'daily-board-state-';

interface DailyBoardState {
	flippedCardIds: string[];
	setsFound: number;
}

function boardKey(date: string): string {
	return `${STORAGE_KEY_PREFIX}${date}`;
}

function isDailyBoardState(value: unknown): value is DailyBoardState {
	if (typeof value !== 'object' || value === null) return false;
	if (!('flippedCardIds' in value) || !('setsFound' in value)) return false;
	return Array.isArray(value.flippedCardIds) && typeof value.setsFound === 'number';
}

export
function saveDailyBoardState(
	date: string,
	flippedCardIds: ReadonlySet<string>,
	setsFound: number,
	storage: Pick<Storage, 'setItem'> = localStorage,
): void {
	const state: DailyBoardState = {
		flippedCardIds: [...flippedCardIds],
		setsFound,
	};
	storage.setItem(boardKey(date), JSON.stringify(state));
}

export
function loadDailyBoardState(
	date: string,
	storage: Pick<Storage, 'getItem'> = localStorage,
): { flippedCardIds: Set<string>; setsFound: number } | null {
	const raw = storage.getItem(boardKey(date));
	if (!raw) return null;

	try {
		const parsed: unknown = JSON.parse(raw);
		if (!isDailyBoardState(parsed)) {
			return null;
		}

		return {
			flippedCardIds: new Set(parsed.flippedCardIds.filter(id => typeof id === 'string')),
			setsFound: parsed.setsFound,
		};
	} catch {
		return null;
	}
}

export
function clearDailyBoardState(
	date: string,
	storage: Pick<Storage, 'removeItem'> = localStorage,
): void {
	storage.removeItem(boardKey(date));
}
