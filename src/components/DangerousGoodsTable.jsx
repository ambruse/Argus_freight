import './DangerousGoodsTable.css';

const categories = [
  ['Batteries & battery-powered equipment', 'Lithium batteries, equipment containing batteries and other battery types.', 'Battery chemistry, configuration, condition and applicable test documentation.'],
  ['Paints, solvents & coatings', 'Products classified as flammable or otherwise dangerous for transport.', 'Product Safety Data Sheet (SDS), transport classification and package quantities.'],
  ['Other regulated cargo', 'Dry ice, environmentally hazardous products and other classified articles.', 'Product details, transport classification, quantities and proposed route.'],
  ['Specially restricted categories', 'Explosives, infectious substances and radioactive materials.', 'Separate specialist review required. Availability is not confirmed; applicable permits, authorizations and carrier approval must be established first.'],
];

export default function DangerousGoodsTable() {
  return (
    <section className="dg-cargo" aria-labelledby="dg-cargo-heading">
      <h3 id="dg-cargo-heading">Dangerous goods enquiries we review</h3>
      <p>We welcome enquiries across a broad range of dangerous goods. The categories below are subject to shipment-specific review—not a guarantee of acceptance by air, sea or road.</p>
      <div className="dg-table-scroll" role="region" aria-label="Dangerous goods categories and enquiry information" tabIndex={0}>
        <table>
          <caption>Goods categories and information to provide for an assessment</caption>
          <thead><tr><th scope="col">Cargo category</th><th scope="col">Examples</th><th scope="col">Information for review</th></tr></thead>
          <tbody>{categories.map(([category, examples, information]) => (
            <tr key={category}><th scope="row">{category}</th><td>{examples}</td><td>{information}</td></tr>
          ))}</tbody>
        </table>
      </div>
      <h4>Documents &amp; booking requirements</h4>
      <p>Send the origin, destination, cargo-ready date, invoice, packing list and product information. Include the SDS where applicable and classification supplied by the responsible shipper: UN number, proper shipping name, hazard class and packing group where applicable. Shipping declarations, permits and other supporting documents depend on the cargo, transport mode and route.</p>
      <p className="dg-acceptance-note"><strong>Important:</strong> Documents alone do not make a shipment acceptable. Packaging, marking, labelling, legal requirements and carrier acceptance must also be confirmed before collection. This is an enquiry checklist, not a complete compliance checklist or classification guide.</p>
      <p className="dg-guidance">Transport guidance: <a href="https://www.iata.org/en/publications/dgr">IATA dangerous goods regulations</a> · <a href="https://www.imo.org/en/ourwork/safety/pages/dangerousgoods-default.aspx">IMO IMDG guidance</a></p>
    </section>
  );
}
