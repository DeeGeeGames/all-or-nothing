import { describe, expect, mock, test } from 'bun:test';
import { createScoreSubmissionCoordinator } from './score-submission';

function createDeferred<T>() {
	return Promise.withResolvers<T>();
}

function createStorage() {
	const submittedRunIds = new Set<string>();

	return {
		submittedRunIds,
		storage: {
			isSubmitted: async (runId: string) => submittedRunIds.has(runId),
			markSubmitted: async (runId: string) => {
				submittedRunIds.add(runId);
			},
		},
	};
}

describe('score submission coordinator', () => {
	test('submits an immutable completed result and marks that run after a delayed response', async () => {
		const submitRunScore = createScoreSubmissionCoordinator();
		const response = createDeferred<boolean>();
		const { storage, submittedRunIds } = createStorage();
		const submitA = mock(async (_score: { readonly score: number }) => response.promise);
		const submitB = mock(async (_score: { readonly score: number }) => true);
		const completedA = {
			runId: 'run-a',
			score: { score: 100 },
		} as const;

		const submissionA = submitRunScore(completedA, submitA, storage);
		const completedB = {
			runId: 'run-b',
			score: { score: 200 },
		} as const;

		response.resolve(true);
		await submissionA;

		expect(submitA).toHaveBeenCalledWith({ score: 100 });
		expect(submittedRunIds.has(completedA.runId)).toBe(true);
		expect(submittedRunIds.has(completedB.runId)).toBe(false);

		expect(await submitRunScore(completedB, submitB, storage)).toBe(true);
		expect(submitB).toHaveBeenCalledWith({ score: 200 });
		expect(submittedRunIds.has(completedB.runId)).toBe(true);
	});

	test('coalesces concurrent submissions for one run and permits a failed retry', async () => {
		const submitRunScore = createScoreSubmissionCoordinator();
		const firstResponse = createDeferred<boolean>();
		const { storage, submittedRunIds } = createStorage();
		const result = {
			runId: 'run-a',
			score: { score: 100 },
		} as const;
		const submit = mock(async () => firstResponse.promise);

		const first = submitRunScore(result, submit, storage);
		const overlapping = submitRunScore(result, submit, storage);
		firstResponse.resolve(false);

		expect(await first).toBe(false);
		expect(await overlapping).toBe(false);
		expect(submit).toHaveBeenCalledTimes(1);
		expect(submittedRunIds.has(result.runId)).toBe(false);

		const retry = mock(async () => true);
		expect(await submitRunScore(result, retry, storage)).toBe(true);
		expect(retry).toHaveBeenCalledTimes(1);
		expect(submittedRunIds.has(result.runId)).toBe(true);
	});

	test('does not resubmit a run already marked successful', async () => {
		const submitRunScore = createScoreSubmissionCoordinator();
		const { storage, submittedRunIds } = createStorage();
		submittedRunIds.add('run-a');
		const submit = mock(async () => true);

		const success = await submitRunScore({
			runId: 'run-a',
			score: { score: 100 },
		}, submit, storage);

		expect(success).toBe(true);
		expect(submit).not.toHaveBeenCalled();
	});
});
