import { describe, expect, test } from 'bun:test';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const persistenceApi = /\b(resetGameCore|exportGameState|importGameState|getDb|shuffleDeck|discardCards|recordGameCompletion|submitRunScore|awardMatchScore|updateTime|performTimerTick|SavedGameKey)\b/;

function filesUnder(dir: string): string[] {
	return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
		const path = join(dir, entry.name);
		if (entry.isDirectory()) {
			return filesUnder(path);
		}
		return [path];
	});
}

describe('multiplayer persistence boundary', () => {
	test('multiplayer modules do not call single-player persistence APIs', () => {
		const here = dirname(fileURLToPath(import.meta.url));
		const roots = [
			here,
			join(here, '../components/screens/multiplayer-game-screen'),
		];
		const sourceFiles = roots
			.flatMap(filesUnder)
			.filter(path => path.endsWith('.ts') || path.endsWith('.tsx'))
			.filter(path => !path.endsWith('.test.ts'));

		expect(sourceFiles.length).toBeGreaterThan(0);

		const violations = sourceFiles.filter(path => persistenceApi.test(readFileSync(path, 'utf8')));
		expect(violations).toEqual([]);
	});
});
