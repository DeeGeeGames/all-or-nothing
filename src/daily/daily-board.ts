import { type Card } from '@/types';
import { generateCanonicalDeck } from '@/deck';
import { mulberry32, dateToSeed, seededShuffle } from './seeded-rng';

// Generate the daily board for a given date
export
function generateDailyBoard(date: Date): Card[] {
	const seed = dateToSeed(date);
	const rng = mulberry32(seed);
	const deck = generateCanonicalDeck();
	const shuffled = seededShuffle(deck, rng);
	const first12 = shuffled.slice(0, 12);

	return first12.map((cardJson, index) => ({
		...(JSON.parse(cardJson) as Card),
		id: `daily-${index}`,
	}));
}
