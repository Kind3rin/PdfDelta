import { build } from 'esbuild';
await build({ stdin: { contents: "export { createClient } from '@supabase/supabase-js';", resolveDir: process.cwd() }, bundle: true, format: 'esm', platform: 'browser', minify: true, outfile: 'vendor/account-client.mjs', legalComments: 'eof' });
