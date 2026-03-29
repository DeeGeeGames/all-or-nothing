const StorageVersion = 'v0.3';
export const DbName = `all-or-nothing-${StorageVersion}`;
export const SavedGameKey = `saved-game-time-${StorageVersion}`;
export const DbCollectionItemNameSetOrdersDeck = 'deck';
export const DbCollectionItemNameSetOrdersDiscard = 'discard';
export const DbCollectionItemNameGameDataMisses = 'misses';
export const DbCollectionItemNameGameDataFastestScore = 'fastest-score';
export const DbCollectionItemNameGameDataTime = 'time';
export const DbCollectionItemNameGameDataSoundEnabled = 'sound-enabled';
export const DbCollectionItemNameGameDataMusicEnabled = 'music-enabled';
export const DbCollectionItemNameGameDataScore = 'score';
export const DbCollectionItemNameGameDataScoreValue = 'score-value';
export const DbCollectionItemNameGameDataLastMatchTime = 'last-match-time';
export const DbCollectionItemNameGameDataComboCount = 'combo-count';
export const DbCollectionItemNameGameDataMaxCombo = 'max-combo';
export const TutorialCompletedKey = 'tutorialCompleted';
export const BoardCardCount = 12;

// SVG noise pattern for subtle texture overlay
export const noisePattern = `data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.05'/%3E%3C/svg%3E`;

export const FullscreenEnabledKey = 'fullscreen-enabled';
