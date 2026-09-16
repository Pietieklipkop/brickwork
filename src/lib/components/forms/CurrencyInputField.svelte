<script lang="ts">
	import { formatZAR, parseDecimalStringToCents } from '$lib/domain/currency';

	interface Props {
		valueCents: number;
		label?: string;
		id?: string;
		name?: string;
		disabled?: boolean;
		hasError?: boolean;
		errorMessage?: string;
		helperText?: string;
		required?: boolean;
		onchange?: (newCents: number) => void;
	}

	let {
		valueCents = $bindable(0),
		label = 'Total Amount (ZAR)',
		id = 'currency-input',
		name = 'amount',
		disabled = false,
		hasError = false,
		errorMessage = '',
		helperText = '',
		required = false,
		onchange
	}: Props = $props();

	// Local display string
	let rawInput = $state(valueCents > 0 ? (valueCents / 100).toFixed(2) : '');

	// Keep input synced if valueCents changes externally
	$effect(() => {
		const expectedStr = valueCents > 0 ? (valueCents / 100).toFixed(2) : '';
		const currentParsed = parseDecimalStringToCents(rawInput);
		if (currentParsed !== valueCents) {
			rawInput = expectedStr;
		}
	});

	let accessibleLabel = $derived(`Amount in South African Rand: ${formatZAR(valueCents)}`);

	function handleInput(e: Event) {
		const target = e.target as HTMLInputElement;
		rawInput = target.value;
		const cents = parseDecimalStringToCents(target.value);
		valueCents = cents;
		onchange?.(cents);
	}

	function handleBlur() {
		// Format to clean 2-decimal representation on blur if non-zero
		if (valueCents > 0) {
			rawInput = (valueCents / 100).toFixed(2);
		} else {
			rawInput = '';
		}
	}

	function handleClear() {
		valueCents = 0;
		rawInput = '';
		onchange?.(0);
	}
</script>

<div class="w-full">
	{#if label}
		<label for={id} class="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
			{label}
			{#if required}<span class="text-rose-500">*</span>{/if}
		</label>
	{/if}

	<div class="relative flex items-center">
		<!-- Currency Affix Prefix: R (Left 14px) -->
		<span
			class="pointer-events-none absolute left-3.5 flex items-center text-lg font-bold text-slate-400 dark:text-slate-500 select-none"
			aria-hidden="true"
		>
			R
		</span>

		<!-- Numeric / Decimal Input (52px height, 20px font, tabular numerals) -->
		<input
			{id}
			{name}
			type="text"
			inputmode="decimal"
			pattern="[0-9]*[.,]?[0-9]*"
			autocomplete="off"
			{disabled}
			{required}
			aria-label={accessibleLabel}
			aria-invalid={hasError}
			aria-describedby={hasError ? `${id}-error` : helperText ? `${id}-helper` : undefined}
			value={rawInput}
			oninput={handleInput}
			onblur={handleBlur}
			placeholder="0.00"
			class="w-full h-[52px] pl-11 pr-10 rounded-lg font-mono text-xl font-bold tabular-nums tracking-tight bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-[1.5px] border-slate-300 dark:border-slate-700 shadow-sm transition-all focus:border-[#0B2240] dark:focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-[#0B2240]/20 dark:focus:ring-emerald-500/20 disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:text-slate-400 disabled:cursor-not-allowed {hasError
				? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/20'
				: ''}"
		/>

		<!-- Hidden form input with integer cents for standard form submissions -->
		<input type="hidden" name="{name}_cents" value={valueCents} />

		<!-- Quick Clear Button (×) -->
		{#if valueCents > 0 && !disabled}
			<button
				type="button"
				onclick={handleClear}
				aria-label="Clear amount"
				class="absolute right-3 w-6 h-6 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
			>
				<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
					<line x1="18" y1="6" x2="6" y2="18"></line>
					<line x1="6" y1="6" x2="18" y2="18"></line>
				</svg>
			</button>
		{/if}
	</div>

	{#if hasError && errorMessage}
		<p id="{id}-error" class="mt-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400" role="alert">
			{errorMessage}
		</p>
	{:else}
		<p id="{id}-helper" class="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
			{helperText || `Current value: ${formatZAR(valueCents)}`}
		</p>
	{/if}
</div>
