import './globals.css';

export const metadata = {
  title: 'Storecraft | Online stores for local businesses',
  description: 'Discover local storefronts or bring your own business online with Storecraft.',
};

export default function RootLayout({ children }) {
  return <html lang="en"><body>{children}</body></html>;
}
