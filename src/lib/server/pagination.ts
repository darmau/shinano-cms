/**
 * 后台所有列表页共用的分页参数解析。
 *
 * 抽出来之前这段逻辑在 8 个 +page.server.ts 里各抄了一遍，带来三个问题：
 *
 * 1. 每页条数在 10 / 12 / 16 / 24 之间随意漂移，没有任何理由；
 * 2. `url.pathname.substring(0, url.pathname.indexOf(page) - 1)` 用**页码字符串**
 *    在路径里做首次匹配。第 1 页时 `indexOf('1')` 会命中路径里任何一个 "1"——
 *    比如 /admin/article/zh-CN1/1 或者将来任何含数字的段，截出来的 path 就是错的；
 * 3. limit 直接 Number(...)，`?limit=abc` 会一路传成 NaN，`?limit=99999` 则是
 *    一条没人挡的全表查询。
 */

export const DEFAULT_PAGE_SIZE = 16;
const MAX_PAGE_SIZE = 100;

export type Pagination = {
	/** 1 起的页码 */
	page: number;
	/** 每页条数，已收窄到 1–100 */
	limit: number;
	/** supabase `.range()` 的起始下标 */
	from: number;
	/** supabase `.range()` 的结束下标（含） */
	to: number;
	/** 去掉末尾页码段的路径，分页组件用它拼链接 */
	path: string;
};

export function getPagination(
	url: URL,
	page: string,
	defaultLimit: number = DEFAULT_PAGE_SIZE
): Pagination {
	const parsedPage = Number(page);
	const pageNumber = Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;

	const requestedLimit = Number(url.searchParams.get('limit'));
	const limit =
		Number.isInteger(requestedLimit) && requestedLimit > 0
			? Math.min(requestedLimit, MAX_PAGE_SIZE)
			: defaultLimit;

	return {
		page: pageNumber,
		limit,
		from: (pageNumber - 1) * limit,
		to: pageNumber * limit - 1,
		// 只砍掉末尾的页码段，不做全路径搜索
		path: url.pathname.replace(/\/\d+$/, '')
	};
}
