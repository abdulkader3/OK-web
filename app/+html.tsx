import { ScrollViewStyleReset } from 'expo-router/html';
import { type PropsWithChildren } from 'react';

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <meta name="theme-color" content="#E6F4FE" />
        <meta name="description" content="BossBook - Ledger, Sales & Payments Management" />

        {/* Apple PWA Meta Tags */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="BossBook" />

        {/* Apple Touch Icons */}
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />

        {/* PWA Manifest Icons */}
        <link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/icon-512.png" />

        {/* Microsoft Tiles */}
        <meta name="msapplication-TileImage" content="/icon-192.png" />
        <meta name="msapplication-TileColor" content="#E6F4FE" />

        <ScrollViewStyleReset />
        {/* @t-expo-stack/blur */}
      </head>
      <body>{children}</body>
    </html>
  );
}
