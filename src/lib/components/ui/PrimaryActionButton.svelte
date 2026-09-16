<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		type?: 'button' | 'submit' | 'reset';
		variant?: 'primary' | 'danger' | 'secondary' | 'emerald';
		disabled?: boolean;
		loading?: boolean;
		fullWidth?: boolean;
		class?: string;
		ariaLabel?: string;
		onclick?: (event: MouseEvent) => void;
		children?: Snippet;
		leadingIcon?: Snippet;
		trailingIcon?: Snippet;
	}

	let {
		type = 'button',
		variant = 'primary',
		disabled = false,
		loading = false,
		fullWidth = true,
		class: className = '',
		ariaLabel,
		onclick,
		children,
		leadingIcon,
		trailingIcon
	}: Props = $props();

	let variantClasses = $derived(() => {
		switch (variant) {
			case 'emerald':
				return 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white focus-visible:outline-emerald-600';
			case 'danger':
				return 'bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white focus-visible:outline-rose-600';
			case 'secondary':
				return 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 border border-slate-300 dark:border-slate-700 focus-visible:outline-slate-500';
			case 'primary':
			default:
				return 'bg-[#0B2240] hover:bg-[#132f54] active:bg-[#07172d] text-white focus-visible:outline-[#0B2240]';
		}
	});
</script>

<button
	{type}
	disabled={disabled || loading}
	aria-label={ariaLabel}
	aria-busy={loading}
	{onclick}
	class="inline-flex items-center justify-center h-12 px-6 rounded-lg font-semibold text-[15px] tracking-wide shadow-sm border border-transparent transition-all duration-150 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 disabled:shadow-none {fullWidth
		? 'w-full sm:w-auto sm:min-w-[140px]'
		: ''} {variantClasses()} {className}"
>
	{#if loading}
		<svg
			class="animate-spin -ml-1 mr-2 h-5 w-5 text-current"
			xmlns="http://www.w3.org/2000/svg"
			fill="none"
			viewBox="0 0 24 24"
			aria-hidden="true"
		>
			<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
			<path
				class="opacity-75"
				fill="currentColor"
				d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
			></path>
		</svg>
		<span>Processing...</span>
	{:else}
		{#if leadingIcon}
			<span class="mr-2 inline-flex items-center shrink-0">
				{@render leadingIcon()}
			</span>
		{/if}

		{#if children}
			{@render children()}
		{/if}

		{#if trailingIcon}
			<span class="ml-2 inline-flex items-center shrink-0">
				{@render trailingIcon()}
			</span>
		{/if}
	{/if}
</button>
