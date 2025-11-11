import type { PageServerLoad } from './$types';
import { URL_PREFIX } from '$env/static/private';

export const load: PageServerLoad = async () => {
	const thoughtContent = {
		content_json: {
			type: 'doc',
			content: [
				{
					type: 'paragraph',
					content: [
						{
							type: 'text',
							text: '只言片语'
						}
					]
				}
			]
		},
		content_html: '<p>只言片语</p>',
		content_text: '只言片语'
	};
	return {
		prefix: URL_PREFIX,
		thoughtContent
	};
};
