<script lang="ts">
	let { title, children } = $props();
</script>

<div class="bg-white/20 p-6 mb-6">
    <h2 class="text-xl font-bold mb-4">{title}</h2>
    {@render children()}
</div>