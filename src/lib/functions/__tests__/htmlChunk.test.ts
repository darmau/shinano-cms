/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from 'vitest';
import { splitHtmlByTopLevelNodes } from '../htmlChunk';

describe('splitHtmlByTopLevelNodes', () => {
	it('returns an empty array for empty or whitespace-only input', () => {
		expect(splitHtmlByTopLevelNodes('')).toEqual([]);
		expect(splitHtmlByTopLevelNodes('   \n  ')).toEqual([]);
	});

	it('splits multiple top-level elements into chunks', () => {
		const html = '<p>one</p><p>two</p><p>three</p>';
		const chunks = splitHtmlByTopLevelNodes(html);
		expect(chunks).toHaveLength(3);
		expect(chunks[0]).toContain('one');
		expect(chunks[2]).toContain('three');
	});

	it('drops whitespace-only text nodes between elements', () => {
		const html = '<p>one</p>\n  \n<p>two</p>';
		const chunks = splitHtmlByTopLevelNodes(html);
		expect(chunks).toHaveLength(2);
	});

	it('falls back to the original html when nothing useful is parsed', () => {
		expect(splitHtmlByTopLevelNodes('   ')).toEqual([]);
	});
});
