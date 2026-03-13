import createNextIntlPlugin from 'next-intl/plugin';
 
const nextConfig = {};
 
const withNextIntl = createNextIntlPlugin('./i18n/request.ts');
export default withNextIntl(nextConfig);