<script>
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

<header
    class="flex flex-col gap-3 border-b border-slate-200 pb-5 sm:flex-row sm:items-center sm:justify-between"
>
    <div>
        <p class="text-sm font-medium text-indigo-600">Quick access</p>
        <h2 class="mt-1 text-3xl font-bold tracking-tight text-slate-900">Useful tools</h2>
    </div>
    <a
        href="/"
        class="inline-flex items-center justify-center rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
    >
        Home
    </a>
</header>

<section class="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
    {#each tools as tool}
        <article
            class="rounded-xl border border-slate-200 bg-slate-50 p-4 transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-sm"
        >
            <div class="mb-4 flex items-center justify-between">
                <span
                    class="inline-flex rounded-full bg-indigo-100 px-2.5 py-1 text-xs font-semibold text-indigo-700"
                >
                    {tool.category}
                </span>
                <span class="text-xs text-slate-500">Tool</span>
            </div>

            <h3 class="text-lg font-semibold text-slate-900">{tool.name}</h3>
            <p class="mt-2 text-sm leading-6 text-slate-600">{tool.description}</p>

            <a
                href={tool.href}
                class="mt-4 inline-flex items-center text-sm font-semibold text-indigo-600 hover:text-indigo-500"
            >
                Open tool
            </a>
        </article>
    {/each}
</section>