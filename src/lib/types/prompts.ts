export const DEFAULT_AI_CONFIG = {
	ai_GATEWAY_ENDPOINT: '',
	cf_AIG_TOKEN: '',
	config_OPENAI: '',
	prompt_SEO: '',
	model_ABSTRACT: 'gpt-5-nano',
	prompt_SLUG: '',
	model_SLUG: 'gpt-5-nano',
	prompt_TRANSLATION: '',
	model_TRANSLATION: 'gpt-5',
	prompt_IMAGE_ALT: '',
	prompt_TAGS: '',
	model_TAGS: 'gpt-5-nano'
} as const;

export type AIConfigKey = keyof typeof DEFAULT_AI_CONFIG;

export type AIModelKey = Extract<AIConfigKey, `model_${string}`>;

export type AIMutableConfig = Record<AIConfigKey, string>;

export class AI {
	private readonly defaultsMap: Map<AIConfigKey, string>;

	public constructor() {
		this.defaultsMap = new Map(Object.entries(DEFAULT_AI_CONFIG) as [AIConfigKey, string][]);
	}

	public array(): AIConfigKey[] {
		return Array.from(this.defaultsMap.keys());
	}

	public emptyObject(): AIMutableConfig {
		return { ...DEFAULT_AI_CONFIG };
	}

	public defaultFor(key: AIConfigKey): string {
		return this.defaultsMap.get(key) ?? '';
	}
}
