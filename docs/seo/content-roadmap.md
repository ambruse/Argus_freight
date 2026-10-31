# Content and localization roadmap

Audit date: 2026-10-31. Priorities follow finding IDs in [audit.md](audit.md). These are review gates, not commitments to new pages or unsupported services.

## Phase 1 — release the verified foundation

Engineering: apply A02–A06 and A09's chairman-link fix; run build, source and browser checks; deploy through the existing release process only after review. No current URL changes. Verify production headers in both Apache and Express hosting paths. Business owner: resolve A01 (simulated Contact/modal success) by selecting the enquiry destination, delivery-failure behavior, ownership and response process. Implement that workflow separately with real delivery tests; the working live-rate enquiry path is preserved.

Analytics owner: connect explicit consent to the preserved GA4 ID, disable automatic URL/history/form/outbound collection in its data stream, then validate sanitized events in DebugView. Account access and lead qualification rules are prerequisites, not inferred approvals.

## Phase 2 — factual and usefulness review

| Content | Finding | Required evidence / decision | Acceptance criterion |
| --- | --- | --- | --- |
| Homepage, service/market copy | A08 | Accreditation status, facilities versus partner networks, service scope, promotional statistics | Every credential, physical location and capability supported by an owner-approved source; no changes merely for keyword insertion |
| Three case studies | A08 | Shipment records, customer consent, measurements supporting exact results | Claims traced to evidence or approved rewritten case studies; no invented 22%/40% savings or vaccine/45-ton shipment story |
| GCC insight report | A08 | Actual report, dataset, sample dates, methodology, researcher | Verify the 10,000-shipment and survey claims or approve their correction |
| Industry pages | A08/A09 | Sector-specific service evidence, partner responsibility, regulated/cold-chain scope | Distinct buyer tasks and documented capability; then add useful contextual links |
| CBM/chargeable-weight pages | A09 | Intent review: current copy is a guide, not a working calculator | Link to the existing live calculator for calculation tasks or approve real standalone functionality; do not promise tools that are absent |
| Incoterms/container guides | A09 | Current ICC/carrier references and freight-editor review | Explain limitations, specific equipment/quotation dependencies; avoid universal capacity or divisor rules |
| Turkey local-business schema | A05 | No local address/phone provided | Keep network positioning; add physical business only with verified visible contact facts |

The 14 existing pages lacking incoming crawlable anchors after this task are `/industries/construction-logistics/`, `/industries/oil-gas-logistics/`, `/industries/automotive-logistics/`, `/industries/healthcare-logistics/`, `/industries/retail-logistics/`, `/industries/industrial-logistics/`, `/resources/cbm-calculator/`, `/resources/chargeable-weight-calculator/`, `/resources/incoterms-guide/`, `/resources/container-size-guide/`, `/case-studies/heavy-lift-qatar/`, `/case-studies/pharma-cold-chain-uae/`, `/case-studies/fmcg-distribution-india/`, and `/insights/gcc-freight-report/`. This task does not remove, noindex, redirect or promote them before the factual review. Their status is explicit in regression output.

## Every existing trade lane

All six have origin/destination copy, freight modes, collection/consolidation discussion, document/clearance/delivery planning, service links and a contact CTA. Existing scope is preserved; source copy establishes what the website says, not independent proof of shipment delivery capability. No rates, transit guarantees or customs rules were added.

| Route | Existing useful content | Safe improvement implemented | Remaining owner/editor review |
| --- | --- | --- | --- |
| `/trade-lanes/china-to-qatar/` | Guangzhou/Yiwu; air/sea; FCL/LCL; multi-supplier collection; Qatar clearance and delivery | Included in central directory and relevant country network links; retained Doha contact | Verify actual receiving instructions and cargo acceptance; retain shipment-specific timing |
| `/trade-lanes/china-to-uae/` | Guangzhou/Yiwu/Dubai; air/sea; FCL/LCL; consolidation; customs and final delivery | Corrected collection membership so directory lists it; enquiry now uses site-listed Dubai phone/team | Validate promises of any-emirate delivery and hub storage for each service scope |
| `/trade-lanes/india-to-qatar/` | Supplier collection; air/sea; FCL/LCL; package documentation; Qatar delivery | Retained directory, relevant services and destination contact | Confirm Mumbai/Bangalore consolidation vs Tuticorin/Nilambur contact roles |
| `/trade-lanes/uae-to-qatar/` | Dubai collection; FTL/LTL; border preparation; Qatar delivery | Fixed related-service selection to include road freight rather than air/sea defaults | Operations to maintain route/receiving exclusions; no guaranteed schedule |
| `/trade-lanes/turkey-to-qatar/` | Istanbul consolidation; air/sea; supplier order reconciliation; Qatar receiving | Retained directory and Doha destination contact; no invented Turkish office | Editor may clarify FCL/LCL applicability only once operations confirms; no assumption of FTL/LTL on this lane |
| `/trade-lanes/bahrain-to-qatar/` | Busaiteen contact; regional road; full/shared-load discussion; documents; delivery | Fixed road-freight related link | Confirm exact full/shared-load service and handovers; do not equate office with cargo terminal |

## Phase 3 — approved complete localization

Commercial owner chooses launch audience using GSC/lead evidence, not assumed volumes. Arabic Qatar/UAE/Bahrain, Simplified Chinese sourcing pages and Turkish sourcing pages are candidates. Hire professional freight translators and native reviewers; approve body, metadata, navigation, contact forms/errors, terminology, RTL/direction, local contacts and parity. See the per-page registry and matrix. Do not launch all combinations automatically. Existing English pages remain unchanged; additive locale routes require no migration.

Before publishing each set, verify direct 200, indexable HTML, same-language self-canonical, identical reciprocal head links, exact self links, safe fallback if justified, real crawlable switcher, sitemap inclusion and working rate/tracking/quote tasks. Evaluate locale-specific demand and qualified enquiries after launch; no ranking guarantees.

## Phase 4 — measured performance and reporting

Obtain mobile and desktop field CWV; PageSpeed API currently returned 429 for both attempts. Investigate the 238-frame decorative background preload and large JS bundle using controlled traces before altering animation. The safe image change in this task preserves pixels. Use GSC by page/country/device/query, and CRM-qualified lead aggregates by target country/service/landing page. No new dashboards or backend lead logic are introduced without a defined qualification process.
