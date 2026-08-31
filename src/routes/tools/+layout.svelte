<script lang="ts">
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();
	const title = '小工具';
	const tools = [
		{
			name: 'Image Optimizer',
			category: 'Media',
			description: 'Compress and size down image assets without losing visual quality.',
			href: '/tools/image-to-pdf'
		},
		{
			name: 'Color Palette',
			category: 'Design',
			description: 'Generate complementary color combinations for UI experiments and mockups.',
			href: '#'
		},
		{
			name: 'Markdown Helper',
			category: 'Writing',
			description: 'Draft clean notes, docs, and lightweight formatting snippets in seconds.',
			href: '#'
		},
		{
			name: 'URL Shortener',
			category: 'Links',
			description: 'Turn long links into tidy references with a cleaner sharing experience.',
			href: '#'
		},
		{
			name: 'Code Formatter',
			category: 'Development',
			description: 'Normalize formatting for snippets and quick front-end prototypes.',
			href: '#'
		},
		{
			name: 'Task Planner',
			category: 'Planning',
			description: 'Break down priorities into small pieces and keep momentum focused.',
			href: '#'
		}
	];
</script>

<svelte:head>
	<title>{title}</title>
</svelte:head>

<div class="min-h-screen bg-teal-400 text-white">
	<div class="mx-auto p-4 sm:p-6">
		<div class="flex flex-col bg-white/20 lg:flex-row">
			<aside class="w-full bg-white/10 p-5 lg:max-w-xs">
				<div class="mb-6">
					<h1 class="mt-2 text-2xl font-bold tracking-tight">
						<a href="/tools" class="hover:text-white/75">{title}</a>
					</h1>
				</div>

				<nav class="space-y-2">
					{#each data.navItems as item}
						<a
							href={item.href}
							aria-current={item.active ? 'page' : undefined}
							class={item.active
								? 'flex items-center justify-between bg-teal-500 px-3 py-2.5 text-sm font-medium'
								: 'flex items-center justify-between px-3 py-2.5 text-sm font-medium transition hover:bg-teal-200'}
						>
							<span>{item.label}</span>
						</a>
					{/each}
				</nav>
			</aside>

			<main class="flex-1 p-5 sm:p-6">
				{@render children()}
			</main>
		</div>
	</div>
</div>
