<script lang="ts">
	import InputField from '$components/InputField.svelte';
	import { locale, locales, t } from '$lib/functions/i18n';
</script>

<div class="flex min-h-full items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
	<div class="w-full max-w-sm space-y-10">
		<div>
			<img class="mx-auto h-10 w-auto" src="https://darmau.co/logo.svg" alt="Your Company" />
			<h2 class="mt-10 text-center text-2xl font-bold leading-9 tracking-tight text-gray-900">
				Sign in to your account
			</h2>
		</div>
		<select
			bind:value={$locale}
			class="rounded-md w-full bg-white border p-2 text-sm text-gray-900 shadow-sm hover:bg-gray-50"
		>
			{#each locales as language}
				<option value={language.lang}>{language.locale}</option>
			{/each}
		</select>
		<form class="space-y-6" method="POST">
			<InputField
				status="normal"
				type="email"
				id="email-address"
				name="email"
				placeholder="Email address"
				autocomplete="email"
				label={$t('email')}
				required
			/>
			<InputField
				status="normal"
				type="password"
				id="password"
				name="password"
				autocomplete="current-password"
				label={$t('password')}
				required
			/>

			<div class="flex items-center justify-between">
				<div class="text-sm leading-6">
					<a href="/static" class="font-semibold text-indigo-600 hover:text-indigo-500"
						>Forgot password?</a
					>
				</div>
			</div>

			<div>
				<button
					type="submit"
					class="flex w-full justify-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold leading-6 text-white hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
					>Sign in</button
				>
			</div>
		</form>

		<p class="text-center text-sm leading-6 text-gray-500">
			Not a member?
			<a href="/auth/signup" class="font-semibold text-indigo-600 hover:text-indigo-500">Sign up</a>
		</p>
	</div>
</div>
