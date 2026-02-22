export interface Video {
  id: number;
  title: string;
  category: string;
  youtube_id: string;
  instructor: string;
  created_at: string;
}

export type Category = 'MS Word' | 'MS Excel' | 'Freelancing' | 'Electrical';
