import type { LayoutLoad } from '../$types';

export const load: LayoutLoad = ({ url }) => {
	return {
		navItems: [
			{ label: '圖片轉 PDF', href: '/tools/image-to-pdf', active: url.pathname === '/tools/image-to-pdf' },
			{ label: 'Dummy', href: '/tools/dummy', active: url.pathname === '/tools/dummy' }
		]
	};
};
