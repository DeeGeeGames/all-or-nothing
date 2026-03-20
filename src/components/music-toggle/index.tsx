import { useIsMusicEnabled } from "@/atoms";
import useSound from "use-sound";
import { useEffect, useMemo, useState } from "react";
import { randomChoice } from "@/utils";
import { useGameTheme } from "@/themes";
import type { MusicTrack } from "@/themes/types";

function useManagedSound(track: MusicTrack, active: boolean) {
	const isEnabled = useIsMusicEnabled();
	const [isLoaded, setIsLoaded] = useState(false);
	const [play, { stop }] = useSound(track.src, {
		volume: track.volume,
		loop: true,
		onload: () => setIsLoaded(true),
	});

	useEffect(() => {
		setIsLoaded(false);
	}, [track.src]);

	useEffect(() => {
		return stop;
	}, [stop]);

	useEffect(() => {
		if (!isLoaded) return;

		(isEnabled && active) ?
			play() :
			stop();
	}, [isEnabled, isLoaded, active]);
}

export function useMusic() {
	const { music } = useGameTheme();
	const activeSong = useMemo(() => randomChoice(...music), [music]);
	useManagedSound(activeSong, true);
}

export function useTitleMusic(active: boolean) {
	const { titleMusic } = useGameTheme();
	useManagedSound(titleMusic, active);
}
