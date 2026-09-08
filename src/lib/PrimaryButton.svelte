<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		type = 'button',
		class: className = '',
		disabled = false,
		onclick,
		children
	}: {
		type?: 'button' | 'submit' | 'reset';
		class?: string;
		disabled?: boolean;
		onclick?: (event: MouseEvent) => void;
		children?: Snippet;
	} = $props();
</script>

<button
	type={type}
	class={`cursor-pointer border-none bg-primary-selected px-5.5 py-3 font-semibold hover:bg-primary-hover disabled:cursor-not-allowed disabled:bg-primary-disabled disabled:text-primary-disabled-text ${className}`.trim()}
	{disabled}
	onclick={onclick}
>
	{#if children}
		{@render children()}
	{/if}
</button>
