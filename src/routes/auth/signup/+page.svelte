<script lang="ts">
	import InputField from '$components/InputField.svelte';

	// check if two passwords are the same
	function checkPassword() {
		const password = document.getElementById('password');
		const passwordConfirm = document.getElementById('password-confirm');
		if (password.value !== passwordConfirm.value) {
			alert('Passwords do not match');
			return false;
		}
		return true;
	}
</script>

<div class="flex min-h-full items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
	<div class="w-full max-w-sm space-y-10">
		<div>
			<img class="mx-auto h-10 w-auto" src="https://darmau.co/logo.svg" alt="Your Company" />
			<h2 class="mt-10 text-center text-2xl font-bold leading-9 tracking-tight text-gray-900">
				Create admin account
			</h2>
		</div>
		<form class="space-y-6" method="POST" action="?/signup">
			<InputField
				status="normal"
				type="email"
				id="email"
				name="email"
				placeholder="Email address"
				autocomplete="email"
				label="邮箱"
				required
			/>
			<InputField
				status="normal"
				type="text"
				id="name"
				name="name"
				helpText="将作为对外显示的用户名"
				autocomplete="username"
				label="用户名"
				required
			/>
			<InputField
				status="normal"
				type="password"
				id="password"
				name="password"
				helpText="密码需要包含大小写字母和数字，最少8位"
				autocomplete="new-password"
				error="密码长度不足8位"
				label="密码"
				required
			/>

			<div class="mt-6">
				<button
					type="submit"
					class="flex w-full justify-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold leading-6 text-white hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
					>Create Account
				</button>
			</div>
		</form>

		<p class="text-center text-sm leading-6 text-gray-500">
			Already have an account?
			<a href="/auth/login" class="font-semibold text-indigo-600 hover:text-indigo-500">Login</a>
		</p>
	</div>
</div>
