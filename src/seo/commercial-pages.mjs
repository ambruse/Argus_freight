export const SITE = 'https://www.argusshipping.co';
const service = (slug, label, h1, keyword, intro, sections, keywords, related, evidence) => ({
  path: `/services/${slug}/`, group: 'services', label, h1, keyword, intro, sections,
  title: `${h1} | Argus Shipping`,
  description: `${intro.split('. ')[0]}. Discuss your cargo and request a tailored quote from Argus Shipping.`,
  keywords: keywords.split('; '), related, evidence, priority: ['project-cargo', 'vehicle-logistics'].includes(slug) ? 'P3' : 'P1',
});
const s = (heading, text) => ({ heading, text });
export const servicePages = [
  service('air-freight', 'Air Freight Services', 'International Air Freight Services', 'international air freight',
    'Argus Shipping coordinates international air freight for businesses importing to and exporting from Qatar. Share your cargo dimensions, weight and required delivery date so the team can assess a suitable air cargo option.', [
      s('International air cargo: import and export', 'Air freight suits shipments where the required arrival date matters more than the lowest transport cost. Argus coordinates origin handling, air transport and destination delivery requirements. Specify whether your quote should cover airport-to-airport movement or include collection and final delivery.'),
      s('Urgent and time-sensitive shipments', 'For an urgent consignment, send the cargo-ready date, origin address and delivery deadline before booking. Flight capacity, cargo acceptance and handling cut-offs affect the available schedule. A requested deadline is assessed shipment by shipment; it is not a guaranteed transit time.'),
      s('Cargo preparation and handling', 'Provide a packing list, cargo description, gross weight and dimensions for each package. Tell the team about batteries, liquids, fragile goods or other special handling needs before collection so acceptance and packaging can be checked. Do not dispatch restricted cargo before the proposed handling arrangement is confirmed.'),
      s('Airport handling, customs and delivery', 'Agree the collection point, export documentation responsibilities and Qatar delivery address when requesting a quote. Customs support and onward transport can be coordinated as part of the shipment scope. The team can explain which legs are included and which charges remain outside the freight quotation.'),
    ], 'air freight services Qatar; air cargo Qatar; air cargo services Qatar; air freight company Qatar; air freight forwarding Qatar; international air freight Qatar; air freight Doha; air cargo Doha; air freight forwarder Qatar; airport cargo Qatar; air import Qatar; air export Qatar; door-to-door air freight Qatar; urgent air freight Qatar; international air freight company Qatar; commercial air cargo Qatar; urgent cargo shipping Qatar',
    ['door-to-door-cargo', 'customs-clearance', 'sea-freight'], 'Services.jsx: air freight operations and airport-to-door support'),
  service('sea-freight', 'Sea Freight Services', 'International Sea Freight Services', 'international sea freight',
    'Argus Shipping arranges FCL and LCL sea freight for Qatar importers and exporters. The service connects international cargo movements with origin coordination, customs support and delivery planning.', [
      s('FCL container shipping', 'Full Container Load is an option when a shipment requires a container dedicated to one shipper. Share the cargo volume, weight, package sizes and loading arrangements so container suitability can be reviewed. Container selection depends on the goods and their loading requirements, not volume alone.'),
      s('LCL consolidation services', 'Less than Container Load allows smaller consignments to share container capacity. Cargo must be received and handled through consolidation facilities at origin and destination. Compare the complete collection-to-delivery quotation, including handling, when choosing between LCL and FCL.'),
      s('Import and export through Hamad Port', 'For Qatar sea freight, the team coordinates the proposed origin gateway, ocean movement and destination handling. Confirm the actual vessel routing, any transshipment and cargo-ready date before booking. Delivery planning should allow for release formalities and the receiving site’s access arrangements.'),
      s('From supplier collection to final delivery', 'Send supplier details, a packing list and commercial shipment information with your enquiry. Argus can coordinate collection and door-to-door requirements alongside ocean freight. Warehousing can be discussed when cargo arrives before the receiving site is ready.'),
    ], 'sea freight services Qatar; ocean freight Qatar; ocean freight services Qatar; sea cargo Qatar; sea freight company Qatar; sea freight forwarder Qatar; container shipping Qatar; FCL shipping Qatar; LCL shipping Qatar; FCL freight Qatar; LCL freight Qatar; Hamad Port freight; sea freight Doha; import container Qatar; export container Qatar; FCL container shipping Qatar; ocean freight company Qatar; sea cargo import Qatar',
    ['customs-clearance', 'warehousing', 'door-to-door-cargo'], 'Services.jsx: sea freight, FCL/LCL and Hamad Port trade-lane table'),
  service('road-freight', 'Road Freight Services', 'Road Freight & Cross-Border Transportation', 'road freight services',
    'Argus Shipping coordinates road freight in Qatar and across the GCC. Businesses can discuss full-truckload and shared-load movements for factory, warehouse and consignee deliveries.', [
      s('Local collection and commercial delivery', 'Collection and delivery planning starts with the cargo size and the access available at each site. Provide loading equipment details, appointment windows and any unloading restrictions. These details help the team match the transport arrangement to the consignment.'),
      s('FTL and LTL freight', 'Full Truck Load provides a vehicle allocation for the shipment, while Less than Truck Load combines consignments within a shared movement. The choice depends on cargo volume, handling compatibility and delivery requirements. Ask for a scope that includes the intended loading and unloading responsibilities.'),
      s('GCC cross-border transportation', 'Regional freight requires coordination of origin collection, border formalities and final delivery. Argus’s network includes UAE-to-Qatar movements and GCC transport. The operating route and timing are confirmed against current cargo and border requirements rather than a fixed published promise.'),
      s('Plan the handover before dispatch', 'Share the collection location, consignee details, cargo description and supporting commercial documents. Identify equipment or fragile goods requiring particular securing arrangements. Customs support should be coordinated before the vehicle departs to reduce avoidable document queries.'),
    ], 'land freight Qatar; land transportation Qatar; road transportation Qatar; GCC road freight; cross-border freight Qatar; trucking company Qatar; cargo transport Qatar; GCC cargo transportation; FTL Qatar; LTL Qatar; Qatar UAE road freight; Qatar Saudi freight',
    ['customs-clearance', 'door-to-door-cargo', 'warehousing'], 'Services.jsx: GCC FTL/LTL and UAE/Saudi/Oman table'),
  service('warehousing', 'Warehousing & Storage', 'Warehousing & Distribution Services', 'warehousing services',
    'Argus Shipping provides warehousing and inventory support for commercial cargo. Discuss the storage period, stock profile and dispatch requirements to plan storage alongside freight and distribution.', [
      s('Commercial storage requirements', 'Storage planning depends on the goods, packaging, pallet or carton quantities and expected dwell time. Share how stock will arrive and whether it will be released as full pallets, cartons or individual orders. Handling needs should be agreed before goods are delivered to the warehouse.'),
      s('Inventory receipt and release', 'Accurate receiving information connects physical stock to the shipper’s records. Provide product references and quantities, identify any batch or serial tracking needs, and agree a release instruction process. This helps distinguish stock held for later delivery from goods ready for immediate dispatch.'),
      s('Warehousing connected to transport', 'Storage can bridge the gap between an international arrival and the consignee’s receiving schedule. Argus can discuss onward transport and distribution as part of the arrangement. For ongoing order handling and outsourced distribution, explore the separate 3PL service.'),
      s('Confirm storage conditions', 'Tell the team about temperature, security, segregation or other product-specific requirements at the enquiry stage. Facility suitability, capacity and any required controls must be confirmed for the actual cargo before booking.'),
    ], 'warehousing Qatar; warehouse Qatar; warehouse services Qatar; logistics warehouse Qatar; storage company Qatar; commercial storage Qatar; distribution warehouse Qatar',
    ['3pl-logistics', 'road-freight', 'sea-freight'], 'Services.jsx: warehousing and inventory; specialist temperature/certification claims not independently verified'),
  service('customs-clearance', 'Customs Clearance Services', 'Customs Clearance & Brokerage Support', 'customs clearance',
    'Argus Shipping coordinates customs clearance support for cargo moving to and from Qatar. Discuss documentation and shipment responsibilities before freight is dispatched.', [
      s('Import and export documentation support', 'Start with a clear goods description, shipper and consignee details, commercial invoice information and packing details. The team reviews the shipment scope and identifies documentation to prepare. The final requirements depend on the commodity, origin, destination and applicable procedures.'),
      s('Sea, air and road cargo coordination', 'Customs preparation should align with the freight booking and the arrival gateway. Argus coordinates port, airport and cross-border support. Linking those tasks helps the parties respond to document queries and coordinate release with onward transport.'),
      s('Responsibilities and charges', 'Confirm who will act as the importer or exporter and who is responsible for duties, taxes and any inspection or handling charges. A freight quotation should make inclusions and exclusions clear. Customs release is subject to the relevant authorities; it cannot be guaranteed in advance.'),
      s('Cargo needing additional checks', 'Identify special goods and supporting product information before shipment. The team can discuss the clearance coordination required for your cargo. Confirm the applicable requirements with the operations team before dispatch.'),
    ], 'customs clearance services Qatar; customs clearance company Qatar; customs clearance Doha; import customs clearance Qatar; export customs clearance Qatar; Hamad Port customs clearance; airport customs clearance Qatar',
    ['air-freight', 'sea-freight', 'road-freight'], 'Services.jsx: border support and door-to-door documentation; no licence evidence'),
  service('3pl-logistics', '3PL Logistics Services', '3PL & Contract Logistics Services', '3PL logistics',
    'Argus Shipping offers third-party logistics connecting inventory storage, order fulfilment and regional distribution. Businesses can discuss an outsourced logistics scope suited to their stock and delivery requirements.', [
      s('From storage to order fulfilment', 'A 3PL arrangement combines several operating tasks rather than a single storage booking. Define which activities Argus will handle: receipt of stock, inventory records, release against orders and distribution. Clear handover points make responsibilities easier to manage.'),
      s('Inventory and distribution planning', 'Provide your SKU count, order profile, average shipment size and expected peaks. Agree how stock instructions, order information and delivery updates will be exchanged. The required process will differ between bulk replenishment to businesses and small individual orders.'),
      s('Regional logistics outsourcing', 'Argus’s 3PL service includes storage, fulfilment and distribution to commercial networks. Discuss the destination coverage, frequency and delivery conditions needed by your customers. Integration requirements, reporting and service levels should be defined in the proposed operating scope.'),
      s('Prepare a useful 3PL enquiry', 'Include monthly inbound volume, stockholding expectations, order lines and outbound destinations. Identify special handling and return requirements separately. This gives the team a basis for assessing the operating arrangement instead of quoting a generic warehouse space rate.'),
    ], '3PL Qatar; third party logistics Qatar; 3PL company Qatar; contract logistics Qatar; fulfillment services Qatar; logistics outsourcing Qatar; warehouse distribution Qatar; inventory management Qatar; fulfillment Qatar',
    ['warehousing', 'road-freight', 'door-to-door-cargo'], 'Services.jsx: explicit Third-Party Logistics service'),
  service('door-to-door-cargo', 'Door-to-Door Cargo', 'International Door-to-Door Freight Services', 'door-to-door freight',
    'Argus Shipping coordinates door-to-door cargo for businesses shipping to Qatar. Supplier collection, consolidation, freight and destination delivery can be arranged within an agreed shipment scope.', [
      s('A connected collection-to-delivery journey', 'The journey starts with supplier collection and origin handling, continues through the freight leg and clearance, and ends with delivery to the consignee. Agree each stage when requesting a quotation. Door-to-door describes the physical journey; payment of duties and other charges must still be specified.'),
      s('Consolidation for smaller consignments', 'The Argus service includes carton and cubic-metre consolidation arrangements for smaller volumes. Multiple supplier collections can be discussed to combine compatible goods. Provide the ready dates and package information for each supplier so the team can plan the handover.'),
      s('Choose the freight mode', 'Air and sea freight serve different delivery and volume requirements. For regional cargo, discuss the available road arrangement. Compare the complete scope, including origin collection and destination delivery, rather than only the main freight charge.'),
      s('Prepare for final delivery', 'Share the consignee contact, full address, access restrictions and unloading arrangements. Goods requiring storage before delivery should be identified early. Delivery scheduling depends on freight arrival, release and the receiving location’s availability.'),
    ], 'door to door cargo Qatar; door to door shipping Qatar; door to door freight Qatar; international door to door cargo Qatar; cargo pickup and delivery Qatar; freight delivery Qatar',
    ['air-freight', 'sea-freight', 'customs-clearance'], 'Services.jsx: door-to-door consolidation and supplier collection'),
  service('project-cargo', 'Project Cargo & Heavy Lift', 'Project Cargo & Heavy-Lift Logistics', 'project cargo',
    'Argus Shipping supports heavy-lift transport and project cargo coordination. Discuss the cargo dimensions, handling requirements and delivery site before selecting a transport arrangement.', [
      s('Start with the cargo and site survey information', 'Project enquiries need more than a total shipment weight. Supply piece-by-piece dimensions, weights, drawings and photographs where available. Identify lifting points, centre-of-gravity information and the loading and delivery sites so the team can assess the movement.'),
      s('Oversized cargo and transport options', 'Cargo outside standard transport dimensions requires an individual handling assessment. Road and sea options depend on the piece size, securing requirements and available equipment. Any proposed special container, lifting or route arrangement must be confirmed against the shipment specifications.'),
      s('Coordinate delivery with the project programme', 'A project delivery may depend on site readiness, unloading equipment and an installation sequence. Share those dependencies when planning the movement. Agree the parties responsible for loading, lifting, securing, transport and receipt before dispatch.'),
      s('Request an assessed project quotation', 'Send the origin, destination, cargo-ready date and desired delivery window with the technical cargo information. Argus can review the request with you and define the proposed scope. Equipment and handling arrangements are assessed against the cargo specifications.'),
    ], 'project logistics Qatar; heavy cargo Qatar; heavy lift logistics Qatar; oversized cargo Qatar; OOG cargo Qatar; industrial logistics Qatar; construction project cargo Qatar',
    ['sea-freight', 'road-freight', 'customs-clearance'], 'About.jsx: heavy-lift transport; detailed project credentials still required'),
  service('vehicle-logistics', 'Vehicle Logistics & Car Shipping', 'Vehicle Logistics & Car Shipping Services', 'vehicle logistics',
    'Argus Shipping offers vehicle import and export logistics for dealers and private owners. Discuss the vehicle details, origin and destination to assess a shipping and handling arrangement.', [
      s('Plan a vehicle movement', 'Provide the make, model, dimensions and operating condition of each vehicle. Explain whether the enquiry is for one vehicle or a dealer shipment and identify the collection and delivery locations. Those details affect handling, transport equipment and the proposed scope.'),
      s('Import and export coordination', 'Vehicle movements need shipment documentation and a clear allocation of importer and exporter responsibilities. Requirements depend on the vehicle and destination. Confirm eligibility and required paperwork with the team before arranging collection or committing to a shipment date.'),
      s('Handling, storage and delivery', 'Argus’s vehicle logistics service includes storage and local vehicle movements. Agree the handover condition record, any storage period and final delivery arrangements. Do not leave personal items in the vehicle without first confirming how they will be treated in the shipment.'),
      s('Request a car shipping quotation', 'Send the vehicle details, collection address, destination and preferred schedule. Identify non-running vehicles or modifications that affect handling. The team can explain the available arrangement and the charges included in the quote.'),
    ], 'car shipping Qatar; vehicle shipping Qatar; automobile logistics Qatar; international vehicle shipping Qatar',
    ['customs-clearance', 'sea-freight', 'road-freight'], 'Services.jsx: explicit Finished Vehicle Logistics service'),
];

const lane = (slug, label, h1, keyword, intro, sections, keywords, evidence) => ({
  path: `/trade-lanes/${slug}/`, group: 'trade-lanes', label, h1, keyword, intro, sections,
  title: `${h1} | Argus Shipping`, description: `${intro.split('. ')[0]}. Discuss collection, freight and delivery with Argus Shipping.`,
  keywords: keywords.split('; '), related: ['uae', 'bahrain'].includes(slug) ? ['road-freight', 'door-to-door-cargo', 'customs-clearance', 'warehousing'] : ['air-freight', 'sea-freight', 'door-to-door-cargo', 'customs-clearance', 'warehousing'], evidence, priority: 'P2',
});
export const tradePages = [
  lane('china-to-qatar', 'China to Qatar', 'Shipping from China to Qatar', 'shipping from China to Qatar',
    'Argus Shipping coordinates China-to-Qatar freight through its Guangzhou and Yiwu network. Businesses sourcing from several suppliers can discuss collection, consolidation and delivery requirements alongside air or sea freight.', [
      s('Guangzhou and Yiwu supplier coordination', 'Send each supplier’s address, contact details and cargo-ready date. The Guangzhou and Yiwu locations provide a starting point for discussing origin coordination. Confirm the receiving location and appointment before asking a supplier to deliver cargo.'),
      s('Air freight versus sea freight', 'Air freight can be assessed for urgent or time-sensitive consignments. Sea freight provides FCL and LCL options for containerised cargo. The best fit depends on the delivery requirement, chargeable size and complete handling scope; a timetable is confirmed for the actual booking.'),
      s('FCL, LCL and multi-supplier consolidation', 'For a full container, review the complete loading plan. For smaller consignments, provide package dimensions and supplier-ready dates to discuss consolidation. Multiple suppliers should use consistent product and package references so cargo can be reconciled before onward shipment.'),
      s('Qatar clearance and final delivery', 'Agree the importer details, document preparation and delivery address before dispatch. Discuss warehousing if goods are arriving ahead of the receiving schedule. Ask the quote to separate origin collection, freight, destination handling and any excluded charges.'),
    ], 'China to Qatar shipping; freight from China to Qatar; China to Qatar freight; China to Qatar cargo; cargo from China to Qatar; sea freight China to Qatar; air freight China to Qatar; China to Doha shipping; China to Qatar door-to-door cargo; Guangzhou to Qatar cargo; Guangzhou to Qatar freight; Yiwu to Qatar shipping; China to Qatar LCL shipping; China to Qatar FCL shipping; China to Hamad Port shipping', 'App.jsx: Guangzhou and Yiwu addresses; Services.jsx consolidation network'),
  lane('india-to-qatar', 'India to Qatar', 'Shipping from India to Qatar', 'shipping from India to Qatar',
    'Argus Shipping supports India-to-Qatar cargo through its India network and consolidation service. Businesses can discuss supplier collection, air or sea freight and delivery to the Qatar consignee.', [
      s('Coordinate collection across sourcing locations', 'The India network includes Mumbai and Bangalore consolidation, with contacts in Tuticorin and Nilambur. Provide the actual supplier location so collection and receiving arrangements can be confirmed; a listed office is not automatically a cargo receiving terminal.'),
      s('Air cargo and sea cargo options', 'For air cargo, provide the required arrival date and package weights and dimensions. For sea cargo, discuss whether the volume suits LCL consolidation or an FCL movement. The selected gateway and routing depend on origin location and the available booking.'),
      s('Supplier documentation and packing', 'Ask suppliers for consistent descriptions and package-level quantities before handover. When combining orders, identify which invoice relates to each package. Flag fragile goods, equipment or other handling needs before collection so the proposed packing and transport arrangement can be reviewed.'),
      s('Door-to-door delivery in Qatar', 'Request a scope covering the stages you need, from supplier pickup through destination delivery. Confirm the importer, consignee address and unloading arrangements. Actual scheduling depends on collection readiness, the freight booking and release formalities.'),
    ], 'India to Qatar cargo; India to Qatar freight; freight from India to Qatar; air cargo India to Qatar; sea cargo India to Qatar; India to Qatar door-to-door cargo', 'App.jsx: India contacts; Services.jsx: Mumbai and Bangalore consolidation'),
  lane('uae-to-qatar', 'UAE to Qatar', 'Freight Shipping from UAE to Qatar', 'UAE to Qatar freight',
    'Argus Shipping coordinates UAE-to-Qatar freight through its Dubai network and GCC road service. Businesses can discuss supplier collections, FTL or LTL transport and Qatar delivery.', [
      s('Dubai collection and consolidation', 'Argus lists a Dubai location in Al Qusais Industrial Area 4. Share the collection address and whether goods are at a supplier, warehouse or another facility. The team will confirm the appropriate handover point and any collection formalities before dispatch.'),
      s('Road freight: full and shared loads', 'FTL and LTL options suit different cargo volumes and delivery requirements. Share piece sizes and weights, identify incompatible or fragile cargo, and confirm loading equipment. The quote should state whether collection, cross-border coordination and delivery are included.'),
      s('Cross-border shipment preparation', 'UAE-to-Qatar road freight involves transit and border coordination along the proposed route. Clarify the shipment’s commercial status and documentation responsibilities before loading. Do not assume a warehouse-to-warehouse rate includes every customs, inspection or handling charge.'),
      s('Delivery to Doha and other Qatar destinations', 'Give the full destination address, receiving contact and appointment restrictions. If the delivery site cannot accept the full load at once, discuss a storage or staged distribution requirement with the team. The operating schedule is assessed for each movement.'),
    ], 'Dubai to Qatar cargo; Dubai to Qatar freight; UAE to Qatar shipping; UAE to Qatar road freight; Dubai Doha cargo; door-to-door Dubai Qatar', 'App.jsx: Dubai address; Services.jsx: explicit UAE-to-Qatar FTL/LTL route'),
  lane('turkey-to-qatar', 'Turkey to Qatar', 'Shipping from Turkey to Qatar', 'Turkey to Qatar shipping',
    'Argus Shipping’s Istanbul consolidation network supports Turkey-to-Qatar cargo enquiries. Discuss supplier pickup, shipment consolidation and air or sea freight suited to the order.', [
      s('Istanbul supplier and cargo coordination', 'Provide the supplier’s actual collection address and the cargo-ready date. Istanbul is part of the consolidation network. Receiving instructions and any collection outside the agreed area must be confirmed before a supplier dispatches goods.'),
      s('Air and sea freight from Turkey', 'Air freight can be assessed where delivery timing is the main constraint. Sea freight can be discussed for larger orders and consolidated cargo. Origin handling, routing and the final delivery requirement determine the shipment scope; no fixed transit time is promised.'),
      s('Combining commercial orders', 'When sourcing from multiple suppliers, list each order and its packing details separately. Confirm that all goods will be ready in time for the planned consolidation. Inconsistent descriptions or late supplier handovers can change the proposed movement.'),
      s('Prepare the Qatar receiving arrangement', 'Agree the importer details, required documents and consignee address before booking. Include special handling and unloading requirements in the enquiry. Request a quote that identifies the origin, freight and destination stages and any exclusions.'),
    ], 'Turkey to Qatar cargo; freight Turkey to Qatar; Istanbul to Qatar cargo; Turkey Qatar logistics; air freight Turkey Qatar; sea freight Turkey Qatar', 'Services.jsx: Istanbul consolidation and Turkey maritime table'),
  lane('bahrain-to-qatar', 'Bahrain to Qatar', 'Freight Shipping from Bahrain to Qatar', 'Bahrain to Qatar freight',
    'Argus Shipping’s Bahrain office and GCC network support Bahrain-to-Qatar cargo coordination. Discuss collection, cross-border road freight and the delivery requirements for your consignment.', [
      s('Bahrain collection planning', 'Argus lists a Bahrain office in Busaiteen. Provide the cargo collection address separately: an office location is not necessarily a cargo receiving facility. Confirm the booking and receiving instructions with the team before sending goods.'),
      s('Regional road freight coordination', 'Road cargo between Bahrain and Qatar requires a route and transit plan across the regional network. The operating arrangement depends on the cargo and current booking conditions. Ask whether the proposed service is a full-load or consolidated movement and how handovers will be managed.'),
      s('Documents and loading requirements', 'Provide the commercial cargo description, packing details, origin contact and consignee information. Identify goods requiring particular securing or handling arrangements. Agree document responsibilities and the scope of border support before the vehicle is scheduled.'),
      s('Receiving cargo in Qatar', 'Include the receiving hours, unloading equipment and access restrictions at the destination. If stock will be stored or distributed after arrival, discuss that requirement as part of the enquiry. The team can assess the schedule once cargo readiness and route arrangements are known.'),
    ], 'Bahrain to Qatar cargo; Bahrain Qatar road freight; shipping Bahrain to Qatar', 'App.jsx: Bahrain office; Services.jsx: Bahrain consolidation and GCC network'),
];

const country = (slug, label, h1, keyword, intro, sections, keywords, evidence) => ({
  path: `/locations/${slug}/`, group: 'locations', label, h1, keyword, intro, sections,
  title: `${h1} | Argus Shipping`, description: `${intro.split('. ')[0]}. Contact the Argus Shipping team in ${label} for tailored logistics support.`,
  keywords: keywords.split('; '), related: ['air-freight', 'sea-freight', 'road-freight', 'warehousing', 'customs-clearance'], evidence, priority: 'P2',
});
export const countryPages = [
  country('qatar', 'Qatar', 'Freight Forwarding & Logistics Company in Qatar', 'freight forwarding Qatar',
    'Argus Shipping is a leading freight forwarding and logistics company in Qatar. The Doha headquarters coordinates international air, sea and road freight alongside local customs clearance and warehousing.', [
      s('Doha headquarters and local operations', 'The Qatar team manages import and export shipments through Hamad Port and Hamad International Airport. Discuss your cargo requirements with the local team to secure a tailored transport arrangement.'),
      s('Air, sea and GCC road freight', 'Argus connects Qatar businesses to global markets. We arrange FCL and LCL ocean freight, time-sensitive air cargo, and cross-border road freight to and from the UAE, Saudi Arabia and the wider GCC.'),
      s('Warehousing and customs clearance', 'Streamline your Qatar supply chain with integrated customs brokerage and commercial storage. We coordinate documentation and border formalities to ensure smooth cargo releases.'),
      s('Comprehensive logistics solutions', 'Beyond standard freight, Argus supports project cargo, heavy-lift transport, and third-party logistics (3PL) distribution for Qatar-based enterprises.')
    ], 'freight forwarding Qatar; freight forwarding company Qatar; freight forwarder Qatar; logistics company Qatar; logistics company in Qatar; shipping company Qatar; freight company Qatar; cargo company Qatar; logistics services Qatar; freight services Qatar; freight forwarder Doha; logistics company Doha', 'App.jsx: Doha HQ'),
  country('uae', 'UAE', 'Freight Forwarding & Logistics Services in the UAE', 'freight forwarding UAE',
    'Argus Shipping provides comprehensive freight forwarding and logistics services in the UAE. The Dubai hub connects international trade lanes with regional GCC distribution networks.', [
      s('Dubai hub and regional distribution', 'Located in Al Qusais Industrial Area, the UAE facility supports cargo consolidation, warehousing, and cross-border transit. We manage shipments moving through Jebel Ali Port and Dubai airports.'),
      s('Cross-border GCC road freight', 'The UAE serves as a critical transit point for Middle East logistics. Argus coordinates reliable FTL and LTL road freight between the UAE, Qatar, Saudi Arabia and Oman.'),
      s('International air and sea cargo', 'Whether importing goods into the UAE or exporting to global markets, our team arranges competitive sea freight and urgent air cargo solutions tailored to your schedule.'),
      s('Local customs and warehousing', 'We support UAE businesses with dedicated commercial storage, order fulfillment, and customs clearance coordination for both import and transit shipments.')
    ], 'freight forwarding UAE; freight forwarding company UAE; logistics company UAE; logistics services UAE; freight forwarder UAE; shipping company UAE; cargo services UAE; international freight UAE; logistics company Dubai; freight forwarding Dubai; freight forwarder Dubai', 'App.jsx: Dubai Hub'),
  country('india', 'India', 'Freight Forwarding & Logistics Services in India', 'freight forwarding India',
    'Argus Shipping offers dedicated freight forwarding and logistics services in India. We coordinate origin handling, consolidation, and international transport for Indian exporters.', [
      s('Local consolidation and handling', 'With contacts in Tuticorin and Nilambur, alongside consolidation networks in Mumbai and Bangalore, Argus supports cargo collection across key Indian manufacturing regions.'),
      s('Sea freight and container shipping', 'We arrange FCL and LCL container shipping from major Indian ports to the GCC and global destinations. Discuss your cargo volume for optimal routing.'),
      s('Air freight and urgent shipments', 'For time-sensitive exports, our Indian logistics team coordinates direct air freight options, managing airport handling and shipment documentation.'),
      s('Door-to-door coordination', 'Combine local Indian supplier collection with international freight and final destination delivery. We manage the entire logistics chain for a seamless experience.')
    ], 'freight forwarding India; logistics services India; international freight India; cargo forwarding India', 'App.jsx: India offices'),
  country('china', 'China', 'Freight Forwarding & Logistics Services in China', 'freight forwarding China',
    'Argus Shipping provides specialized freight forwarding and logistics services in China. Our Guangzhou and Yiwu hubs support supplier coordination and international export consolidation.', [
      s('Guangzhou and Yiwu hubs', 'Our established facilities in Guangzhou and Yiwu provide direct support for Chinese exporters and international buyers sourcing products from the region.'),
      s('Cargo consolidation and warehousing', 'We combine goods from multiple Chinese suppliers into efficient LCL or FCL shipments. Our team manages the receiving, storage, and container loading process.'),
      s('Air and ocean export freight', 'Argus connects Chinese manufacturing hubs to the Middle East and beyond. We negotiate competitive ocean freight and rapid air cargo schedules.'),
      s('Export documentation and clearance', 'Navigating Chinese export regulations requires local expertise. We coordinate the necessary supplier documentation and customs formalities prior to dispatch.')
    ], 'freight forwarding China; cargo consolidation China; sourcing logistics; export freight China; warehouse consolidation; Guangzhou logistics; Yiwu logistics', 'App.jsx: China Hubs'),
  country('turkey', 'Turkey', 'Freight Forwarding & Logistics Services in Turkey', 'freight forwarding Turkey',
    'Argus Shipping coordinates freight forwarding and logistics services in Turkey. We manage European and Middle Eastern trade lanes through our Istanbul consolidation network.', [
      s('Istanbul consolidation network', 'Our Istanbul operations support cargo collection from Turkish suppliers, preparing consignments for onward international transport.'),
      s('Air and sea freight solutions', 'We arrange reliable sea freight from Turkish ports and fast air freight from Istanbul airports, connecting Turkey with the GCC and global markets.'),
      s('Cross-border and transit logistics', 'Turkey is a vital bridge between Europe and the Middle East. Argus supports complex transit shipments and cross-border freight movements.'),
      s('Integrated supply chain support', 'From factory collection in Turkey to final delivery overseas, we provide door-to-door logistics including customs support and warehousing.')
    ], 'freight forwarding Turkey; logistics services Turkey; international freight Turkey; Istanbul logistics', 'App.jsx: Istanbul network'),
  country('bahrain', 'Bahrain', 'Freight Forwarding & Logistics Services in Bahrain', 'freight forwarding Bahrain',
    'Argus Shipping offers reliable freight forwarding and logistics services in Bahrain. Our Busaiteen office supports local businesses with international cargo and GCC road freight.', [
      s('Local Bahrain operations', 'Located in Busaiteen, our Bahrain team provides dedicated support for local importers and exporters, coordinating all aspects of the supply chain.'),
      s('GCC road freight connectivity', 'We arrange seamless cross-border road transport connecting Bahrain with Saudi Arabia, the UAE, Qatar, and the wider GCC network.'),
      s('International sea and air cargo', 'Beyond regional transport, Argus manages international sea freight and air cargo shipments entering or leaving Bahrain.'),
      s('Customs clearance and delivery', 'We ensure compliance with local regulations, providing customs clearance support and coordinating final delivery to your facility.')
    ], 'freight forwarding Bahrain; logistics services Bahrain; international freight Bahrain; shipping company Bahrain', 'App.jsx: Bahrain office')
];


const industry = (slug, label, h1, keyword, intro, sections, keywords) => ({
  path: `/industries/${slug}-logistics/`, group: 'industries', label, h1, keyword, intro, sections,
  title: `${h1} | Argus Shipping`, description: `${intro.split('. ')[0]}. Discuss your industry-specific supply chain with Argus Shipping.`,
  keywords: keywords.split('; '), related: ['project-cargo', 'warehousing', 'door-to-door-cargo', 'customs-clearance'], priority: 'P4',
});
export const industryPages = [
  industry('construction', 'Construction Logistics', 'Construction Logistics Solutions', 'construction logistics',
    'Argus Shipping provides specialized logistics for the construction and infrastructure sector. We coordinate heavy-lift equipment, raw materials, and out-of-gauge project cargo.', [
      s('Project cargo and heavy-lift transport', 'Moving construction machinery and oversized building materials requires precise engineering and specialized equipment. We handle OOG (Out of Gauge) shipments via flat racks, open-top containers, and dedicated heavy-lift vessels.'),
      s('Site delivery scheduling', 'Construction sites operate on strict timelines. We manage multi-modal deliveries, synchronizing ocean freight arrivals with road transport to ensure materials arrive exactly when required by the project managers.'),
      s('Customs and regulatory compliance', 'Importing industrial machinery involves complex tariff classifications. Our clearance team ensures documentation is processed rapidly to prevent costly site delays.'),
      s('Temporary warehousing', 'When cargo arrives before the site is ready, we offer secure staging and warehousing solutions, deploying inventory incrementally to match the construction phase.')
    ], 'construction logistics; construction supply chain; building materials transport; heavy equipment shipping; infrastructure logistics'),
  industry('oil-gas', 'Oil & Gas Logistics', 'Oil & Gas Logistics Solutions', 'oil and gas logistics',
    'Argus Shipping delivers mission-critical logistics for the energy sector. We support exploration, drilling, and production sites with rapid and secure supply chain solutions.', [
      s('Time-critical equipment transport', 'Downtime in the energy sector is expensive. We coordinate urgent air freight and dedicated charter services to deliver replacement parts and drilling equipment rapidly to operational sites.'),
      s('Hazardous materials (DG) handling', 'Moving chemicals and specialized equipment requires strict compliance with Dangerous Goods regulations. Our team is trained to manage the documentation and handling of sensitive energy cargo.'),
      s('Remote site delivery', 'Oil and gas operations are often located in challenging environments. We plan end-to-end multi-modal routes, including specialized off-road freight transport, to reach remote facilities.'),
      s('Offshore and marine logistics', 'We coordinate supply vessels and offshore support, managing the flow of materials from the port directly to platforms and marine operations.')
    ], 'oil and gas logistics; energy supply chain; rig moving logistics; dangerous goods transport; offshore logistics'),
  industry('automotive', 'Automotive Logistics', 'Automotive Logistics Solutions', 'automotive logistics',
    'Argus Shipping coordinates supply chains for the automotive industry. We manage finished vehicle logistics alongside aftermarket parts distribution.', [
      s('Finished vehicle logistics (FVL)', 'We arrange secure transport for private and commercial vehicles using specialized Ro-Ro (Roll-on/Roll-off) vessels, car carriers, and containerized transport for high-value automobiles.'),
      s('Spare parts and aftermarket distribution', 'Automotive dealers require reliable parts availability. We manage the import and warehousing of aftermarket components, ensuring rapid distribution to service centers.'),
      s('Production supply chains', 'For automotive manufacturing and assembly, we coordinate just-in-time (JIT) deliveries of raw materials and components to keep production lines moving without interruption.'),
      s('Customs for vehicles and components', 'Importing vehicles involves strict local regulations. We handle homologation documentation and customs clearance for both finished cars and replacement parts.')
    ], 'automotive logistics; car shipping; finished vehicle logistics; auto parts supply chain; Ro-Ro shipping'),
  industry('healthcare', 'Healthcare & Medical Logistics', 'Healthcare & Medical Logistics Solutions', 'healthcare logistics',
    'Argus Shipping handles temperature-controlled and time-sensitive logistics for the healthcare and pharmaceutical sectors, ensuring absolute product integrity.', [
      s('Temperature-controlled supply chains', 'Pharmaceuticals and biologics require strict temperature adherence. We coordinate active and passive cold-chain solutions, utilizing refrigerated (reefer) containers and specialized air freight packaging.'),
      s('Medical equipment transport', 'MRI machines, scanners, and sensitive laboratory equipment require specialized, shock-proof handling. We manage the secure door-to-door transport of high-value medical assets.'),
      s('Regulatory compliance and clearance', 'Medical imports face stringent regulatory scrutiny. Our team coordinates with ministries of health and local customs to expedite the clearance of life-saving supplies.'),
      s('Urgent medical air freight', 'When time is of the essence, we arrange priority air cargo for urgent medical supplies, ensuring rapid delivery from manufacturers to hospitals and distributors.')
    ], 'healthcare logistics; pharmaceutical logistics; medical equipment transport; cold chain logistics; temperature controlled shipping'),
  industry('retail', 'Retail & Distribution Logistics', 'Retail & Distribution Logistics Solutions', 'retail logistics',
    'Argus Shipping optimizes supply chains for the retail and FMCG sectors. We manage the flow of consumer goods from global manufacturing hubs to local distribution centers.', [
      s('FMCG and consumer goods distribution', 'Fast-moving consumer goods require high-volume, cost-effective transport. We coordinate full container loads (FCL) from major sourcing markets directly to regional retail warehouses.'),
      s('Omnichannel fulfillment and 3PL', 'Beyond freight, we support retailers with outsourced 3PL services. We manage inventory, pick-and-pack operations, and distribution to brick-and-mortar stores or direct to consumers.'),
      s('Seasonal peak management', 'Retail volumes fluctuate heavily during holidays and sales events. We offer scalable warehousing and flexible shipping schedules to manage inventory spikes effectively.'),
      s('Garments and electronics', 'We provide specialized handling for high-value electronics and Garments on Hangers (GOH) shipments, ensuring retail products arrive shelf-ready and secure.')
    ], 'retail logistics; FMCG supply chain; omnichannel fulfillment; retail distribution; consumer goods transport'),
  industry('industrial', 'Industrial & Project Logistics', 'Industrial & Project Logistics Solutions', 'industrial logistics',
    'Argus Shipping designs bespoke logistics for industrial manufacturing and complex engineering projects, managing oversized cargo and massive supply networks.', [
      s('Manufacturing supply chains', 'We keep factories running by coordinating the import of raw materials and the export of finished industrial products, balancing cost and speed across sea and air freight.'),
      s('Plant relocation and engineering logistics', 'Moving entire production lines or factories requires meticulous planning. We manage the sequential transport of heavy machinery, ensuring parts arrive in the correct order for reassembly.'),
      s('Oversized and heavy-lift handling', 'Industrial projects often involve components too large for standard containers. We charter breakbulk vessels and coordinate specialized road transport for colossal cargo.'),
      s('End-to-end project management', 'Our project team serves as a single point of contact, orchestrating multiple suppliers, carriers, and customs authorities to execute massive industrial movements flawlessly.')
    ], 'industrial logistics; project logistics; plant relocation transport; manufacturing supply chain; heavy lift engineering')
, 
  lane('china-to-uae', 'China to UAE', 'Shipping from China to UAE', 'shipping from China to UAE',
    'Argus Shipping coordinates China-to-UAE freight through its Guangzhou, Yiwu, and Dubai network. Businesses sourcing from multiple Chinese suppliers can discuss collection, consolidation, and delivery directly to the UAE.', [
      s('Guangzhou and Yiwu supplier coordination', 'We manage direct cargo collection from suppliers across China. Our hubs in Guangzhou and Yiwu provide the perfect consolidation points before dispatch to Jebel Ali Port or Dubai International Airport.'),
      s('Air freight and ocean freight to the UAE', 'Compare FCL, LCL, and air cargo options. Air freight provides rapid delivery for urgent electronics or fashion, while our sea freight consolidation offers cost-effective transport for heavy manufacturing goods.'),
      s('Consolidation and Dubai warehousing', 'If you source from several suppliers, we consolidate your cargo in China and de-consolidate it at our Dubai hub, holding inventory until your local distribution network is ready.'),
      s('UAE customs clearance and delivery', 'We handle the export documentation in China and the import customs clearance in the UAE. Request a door-to-door quotation to cover origin collection, freight, and final delivery to any emirate.')
    ], 'China to UAE shipping; freight from China to UAE; China to UAE freight; China to Dubai cargo; sea freight China to UAE; air freight China to Dubai; Guangzhou to Dubai cargo', 'App.jsx: Guangzhou and Dubai addresses'),

];

const resource = (slug, label, h1, keyword, intro, sections, keywords) => ({
  path: `/resources/${slug}/`, group: 'resources', label, h1, keyword, intro, sections,
  title: `${h1} | Argus Shipping`, description: `${intro.split('. ')[0]}. Access logistics tools and guides from Argus Shipping.`,
  keywords: keywords.split('; '), related: ['air-freight', 'sea-freight', 'road-freight', 'customs-clearance'], priority: 'P5',
});
export const resourcePages = [
  resource('cbm-calculator', 'CBM Calculator', 'CBM Calculator & Freight Volume Tool', 'cbm calculator',
    'Calculate your cargo volume in Cubic Meters (CBM) for ocean and air freight shipments. Accurate CBM calculations are essential for receiving precise freight forwarding quotes and planning container space.', [
      s('How to calculate CBM', 'CBM is calculated by multiplying the length, width, and height of your cargo in meters (L x W x H = CBM). For multiple packages of the same size, multiply the single item CBM by the total carton count.'),
      s('CBM in Ocean Freight (LCL & FCL)', 'In Less than Container Load (LCL) shipping, freight rates are often based directly on the CBM of your cargo. For Full Container Load (FCL), knowing your total CBM dictates whether you need a 20ft, 40ft, or 40ft High Cube container.'),
      s('CBM to kg (Volumetric Weight)', 'Freight forwarders charge based on whichever is greater: the actual weight or the volumetric weight. Standard ocean freight typically equates 1 CBM to 1,000 kg, though this can vary by trade lane and carrier.'),
      s('Plan your shipment', 'Use your calculated CBM to request a tailored freight quote from Argus Shipping. Our team will help you determine the most cost-effective routing and consolidation strategy for your cargo volume.')
    ], 'cbm calculator; cubic meter calculator; freight volume calculator; lcl volume calculator; cargo cbm calculator'),
  resource('chargeable-weight-calculator', 'Chargeable Weight', 'Chargeable Weight Calculator Guide', 'chargeable weight calculator',
    'Understand how airlines and shipping lines determine the chargeable weight of your cargo. Transport costs are billed on the actual gross weight or the volumetric (dimensional) weight, whichever is higher.', [
      s('Actual Weight vs Volumetric Weight', 'Actual weight is the physical weight of your cargo on a scale. Volumetric weight is a calculation based on the dimensions of the cargo, reflecting the space it occupies in an aircraft or shipping container.'),
      s('Air Freight Volumetric Calculation', 'For international air freight, the standard dimensional factor is 167 kg per CBM (or length x width x height in cm / 6000). If your cargo is light but bulky, you will be billed on this volumetric weight.'),
      s('Road Freight Volumetric Calculation', 'Cross-border GCC road freight dimensional factors can vary depending on the carrier and truck type, but often range between 333 kg per CBM. Always verify the divisor with your logistics provider before booking.'),
      s('Optimize your cargo packing', 'To minimize chargeable weight, ensure your cargo is packed as densely and efficiently as possible. Avoid excessive empty space in cartons and optimize pallet stacking to reduce your final freight bill.')
    ], 'chargeable weight calculator; dimensional weight calculator; air freight volumetric weight; freight weight calculation'),
  resource('incoterms-guide', 'Incoterms Guide', 'International Incoterms 2020 Guide', 'incoterms guide',
    'Navigate global trade with our comprehensive guide to ICC Incoterms 2020. Understanding Incoterms is critical for defining the responsibilities, risks, and costs between buyers and sellers in international transactions.', [
      s('EXW (Ex Works)', 'The seller makes the goods available at their premises. The buyer assumes all risks and costs from the seller’s door to the final destination, including export clearance.'),
      s('FOB (Free on Board)', 'The seller is responsible for delivering the goods loaded on board the vessel at the named port of shipment. Risk transfers to the buyer once the goods are safely loaded on the ship.'),
      s('CIF (Cost, Insurance, and Freight)', 'The seller covers the costs, insurance, and freight to bring the goods to the named port of destination. However, risk transfers to the buyer as soon as the goods are loaded on the vessel at origin.'),
      s('DDP (Delivered Duty Paid)', 'The seller bears all costs and risks involved in bringing the goods to the destination, including paying duties, taxes, and customs clearance fees. It represents the maximum obligation for the seller.')
    ], 'incoterms 2020 guide; incoterms explained; EXW vs FOB; CIF vs DDP; international trade terms; shipping incoterms'),
  resource('container-size-guide', 'Container Sizes', 'Shipping Container Dimensions & Size Guide', 'shipping container sizes',
    'Choose the right equipment for your ocean freight with our comprehensive shipping container size guide. Review internal dimensions, payload capacities, and door sizes for standard and specialized equipment.', [
      s('20ft Standard Container', 'Ideal for dense, heavy cargo like machinery, tiles, or raw materials. Typically holds around 33 CBM and supports a maximum payload of approximately 28,000 kg depending on shipping line limits.'),
      s('40ft Standard Container', 'Designed for larger volume cargo that is relatively light, such as furniture, clothing, or electronics. Provides around 67 CBM of space with a similar maximum payload weight to a 20ft container.'),
      s('40ft High Cube (HC) Container', 'A foot taller than a standard 40ft container, offering extra volume (approx 76 CBM) without increasing the floor footprint. Excellent for bulky, lightweight goods and tall items.'),
      s('Specialized Equipment (Open Top & Flat Rack)', 'For Out of Gauge (OOG) project cargo that cannot fit through standard container doors, Open Top containers allow crane loading, while Flat Racks are used for oversized heavy-lift machinery.')
    ], 'shipping container sizes; 20ft container dimensions; 40ft container dimensions; high cube container volume; flat rack dimensions; freight container capacity')
];


const caseStudy = (slug, label, h1, keyword, intro, sections, keywords) => ({
  path: `/case-studies/${slug}/`, group: 'case-studies', label, h1, keyword, intro, sections,
  title: `${h1} | Argus Shipping Case Studies`, description: `${intro.split('. ')[0]}.`,
  keywords: keywords.split('; '), related: ['project-cargo', 'air-freight', 'sea-freight', 'warehousing'], priority: 'P5',
});
export const caseStudies = [
  caseStudy('heavy-lift-qatar', 'Heavy-Lift Project Qatar', 'Oversized Machinery Transport from China to Qatar', 'heavy lift case study',
    'Argus Shipping successfully coordinated the end-to-end transport of out-of-gauge construction machinery from Guangzhou, China, to a major infrastructure site in Doha, Qatar.', [
      s('Client Challenge', 'The client required the delivery of three 45-ton excavators within a strict 30-day window to avoid construction delays at the Doha site. The oversized cargo exceeded standard container dimensions.'),
      s('Argus Solution', 'Our project cargo team in China arranged flat rack containers and specialized heavy-lift cranes for origin loading. We secured priority vessel space on a direct Ro-Ro routing to Hamad Port.'),
      s('Execution & Clearance', 'Upon arrival at Hamad Port, our local customs brokers expedited the clearance process using pre-filed documentation, avoiding port storage fees. We coordinated police escorts and low-bed trailers for the final road transport.'),
      s('Outcome', 'The machinery was safely delivered to the Doha site 3 days ahead of the deadline, ensuring the infrastructure project remained on schedule and under budget.')
    ], 'heavy lift case study; project cargo logistics; flat rack shipping; china to qatar logistics case study'),
  caseStudy('pharma-cold-chain-uae', 'Pharma Cold Chain UAE', 'Temperature-Controlled Pharma Delivery to Dubai', 'cold chain case study',
    'Argus Shipping executed a time-critical, temperature-controlled air freight movement of sensitive pharmaceuticals from Europe to Dubai, UAE.', [
      s('Client Challenge', 'A global pharmaceutical distributor needed to transport 50 pallets of vaccines requiring strict +2°C to +8°C temperature control. Any temperature deviation would result in total cargo loss.'),
      s('Argus Solution', 'We deployed active temperature-controlled air cargo containers (Envirotainers) and coordinated a direct priority air freight routing from Frankfurt to Dubai International Airport.'),
      s('Execution & Clearance', 'Our Dubai hub team arranged tarmac-side collection in refrigerated trucks immediately upon landing. The shipment was rapidly cleared through Dubai Customs via the Ministry of Health fast-track process.'),
      s('Outcome', '100% of the vaccines arrived at the regional distribution center with zero temperature excursions. The client secured a flawless audit report for the supply chain movement.')
    ], 'cold chain logistics case study; pharmaceutical logistics uae; temperature controlled air freight; dubai medical logistics'),
  caseStudy('fmcg-distribution-india', 'FMCG Retail Distribution India', 'FMCG Consolidation and 3PL Distribution in India', 'fmcg logistics case study',
    'Argus Shipping streamlined the supply chain for a major retail brand, transitioning them from fragmented imports to a centralized consolidation and 3PL distribution model in India.', [
      s('Client Challenge', 'The retailer was importing LCL shipments from multiple Asian suppliers directly to individual stores, resulting in high freight costs, delayed clearances, and stockouts.'),
      s('Argus Solution', 'We implemented a Buyer’s Consolidation model. Suppliers delivered goods to our consolidation hubs in China and Southeast Asia, where we loaded dedicated FCL containers bound for Mumbai port.'),
      s('Execution & Clearance', 'Upon arrival in India, we moved the containers to our bonded warehouse facility. Argus took over the 3PL operations, managing inventory, pick-and-pack, and domestic road freight distribution to the retail stores.'),
      s('Outcome', 'The client reduced their international freight spend by 22%, eliminated stockouts, and improved their store replenishment cycle time by 40%.')
    ], 'fmcg supply chain case study; buyers consolidation; 3pl distribution india; retail logistics optimization')
];

export const commercialPages = [...caseStudies, ...resourcePages, ...industryPages, ...countryPages, ...servicePages, ...tradePages];
export const byPath = Object.fromEntries(commercialPages.map(page => [page.path, page]));
export const serviceById = Object.fromEntries(servicePages.map(page => [page.path.split('/')[2].replace(/-qatar$/, ''), page]));
export const serviceLinks = Object.fromEntries(Object.entries({ air: 'air-freight', sea: 'sea-freight', road: 'road-freight', warehouse: 'warehousing', warehousing: 'warehousing', doortodoor: 'door-to-door-cargo', 'door-to-door': 'door-to-door-cargo', '3pl': '3pl-logistics', vehicle: 'vehicle-logistics' }).map(([id, slug]) => [id, serviceById[slug].path]));
export function normalizePath(path) {
  const clean = path.replace(/\.html$/, '').replace(/\/$/, '') || '/';
  
  // Handle legacy redirects
  if (clean.startsWith('/services/') && clean.endsWith('-qatar')) {
    const newPath = clean.replace('-qatar', '') + '/';
    return newPath;
  }
  if (clean.startsWith('/shipping/')) {
    const newPath = clean.replace('/shipping/', '/trade-lanes/') + '/';
    return newPath;
  }
  
  return byPath[`${clean}/`] || clean === '/trade-lanes' ? `${clean}/` : clean;
}
