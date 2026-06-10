export type PressReleaseDraft = {
  title: string;
  slug: string;
  lead: string;
  body_html: string;
  body_markdown?: string;
  date?: string;
  location?: string;
  participants?: string[];
  seo_title?: string;
  seo_description: string;
  photo_captions: string[];
  facts_to_verify: string[];
  confidence?: number;
  provider?: string;
  model?: string;
};
