import type { PageServerLoad } from './$types';
import { URL_PREFIX } from '$env/static/private';

export const load: PageServerLoad = async () => {
	return {
		prefix: URL_PREFIX
	};
};
