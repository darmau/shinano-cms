import type { Tables } from './database';

export type { SelectedImage } from './editor';

/** image 表的完整行，直接来自生成的数据库类型 */
export type ImageRow = Tables<'image'>;

/** 列表与选择器只用得到这几列 —— 显式列清单也是 P0-5 之后读表的推荐写法 */
export type ImageListItem = Pick<
	ImageRow,
	| 'id'
	| 'storage_key'
	| 'file_name'
	| 'alt'
	| 'folder'
	| 'caption'
	| 'location'
	| 'taken_at'
	| 'width'
	| 'height'
	| 'size'
>;
