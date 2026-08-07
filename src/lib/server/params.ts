import { error } from '@sveltejs/kit';

/**
 * 路由参数永远是字符串，而这些表的主键是 bigint。
 *
 * 生成数据库类型之后 `.eq('id', params.id)` 会直接报类型错误——这不是噪音：
 * 之前把 `/admin/article/edit/abc` 里的 "abc" 原样丢给 PostgREST，换回来的是
 * 一个 500 和一段关于 bigint 解析失败的报错。转换失败按 404 处理才是对的。
 */
export function parseIdParam(value: string, label = '内容'): number {
	const id = Number(value);

	if (!Number.isInteger(id) || id <= 0) {
		error(404, { message: `${label}不存在` });
	}

	return id;
}
