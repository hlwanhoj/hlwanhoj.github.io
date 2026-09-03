<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		type = 'button',
		class: className = '',
		onclick,
		children
	}: {
		type?: 'button' | 'submit' | 'reset';
		class?: string;
		onclick?: (event: MouseEvent) => void;
		children?: Snippet;
	} = $props();
</script>

<button
	type={type}
	class={`cursor-pointer border-2 border-zinc-500 bg-transparent px-4.5 py-3 text-sm text-zinc-500 hover:border-zinc-100 hover:text-zinc-100 ${className}`.trim()}
	onclick={onclick}
>
	{#if children}
		{@render children()}
	{/if}
</button>
