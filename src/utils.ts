import { useEffect, useLayoutEffect, useRef } from 'react'
import { Enum } from './types';

export
function moveAndOverwriteItem<T>(arr: T[], fromIndex: number, toIndex: number): T[] {
	if (fromIndex < 0 || fromIndex >= arr.length || toIndex < 0 || toIndex >= arr.length) {
		console.warn("Indices are out of bounds. Returning original array.");
		return [...arr]; // Return a copy of the original array
	}

	const newArr = [...arr];

	const [item] = newArr.splice(fromIndex, 1) as [T];

	newArr[toIndex] = item;

	return newArr;
}

export
function getRandom(min: number, max: number) {
	min = Math.ceil(min);
	max = Math.floor(max);
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

export
function randomizeArray<T>(array: T[]): T[] {
	const newArray = array.slice();

	// Fisher-Yates Shuffle
	for (let i = newArray.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		const itemI = newArray[i];
		const itemJ = newArray[j];

		if (itemI === undefined || itemJ === undefined) {
			throw new Error(`Array index out of bounds: ${i}, ${j}`);
		}

		newArray[i] = itemJ;
		newArray[j] = itemI;
	}

	return newArray;
}

export function useTimeout(callback: () => void, delay: number | null): void {
	const savedCallback = useRef(callback);

	// Remember the latest callback if it changes.
	useLayoutEffect(() => {
		savedCallback.current = callback
	}, [callback]);

	// Set up the timeout.
	useEffect(() => {
		// Don't schedule if no delay is specified.
		// Note: 0 is a valid value for delay.
		if (!delay && delay !== 0) {
			return;
		}

		const id = setTimeout(() => {
			savedCallback.current();
		}, delay);

		return () => clearTimeout(id);
	}, [delay])
}

export
function randomChoice<T>(...items: T[]): T {
	if (items.length === 0) {
		throw new Error("At least one argument is required");
	}

	const randomIndex = Math.floor(Math.random() * items.length);

	return items[randomIndex] as T;
}

export
async function resetGame() {
	const { resetGameCore } = await import('@/core');
	await resetGameCore();
}

export
function pick<T extends Record<any, any>, K extends keyof T>(object: T, ...ks: K[]): Pick<T, K> {
	return Object.assign(
		{},
		...ks
			.map(key => {
				if (object && Object.prototype.hasOwnProperty.call(object, key)) {
					return { [key]: object[key] };
				}

				return null;
			})
			.filter(val => !!val)
	);
}

export
function isIn<T extends string, S extends object>(
	value: T,
	subset: S,
): value is T & Enum<S> {
	return Object
		.values(subset)
		.includes(value);
}

export
function formatDuration(seconds: number): string {
	const minutes = Math.floor(seconds / 60);
	const remainingSeconds = Math.floor(seconds % 60);
	return `${minutes}:${String(remainingSeconds).padStart(2, '0')}`;
}
