<script lang="ts">
	import { type Snippet } from 'svelte';

	let {
		label,
		for: htmlFor,
		children
	}: {
		label: string;
		for: string;
		children: Snippet;
	} = $props();
</script>

<div class="flex-1 min-w-3xs">
	<label class="block text-sm mb-2" for={htmlFor}>{label}</label>
	{@render children()}
</div>

<style>
    @reference 'tailwindcss';

	:global(input),
	:global(select) {
		width: 100%;
		@apply px-3 text-sm text-neutral-700 placeholder:text-neutral-700/30 bg-white/30 border-none;
	}
</style>