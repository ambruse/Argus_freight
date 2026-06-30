"use client";
import { useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import api from "@/lib/api";
import toast from "react-hot-toast";

export default function CallEnquiryEntry() {
  const [form, setForm] = useState({
    customer_name: "",
    company: "",
    type: "",
    customer_number: "",
    customer_email: "",
    customer_address: "",
    details: "",
    status: "Lead",
  });
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.customer_name) {
      return toast.error("Customer Name is compulsory.");
    }
    if (!form.customer_number) {
      return toast.error("Customer Number is compulsory.");
    }
    if (!form.details) {
      return toast.error("Details is compulsory.");
    }

    setSubmitting(true);
    try {
      const payload = {
        ...form,
        is_lead: form.status === "Lead"
      };
      await api.post("/call-enquiries", payload);
      toast.success("Call Enquiry logged successfully. Assigned to Sales.");
      setForm({
        customer_name: "",
        company: "",
        type: "",
        customer_number: "",
        customer_email: "",
        customer_address: "",
        details: "",
        status: "Lead",
      });
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to log enquiry.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppLayout title="New Call Enquiry" subtitle="Log a new call and automatically assign it to a Sales representative.">
      <div className="max-w-3xl mx-auto glass rounded-2xl shadow-card p-6 md:p-8">
        <h3 className="text-sm font-semibold uppercase tracking-widest text-muted border-b border-white/[0.06] pb-3 mb-6">
          Enquiry Details
        </h3>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-[10px] uppercase tracking-widest font-semibold text-muted mb-1.5">
                Customer Name <span className="text-rose">*</span>
              </label>
              <input
                name="customer_name"
                value={form.customer_name}
                onChange={handleChange}
                className="input"
                placeholder="John Doe"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-widest font-semibold text-muted mb-1.5">
                Company
              </label>
              <input
                name="company"
                value={form.company}
                onChange={handleChange}
                className="input"
                placeholder="ABC Corp"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-widest font-semibold text-muted mb-1.5">
                Type
              </label>
              <input
                name="type"
                value={form.type}
                onChange={handleChange}
                className="input"
                placeholder="E.g., Air Freight, B2B"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-widest font-semibold text-muted mb-1.5">
                Customer Number <span className="text-rose">*</span>
              </label>
              <input
                name="customer_number"
                value={form.customer_number}
                onChange={handleChange}
                className="input"
                placeholder="+1 234 567 890"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-widest font-semibold text-muted mb-1.5">
                Customer Email
              </label>
              <input
                name="customer_email"
                type="email"
                value={form.customer_email}
                onChange={handleChange}
                className="input"
                placeholder="john@example.com"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-widest font-semibold text-muted mb-1.5">
                Status <span className="text-rose">*</span>
              </label>
              <select name="status" value={form.status} onChange={handleChange} className="select">
                <option value="Lead">Lead</option>
                <option value="No Lead">No Lead</option>
              </select>
            </div>
          </div>
          
          <div>
            <label className="block text-[10px] uppercase tracking-widest font-semibold text-muted mb-1.5">
              Customer Address
            </label>
            <input
              name="customer_address"
              value={form.customer_address}
              onChange={handleChange}
              className="input"
              placeholder="123 Business St..."
            />
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-widest font-semibold text-muted mb-1.5">
              Details <span className="text-rose">*</span>
            </label>
            <textarea
              name="details"
              value={form.details}
              onChange={handleChange}
              className="input min-h-[120px] py-3"
              placeholder="What did the customer discuss? What are their requirements?"
            />
          </div>

          <div className="pt-4 border-t border-white/[0.06] flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary w-full md:w-auto px-12"
            >
              {submitting ? "Logging..." : "Done"}
            </button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
