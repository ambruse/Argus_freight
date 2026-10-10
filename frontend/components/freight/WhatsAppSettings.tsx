"use client";
import { FormEvent, useEffect, useState } from "react";
import api from "@/lib/api";
import SearchComboBox from "@/components/ui/SearchComboBox";
import codes from "@/lib/data/phone-codes.json";
const choices = Object.entries(codes).map(([country,code]) => ({ value:country,label:`${country} (${code})`,searchText:code }));
export default function WhatsAppSettings() {
  const [form,setForm] = useState({country:"Qatar",calling_code:"+974",national_number:""});
  const [loading,setLoading] = useState(true);
  const [saving,setSaving] = useState(false);
  const [error,setError] = useState("");
  const [notice,setNotice] = useState("");
  const [retry,setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setError("");
    api.get('/freight-rates/contact-settings',{signal:controller.signal}).then(r => setForm(r.data))
      .catch(() => { if (!controller.signal.aborted) setError('Unable to load your WhatsApp settings. Please retry.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  },[retry]);
  async function save(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError(""); setNotice("");
    try { const {data} = await api.put('/freight-rates/contact-settings',form); setForm(data); setNotice('WhatsApp number saved. Enquiries for your rates will open a chat with this number.'); }
    catch (e) { setError((e as {response?:{data?:{message?:string}}}).response?.data?.message || 'Unable to save WhatsApp number. Please try again.'); }
    finally { setSaving(false); }
  }
  return <section className="glass p-6 rounded-2xl border border-white/5" aria-labelledby="whatsapp-settings-title">
    <h2 id="whatsapp-settings-title" className="text-lg font-bold text-primary mb-2">WhatsApp enquiries</h2>
    <p className="text-sm text-muted mb-5">Customers requesting a quote for your freight rates will contact this number on WhatsApp. Use your business WhatsApp number.</p>
    {loading ? <p role="status">Loading WhatsApp settings…</p> : <form onSubmit={save} className="space-y-4">
      <label className="block text-xs font-semibold text-muted">Country code
        <div className="mt-2"><SearchComboBox required label="WhatsApp country code" options={choices} value={form.country} onChange={country => { setNotice(""); setForm(f => ({...f,country,calling_code:codes[country as keyof typeof codes] || ""})); }} /></div>
      </label>
      <label className="block text-xs font-semibold text-muted" htmlFor="whatsapp-national">WhatsApp number</label>
      <div className="flex items-center gap-2"><span className="text-sm text-muted shrink-0">{form.calling_code || "+"}</span><input id="whatsapp-national" className="input w-full" type="tel" inputMode="tel" autoComplete="tel-national" required maxLength={25} value={form.national_number} placeholder="Enter number without country code" onChange={e => { setNotice(""); setForm({...form,national_number:e.target.value}); }} /></div>
      <p className="text-xs text-muted">Enter the remaining number, including any required leading zero. Saving makes this number available through your public rate enquiry buttons.</p>
      <button type="submit" className="btn-primary w-full justify-center" disabled={saving || !form.country}>{saving ? 'Saving…' : 'Save WhatsApp number'}</button>
    </form>}
    {error && <p role="alert" className="text-sm mt-4">{error} <button type="button" className="underline" onClick={() => setRetry(n=>n+1)}>Reload settings</button></p>}
    {notice && <p role="status" className="text-sm mt-4 text-primary">{notice}</p>}
  </section>;
}
