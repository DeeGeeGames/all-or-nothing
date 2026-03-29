import { Typography, TypographyProps } from '@mui/material';
import { formatDuration } from '@/utils';

interface Props {
	label: string;
	value: number;
	variant?: TypographyProps['variant'];
}

export default
function FormattedTime(props: Props) {
	const {
		label,
		value,
		variant = 'subtitle1',
	} = props;

	return (
		<Typography variant={variant}>
			{label} <strong>{formatDuration(value)}</strong>
		</Typography>
	);
}
