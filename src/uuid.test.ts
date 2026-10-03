import { describe, expect, test } from 'bun:test';
import { createUuid } from './uuid';

describe('createUuid', () => {
	test('creates distinct UUIDs with the version 4 and RFC variant bits', () => {
		const ids = Array.from({ length: 1000 }, createUuid);
		expect(new Set(ids).size).toBe(ids.length);
		ids.forEach(function(id) {
			expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
		});
	});
});
