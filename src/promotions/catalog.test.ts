import { describe, expect, test } from 'bun:test';
import { findGame, getGameDestination, steamEdition } from './catalog';

describe('DeeGee Games destinations', function () {
	test('Steam players are directed to the free web release', function () {
		expect(getGameDestination(steamEdition, 'steam')).toMatchObject({ kind: 'web', url: 'https://allornothing.app/', label: 'Play free on web' });
	});

	test('other distributions are directed to the Steam release', function () {
		(['web', 'standalone'] as const).forEach(function (distribution) {
			expect(getGameDestination(steamEdition, distribution)).toMatchObject({ kind: 'steam', url: 'https://store.steampowered.com/app/4537590/' });
		});
	});

	test('future games keep their Steam destination on Steam', function () {
		const futureGame = { ...steamEdition, id: 'math-marsh', title: 'Math Marsh', steamAppId: 123 } as const;
		expect(getGameDestination(futureGame, 'steam')).toMatchObject({ kind: 'steam', url: 'https://store.steampowered.com/app/123/' });
	});

	test('only known catalog identifiers can open a destination', function () {
		expect(findGame(steamEdition.id)).toBe(steamEdition);
		expect(findGame('https://example.com')).toBeUndefined();
		expect(findGame({ id: steamEdition.id })).toBeUndefined();
		expect(findGame(null)).toBeUndefined();
	});
});
