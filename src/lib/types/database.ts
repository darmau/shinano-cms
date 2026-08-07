export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
	// Allows to automatically instantiate createClient with right options
	// instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
	__InternalSupabase: {
		PostgrestVersion: '12.2.2 (db9da0b)';
	};
	public: {
		Tables: {
			article: {
				Row: {
					abstract: string | null;
					category: number;
					content_html: string | null;
					content_json: Json | null;
					content_text: string | null;
					cover: number | null;
					created_at: string | null;
					id: number;
					is_draft: boolean | null;
					is_featured: boolean | null;
					is_premium: boolean | null;
					is_top: boolean | null;
					lang: number;
					page_view: number | null;
					published_at: string | null;
					reactions: Json | null;
					slug: string;
					subtitle: string | null;
					title: string;
					topic: string[] | null;
					updated_at: string;
				};
				Insert: {
					abstract?: string | null;
					category: number;
					content_html?: string | null;
					content_json?: Json | null;
					content_text?: string | null;
					cover?: number | null;
					created_at?: string | null;
					id?: number;
					is_draft?: boolean | null;
					is_featured?: boolean | null;
					is_premium?: boolean | null;
					is_top?: boolean | null;
					lang: number;
					page_view?: number | null;
					published_at?: string | null;
					reactions?: Json | null;
					slug: string;
					subtitle?: string | null;
					title: string;
					topic?: string[] | null;
					updated_at?: string;
				};
				Update: {
					abstract?: string | null;
					category?: number;
					content_html?: string | null;
					content_json?: Json | null;
					content_text?: string | null;
					cover?: number | null;
					created_at?: string | null;
					id?: number;
					is_draft?: boolean | null;
					is_featured?: boolean | null;
					is_premium?: boolean | null;
					is_top?: boolean | null;
					lang?: number;
					page_view?: number | null;
					published_at?: string | null;
					reactions?: Json | null;
					slug?: string;
					subtitle?: string | null;
					title?: string;
					topic?: string[] | null;
					updated_at?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'article_category_fkey';
						columns: ['category'];
						isOneToOne: false;
						referencedRelation: 'category';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'article_cover_fkey';
						columns: ['cover'];
						isOneToOne: false;
						referencedRelation: 'image';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'article_lang_fkey';
						columns: ['lang'];
						isOneToOne: false;
						referencedRelation: 'language';
						referencedColumns: ['id'];
					}
				];
			};
			book: {
				Row: {
					comment: string | null;
					cover: number | null;
					created_at: string | null;
					date: string | null;
					id: number;
					link: string | null;
					rate: number | null;
					title: string;
				};
				Insert: {
					comment?: string | null;
					cover?: number | null;
					created_at?: string | null;
					date?: string | null;
					id?: number;
					link?: string | null;
					rate?: number | null;
					title: string;
				};
				Update: {
					comment?: string | null;
					cover?: number | null;
					created_at?: string | null;
					date?: string | null;
					id?: number;
					link?: string | null;
					rate?: number | null;
					title?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'book_cover_fkey';
						columns: ['cover'];
						isOneToOne: false;
						referencedRelation: 'image';
						referencedColumns: ['id'];
					}
				];
			};
			category: {
				Row: {
					cover: number | null;
					created_at: string | null;
					description: string | null;
					id: number;
					lang: number;
					slug: string;
					title: string;
					type: Database['public']['Enums']['content'];
				};
				Insert: {
					cover?: number | null;
					created_at?: string | null;
					description?: string | null;
					id?: number;
					lang: number;
					slug: string;
					title: string;
					type?: Database['public']['Enums']['content'];
				};
				Update: {
					cover?: number | null;
					created_at?: string | null;
					description?: string | null;
					id?: number;
					lang?: number;
					slug?: string;
					title?: string;
					type?: Database['public']['Enums']['content'];
				};
				Relationships: [
					{
						foreignKeyName: 'category_cover_fkey';
						columns: ['cover'];
						isOneToOne: false;
						referencedRelation: 'image';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'category_lang_fkey';
						columns: ['lang'];
						isOneToOne: false;
						referencedRelation: 'language';
						referencedColumns: ['id'];
					}
				];
			};
			comment: {
				Row: {
					content_html: string | null;
					content_json: Json | null;
					content_text: string | null;
					created_at: string | null;
					email: string | null;
					id: number;
					ip: unknown;
					ip_info: Json | null;
					is_anonymous: boolean | null;
					is_blocked: boolean | null;
					is_public: boolean | null;
					name: string | null;
					receive_notification: boolean | null;
					reply_to: number | null;
					to_article: number | null;
					to_photo: number | null;
					to_thought: number | null;
					toxic_score: number | null;
					user_id: number | null;
					website: string | null;
				};
				Insert: {
					content_html?: string | null;
					content_json?: Json | null;
					content_text?: string | null;
					created_at?: string | null;
					email?: string | null;
					id?: number;
					ip?: unknown;
					ip_info?: Json | null;
					is_anonymous?: boolean | null;
					is_blocked?: boolean | null;
					is_public?: boolean | null;
					name?: string | null;
					receive_notification?: boolean | null;
					reply_to?: number | null;
					to_article?: number | null;
					to_photo?: number | null;
					to_thought?: number | null;
					toxic_score?: number | null;
					user_id?: number | null;
					website?: string | null;
				};
				Update: {
					content_html?: string | null;
					content_json?: Json | null;
					content_text?: string | null;
					created_at?: string | null;
					email?: string | null;
					id?: number;
					ip?: unknown;
					ip_info?: Json | null;
					is_anonymous?: boolean | null;
					is_blocked?: boolean | null;
					is_public?: boolean | null;
					name?: string | null;
					receive_notification?: boolean | null;
					reply_to?: number | null;
					to_article?: number | null;
					to_photo?: number | null;
					to_thought?: number | null;
					toxic_score?: number | null;
					user_id?: number | null;
					website?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: 'comment_reply_to_fkey';
						columns: ['reply_to'];
						isOneToOne: false;
						referencedRelation: 'comment';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'comment_to_article_fkey';
						columns: ['to_article'];
						isOneToOne: false;
						referencedRelation: 'article';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'comment_to_photo_fkey';
						columns: ['to_photo'];
						isOneToOne: false;
						referencedRelation: 'photo';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'comment_to_photo_fkey';
						columns: ['to_photo'];
						isOneToOne: false;
						referencedRelation: 'random_en_photos';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'comment_to_photo_fkey';
						columns: ['to_photo'];
						isOneToOne: false;
						referencedRelation: 'random_jp_photos';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'comment_to_photo_fkey';
						columns: ['to_photo'];
						isOneToOne: false;
						referencedRelation: 'random_zh_photos';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'comment_to_thought_fkey';
						columns: ['to_thought'];
						isOneToOne: false;
						referencedRelation: 'thought';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'comment_user_id_fkey';
						columns: ['user_id'];
						isOneToOne: false;
						referencedRelation: 'users';
						referencedColumns: ['id'];
					}
				];
			};
			config: {
				Row: {
					key: string;
					value: string | null;
				};
				Insert: {
					key: string;
					value?: string | null;
				};
				Update: {
					key?: string;
					value?: string | null;
				};
				Relationships: [];
			};
			image: {
				Row: {
					alt: string | null;
					caption: string | null;
					created_at: string | null;
					date: string | null;
					exif: Json | null;
					file_name: string | null;
					folder: string | null;
					format: string | null;
					gps_location: unknown;
					height: number | null;
					id: number;
					latitude: number | null;
					location: string | null;
					longitude: number | null;
					size: number | null;
					storage_key: string;
					taken_at: string | null;
					width: number | null;
				};
				Insert: {
					alt?: string | null;
					caption?: string | null;
					created_at?: string | null;
					date?: string | null;
					exif?: Json | null;
					file_name?: string | null;
					folder?: string | null;
					format?: string | null;
					gps_location?: unknown;
					height?: number | null;
					id?: number;
					latitude?: number | null;
					location?: string | null;
					longitude?: number | null;
					size?: number | null;
					storage_key?: string;
					taken_at?: string | null;
					width?: number | null;
				};
				Update: {
					alt?: string | null;
					caption?: string | null;
					created_at?: string | null;
					date?: string | null;
					exif?: Json | null;
					file_name?: string | null;
					folder?: string | null;
					format?: string | null;
					gps_location?: unknown;
					height?: number | null;
					id?: number;
					latitude?: number | null;
					location?: string | null;
					longitude?: number | null;
					size?: number | null;
					storage_key?: string;
					taken_at?: string | null;
					width?: number | null;
				};
				Relationships: [];
			};
			language: {
				Row: {
					id: number;
					is_default: boolean;
					lang: string;
					locale: string;
				};
				Insert: {
					id?: number;
					is_default?: boolean;
					lang: string;
					locale: string;
				};
				Update: {
					id?: number;
					is_default?: boolean;
					lang?: string;
					locale?: string;
				};
				Relationships: [];
			};
			message: {
				Row: {
					contact_detail: string | null;
					contact_type: string;
					created_at: string | null;
					id: number;
					is_read: boolean | null;
					message: string | null;
					name: string | null;
					user_id: number;
				};
				Insert: {
					contact_detail?: string | null;
					contact_type?: string;
					created_at?: string | null;
					id?: number;
					is_read?: boolean | null;
					message?: string | null;
					name?: string | null;
					user_id: number;
				};
				Update: {
					contact_detail?: string | null;
					contact_type?: string;
					created_at?: string | null;
					id?: number;
					is_read?: boolean | null;
					message?: string | null;
					name?: string | null;
					user_id?: number;
				};
				Relationships: [
					{
						foreignKeyName: 'message_user_id_fkey';
						columns: ['user_id'];
						isOneToOne: false;
						referencedRelation: 'users';
						referencedColumns: ['id'];
					}
				];
			};
			photo: {
				Row: {
					abstract: string | null;
					category: number;
					content_html: string | null;
					content_json: Json | null;
					content_text: string | null;
					cover: number | null;
					created_at: string | null;
					id: number;
					is_draft: boolean | null;
					is_featured: boolean | null;
					is_top: boolean | null;
					lang: number;
					page_view: number | null;
					published_at: string | null;
					reactions: Json | null;
					slug: string;
					title: string;
					topic: string[] | null;
					updated_at: string;
				};
				Insert: {
					abstract?: string | null;
					category: number;
					content_html?: string | null;
					content_json?: Json | null;
					content_text?: string | null;
					cover?: number | null;
					created_at?: string | null;
					id?: number;
					is_draft?: boolean | null;
					is_featured?: boolean | null;
					is_top?: boolean | null;
					lang: number;
					page_view?: number | null;
					published_at?: string | null;
					reactions?: Json | null;
					slug: string;
					title: string;
					topic?: string[] | null;
					updated_at?: string;
				};
				Update: {
					abstract?: string | null;
					category?: number;
					content_html?: string | null;
					content_json?: Json | null;
					content_text?: string | null;
					cover?: number | null;
					created_at?: string | null;
					id?: number;
					is_draft?: boolean | null;
					is_featured?: boolean | null;
					is_top?: boolean | null;
					lang?: number;
					page_view?: number | null;
					published_at?: string | null;
					reactions?: Json | null;
					slug?: string;
					title?: string;
					topic?: string[] | null;
					updated_at?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'photo_category_fkey';
						columns: ['category'];
						isOneToOne: false;
						referencedRelation: 'category';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'photo_cover_fkey';
						columns: ['cover'];
						isOneToOne: false;
						referencedRelation: 'image';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'photo_lang_fkey';
						columns: ['lang'];
						isOneToOne: false;
						referencedRelation: 'language';
						referencedColumns: ['id'];
					}
				];
			};
			photo_image: {
				Row: {
					image_id: number;
					order: number | null;
					photo_id: number;
				};
				Insert: {
					image_id: number;
					order?: number | null;
					photo_id: number;
				};
				Update: {
					image_id?: number;
					order?: number | null;
					photo_id?: number;
				};
				Relationships: [
					{
						foreignKeyName: 'photo_image_image_id_fkey';
						columns: ['image_id'];
						isOneToOne: false;
						referencedRelation: 'image';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'photo_image_photo_id_fkey';
						columns: ['photo_id'];
						isOneToOne: false;
						referencedRelation: 'photo';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'photo_image_photo_id_fkey';
						columns: ['photo_id'];
						isOneToOne: false;
						referencedRelation: 'random_en_photos';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'photo_image_photo_id_fkey';
						columns: ['photo_id'];
						isOneToOne: false;
						referencedRelation: 'random_jp_photos';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'photo_image_photo_id_fkey';
						columns: ['photo_id'];
						isOneToOne: false;
						referencedRelation: 'random_zh_photos';
						referencedColumns: ['id'];
					}
				];
			};
			spatial_ref_sys: {
				Row: {
					auth_name: string | null;
					auth_srid: number | null;
					proj4text: string | null;
					srid: number;
					srtext: string | null;
				};
				Insert: {
					auth_name?: string | null;
					auth_srid?: number | null;
					proj4text?: string | null;
					srid: number;
					srtext?: string | null;
				};
				Update: {
					auth_name?: string | null;
					auth_srid?: number | null;
					proj4text?: string | null;
					srid?: number;
					srtext?: string | null;
				};
				Relationships: [];
			};
			stats: {
				Row: {
					article_count: number | null;
					comment_count: number | null;
					date: string | null;
					id: number;
					image_count: number | null;
					message_count: number | null;
					photo_count: number | null;
					thought_count: number | null;
					user_count: number | null;
				};
				Insert: {
					article_count?: number | null;
					comment_count?: number | null;
					date?: string | null;
					id?: number;
					image_count?: number | null;
					message_count?: number | null;
					photo_count?: number | null;
					thought_count?: number | null;
					user_count?: number | null;
				};
				Update: {
					article_count?: number | null;
					comment_count?: number | null;
					date?: string | null;
					id?: number;
					image_count?: number | null;
					message_count?: number | null;
					photo_count?: number | null;
					thought_count?: number | null;
					user_count?: number | null;
				};
				Relationships: [];
			};
			thought: {
				Row: {
					content_html: string | null;
					content_json: Json | null;
					content_text: string | null;
					created_at: string | null;
					id: number;
					location: string | null;
					page_view: number | null;
					push_to_gallery: boolean | null;
					reactions: Json | null;
					slug: string;
				};
				Insert: {
					content_html?: string | null;
					content_json?: Json | null;
					content_text?: string | null;
					created_at?: string | null;
					id?: number;
					location?: string | null;
					page_view?: number | null;
					push_to_gallery?: boolean | null;
					reactions?: Json | null;
					slug?: string;
				};
				Update: {
					content_html?: string | null;
					content_json?: Json | null;
					content_text?: string | null;
					created_at?: string | null;
					id?: number;
					location?: string | null;
					page_view?: number | null;
					push_to_gallery?: boolean | null;
					reactions?: Json | null;
					slug?: string;
				};
				Relationships: [];
			};
			thought_image: {
				Row: {
					image_id: number;
					order: number | null;
					thought_id: number;
				};
				Insert: {
					image_id: number;
					order?: number | null;
					thought_id: number;
				};
				Update: {
					image_id?: number;
					order?: number | null;
					thought_id?: number;
				};
				Relationships: [
					{
						foreignKeyName: 'thought_image_image_id_fkey';
						columns: ['image_id'];
						isOneToOne: false;
						referencedRelation: 'image';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'thought_image_thought_id_fkey';
						columns: ['thought_id'];
						isOneToOne: false;
						referencedRelation: 'thought';
						referencedColumns: ['id'];
					}
				];
			};
			users: {
				Row: {
					created_at: string | null;
					current_ip: unknown;
					id: number;
					name: string | null;
					role: Database['public']['Enums']['role'] | null;
					source: string | null;
					user_id: string | null;
					website: string | null;
				};
				Insert: {
					created_at?: string | null;
					current_ip?: unknown;
					id?: number;
					name?: string | null;
					role?: Database['public']['Enums']['role'] | null;
					source?: string | null;
					user_id?: string | null;
					website?: string | null;
				};
				Update: {
					created_at?: string | null;
					current_ip?: unknown;
					id?: number;
					name?: string | null;
					role?: Database['public']['Enums']['role'] | null;
					source?: string | null;
					user_id?: string | null;
					website?: string | null;
				};
				Relationships: [];
			};
		};
		Views: {
			gallery_feed: {
				Row: {
					content_text: string | null;
					content_type: string | null;
					cover: Json | null;
					created_at: string | null;
					id: number | null;
					images: Json | null;
					lang: string | null;
					slug: string | null;
					sort_date: string | null;
					title: string | null;
				};
				Relationships: [];
			};
			geography_columns: {
				Row: {
					coord_dimension: number | null;
					f_geography_column: unknown;
					f_table_catalog: unknown;
					f_table_name: unknown;
					f_table_schema: unknown;
					srid: number | null;
					type: string | null;
				};
				Relationships: [];
			};
			geometry_columns: {
				Row: {
					coord_dimension: number | null;
					f_geometry_column: unknown;
					f_table_catalog: string | null;
					f_table_name: unknown;
					f_table_schema: unknown;
					srid: number | null;
					type: string | null;
				};
				Insert: {
					coord_dimension?: number | null;
					f_geometry_column?: unknown;
					f_table_catalog?: string | null;
					f_table_name?: unknown;
					f_table_schema?: unknown;
					srid?: number | null;
					type?: string | null;
				};
				Update: {
					coord_dimension?: number | null;
					f_geometry_column?: unknown;
					f_table_catalog?: string | null;
					f_table_name?: unknown;
					f_table_schema?: unknown;
					srid?: number | null;
					type?: string | null;
				};
				Relationships: [];
			};
			random_en_photos: {
				Row: {
					abstract: string | null;
					category: number | null;
					content_html: string | null;
					content_json: Json | null;
					content_text: string | null;
					cover: number | null;
					created_at: string | null;
					id: number | null;
					is_draft: boolean | null;
					is_featured: boolean | null;
					is_top: boolean | null;
					lang: number | null;
					page_view: number | null;
					published_at: string | null;
					slug: string | null;
					title: string | null;
					topic: string[] | null;
					updated_at: string | null;
				};
				Relationships: [
					{
						foreignKeyName: 'photo_category_fkey';
						columns: ['category'];
						isOneToOne: false;
						referencedRelation: 'category';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'photo_cover_fkey';
						columns: ['cover'];
						isOneToOne: false;
						referencedRelation: 'image';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'photo_lang_fkey';
						columns: ['lang'];
						isOneToOne: false;
						referencedRelation: 'language';
						referencedColumns: ['id'];
					}
				];
			};
			random_jp_photos: {
				Row: {
					abstract: string | null;
					category: number | null;
					content_html: string | null;
					content_json: Json | null;
					content_text: string | null;
					cover: number | null;
					created_at: string | null;
					id: number | null;
					is_draft: boolean | null;
					is_featured: boolean | null;
					is_top: boolean | null;
					lang: number | null;
					page_view: number | null;
					published_at: string | null;
					slug: string | null;
					title: string | null;
					topic: string[] | null;
					updated_at: string | null;
				};
				Relationships: [
					{
						foreignKeyName: 'photo_category_fkey';
						columns: ['category'];
						isOneToOne: false;
						referencedRelation: 'category';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'photo_cover_fkey';
						columns: ['cover'];
						isOneToOne: false;
						referencedRelation: 'image';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'photo_lang_fkey';
						columns: ['lang'];
						isOneToOne: false;
						referencedRelation: 'language';
						referencedColumns: ['id'];
					}
				];
			};
			random_zh_photos: {
				Row: {
					abstract: string | null;
					category: number | null;
					content_html: string | null;
					content_json: Json | null;
					content_text: string | null;
					cover: number | null;
					created_at: string | null;
					id: number | null;
					is_draft: boolean | null;
					is_featured: boolean | null;
					is_top: boolean | null;
					lang: number | null;
					page_view: number | null;
					published_at: string | null;
					slug: string | null;
					title: string | null;
					topic: string[] | null;
					updated_at: string | null;
				};
				Relationships: [
					{
						foreignKeyName: 'photo_category_fkey';
						columns: ['category'];
						isOneToOne: false;
						referencedRelation: 'category';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'photo_cover_fkey';
						columns: ['cover'];
						isOneToOne: false;
						referencedRelation: 'image';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'photo_lang_fkey';
						columns: ['lang'];
						isOneToOne: false;
						referencedRelation: 'language';
						referencedColumns: ['id'];
					}
				];
			};
		};
		Functions: {
			_postgis_deprecate: {
				Args: { newname: string; oldname: string; version: string };
				Returns: undefined;
			};
			_postgis_index_extent: {
				Args: { col: string; tbl: unknown };
				Returns: unknown;
			};
			_postgis_pgsql_version: { Args: never; Returns: string };
			_postgis_scripts_pgsql_version: { Args: never; Returns: string };
			_postgis_selectivity: {
				Args: { att_name: string; geom: unknown; mode?: string; tbl: unknown };
				Returns: number;
			};
			_postgis_stats: {
				Args: { ''?: string; att_name: string; tbl: unknown };
				Returns: string;
			};
			_st_3dintersects: {
				Args: { geom1: unknown; geom2: unknown };
				Returns: boolean;
			};
			_st_contains: {
				Args: { geom1: unknown; geom2: unknown };
				Returns: boolean;
			};
			_st_containsproperly: {
				Args: { geom1: unknown; geom2: unknown };
				Returns: boolean;
			};
			_st_coveredby:
				| { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
				| { Args: { geom1: unknown; geom2: unknown }; Returns: boolean };
			_st_covers:
				| { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
				| { Args: { geom1: unknown; geom2: unknown }; Returns: boolean };
			_st_crosses: {
				Args: { geom1: unknown; geom2: unknown };
				Returns: boolean;
			};
			_st_dwithin: {
				Args: {
					geog1: unknown;
					geog2: unknown;
					tolerance: number;
					use_spheroid?: boolean;
				};
				Returns: boolean;
			};
			_st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean };
			_st_intersects: {
				Args: { geom1: unknown; geom2: unknown };
				Returns: boolean;
			};
			_st_linecrossingdirection: {
				Args: { line1: unknown; line2: unknown };
				Returns: number;
			};
			_st_longestline: {
				Args: { geom1: unknown; geom2: unknown };
				Returns: unknown;
			};
			_st_maxdistance: {
				Args: { geom1: unknown; geom2: unknown };
				Returns: number;
			};
			_st_orderingequals: {
				Args: { geom1: unknown; geom2: unknown };
				Returns: boolean;
			};
			_st_overlaps: {
				Args: { geom1: unknown; geom2: unknown };
				Returns: boolean;
			};
			_st_sortablehash: { Args: { geom: unknown }; Returns: number };
			_st_touches: {
				Args: { geom1: unknown; geom2: unknown };
				Returns: boolean;
			};
			_st_voronoi: {
				Args: {
					clip?: unknown;
					g1: unknown;
					return_polygons?: boolean;
					tolerance?: number;
				};
				Returns: unknown;
			};
			_st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean };
			add_reaction: {
				Args: {
					content_id: number;
					content_type: string;
					reaction_type: string;
				};
				Returns: Json;
			};
			addauth: { Args: { '': string }; Returns: boolean };
			addgeometrycolumn:
				| {
						Args: {
							catalog_name: string;
							column_name: string;
							new_dim: number;
							new_srid_in: number;
							new_type: string;
							schema_name: string;
							table_name: string;
							use_typmod?: boolean;
						};
						Returns: string;
				  }
				| {
						Args: {
							column_name: string;
							new_dim: number;
							new_srid: number;
							new_type: string;
							schema_name: string;
							table_name: string;
							use_typmod?: boolean;
						};
						Returns: string;
				  }
				| {
						Args: {
							column_name: string;
							new_dim: number;
							new_srid: number;
							new_type: string;
							table_name: string;
							use_typmod?: boolean;
						};
						Returns: string;
				  };
			article_page_view: { Args: { article_id: number }; Returns: number };
			disablelongtransactions: { Args: never; Returns: string };
			dropgeometrycolumn:
				| {
						Args: {
							catalog_name: string;
							column_name: string;
							schema_name: string;
							table_name: string;
						};
						Returns: string;
				  }
				| {
						Args: {
							column_name: string;
							schema_name: string;
							table_name: string;
						};
						Returns: string;
				  }
				| { Args: { column_name: string; table_name: string }; Returns: string };
			dropgeometrytable:
				| {
						Args: {
							catalog_name: string;
							schema_name: string;
							table_name: string;
						};
						Returns: string;
				  }
				| { Args: { schema_name: string; table_name: string }; Returns: string }
				| { Args: { table_name: string }; Returns: string };
			enablelongtransactions: { Args: never; Returns: string };
			equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean };
			exif_coordinate_to_decimal: { Args: { coord: Json }; Returns: number };
			exif_coordinate_with_ref: {
				Args: { coord: Json; ref: string };
				Returns: number;
			};
			exif_value_to_float: { Args: { value: Json }; Returns: number };
			extract_image_gps: { Args: { exif: Json }; Returns: unknown };
			geometry: { Args: { '': string }; Returns: unknown };
			geometry_above: {
				Args: { geom1: unknown; geom2: unknown };
				Returns: boolean;
			};
			geometry_below: {
				Args: { geom1: unknown; geom2: unknown };
				Returns: boolean;
			};
			geometry_cmp: {
				Args: { geom1: unknown; geom2: unknown };
				Returns: number;
			};
			geometry_contained_3d: {
				Args: { geom1: unknown; geom2: unknown };
				Returns: boolean;
			};
			geometry_contains: {
				Args: { geom1: unknown; geom2: unknown };
				Returns: boolean;
			};
			geometry_contains_3d: {
				Args: { geom1: unknown; geom2: unknown };
				Returns: boolean;
			};
			geometry_distance_box: {
				Args: { geom1: unknown; geom2: unknown };
				Returns: number;
			};
			geometry_distance_centroid: {
				Args: { geom1: unknown; geom2: unknown };
				Returns: number;
			};
			geometry_eq: {
				Args: { geom1: unknown; geom2: unknown };
				Returns: boolean;
			};
			geometry_ge: {
				Args: { geom1: unknown; geom2: unknown };
				Returns: boolean;
			};
			geometry_gt: {
				Args: { geom1: unknown; geom2: unknown };
				Returns: boolean;
			};
			geometry_le: {
				Args: { geom1: unknown; geom2: unknown };
				Returns: boolean;
			};
			geometry_left: {
				Args: { geom1: unknown; geom2: unknown };
				Returns: boolean;
			};
			geometry_lt: {
				Args: { geom1: unknown; geom2: unknown };
				Returns: boolean;
			};
			geometry_overabove: {
				Args: { geom1: unknown; geom2: unknown };
				Returns: boolean;
			};
			geometry_overbelow: {
				Args: { geom1: unknown; geom2: unknown };
				Returns: boolean;
			};
			geometry_overlaps: {
				Args: { geom1: unknown; geom2: unknown };
				Returns: boolean;
			};
			geometry_overlaps_3d: {
				Args: { geom1: unknown; geom2: unknown };
				Returns: boolean;
			};
			geometry_overleft: {
				Args: { geom1: unknown; geom2: unknown };
				Returns: boolean;
			};
			geometry_overright: {
				Args: { geom1: unknown; geom2: unknown };
				Returns: boolean;
			};
			geometry_right: {
				Args: { geom1: unknown; geom2: unknown };
				Returns: boolean;
			};
			geometry_same: {
				Args: { geom1: unknown; geom2: unknown };
				Returns: boolean;
			};
			geometry_same_3d: {
				Args: { geom1: unknown; geom2: unknown };
				Returns: boolean;
			};
			geometry_within: {
				Args: { geom1: unknown; geom2: unknown };
				Returns: boolean;
			};
			geomfromewkt: { Args: { '': string }; Returns: unknown };
			get_article_count_by_category: {
				Args: { lang_name: string };
				Returns: {
					count: number;
					slug: string;
					title: string;
				}[];
			};
			get_article_count_by_year: {
				Args: { lang_name: string };
				Returns: {
					count: number;
					year: string;
				}[];
			};
			get_photo_map_geojson: { Args: { lang_code: string }; Returns: Json };
			gettransactionid: { Args: never; Returns: unknown };
			is_admin: { Args: never; Returns: boolean };
			longtransactionsenabled: { Args: never; Returns: boolean };
			photo_page_view: { Args: { photo_id: number }; Returns: number };
			populate_geometry_columns:
				| { Args: { tbl_oid: unknown; use_typmod?: boolean }; Returns: number }
				| { Args: { use_typmod?: boolean }; Returns: string };
			postgis_constraint_dims: {
				Args: { geomcolumn: string; geomschema: string; geomtable: string };
				Returns: number;
			};
			postgis_constraint_srid: {
				Args: { geomcolumn: string; geomschema: string; geomtable: string };
				Returns: number;
			};
			postgis_constraint_type: {
				Args: { geomcolumn: string; geomschema: string; geomtable: string };
				Returns: string;
			};
			postgis_extensions_upgrade: { Args: never; Returns: string };
			postgis_full_version: { Args: never; Returns: string };
			postgis_geos_version: { Args: never; Returns: string };
			postgis_lib_build_date: { Args: never; Returns: string };
			postgis_lib_revision: { Args: never; Returns: string };
			postgis_lib_version: { Args: never; Returns: string };
			postgis_libjson_version: { Args: never; Returns: string };
			postgis_liblwgeom_version: { Args: never; Returns: string };
			postgis_libprotobuf_version: { Args: never; Returns: string };
			postgis_libxml_version: { Args: never; Returns: string };
			postgis_proj_version: { Args: never; Returns: string };
			postgis_scripts_build_date: { Args: never; Returns: string };
			postgis_scripts_installed: { Args: never; Returns: string };
			postgis_scripts_released: { Args: never; Returns: string };
			postgis_svn_version: { Args: never; Returns: string };
			postgis_type_name: {
				Args: {
					coord_dimension: number;
					geomname: string;
					use_new_name?: boolean;
				};
				Returns: string;
			};
			postgis_version: { Args: never; Returns: string };
			postgis_wagyu_version: { Args: never; Returns: string };
			save_photo_with_images: {
				Args: { p_images?: Json; p_photo: Json; p_photo_id?: number };
				Returns: number;
			};
			st_3dclosestpoint: {
				Args: { geom1: unknown; geom2: unknown };
				Returns: unknown;
			};
			st_3ddistance: {
				Args: { geom1: unknown; geom2: unknown };
				Returns: number;
			};
			st_3dintersects: {
				Args: { geom1: unknown; geom2: unknown };
				Returns: boolean;
			};
			st_3dlongestline: {
				Args: { geom1: unknown; geom2: unknown };
				Returns: unknown;
			};
			st_3dmakebox: {
				Args: { geom1: unknown; geom2: unknown };
				Returns: unknown;
			};
			st_3dmaxdistance: {
				Args: { geom1: unknown; geom2: unknown };
				Returns: number;
			};
			st_3dshortestline: {
				Args: { geom1: unknown; geom2: unknown };
				Returns: unknown;
			};
			st_addpoint: {
				Args: { geom1: unknown; geom2: unknown };
				Returns: unknown;
			};
			st_angle:
				| { Args: { line1: unknown; line2: unknown }; Returns: number }
				| {
						Args: { pt1: unknown; pt2: unknown; pt3: unknown; pt4?: unknown };
						Returns: number;
				  };
			st_area:
				| { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
				| { Args: { '': string }; Returns: number };
			st_asencodedpolyline: {
				Args: { geom: unknown; nprecision?: number };
				Returns: string;
			};
			st_asewkt: { Args: { '': string }; Returns: string };
			st_asgeojson:
				| {
						Args: { geog: unknown; maxdecimaldigits?: number; options?: number };
						Returns: string;
				  }
				| {
						Args: { geom: unknown; maxdecimaldigits?: number; options?: number };
						Returns: string;
				  }
				| {
						Args: {
							geom_column?: string;
							maxdecimaldigits?: number;
							pretty_bool?: boolean;
							r: Record<string, unknown>;
						};
						Returns: string;
				  }
				| { Args: { '': string }; Returns: string };
			st_asgml:
				| {
						Args: {
							geog: unknown;
							id?: string;
							maxdecimaldigits?: number;
							nprefix?: string;
							options?: number;
						};
						Returns: string;
				  }
				| {
						Args: { geom: unknown; maxdecimaldigits?: number; options?: number };
						Returns: string;
				  }
				| { Args: { '': string }; Returns: string }
				| {
						Args: {
							geog: unknown;
							id?: string;
							maxdecimaldigits?: number;
							nprefix?: string;
							options?: number;
							version: number;
						};
						Returns: string;
				  }
				| {
						Args: {
							geom: unknown;
							id?: string;
							maxdecimaldigits?: number;
							nprefix?: string;
							options?: number;
							version: number;
						};
						Returns: string;
				  };
			st_askml:
				| {
						Args: { geog: unknown; maxdecimaldigits?: number; nprefix?: string };
						Returns: string;
				  }
				| {
						Args: { geom: unknown; maxdecimaldigits?: number; nprefix?: string };
						Returns: string;
				  }
				| { Args: { '': string }; Returns: string };
			st_aslatlontext: {
				Args: { geom: unknown; tmpl?: string };
				Returns: string;
			};
			st_asmarc21: { Args: { format?: string; geom: unknown }; Returns: string };
			st_asmvtgeom: {
				Args: {
					bounds: unknown;
					buffer?: number;
					clip_geom?: boolean;
					extent?: number;
					geom: unknown;
				};
				Returns: unknown;
			};
			st_assvg:
				| {
						Args: { geog: unknown; maxdecimaldigits?: number; rel?: number };
						Returns: string;
				  }
				| {
						Args: { geom: unknown; maxdecimaldigits?: number; rel?: number };
						Returns: string;
				  }
				| { Args: { '': string }; Returns: string };
			st_astext: { Args: { '': string }; Returns: string };
			st_astwkb:
				| {
						Args: {
							geom: unknown;
							prec?: number;
							prec_m?: number;
							prec_z?: number;
							with_boxes?: boolean;
							with_sizes?: boolean;
						};
						Returns: string;
				  }
				| {
						Args: {
							geom: unknown[];
							ids: number[];
							prec?: number;
							prec_m?: number;
							prec_z?: number;
							with_boxes?: boolean;
							with_sizes?: boolean;
						};
						Returns: string;
				  };
			st_asx3d: {
				Args: { geom: unknown; maxdecimaldigits?: number; options?: number };
				Returns: string;
			};
			st_azimuth:
				| { Args: { geog1: unknown; geog2: unknown }; Returns: number }
				| { Args: { geom1: unknown; geom2: unknown }; Returns: number };
			st_boundingdiagonal: {
				Args: { fits?: boolean; geom: unknown };
				Returns: unknown;
			};
			st_buffer:
				| {
						Args: { geom: unknown; options?: string; radius: number };
						Returns: unknown;
				  }
				| {
						Args: { geom: unknown; quadsegs: number; radius: number };
						Returns: unknown;
				  };
			st_centroid: { Args: { '': string }; Returns: unknown };
			st_clipbybox2d: {
				Args: { box: unknown; geom: unknown };
				Returns: unknown;
			};
			st_closestpoint: {
				Args: { geom1: unknown; geom2: unknown };
				Returns: unknown;
			};
			st_collect: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown };
			st_concavehull: {
				Args: {
					param_allow_holes?: boolean;
					param_geom: unknown;
					param_pctconvex: number;
				};
				Returns: unknown;
			};
			st_contains: {
				Args: { geom1: unknown; geom2: unknown };
				Returns: boolean;
			};
			st_containsproperly: {
				Args: { geom1: unknown; geom2: unknown };
				Returns: boolean;
			};
			st_coorddim: { Args: { geometry: unknown }; Returns: number };
			st_coveredby:
				| { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
				| { Args: { geom1: unknown; geom2: unknown }; Returns: boolean };
			st_covers:
				| { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
				| { Args: { geom1: unknown; geom2: unknown }; Returns: boolean };
			st_crosses: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean };
			st_curvetoline: {
				Args: { flags?: number; geom: unknown; tol?: number; toltype?: number };
				Returns: unknown;
			};
			st_delaunaytriangles: {
				Args: { flags?: number; g1: unknown; tolerance?: number };
				Returns: unknown;
			};
			st_difference: {
				Args: { geom1: unknown; geom2: unknown; gridsize?: number };
				Returns: unknown;
			};
			st_disjoint: {
				Args: { geom1: unknown; geom2: unknown };
				Returns: boolean;
			};
			st_distance:
				| {
						Args: { geog1: unknown; geog2: unknown; use_spheroid?: boolean };
						Returns: number;
				  }
				| { Args: { geom1: unknown; geom2: unknown }; Returns: number };
			st_distancesphere:
				| { Args: { geom1: unknown; geom2: unknown }; Returns: number }
				| {
						Args: { geom1: unknown; geom2: unknown; radius: number };
						Returns: number;
				  };
			st_distancespheroid: {
				Args: { geom1: unknown; geom2: unknown };
				Returns: number;
			};
			st_dwithin: {
				Args: {
					geog1: unknown;
					geog2: unknown;
					tolerance: number;
					use_spheroid?: boolean;
				};
				Returns: boolean;
			};
			st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean };
			st_expand:
				| { Args: { box: unknown; dx: number; dy: number }; Returns: unknown }
				| {
						Args: { box: unknown; dx: number; dy: number; dz?: number };
						Returns: unknown;
				  }
				| {
						Args: {
							dm?: number;
							dx: number;
							dy: number;
							dz?: number;
							geom: unknown;
						};
						Returns: unknown;
				  };
			st_force3d: { Args: { geom: unknown; zvalue?: number }; Returns: unknown };
			st_force3dm: {
				Args: { geom: unknown; mvalue?: number };
				Returns: unknown;
			};
			st_force3dz: {
				Args: { geom: unknown; zvalue?: number };
				Returns: unknown;
			};
			st_force4d: {
				Args: { geom: unknown; mvalue?: number; zvalue?: number };
				Returns: unknown;
			};
			st_generatepoints:
				| { Args: { area: unknown; npoints: number }; Returns: unknown }
				| {
						Args: { area: unknown; npoints: number; seed: number };
						Returns: unknown;
				  };
			st_geogfromtext: { Args: { '': string }; Returns: unknown };
			st_geographyfromtext: { Args: { '': string }; Returns: unknown };
			st_geohash:
				| { Args: { geog: unknown; maxchars?: number }; Returns: string }
				| { Args: { geom: unknown; maxchars?: number }; Returns: string };
			st_geomcollfromtext: { Args: { '': string }; Returns: unknown };
			st_geometricmedian: {
				Args: {
					fail_if_not_converged?: boolean;
					g: unknown;
					max_iter?: number;
					tolerance?: number;
				};
				Returns: unknown;
			};
			st_geometryfromtext: { Args: { '': string }; Returns: unknown };
			st_geomfromewkt: { Args: { '': string }; Returns: unknown };
			st_geomfromgeojson:
				| { Args: { '': Json }; Returns: unknown }
				| { Args: { '': Json }; Returns: unknown }
				| { Args: { '': string }; Returns: unknown };
			st_geomfromgml: { Args: { '': string }; Returns: unknown };
			st_geomfromkml: { Args: { '': string }; Returns: unknown };
			st_geomfrommarc21: { Args: { marc21xml: string }; Returns: unknown };
			st_geomfromtext: { Args: { '': string }; Returns: unknown };
			st_gmltosql: { Args: { '': string }; Returns: unknown };
			st_hasarc: { Args: { geometry: unknown }; Returns: boolean };
			st_hausdorffdistance: {
				Args: { geom1: unknown; geom2: unknown };
				Returns: number;
			};
			st_hexagon: {
				Args: { cell_i: number; cell_j: number; origin?: unknown; size: number };
				Returns: unknown;
			};
			st_hexagongrid: {
				Args: { bounds: unknown; size: number };
				Returns: Record<string, unknown>[];
			};
			st_interpolatepoint: {
				Args: { line: unknown; point: unknown };
				Returns: number;
			};
			st_intersection: {
				Args: { geom1: unknown; geom2: unknown; gridsize?: number };
				Returns: unknown;
			};
			st_intersects:
				| { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
				| { Args: { geom1: unknown; geom2: unknown }; Returns: boolean };
			st_isvaliddetail: {
				Args: { flags?: number; geom: unknown };
				Returns: Database['public']['CompositeTypes']['valid_detail'];
				SetofOptions: {
					from: '*';
					to: 'valid_detail';
					isOneToOne: true;
					isSetofReturn: false;
				};
			};
			st_length:
				| { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
				| { Args: { '': string }; Returns: number };
			st_letters: { Args: { font?: Json; letters: string }; Returns: unknown };
			st_linecrossingdirection: {
				Args: { line1: unknown; line2: unknown };
				Returns: number;
			};
			st_linefromencodedpolyline: {
				Args: { nprecision?: number; txtin: string };
				Returns: unknown;
			};
			st_linefromtext: { Args: { '': string }; Returns: unknown };
			st_linelocatepoint: {
				Args: { geom1: unknown; geom2: unknown };
				Returns: number;
			};
			st_linetocurve: { Args: { geometry: unknown }; Returns: unknown };
			st_locatealong: {
				Args: { geometry: unknown; leftrightoffset?: number; measure: number };
				Returns: unknown;
			};
			st_locatebetween: {
				Args: {
					frommeasure: number;
					geometry: unknown;
					leftrightoffset?: number;
					tomeasure: number;
				};
				Returns: unknown;
			};
			st_locatebetweenelevations: {
				Args: { fromelevation: number; geometry: unknown; toelevation: number };
				Returns: unknown;
			};
			st_longestline: {
				Args: { geom1: unknown; geom2: unknown };
				Returns: unknown;
			};
			st_makebox2d: {
				Args: { geom1: unknown; geom2: unknown };
				Returns: unknown;
			};
			st_makeline: {
				Args: { geom1: unknown; geom2: unknown };
				Returns: unknown;
			};
			st_makevalid: {
				Args: { geom: unknown; params: string };
				Returns: unknown;
			};
			st_maxdistance: {
				Args: { geom1: unknown; geom2: unknown };
				Returns: number;
			};
			st_minimumboundingcircle: {
				Args: { inputgeom: unknown; segs_per_quarter?: number };
				Returns: unknown;
			};
			st_mlinefromtext: { Args: { '': string }; Returns: unknown };
			st_mpointfromtext: { Args: { '': string }; Returns: unknown };
			st_mpolyfromtext: { Args: { '': string }; Returns: unknown };
			st_multilinestringfromtext: { Args: { '': string }; Returns: unknown };
			st_multipointfromtext: { Args: { '': string }; Returns: unknown };
			st_multipolygonfromtext: { Args: { '': string }; Returns: unknown };
			st_node: { Args: { g: unknown }; Returns: unknown };
			st_normalize: { Args: { geom: unknown }; Returns: unknown };
			st_offsetcurve: {
				Args: { distance: number; line: unknown; params?: string };
				Returns: unknown;
			};
			st_orderingequals: {
				Args: { geom1: unknown; geom2: unknown };
				Returns: boolean;
			};
			st_overlaps: {
				Args: { geom1: unknown; geom2: unknown };
				Returns: boolean;
			};
			st_perimeter: {
				Args: { geog: unknown; use_spheroid?: boolean };
				Returns: number;
			};
			st_pointfromtext: { Args: { '': string }; Returns: unknown };
			st_pointm: {
				Args: {
					mcoordinate: number;
					srid?: number;
					xcoordinate: number;
					ycoordinate: number;
				};
				Returns: unknown;
			};
			st_pointz: {
				Args: {
					srid?: number;
					xcoordinate: number;
					ycoordinate: number;
					zcoordinate: number;
				};
				Returns: unknown;
			};
			st_pointzm: {
				Args: {
					mcoordinate: number;
					srid?: number;
					xcoordinate: number;
					ycoordinate: number;
					zcoordinate: number;
				};
				Returns: unknown;
			};
			st_polyfromtext: { Args: { '': string }; Returns: unknown };
			st_polygonfromtext: { Args: { '': string }; Returns: unknown };
			st_project: {
				Args: { azimuth: number; distance: number; geog: unknown };
				Returns: unknown;
			};
			st_quantizecoordinates: {
				Args: {
					g: unknown;
					prec_m?: number;
					prec_x: number;
					prec_y?: number;
					prec_z?: number;
				};
				Returns: unknown;
			};
			st_reduceprecision: {
				Args: { geom: unknown; gridsize: number };
				Returns: unknown;
			};
			st_relate: { Args: { geom1: unknown; geom2: unknown }; Returns: string };
			st_removerepeatedpoints: {
				Args: { geom: unknown; tolerance?: number };
				Returns: unknown;
			};
			st_segmentize: {
				Args: { geog: unknown; max_segment_length: number };
				Returns: unknown;
			};
			st_setsrid:
				| { Args: { geog: unknown; srid: number }; Returns: unknown }
				| { Args: { geom: unknown; srid: number }; Returns: unknown };
			st_sharedpaths: {
				Args: { geom1: unknown; geom2: unknown };
				Returns: unknown;
			};
			st_shortestline: {
				Args: { geom1: unknown; geom2: unknown };
				Returns: unknown;
			};
			st_simplifypolygonhull: {
				Args: { geom: unknown; is_outer?: boolean; vertex_fraction: number };
				Returns: unknown;
			};
			st_split: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown };
			st_square: {
				Args: { cell_i: number; cell_j: number; origin?: unknown; size: number };
				Returns: unknown;
			};
			st_squaregrid: {
				Args: { bounds: unknown; size: number };
				Returns: Record<string, unknown>[];
			};
			st_srid:
				| { Args: { geog: unknown }; Returns: number }
				| { Args: { geom: unknown }; Returns: number };
			st_subdivide: {
				Args: { geom: unknown; gridsize?: number; maxvertices?: number };
				Returns: unknown[];
			};
			st_swapordinates: {
				Args: { geom: unknown; ords: unknown };
				Returns: unknown;
			};
			st_symdifference: {
				Args: { geom1: unknown; geom2: unknown; gridsize?: number };
				Returns: unknown;
			};
			st_symmetricdifference: {
				Args: { geom1: unknown; geom2: unknown };
				Returns: unknown;
			};
			st_tileenvelope: {
				Args: {
					bounds?: unknown;
					margin?: number;
					x: number;
					y: number;
					zoom: number;
				};
				Returns: unknown;
			};
			st_touches: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean };
			st_transform:
				| {
						Args: { from_proj: string; geom: unknown; to_proj: string };
						Returns: unknown;
				  }
				| {
						Args: { from_proj: string; geom: unknown; to_srid: number };
						Returns: unknown;
				  }
				| { Args: { geom: unknown; to_proj: string }; Returns: unknown };
			st_triangulatepolygon: { Args: { g1: unknown }; Returns: unknown };
			st_union:
				| { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
				| {
						Args: { geom1: unknown; geom2: unknown; gridsize: number };
						Returns: unknown;
				  };
			st_voronoilines: {
				Args: { extend_to?: unknown; g1: unknown; tolerance?: number };
				Returns: unknown;
			};
			st_voronoipolygons: {
				Args: { extend_to?: unknown; g1: unknown; tolerance?: number };
				Returns: unknown;
			};
			st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean };
			st_wkbtosql: { Args: { wkb: string }; Returns: unknown };
			st_wkttosql: { Args: { '': string }; Returns: unknown };
			st_wrapx: {
				Args: { geom: unknown; move: number; wrap: number };
				Returns: unknown;
			};
			thought_page_view: { Args: { thought_id: number }; Returns: number };
			unlockrows: { Args: { '': string }; Returns: number };
			updategeometrysrid: {
				Args: {
					catalogn_name: string;
					column_name: string;
					new_srid_in: number;
					schema_name: string;
					table_name: string;
				};
				Returns: string;
			};
			user_is_blocked: { Args: never; Returns: boolean };
		};
		Enums: {
			content: 'article' | 'photo' | 'video' | 'thought';
			role: 'admin' | 'reader' | 'banned';
		};
		CompositeTypes: {
			geometry_dump: {
				path: number[] | null;
				geom: unknown;
			};
			valid_detail: {
				valid: boolean | null;
				reason: string | null;
				location: unknown;
			};
		};
	};
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
	DefaultSchemaTableNameOrOptions extends
		| keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
		| { schema: keyof DatabaseWithoutInternals },
	TableName extends DefaultSchemaTableNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals;
	}
		? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
				DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
		: never = never
> = DefaultSchemaTableNameOrOptions extends {
	schema: keyof DatabaseWithoutInternals;
}
	? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
			DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
			Row: infer R;
		}
		? R
		: never
	: DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
		? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
				Row: infer R;
			}
			? R
			: never
		: never;

export type TablesInsert<
	DefaultSchemaTableNameOrOptions extends
		| keyof DefaultSchema['Tables']
		| { schema: keyof DatabaseWithoutInternals },
	TableName extends DefaultSchemaTableNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals;
	}
		? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
		: never = never
> = DefaultSchemaTableNameOrOptions extends {
	schema: keyof DatabaseWithoutInternals;
}
	? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
			Insert: infer I;
		}
		? I
		: never
	: DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
		? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
				Insert: infer I;
			}
			? I
			: never
		: never;

export type TablesUpdate<
	DefaultSchemaTableNameOrOptions extends
		| keyof DefaultSchema['Tables']
		| { schema: keyof DatabaseWithoutInternals },
	TableName extends DefaultSchemaTableNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals;
	}
		? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
		: never = never
> = DefaultSchemaTableNameOrOptions extends {
	schema: keyof DatabaseWithoutInternals;
}
	? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
			Update: infer U;
		}
		? U
		: never
	: DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
		? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
				Update: infer U;
			}
			? U
			: never
		: never;

export type Enums<
	DefaultSchemaEnumNameOrOptions extends
		| keyof DefaultSchema['Enums']
		| { schema: keyof DatabaseWithoutInternals },
	EnumName extends DefaultSchemaEnumNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals;
	}
		? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
		: never = never
> = DefaultSchemaEnumNameOrOptions extends {
	schema: keyof DatabaseWithoutInternals;
}
	? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
	: DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
		? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
		: never;

export type CompositeTypes<
	PublicCompositeTypeNameOrOptions extends
		| keyof DefaultSchema['CompositeTypes']
		| { schema: keyof DatabaseWithoutInternals },
	CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals;
	}
		? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
		: never = never
> = PublicCompositeTypeNameOrOptions extends {
	schema: keyof DatabaseWithoutInternals;
}
	? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
	: PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
		? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
		: never;

export const Constants = {
	public: {
		Enums: {
			content: ['article', 'photo', 'video', 'thought'],
			role: ['admin', 'reader', 'banned']
		}
	}
} as const;
