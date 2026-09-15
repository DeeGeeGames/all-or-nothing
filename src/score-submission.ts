export
interface CompletedRunScore<TScore> {
	readonly runId: string;
	readonly score: TScore;
}

export
interface RunScoreSubmissionStorage {
	isSubmitted(runId: string): Promise<boolean>;
	markSubmitted(runId: string): Promise<void>;
}

export
function createScoreSubmissionCoordinator() {
	const pendingSubmissions = new Map<string, Promise<boolean>>();

	return function submitRunScore<TScore>(
		result: CompletedRunScore<TScore>,
		submit: (score: TScore) => Promise<boolean>,
		storage: RunScoreSubmissionStorage,
	): Promise<boolean> {
		const pending = pendingSubmissions.get(result.runId);
		if (pending) {
			return pending;
		}

		const submission = performScoreSubmission(result, submit, storage);
		const trackedSubmission = submission.finally(() => {
			if (pendingSubmissions.get(result.runId) === trackedSubmission) {
				pendingSubmissions.delete(result.runId);
			}
		});
		pendingSubmissions.set(result.runId, trackedSubmission);
		return trackedSubmission;
	};
}

async function performScoreSubmission<TScore>(
	result: CompletedRunScore<TScore>,
	submit: (score: TScore) => Promise<boolean>,
	storage: RunScoreSubmissionStorage,
): Promise<boolean> {
	if (await storage.isSubmitted(result.runId)) {
		return true;
	}

	try {
		const success = await submit(result.score);
		if (!success) {
			return false;
		}

		await storage.markSubmitted(result.runId);
		return true;
	} catch {
		return false;
	}
}
