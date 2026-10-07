const fs = require('fs');
const path = require('path');

const docsDir = path.join(__dirname, 'docs');
if (!fs.existsSync(docsDir)) {
  fs.mkdirSync(docsDir, { recursive: true });
}

const files = {
  'GLOBAL_SEO_AUDIT.md': '# Global SEO Audit\n\n## Current Status\nSite is overly positioned as Qatar-only. The homepage and all service pages explicitly append "-qatar", limiting international reach.\n',
  'ENTERPRISE_SEO_STRATEGY.md': '# Enterprise SEO Strategy\n\n## Objective\nPosition Argus Shipping as a global logistics leader with regional expertise, rather than a local Qatar-only freight forwarder.\n',
  'GLOBAL_KEYWORD_MAP.md': '# Global Keyword Map\n\n| Keyword | Country | Intent | Volume | Difficulty | Business Value | Target URL | Priority |\n|---|---|---|---:|---:|---:|---|---|\n| international freight forwarding | Global | Commercial | - | - | High | / | P1 |\n| freight forwarding Qatar | Qatar | Commercial | - | - | High | /locations/qatar/ | P2 |\n',
  'COUNTRY_SEO_STRATEGY.md': '# Country SEO Strategy\n\n## Hub Architecture\n- /locations/qatar/\n- /locations/uae/\n- /locations/india/\n- /locations/china/\n- /locations/turkey/\n- /locations/bahrain/\n',
  'SERVICE_SEO_MAP.md': '# Service SEO Map\n\n- /services/air-freight/\n- /services/sea-freight/\n- /services/road-freight/\n- /services/warehousing/\n- /services/3pl-logistics/\n- /services/customs-clearance/\n- /services/project-cargo/\n- /services/door-to-door/\n',
  'TRADE_LANE_SEO_MAP.md': '# Trade Lane SEO Map\n\n- /trade-lanes/china-to-qatar/\n- /trade-lanes/india-to-qatar/\n- /trade-lanes/uae-to-qatar/\n- /trade-lanes/turkey-to-qatar/\n- /trade-lanes/bahrain-to-qatar/\n',
  'INTERNATIONAL_SEO_PLAN.md': '# International SEO Plan\n\nEstablish global entity authority while preserving localized commercial rankings via dedicated country pages.\n',
  'HREFLANG_MAP.md': '# Hreflang Map\n\nDefine x-default for the global root and appropriate en-QA, en-AE tags when localized content versions are rolled out.\n',
  'CANONICAL_MAP.md': '# Canonical Map\n\nEvery legitimate country/localized page and service page uses a self-referencing canonical.\n',
  'INTERNAL_LINKING_PLAN.md': '# Internal Linking Plan\n\n- Global → Services\n- Global → Locations\n- Country → Services\n- Country → Trade Lanes\n- Service → Trade Lane\n',
  'SEO_REDIRECT_MAP.md': '# SEO Redirect Map\n\n- /services/*-qatar/ → /services/*/\n- /shipping/*-to-qatar/ → /trade-lanes/*-to-qatar/\n',
  'CONTENT_GAP_ANALYSIS.md': '# Content Gap Analysis\n\nMissing country hubs, industry-specific hubs, and detailed resource calculators (CBM, chargeable weight).\n',
  'COMPETITOR_ANALYSIS.md': '# Competitor Analysis\n\nTo be conducted against tier-1 global forwarders (DHL, Kuehne+Nagel) and regional GCC leaders.\n',
  'BACKLINK_STRATEGY.md': '# Backlink Strategy\n\nAcquire links from logistics media, ports, chambers of commerce, and shipping directories.\n',
  'TECHNICAL_SEO_AUDIT.md': '# Technical SEO Audit\n\nClient-side rendering relies on prerendering. Need to ensure all new URLs are added to the prerender script. Schema markup needs to be decoupled from hardcoded "Qatar" values.\n',
  'SCHEMA_PLAN.md': '# Schema Plan\n\n- Homepage: Organization (Global), WebSite\n- Country Pages: LocalBusiness, PostalAddress (if verified)\n- Service Pages: Service\n',
  'SEO_90_DAY_ROADMAP.md': '# 90-Day SEO Roadmap\n\n- Phase 1: Audit and URL restructure (Months 1-2)\n- Phase 2: Country Hubs deployment (Month 3)\n',
  'SEO_12_MONTH_ROADMAP.md': '# 12-Month SEO Roadmap\n\n- Q1: Architecture overhaul\n- Q2: Trade Lanes and Industry Hubs\n- Q3: Linkable assets & calculators\n- Q4: Digital PR and entity authority building\n'
};

for (const [filename, content] of Object.entries(files)) {
  fs.writeFileSync(path.join(docsDir, filename), content);
}

console.log('Successfully created all documentation files.');
