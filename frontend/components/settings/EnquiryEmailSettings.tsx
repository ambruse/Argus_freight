"use client";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import phoneCountries from "../../../shared/phoneCountries.json";

type Settings = { version: number; enabled: boolean; host: string; port: number; email: string; has_password: boolean; recipients: { email: string; country: string }[] };
type Delivery = { id: string; contact: { name?: string; email: string; phone: string; phone_country: string }; route: { mode: string; origin: { country: string; name: string }; destination: { country: string; name: string } }; recipient: string; status: string; created_at: string };
export default function EnquiryEmailSettings() {
    const [settings, setSettings] = useState<Settings | null>(null), [password, setPassword] = useState("");
    const [error, setError] = useState(""), [message, setMessage] = useState(""), [busy, setBusy] = useState(false), [deliveries, setDeliveries] = useState<Delivery[]>([]);
    const [exporting, setExporting] = useState(false);
    async function downloadContacts() {
        setError(""); setExporting(true);
        try {
            const { data } = await api.get("/live-pricing/enquiries/export.csv", { responseType: "blob" });
            const url = URL.createObjectURL(data);
            const link = document.createElement("a");
            link.href = url; link.download = "live-enquiry-contacts.csv";
            document.body.appendChild(link); link.click(); link.remove();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
        } catch {
            setError("Unable to download enquiry contacts. Please try again.");
        } finally { setExporting(false); }
    }
    async function load() {
        setError(""); setBusy(true);
        try {
            const [config, history] = await Promise.all([api.get("/live-pricing/enquiry-settings"), api.get("/live-pricing/enquiries")]);
            setSettings(config.data); setDeliveries(history.data.rows);
        } catch (err: any) { setError(err.response?.data?.message || "Unable to load enquiry settings."); }
        finally { setBusy(false); }
    }
    useEffect(() => { load(); }, []);
    async function save(e: React.FormEvent) {
        e.preventDefault(); setError(""); setMessage(""); setBusy(true);
        try {
            const response = await api.put("/live-pricing/enquiry-settings", { ...settings, password });
            setSettings(response.data); setPassword(""); setMessage("Enquiry settings saved. Enabled SMTP credentials have been verified.");
        } catch (err: any) { setError(err.response?.data?.message || "Unable to save enquiry settings."); }
        finally { setBusy(false); }
    }
    return <section className="glass p-6 rounded-2xl border border-white/5 shadow-card md:col-span-2" aria-labelledby="enquiry-email-heading">
        <h2 id="enquiry-email-heading" className="text-lg font-bold text-primary mb-2">Live Calculator — Enquiry Email</h2>
        <p className="text-sm text-muted mb-6">Continue sends the visitor’s contact details and route to one operator. Routing uses the selected phone country. Country matches take priority; otherwise Global recipients are used. Matching recipients rotate in the order below.</p>
        {error && <p role="alert" className="text-rose mb-4">{error}</p>}
        {message && <p role="status" className="text-gold mb-4">{message}</p>}
        <div className="mb-6">
            <h3 className="font-semibold text-primary mb-2">Enquiry contact records</h3>
            <p className="text-sm text-muted mb-3">Download all saved enquiries as CSV: Name, Phone number (country code + number), Email address. Older enquiries may have a blank name.</p>
            <button type="button" className="btn-secondary" disabled={exporting} onClick={downloadContacts}>{exporting ? "Downloading…" : "Download contacts CSV"}</button>
        </div>
        {!settings ? <button type="button" className="btn-secondary" disabled={busy} onClick={load}>{busy ? "Loading…" : "Retry loading settings"}</button> : <form onSubmit={save}>
            <fieldset disabled={busy} className="space-y-5 min-w-0">
                <label className="flex items-center gap-3 text-primary"><input type="checkbox" checked={settings.enabled} onChange={e => setSettings({ ...settings, enabled: e.target.checked })}/>Enable enquiry email delivery</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <label className="text-sm text-primary">SMTP host<input required className="input w-full mt-2" value={settings.host} onChange={e => setSettings({ ...settings, host: e.target.value })}/></label>
                    <label className="text-sm text-primary">SMTP port<select className="input w-full mt-2" value={settings.port} onChange={e => setSettings({ ...settings, port: Number(e.target.value) })}><option value={587}>587 — STARTTLS</option><option value={465}>465 — TLS</option></select></label>
                    <label className="text-sm text-primary">Sender / SMTP email<input type="email" required={settings.enabled} className="input w-full mt-2" autoComplete="off" value={settings.email} onChange={e => setSettings({ ...settings, email: e.target.value })}/></label>
                    <label className="text-sm text-primary">SMTP password / app password<input type="password" className="input w-full mt-2" autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} placeholder={settings.has_password ? "Saved — leave blank to keep" : "Enter sender password"}/></label>
                </div>
                <p className="text-xs text-muted">The password is encrypted on the server and is never returned to the browser. Saving enabled settings verifies the SMTP connection without sending a test email.</p>
                <h3 className="font-semibold text-primary">Operator recipients</h3>
                {settings.recipients.map((recipient, index) => <div key={index} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-3 items-end">
                    <label className="text-sm text-primary">Operator email {index + 1}<input type="email" required className="input w-full mt-2" value={recipient.email} onChange={e => setSettings({ ...settings, recipients: settings.recipients.map((r, i) => i === index ? { ...r, email: e.target.value } : r) })}/></label>
                    <label className="text-sm text-primary">Country {index + 1}<select className="input w-full mt-2" value={recipient.country} onChange={e => setSettings({ ...settings, recipients: settings.recipients.map((r, i) => i === index ? { ...r, country: e.target.value } : r) })}><option value="">Global — all other countries</option>{phoneCountries.map(c => <option key={c.country}>{c.country}</option>)}</select></label>
                    <button type="button" className="btn-secondary" aria-label={`Remove recipient ${index + 1}`} onClick={() => setSettings({ ...settings, recipients: settings.recipients.filter((_, i) => i !== index) })}>Remove</button>
                </div>)}
                <div className="flex flex-wrap gap-3"><button type="button" className="btn-secondary" disabled={settings.recipients.length >= 100} onClick={() => setSettings({ ...settings, recipients: [...settings.recipients, { email: "", country: "" }] })}>Add operator email</button><button type="submit" className="btn-primary">{busy ? "Verifying and saving…" : "Save enquiry settings"}</button></div>
            </fieldset>
        </form>}
        {settings && <div className="mt-8"><div className="flex flex-wrap items-center justify-between gap-3 mb-3"><h3 className="font-semibold text-primary">Recent enquiries</h3><button type="button" className="btn-secondary" disabled={busy} onClick={load}>Refresh</button></div><p className="text-xs text-muted mb-3">Sent means the SMTP server accepted the email. For uncertain or stalled sending entries, check the sender’s mail logs before any manual resend to avoid duplicates. Refresh reloads saved settings.</p>
            <div className="max-h-80 overflow-auto" tabIndex={0} role="region" aria-label="Recent enquiry deliveries"><table className="w-full text-sm text-left"><thead><tr><th className="p-2">Customer</th><th className="p-2">Route</th><th className="p-2">Assigned operator</th><th className="p-2">Delivery</th></tr></thead><tbody>{deliveries.map(d => <tr key={d.id} className="border-t border-white/10"><td className="p-2 break-all">{d.contact.name && <><strong>{d.contact.name}</strong><br/></>}{d.contact.email}<br/>{d.contact.phone}<br/>{d.contact.phone_country}</td><td className="p-2">{d.route.origin.name} → {d.route.destination.name}<br/>{d.route.mode}</td><td className="p-2">{d.recipient}</td><td className="p-2">{d.status}<br/><small>{d.id}</small></td></tr>)}</tbody></table>{!deliveries.length && <p className="text-muted p-3">No enquiries yet.</p>}</div>
        </div>}
    </section>;
}
