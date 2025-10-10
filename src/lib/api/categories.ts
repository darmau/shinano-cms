import { error } from '@sveltejs/kit';

const basePath = '/api/category';

export const deleteCategory = async (id: number) => {
	const response = await fetch(`${basePath}/${id}`, {
		method: 'DELETE',
		headers: {
			'Content-Type': 'application/json'
		}
	});

	if (!response.ok) {
		return { error: await response.json() };
	}

	return { deleted: await response.json() };
};

export const deleteCategories = async (ids: number[]) => {
	const response = await fetch(basePath, {
		method: 'DELETE',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({ ids })
	});

	if (!response.ok) {
		return { error: await response.json() };
	}

	return { success: true };
};

