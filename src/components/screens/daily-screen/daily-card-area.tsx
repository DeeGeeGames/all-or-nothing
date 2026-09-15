import PlayingCard from '@/components/playing-card';
import { Card } from '@/types';
import { Grid, Box, useTheme, useMediaQuery } from '@mui/material';
import { useCallback } from 'react';
import { useFocusable } from '@/focus/useFocusable';
import { useActivationGuard } from '@/hooks';
import { useUsingNavigationalInput } from '@/atoms';

interface Props {
	cards: Card[];
	flippedCardIds: ReadonlySet<string>;
	selectedCardIds: ReadonlySet<string>;
	onSelected(card: Card): void;
}

export default
function DailyCardArea(props: Props) {
	const { cards, flippedCardIds, selectedCardIds, onSelected } = props;
	const theme = useTheme();
	const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
	const usingNavigationalInput = useUsingNavigationalInput();
	const columns = isMobile ? 3 : 6;

	return (
		<Grid
			container
			rowSpacing={1}
			paddingBottom={1}
			columns={{
				xs: 3,
				sm: 6,
			}}
			sx={{
				height: {
					xs: '100%',
					sm: 'auto',
				},
				maxHeight: {
					xs: '100%',
					sm: 'none',
				},
				minHeight: {
					sm: 'calc(min(100vw, 1536px) * 0.41 + 16px)',
				},
				'& > *': {
					height: {
						xs: 'calc(25% - 4px)',
						sm: 'auto',
					},
				},
			}}
		>
			{cards.map((card, index) => {
				const cardId = card.id ?? '';
				const isFlipped = flippedCardIds.has(cardId);
				const isSelected = selectedCardIds.has(cardId);

				return (
					<Grid
						key={cardId}
						display="flex"
						justifyContent="center"
						size={1}
					>
						<Box
							data-card-id={cardId}
							sx={{
								maxWidth: '80%',
								width: '100%',
								height: {
									xs: '100%',
									sm: 'auto',
								},
								'& > div': {
									height: {
										xs: '100%',
										sm: 'auto',
									},
									width: {
										xs: 'auto',
										sm: 350,
									},
								},
							}}
						>
							<FocusableDailyCard
								card={card}
								flipped={isFlipped}
								selected={isSelected}
								showFocus={usingNavigationalInput}
								onSelected={onSelected}
								gridPosition={{
									row: Math.floor(index / columns),
									col: index % columns,
								}}
							/>
						</Box>
					</Grid>
				);
			})}
		</Grid>
	);
}

function FocusableDailyCard({
	card,
	flipped,
	selected,
	showFocus,
	onSelected,
	gridPosition,
}: {
	card: Card;
	flipped: boolean;
	selected: boolean;
	showFocus: boolean;
	onSelected: (card: Card) => void;
	gridPosition: { row: number; col: number };
}) {
	const handleSelect = useCallback(() => {
		if (flipped) return;
		onSelected(card);
	}, [card, flipped, onSelected]);

	const handleCardSelection = useActivationGuard(handleSelect);

	const { ref, isFocused } = useFocusable({
		id: `daily-card-${card.id}`,
		group: 'daily-cards',
		gridPosition,
		onSelect: handleCardSelection,
	});

	return (
		<PlayingCard
			card={card}
			dealt
			flipped={flipped}
			selected={selected}
			raised={selected}
			focused={isFocused && showFocus}
			onClick={handleCardSelection}
			elementRef={ref}
		/>
	);
}
