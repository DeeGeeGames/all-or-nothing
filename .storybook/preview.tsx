import type { Preview } from '@storybook/react-vite';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import { theme } from '../src/theme';
import { PlatformProvider, createNoopPlatformService } from '../src/platform';

import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';

const noopService = createNoopPlatformService();

const preview: Preview = {
	decorators: [
		(Story) => (
			<ThemeProvider theme={theme}>
				<CssBaseline />
				<PlatformProvider service={noopService}>
					<Story />
				</PlatformProvider>
			</ThemeProvider>
		),
	],
};

export default preview;
