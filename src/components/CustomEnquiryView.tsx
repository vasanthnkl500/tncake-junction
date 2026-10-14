import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { buildWhatsAppLink } from '../utils/whatsapp';
import { 
  Send, 
  Upload, 
  CheckCircle2, 
  AlertCircle, 
  MessageCircle,
  Calendar,
  FileImage,
  X
} from 'lucide-react';

interface CustomEnquiryViewProps {
  onSuccessNavigate?: () => void;
}

export const CustomEnquiryView: React.FC<CustomEnquiryViewProps> = ({ onSuccessNavigate }) => {
  const { settings, t, submitEnquiry } = useApp();

  const [formData, setFormData] = useState({
    customerName: '',
    phone: '',
    occasion: '',
    requiredDate: '',
    flavour: 'Vanilla Bean & Wild Berry',
    approximateWeight: '1.5 kg',
    budgetInr: '',
    deliveryOrPickup: 'delivery' as 'delivery' | 'pickup',
    address: '',
    message: ''
  });

  const [referenceImages, setReferenceImages] = useState<string[]>([]);
  const [submittedRef, setSubmittedRef] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // File upload simulation (encodes image to base64 for persistent preview)
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('Reference photo must be under 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setReferenceImages(prev => [...prev, reader.result as string]);
        setErrorMsg(null);
      }
    };
    reader.readAsDataURL(file);
  };

  const removeImage = (idx: number) => {
    setReferenceImages(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!formData.customerName.trim() || !formData.phone.trim() || !formData.requiredDate) {
      setErrorMsg('Please fill in your name, contact phone number, and required celebration date.');
      return;
    }

    // Minimum notice check
    const selectedDate = new Date(formData.requiredDate);
    const today = new Date();
    const diffDays = Math.ceil((selectedDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < (settings.minNoticeDays || 1)) {
      setErrorMsg(`We require at least ${settings.minNoticeDays} days advance notice for custom handcrafted orders.`);
      return;
    }

    const created = submitEnquiry({
      customerName: formData.customerName,
      phone: formData.phone,
      occasion: formData.occasion || 'Special Celebration',
      requiredDate: formData.requiredDate,
      flavour: formData.flavour,
      approximateWeight: formData.approximateWeight,
      budgetInr: formData.budgetInr ? parseInt(formData.budgetInr, 10) : undefined,
      message: formData.message,
      deliveryOrPickup: formData.deliveryOrPickup,
      address: formData.address,
      referenceImageUrls: referenceImages
    });

    setSubmittedRef(created.referenceNumber);
  };

  const whatsappLink = submittedRef
    ? buildWhatsAppLink(
        settings.whatsappNumber,
        `Hello ${settings.shopName || 'Bakery'}, I have submitted a custom cake enquiry! Reference: *${submittedRef}*. Looking forward to discussing details.`
      )
    : null;

  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
      {submittedRef ? (
        /* Success Confirmation Panel */
        <div className="bg-white rounded-3xl p-8 sm:p-12 border border-[#E8D5C8] shadow-sm text-center max-w-2xl mx-auto">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <h2 className="font-serif text-3xl font-bold text-[#4B2E25]">
            {t.enquiry_success}
          </h2>

          <div className="my-6 p-4 bg-[#FFF8EF] rounded-2xl border border-[#E8D5C8] inline-block">
            <p className="text-xs text-[#4B2E25]/70 uppercase tracking-wider font-semibold">
              {t.enquiry_ref_is}
            </p>
            <p className="font-mono text-2xl font-bold text-[#4B2E25] mt-1">
              {submittedRef}
            </p>
          </div>

          <p className="text-sm text-[#4B2E25]/80 max-w-md mx-auto leading-relaxed mb-8">
            Our master baker will review your design, calculate sponge and structural requirements, and respond with a formal quotation and date confirmation.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {whatsappLink && (
              <a
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-emerald-800 hover:bg-emerald-900 rounded-xl transition-colors shadow-xs"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Notify Bakery on WhatsApp</span>
              </a>
            )}

            <button
              onClick={() => {
                setSubmittedRef(null);
                setFormData({
                  customerName: '',
                  phone: '',
                  occasion: '',
                  requiredDate: '',
                  flavour: 'Vanilla Bean & Wild Berry',
                  approximateWeight: '1.5 kg',
                  budgetInr: '',
                  deliveryOrPickup: 'delivery',
                  address: '',
                  message: ''
                });
                setReferenceImages([]);
                if (onSuccessNavigate) onSuccessNavigate();
              }}
              className="px-6 py-3 text-sm font-medium text-[#4B2E25] bg-white border border-[#E8D5C8] hover:bg-[#F4D8D8]/30 rounded-xl transition-colors"
            >
              Submit Another Enquiry
            </button>
          </div>
        </div>
      ) : (
        /* Form view */
        <div className="bg-white rounded-3xl p-6 sm:p-10 border border-[#E8D5C8] shadow-sm">
          <div className="mb-8">
            <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#4B2E25] text-balance">
              {t.enquiry_title}
            </h1>
            <p className="mt-2 text-sm sm:text-base text-[#4B2E25]/75">
              {t.enquiry_subtitle}
            </p>

            <div className="mt-4 p-3.5 bg-[#FFF8EF] rounded-xl border border-[#E8D5C8] flex items-start gap-2.5 text-xs text-[#4B2E25]/80">
              <AlertCircle className="w-4 h-4 text-[#C5A15A] shrink-0 mt-0.5" />
              <span>{t.enquiry_notice}</span>
            </div>
          </div>

          {errorMsg && (
            <div className="mb-6 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#4B2E25]/70 mb-1.5">
                  {t.field_name} *
                </label>
                <input
                  type="text"
                  required
                  value={formData.customerName}
                  onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                  placeholder="e.g. Radhika Raman"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8D5C8] text-sm text-[#4B2E25] focus:outline-hidden focus:ring-2 focus:ring-[#C5A15A]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#4B2E25]/70 mb-1.5">
                  {t.field_phone} *
                </label>
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+91 98765 43210"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8D5C8] text-sm text-[#4B2E25] focus:outline-hidden focus:ring-2 focus:ring-[#C5A15A]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#4B2E25]/70 mb-1.5">
                  {t.field_occasion}
                </label>
                <input
                  type="text"
                  value={formData.occasion}
                  onChange={(e) => setFormData({ ...formData, occasion: e.target.value })}
                  placeholder="e.g. Baby Shower, 25th Silver Jubilee"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8D5C8] text-sm text-[#4B2E25] focus:outline-hidden focus:ring-2 focus:ring-[#C5A15A]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#4B2E25]/70 mb-1.5">
                  {t.field_date} *
                </label>
                <input
                  type="date"
                  required
                  value={formData.requiredDate}
                  onChange={(e) => setFormData({ ...formData, requiredDate: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8D5C8] text-sm text-[#4B2E25] focus:outline-hidden focus:ring-2 focus:ring-[#C5A15A]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#4B2E25]/70 mb-1.5">
                  {t.field_flavour}
                </label>
                <input
                  type="text"
                  value={formData.flavour}
                  onChange={(e) => setFormData({ ...formData, flavour: e.target.value })}
                  placeholder="e.g. Belgian Truffle"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8D5C8] text-sm text-[#4B2E25] focus:outline-hidden focus:ring-2 focus:ring-[#C5A15A]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#4B2E25]/70 mb-1.5">
                  {t.field_weight}
                </label>
                <input
                  type="text"
                  value={formData.approximateWeight}
                  onChange={(e) => setFormData({ ...formData, approximateWeight: e.target.value })}
                  placeholder="e.g. 2.5 kg"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8D5C8] text-sm text-[#4B2E25] focus:outline-hidden focus:ring-2 focus:ring-[#C5A15A]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#4B2E25]/70 mb-1.5">
                  {t.field_budget}
                </label>
                <input
                  type="number"
                  value={formData.budgetInr}
                  onChange={(e) => setFormData({ ...formData, budgetInr: e.target.value })}
                  placeholder="e.g. 4500"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8D5C8] text-sm text-[#4B2E25] focus:outline-hidden focus:ring-2 focus:ring-[#C5A15A]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#4B2E25]/70 mb-1.5">
                {t.field_preference}
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm text-[#4B2E25] cursor-pointer">
                  <input
                    type="radio"
                    name="deliveryOrPickup"
                    checked={formData.deliveryOrPickup === 'delivery'}
                    onChange={() => setFormData({ ...formData, deliveryOrPickup: 'delivery' })}
                    className="accent-[#4B2E25]"
                  />
                  <span>{t.pref_delivery}</span>
                </label>
                <label className="flex items-center gap-2 text-sm text-[#4B2E25] cursor-pointer">
                  <input
                    type="radio"
                    name="deliveryOrPickup"
                    checked={formData.deliveryOrPickup === 'pickup'}
                    onChange={() => setFormData({ ...formData, deliveryOrPickup: 'pickup' })}
                    className="accent-[#4B2E25]"
                  />
                  <span>{t.pref_pickup}</span>
                </label>
              </div>
            </div>

            {formData.deliveryOrPickup === 'delivery' && (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#4B2E25]/70 mb-1.5">
                  {t.field_address}
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="House / Flat No, Street, Locality & City"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8D5C8] text-sm text-[#4B2E25] focus:outline-hidden focus:ring-2 focus:ring-[#C5A15A]"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#4B2E25]/70 mb-1.5">
                {t.field_message}
              </label>
              <textarea
                rows={3}
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                placeholder="Describe cake theme, colors, piped names or special dietary instructions..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8D5C8] text-sm text-[#4B2E25] focus:outline-hidden focus:ring-2 focus:ring-[#C5A15A]"
              />
            </div>

            {/* Reference Photos */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#4B2E25]/70 mb-1.5">
                {t.field_ref_photo}
              </label>
              <div className="flex flex-wrap items-center gap-3">
                <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2.5 bg-[#FFF8EF] hover:bg-[#F4D8D8]/40 border border-dashed border-[#C5A15A] rounded-xl text-xs font-medium text-[#4B2E25] transition-colors">
                  <Upload className="w-4 h-4 text-[#C5A15A]" />
                  <span>Upload Reference Image (PNG/JPG)</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>

                {referenceImages.map((img, idx) => (
                  <div key={idx} className="relative w-16 h-16 rounded-xl overflow-hidden border border-[#E8D5C8]">
                    <img src={img} alt="Reference" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeImage(idx)}
                      className="absolute top-1 right-1 p-0.5 bg-black/70 text-white rounded-full hover:bg-black"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 px-6 text-sm font-semibold text-white bg-[#4B2E25] hover:bg-[#38221B] rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4 text-[#C5A15A]" />
              <span>{t.btn_submit_enquiry}</span>
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
