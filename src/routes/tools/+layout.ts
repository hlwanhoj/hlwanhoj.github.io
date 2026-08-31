import type { LayoutLoad } from '../$types';

export const load: LayoutLoad = ({ url }) => {
	return {
		navItems: [
			{ label: '圖片合併 PDF 工具', href: '/tools/image-to-pdf', active: url.pathname === '/tools/image-to-pdf' },
			{ label: 'Dummy', href: '/tools/dummy', active: url.pathname === '/tools/dummy' }
		]
	};
};
