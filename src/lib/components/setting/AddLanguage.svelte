<!--本组件是一个toast，用于添加语言-->
<script lang="ts">
	import InputField from '$components/InputField.svelte';

	export let closeAddLanguage: () => void;
	export let addLanguage: (lang: string, locale: string) => void;

	function submitForm(event: Event) {
		event.preventDefault();
		const formData = new FormData(event.target as HTMLFormElement);
		const languageData = Object.fromEntries(formData.entries());
		addLanguage(languageData.lang, languageData.locale);
		closeAddLanguage();
	}
</script>

<div class="relative z-50">
	<div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity">
		<div class="fixed inset-0 z-10 w-screen overflow-y-auto">
			<div class="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
				<form
					method="POST"
					on:submit={submitForm}
					class="relative transform space-y-4 overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-sm sm:p-6"
				>
					<InputField
						label="Language Code"
						id="lang"
						name="lang"
						type="text"
						placeholder="en, zh, es"
						helpText="This is the language code that will be used for api."
					/>
					<InputField
						label="Language"
						id="locale"
						name="locale"
						type="text"
						placeholder="English/中文/Español"
						helpText="This is the language name that will be displayed on the front-end."
					/>
					<div class="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
						<button
							type="submit"
							class="inline-flex w-full justify-center rounded-md bg-cyan-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-cyan-500 sm:ml-3 sm:w-auto"
							>提交
						</button>
						<button
							type="button"
							on:click={closeAddLanguage}
							class="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
							>取消
						</button>
					</div>
				</form>
			</div>
		</div>
	</div>
</div>
