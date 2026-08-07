import { describe, expect, it } from 'vitest';
import { getPagination } from '../pagination';

const url = (path: string, search = '') => new URL(`https://cms.example${path}${search}`);

describe('getPagination', () => {
	it('computes the supabase range from page and limit', () => {
		const { from, to } = getPagination(url('/admin/media/3'), '3', 24);
		expect(from).toBe(48);
		expect(to).toBe(71);
	});

	it('strips only the trailing page segment', () => {
		// 旧实现是 pathname.indexOf(page)，第 1 页时会命中路径里任何一个 "1"
		expect(getPagination(url('/admin/article/zh-CN1/1'), '1').path).toBe('/admin/article/zh-CN1');
		expect(getPagination(url('/admin/media/1'), '1').path).toBe('/admin/media');
	});

	it('falls back to page 1 for junk page params', () => {
		expect(getPagination(url('/admin/media/abc'), 'abc').page).toBe(1);
		expect(getPagination(url('/admin/media/0'), '0').page).toBe(1);
		expect(getPagination(url('/admin/media/-2'), '-2').page).toBe(1);
	});

	it('uses the caller default when limit is absent or unusable', () => {
		expect(getPagination(url('/admin/media/1'), '1', 24).limit).toBe(24);
		expect(getPagination(url('/admin/media/1', '?limit=abc'), '1', 24).limit).toBe(24);
		expect(getPagination(url('/admin/media/1', '?limit=0'), '1', 24).limit).toBe(24);
	});

	it('honours an explicit limit but caps it', () => {
		expect(getPagination(url('/admin/media/1', '?limit=36'), '1').limit).toBe(36);
		// ?limit=100000 以前会变成一条全表查询
		expect(getPagination(url('/admin/media/1', '?limit=100000'), '1').limit).toBe(100);
	});
});
