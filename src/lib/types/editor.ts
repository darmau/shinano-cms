import type { ComponentType } from 'svelte';

/**
 * 编辑器菜单项类型
 * 用于定义工具栏按钮
 */
export type MenuItem = {
	name: string;
	command: () => void;
	content: ComponentType;
	active: () => boolean;
};

/**
 * 选中的图片类型
 * 用于图片选择器
 */
export type SelectedImage = {
	id: number;
	storage_key: string;
	prefix: string;
	alt?: string | null;
	caption?: string | null;
};

