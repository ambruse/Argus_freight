import fs from 'node:fs';
import {metadata} from '../src/seo/metadata.mjs';
// Analytics needs only public route names, never page copy or customer data.
fs.writeFileSync(new URL('../shared/public-page-paths.json',import.meta.url),JSON.stringify(Object.keys(metadata).sort(),null,2)+'\n');
