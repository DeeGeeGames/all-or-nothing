import { describe, expect, test } from 'bun:test';
import { getDesktopDistribution, resolveDistribution, shouldShowSteamPromotion } from './distribution';

describe('promotion distribution identity', function () {
	test('web and standalone releases show the Steam promotion', function () {
		expect(shouldShowSteamPromotion('web')).toBe(true);
		expect(shouldShowSteamPromotion('standalone')).toBe(true);
	});

	test('Steam and unresolved identities never show the Steam promotion', function () {
		expect(shouldShowSteamPromotion('steam')).toBe(false);
		expect(shouldShowSteamPromotion(null)).toBe(false);
	});

	test('a Steam package marker identifies Steam without a running client', function () {
		expect(getDesktopDistribution(undefined, true, 4537590)).toBe('steam');
		expect(getDesktopDistribution('4537590', false, 4537590)).toBe('steam');
		expect(getDesktopDistribution(undefined, false, 4537590)).toBe('standalone');
	});

	test('another Steam app identity does not turn a standalone install into this Steam release', function () {
		expect(getDesktopDistribution('0', false, 4537590)).toBe('standalone');
		expect(getDesktopDistribution('12345', false, 4537590)).toBe('standalone');
	});

	test('web identity does not require an Electron bridge', async function () {
		expect(await resolveDistribution()).toBe('web');
	});

	test('desktop identity comes from the bridge independently of Steam initialization', async function () {
		expect(await resolveDistribution({ getDistribution: async function () { return 'steam'; } })).toBe('steam');
		expect(await resolveDistribution({ getDistribution: async function () { return 'standalone'; } })).toBe('standalone');
	});

	test('invalid or failing bridges stay unresolved rather than advertising Steam to Steam users', async function () {
		expect(await resolveDistribution({ getDistribution: async function () { return 'web'; } })).toBe(null);
		expect(await resolveDistribution({ getDistribution: async function () { throw new Error('IPC unavailable'); } })).toBe(null);
	});
});
