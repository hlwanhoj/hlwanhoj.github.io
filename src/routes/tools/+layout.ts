import type { LayoutLoad } from '../$types';

export const load: LayoutLoad = ({ url }) => {
	return {
		navItems: [
			{ label: 'Images to PDF', href: '/tools/image-to-pdf', active: url.pathname === '/tools/image-to-pdf' }
		]
	};
};
