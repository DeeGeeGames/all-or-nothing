import { createContext, useContext, useState, useEffect, useMemo, type ReactNode } from 'react';
import type { PlatformService } from './types';
import { createNoopPlatformService } from './noop-platform-service';
import { resolveDistribution, type Distribution } from './distribution';

interface PlatformContextValue {
	readonly service: PlatformService;
	readonly isAvailable: boolean;
	readonly isReady: boolean;
	readonly distribution: Distribution | null;
}

const defaultService = createNoopPlatformService();

const PlatformContext = createContext<PlatformContextValue>({
	service: defaultService,
	isAvailable: false,
	isReady: false,
	distribution: null,
});

interface Props {
	readonly service: PlatformService;
	readonly children: ReactNode;
}

export function PlatformProvider({ service, children }: Props) {
	const [isAvailable, setIsAvailable] = useState(false);
	const [isReady, setIsReady] = useState(false);
	const [distribution, setDistribution] = useState<Distribution | null>(window.electronAPI ? null : 'web');

	useEffect(function () {
		const controller = new AbortController();
		resolveDistribution(window.electronAPI).then(function (resolved) {
			if (controller.signal.aborted) return;
			setDistribution(resolved);
		});
		return function () { controller.abort(); };
	}, []);

	useEffect(() => {
		service.init()
			.then(async (available) => {
				setIsAvailable(available);
				if (available) {
					const cloudData = await service.cloudLoad();
					if (cloudData) {
						const { importGameState } = await import('@/core');
						await importGameState(cloudData);
					}
				}
			})
			.catch(() => setIsAvailable(false))
			.finally(() => setIsReady(true));
	}, [service]);

	const value = useMemo(() => ({
		service,
		isAvailable,
		isReady,
		distribution,
	}), [service, isAvailable, isReady, distribution]);

	return (
		<PlatformContext value={value}>
			{children}
		</PlatformContext>
	);
}

export function usePlatform() {
	return useContext(PlatformContext);
}
