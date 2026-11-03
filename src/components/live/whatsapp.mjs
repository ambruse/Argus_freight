import { measure } from '../../../shared/livePricing.mjs';
import { locationLabel } from '../../../shared/locationLabel.mjs';

export function shipmentMessage({ shipment, cargo, contact, countryCode, locations, group, result, intent = 'quotation' }) {
    const value = input => input === '' || input == null ? 'Not provided' : String(input);
    const location = id => {
        const found = locations.find(item => item.id === id);
        return found ? `${locationLabel(found)} (${id})` : value(id);
    };
    const lines = [
        `Hello Argus Shipping, ${intent === 'contact' ? 'I would like to discuss this shipment.' : intent === 'booking' ? 'I would like to request a booking for this shipment.' : 'please provide a quotation for this shipment.'}`,
        '',
        `Name: ${value(contact.name)}`,
        `Phone: ${contact.phone ? `${countryCode || ''} ${contact.phone}`.trim() : 'Not provided'}`,
        `Phone country: ${value(contact.phone_country)}`,
        `Email: ${value(contact.email)}`,
        '',
        `POL / Origin: ${location(shipment.origin_id)}`,
        `POD / Destination: ${location(shipment.destination_id)}`,
        `Transport mode: ${value(shipment.mode)}`,
        `Shipment type: ${value(shipment.subtype)}`,
    ];
    if (shipment.subtype === 'FCL') lines.push(
        `Container size: ${shipment.size === '40HQ' ? '40 FT High Cube (HQ)' : shipment.size ? `${shipment.size} FT` : 'Not provided'}`,
        `Container type: ${value(shipment.equipment)}`,
        `Number of containers: ${value(shipment.quantity)}`,
    );
    if (shipment.mode === 'TRUCK') lines.push(`Truck / load class: ${value(shipment.truck)}`);
    if (shipment.subtype === 'FTL') lines.push(`Number of trucks: ${value(shipment.quantity)}`);
    if (group) lines.push(`Service: ${group.service}`, `Includes: ${group.inclusions.join(', ')}`, `Excludes: ${group.exclusions.join(', ') || 'None stated'}`);

    cargo.forEach((row, index) => {
        lines.push('', `Cargo ${index + 1}:`, `Volume entry: ${row.input === 'CBM' ? 'Direct CBM (total line volume)' : 'Dimensions'}`);
        if (row.input === 'CBM') lines.push(`Total line CBM: ${value(row.cbm)} m³`);
        else lines.push(`Dimensions (L × W × H): ${value(row.length)} × ${value(row.width)} × ${value(row.height)} ${row.unit}`);
        lines.push(`Packages: ${value(row.quantity)}`, `Weight: ${value(row.weight)} ${row.weight_unit} (${row.weight_basis === 'PACKAGE' ? 'per package' : 'entire cargo line'})`);
    });
    if (cargo.length) {
        try {
            const totals = measure(cargo);
            lines.push('', `Total CBM: ${totals.cbm} m³`, `Total actual weight: ${totals.kg} kg`, `Total packages: ${totals.packages}`);
        } catch {
            // Error-state enquiries may contain incomplete cargo; keep every entered value.
            lines.push('', 'Cargo totals: pending complete cargo details.');
        }
    } else lines.push('', 'Cargo weight / CBM: not provided.');

    if (result) {
        lines.push('', `Quote reference: ${result.reference}`);
        if (result.available && result.estimate) {
            const estimate = result.estimate;
            lines.push(`Estimated total: USD ${estimate.total}`, `Base freight: USD ${estimate.base}`, `Rate basis: ${estimate.pricing_units} ${estimate.basis}`, `Service: ${estimate.service}`);
            estimate.charges.forEach(charge => lines.push(`${charge.name}: USD ${charge.amount}${charge.tax ? ` (${charge.tax})` : ''}`));
            if (shipment.mode === 'AIR') lines.push(`Volumetric / chargeable / billed weight: ${estimate.volumetric_kg} / ${estimate.chargeable_kg} / ${estimate.billed_kg} kg`, `Air divisor: ${estimate.divisor} cm³/kg`);
            lines.push(`Rate validity (Qatar): ${estimate.valid_from} – ${estimate.valid_until}`, `Includes: ${estimate.inclusions.join(', ')}`, `Excludes: ${estimate.exclusions.join(', ') || 'None stated'}`, 'Estimate subject to availability and final confirmation.');
        } else lines.push('Live pricing unavailable; please confirm a custom quotation.');
        if (result.expires_at) lines.push(`Estimate expires (Qatar): ${new Date(result.expires_at).toLocaleString('en-GB', { timeZone: 'Asia/Qatar' })}`);
    }
    return lines.join('\n');
}
