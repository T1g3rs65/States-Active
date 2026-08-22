import { ScrollViewStyleReset } from 'expo-router/html';
import { ASME_CSS } from '../utils/asmeStyle';

export default function Root({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: ASME_CSS }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
