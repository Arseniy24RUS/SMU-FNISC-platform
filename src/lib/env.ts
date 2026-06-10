import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().default('file:./dev.db'),
  NEXT_PUBLIC_SITE_URL: z.string().default('http://localhost:3000'),
  APP_ENV: z.string().default('development'),
  CRON_SECRET: z.string().optional(),
  ADMIN_LOCAL_PASSWORD: z.string().optional(),
  ADMIN_EMAILS: z.string().optional(),
  JWT_SECRET: z.string().optional(),
  UPLOAD_DIR: z.string().default('./uploads'),
  LLM_PROVIDER: z.enum(['openai', 'gemini', 'local', 'openrouter', 'groq']).default('local'),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default('gpt-5.4'),
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().default('gemini-3.1-flash-lite'),
  OPENROUTER_API_KEY: z.string().optional(),
  OPENROUTER_MODEL: z.string().default('google/gemini-2.0-flash-exp:free'),
  GROQ_API_KEY: z.string().optional(),
  GROQ_MODEL: z.string().default('llama-3.3-70b-versatile'),
  SCOPUS_API_KEY: z.string().optional(),
  SCOPUS_INST_TOKEN: z.string().optional(),
  SCOPUS_MAX_RESULTS_PER_AUTHOR: z.coerce.number().default(200),
  WOS_API_KEY: z.string().optional(),
  CLARIVATE_WOS_API_KEY: z.string().optional(),
  ELIBRARY_COOKIE: z.string().optional(),
  ELIBRARY_PROXY_URL: z.string().optional(),
  ELIBRARY_USER_AGENT: z.string().default('Mozilla/5.0 smu-fnisc-platform/0.1'),
  OPENALEX_MAILTO: z.string().optional(),
  MEDIA_AUTO_PUBLISH_THRESHOLD: z.coerce.number().default(0.75),
  MEDIA_MAX_RESULTS_PER_MEMBER: z.coerce.number().default(30),
  MEDIA_QUERY_LANGS: z.string().default('ru,en'),
  MEDIA_REQUEST_TIMEOUT_MS: z.coerce.number().default(45000),
  MEDIA_RETRY_COUNT: z.coerce.number().default(2),
  MEDIA_POLITE_DELAY_MS: z.coerce.number().default(5500),
  MEDIA_ENABLE_GOOGLE_NEWS: z.string().default('false'),
  MEDIA_ENABLE_BING_SEARCH: z.string().default('true'),
  MEDIA_BING_MAX_QUERIES_PER_MEMBER: z.coerce.number().default(6),
  MEDIA_BING_MAX_ITEMS_PER_QUERY: z.coerce.number().default(10),
  GDELT_TIMESPAN: z.string().default('3m'),
  GDELT_MAX_RECORDS_PER_QUERY: z.coerce.number().default(75),
  GDELT_REQUEST_TIMEOUT_MS: z.coerce.number().default(20000),
  GDELT_REQUEST_DELAY_MS: z.coerce.number().default(6500)
});

export const env = envSchema.parse(process.env);

export function adminEmails(): string[] {
  return (env.ADMIN_EMAILS || '')
    .split(',')
    .map((x) => x.trim().toLowerCase())
    .filter(Boolean);
}
