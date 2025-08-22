import * as React from 'react';
import Head from 'next/head';
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import { MeetingProvider } from '../context/MeetingContext';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#1976d2' },
    secondary: { main: '#388e3c' },
  },
});

export default function App({ Component, pageProps }) {
  return (
    <MeetingProvider>
      <ThemeProvider theme={theme}>
        <Head>
          <title>Meeting Management App</title>
          <meta name="viewport" content="initial-scale=1, width=device-width" />
        </Head>
        <CssBaseline />
        <Component {...pageProps} />
      </ThemeProvider>
    </MeetingProvider>
  );
}
