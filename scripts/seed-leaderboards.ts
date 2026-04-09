// Seeds Steam leaderboards via the Steamworks publisher Web API.
//
// Hits ISteamLeaderboards/GetLeaderboardsForGame to discover numeric IDs,
// then ISteamLeaderboards/SetLeaderboardScore to push synthetic entries.
// No game client required — runs from a dev machine against the live backend.
//
// Required env vars:
//   STEAM_PUBLISHER_KEY  Publisher Web API key
//                        (Steamworks → Users & Permissions → Manage Web API Keys)
//   STEAM_APP_ID         App ID for the title
//   SEED_STEAM_IDS       Comma-separated 64-bit SteamIDs to attribute scores to.
//                        Use accounts you control — Steam rejects invalid IDs and
//                        the in-game UI resolves persona names from these.
//
// Run with:
//   npx tsx scripts/seed-leaderboards.ts
//
// Notes:
//   - Board config below MUST mirror electron/steam-handlers.ts STEAM_LEADERBOARDS.
//     If you bump the version suffix or change sort/display there, mirror it here.
//   - Boards are created on demand via FindOrCreateLeaderboard, so a fresh appid
//     with zero existing boards is fine — running this script will create every
//     metric × period combo and seed it in one pass.
//   - For monthly boards, the script provisions the current month plus the next
//     MONTHLY_LOOKAHEAD months ahead, so future rollovers don't appear empty in
//     the UI between the moment the period flips and the first organic upload.
//   - Boards that already have at least one entry are LEFT ALONE — the script
//     never overwrites real player data on re-run. Delete a board's entries via
//     the partner site if you want to re-seed it.

const PARTNER_API = 'https://partner.steam-api.com';

// Mirror of STEAM_LEADERBOARDS in electron/steam-handlers.ts.
type SortMethod = 'Ascending' | 'Descending';
type DisplayType = 'Numeric' | 'TimeSeconds' | 'TimeMilliSeconds';

interface MetricConfig {
	readonly sort: SortMethod;
	readonly display: DisplayType;
}

const METRIC_CONFIG = {
	Highscores_v3:   { sort: 'Descending', display: 'Numeric' },
	BestTimes_v3:    { sort: 'Ascending',  display: 'TimeMilliSeconds' },
	MaxCombo_v3:     { sort: 'Descending', display: 'Numeric' },
	FastestMatch_v3: { sort: 'Ascending',  display: 'TimeSeconds' },
} as const satisfies Readonly<Record<string, MetricConfig>>;

type Metric = keyof typeof METRIC_CONFIG;
const METRICS = Object.keys(METRIC_CONFIG) as readonly Metric[];

const PERIODS = ['alltime', 'monthly', 'weekly'] as const;
type Period = typeof PERIODS[number];

// Number of FUTURE monthly boards to provision in addition to the current month.
// 3 = current + April/May/June (assuming an April run) → 4 boards per metric.
const MONTHLY_LOOKAHEAD = 3;

// Synthetic scores per metric. Index N is paired with SEED_STEAM_IDS[N % len].
// Units must match the leaderboard's display type:
//   Highscores_v3:   raw points
//   BestTimes_v3:    milliseconds (lower is better)
//   MaxCombo_v3:     raw count
//   FastestMatch_v3: seconds (lower is better)
const SEED_SCORES: Readonly<Record<Metric, readonly number[]>> = {
	Highscores_v3:   [1500, 1000],
	BestTimes_v3:    [360000, 420000],
	MaxCombo_v3:     [3, 2],
	FastestMatch_v3: [20, 30],
} as const;

function requireEnv(name: string): string {
	const value = process.env[name];
	if (!value) throw new Error(`Missing required env var: ${name}`);
	return value;
}

function getISOWeek(date: Date): { readonly year: number; readonly week: number } {
	const target = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
	target.setUTCDate(target.getUTCDate() + 3 - ((target.getUTCDay() + 6) % 7));
	const jan4 = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
	const week = 1 + Math.round(((target.getTime() - jan4.getTime()) / 86400000 - 3 + ((jan4.getUTCDay() + 6) % 7)) / 7);
	return { year: target.getUTCFullYear(), week };
}

function monthlySuffix(date: Date): string {
	return `Monthly_${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

// Each period yields a list of suffixes (or `null` for the un-suffixed all-time
// board). Returning lists lets `monthly` cover the current month plus several
// upcoming months in a single pass.
const periodSuffixListResolvers: Readonly<Record<Period, () => readonly (string | null)[]>> = {
	alltime: () => [null],
	monthly: () => {
		const now = new Date();
		return Array.from({ length: MONTHLY_LOOKAHEAD + 1 }, (_, offset) =>
			monthlySuffix(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offset, 1)))
		);
	},
	weekly: () => {
		const { year, week } = getISOWeek(new Date());
		return [`Weekly_${year}W${String(week).padStart(2, '0')}`];
	},
};

function resolveBoardNames(metric: Metric, period: Period): readonly string[] {
	return periodSuffixListResolvers[period]().map(suffix => suffix ? `${metric}_${suffix}` : metric);
}

interface FindOrCreateArgs {
	readonly key: string;
	readonly appid: string;
	readonly name: string;
	readonly sort: SortMethod;
	readonly display: DisplayType;
}

interface FindOrCreateResult {
	readonly id: number;
	readonly entryCount: number;
}

// Returns the numeric leaderboard id and current entry count, creating the
// board if it doesn't exist. Mirrors the SDK's findOrCreateLeaderboard
// semantics: idempotent on subsequent calls.
async function findOrCreateLeaderboard(args: FindOrCreateArgs): Promise<FindOrCreateResult> {
	const body = new URLSearchParams({
		key: args.key,
		appid: args.appid,
		name: args.name,
		sortmethod: args.sort,
		displaytype: args.display,
		createifnotfound: '1',
		onlytrustedwrites: '1',
		onlyfriendsreads: '0',
	});
	const res = await fetch(`${PARTNER_API}/ISteamLeaderboards/FindOrCreateLeaderboard/v2/`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		body,
	});
	if (!res.ok) throw new Error(`FindOrCreateLeaderboard(${args.name}) failed: ${res.status} ${await res.text()}`);
	const json: unknown = await res.json();
	// Steam's response shape for this endpoint nests the board under `result.leaderboard`
	// with the id in `leaderBoardID` and entry count in `leaderBoardEntries`
	// (note the unusual capitalization).
	const board = (json as {
		result?: { leaderboard?: { leaderBoardID?: number; leaderBoardEntries?: number } };
	}).result?.leaderboard;
	const id = board?.leaderBoardID;
	if (typeof id !== 'number') {
		throw new Error(`FindOrCreateLeaderboard(${args.name}) returned unexpected shape: ${JSON.stringify(json)}`);
	}
	const entryCount = typeof board.leaderBoardEntries === 'number' ? board.leaderBoardEntries : 0;
	return { id, entryCount };
}

interface SeedRequest {
	readonly boardName: string;
	readonly boardId: number;
	readonly steamId: string;
	readonly score: number;
}

async function setLeaderboardScore(key: string, appid: string, req: SeedRequest): Promise<void> {
	const body = new URLSearchParams({
		key,
		appid,
		leaderboardid: String(req.boardId),
		steamid: req.steamId,
		score: String(req.score),
		scoremethod: 'ForceUpdate',
	});
	const res = await fetch(`${PARTNER_API}/ISteamLeaderboards/SetLeaderboardScore/v1/`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		body,
	});
	if (!res.ok) {
		throw new Error(`SetLeaderboardScore(${req.boardName}, ${req.steamId}, ${req.score}) failed: ${res.status} ${await res.text()}`);
	}
}

async function main(): Promise<void> {
	const key = requireEnv('STEAM_PUBLISHER_KEY');
	const appid = requireEnv('STEAM_APP_ID');
	const steamIds = requireEnv('SEED_STEAM_IDS')
		.split(',')
		.map(s => s.trim())
		.filter(Boolean);
	if (steamIds.length === 0) throw new Error('SEED_STEAM_IDS contains no IDs');

	const targets = METRICS.flatMap(metric =>
		PERIODS.flatMap(period =>
			resolveBoardNames(metric, period).map(name => ({ metric, name }))
		)
	);

	console.log(`Ensuring ${targets.length} leaderboards exist (creating if missing)...`);
	const resolved = await Promise.all(
		targets.map(async t => {
			const config = METRIC_CONFIG[t.metric];
			const result = await findOrCreateLeaderboard({
				key,
				appid,
				name: t.name,
				sort: config.sort,
				display: config.display,
			});
			return { ...t, ...result };
		})
	);

	const seedable = resolved.filter(board => board.entryCount === 0);
	const skipped = resolved.length - seedable.length;
	if (skipped > 0) {
		console.log(`Skipping ${skipped} board(s) that already have entries:`);
		resolved
			.filter(board => board.entryCount > 0)
			.forEach(board => console.log(`  ${board.name} (${board.entryCount} entries)`));
	}

	const requests: readonly SeedRequest[] = seedable.flatMap(board =>
		SEED_SCORES[board.metric].flatMap((score, idx) => {
			const steamId = steamIds[idx % steamIds.length];
			if (!steamId) return [];
			return [{ boardName: board.name, boardId: board.id, steamId, score }];
		})
	);

	if (requests.length === 0) {
		console.log('Nothing to submit.');
		return;
	}

	console.log(`Submitting ${requests.length} synthetic scores across ${seedable.length} board(s)...`);
	const results = await Promise.allSettled(requests.map(r => setLeaderboardScore(key, appid, r)));
	const failures = results.flatMap((r, i) => {
		if (r.status !== 'rejected') return [];
		const req = requests[i];
		const label = req ? `${req.boardName} ${req.steamId}=${req.score}` : `request[${i}]`;
		return [{ label, reason: r.reason }];
	});

	const successCount = requests.length - failures.length;
	console.log(`OK: ${successCount} / ${requests.length}`);
	if (failures.length > 0) {
		console.error(`Failures (${failures.length}):`);
		failures.forEach(f => console.error(`  ${f.label}: ${f.reason}`));
		process.exit(1);
	}
}

main().catch(err => {
	console.error(err);
	process.exit(1);
});
