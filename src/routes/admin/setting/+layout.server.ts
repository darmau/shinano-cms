import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async () => {
	// 设置页面组件自己从 Supabase 获取数据，这里返回空对象以保持兼容性
	return {};
};

