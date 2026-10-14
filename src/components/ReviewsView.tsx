import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Star, 
  MessageSquare, 
  Upload, 
  Check, 
  ShieldCheck, 
  AlertCircle,
  ThumbsUp,
  Home,
  ShoppingBag
} from 'lucide-react';

export const ReviewsView: React.FC = () => {
  const { feedbackList, submitFeedback, navigateTo, setIsCartOpen, cartTotalCount, t } = useApp();

  const [formOpen, setFormOpen] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [feedbackText, setFeedbackText] = useState('');
  const [rating, setRating] = useState(5);
  const [consentToPublish, setConsentToPublish] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filter approved feedback for public view
  const approvedFeedback = feedbackList.filter(f => f.status === 'approved');

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('Image size must be less than 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setUploadedImage(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!feedbackText.trim() && !uploadedImage) {
      setErrorMsg('Please provide either review text or a photo of your cake.');
      return;
    }

    if (!consentToPublish) {
      setErrorMsg('Please accept publication consent to allow display on our website.');
      return;
    }

    submitFeedback({
      customerName: customerName.trim() || 'Guest Customer',
      feedbackText: feedbackText.trim() || undefined,
      rating,
      imageUrls: uploadedImage ? [uploadedImage] : undefined,
      consentToPublish: true
    });

    setSubmittedSuccess(true);
    setCustomerName('');
    setFeedbackText('');
    setUploadedImage(null);
    setConsentToPublish(false);
  };

  return (
    <div className="py-10 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-8">
      {/* Top Navigation Row: Home, Cart */}
      <div className="flex items-center justify-between gap-4 pb-2 border-b border-[#E8D5C8]/80 flex-wrap">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigateTo('home')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#4B2E25]/80 hover:text-[#4B2E25] bg-white px-3.5 py-2 rounded-xl border border-[#E8D5C8] shadow-2xs transition-colors"
            title="Return to Home"
          >
            <Home className="w-4 h-4 text-[#C5A15A]" />
            <span>Home</span>
          </button>

          <button
            type="button"
            onClick={() => setIsCartOpen(true)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#4B2E25]/80 hover:text-[#4B2E25] bg-white px-3.5 py-2 rounded-xl border border-[#E8D5C8] shadow-2xs transition-colors"
            title="Open Shopping Cart"
          >
            <ShoppingBag className="w-4 h-4 text-[#C5A15A]" />
            <span>Cart</span>
            {cartTotalCount > 0 && (
              <span className="font-mono text-[#C5A15A] font-bold">({cartTotalCount})</span>
            )}
          </button>
        </div>

        <span className="text-xs text-[#4B2E25]/60 font-medium hidden sm:inline">
          Customer Stories & Cake Celebrations
        </span>
      </div>

      {/* Header & Write CTA */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#4B2E25]">
            {t.reviews_title}
          </h1>
          <p className="mt-2 text-[#4B2E25]/75 text-sm sm:text-base max-w-xl">
            {t.reviews_subtitle}
          </p>
        </div>

        <button
          onClick={() => { setFormOpen(!formOpen); setSubmittedSuccess(false); }}
          className="self-start md:self-auto px-5 py-2.5 text-xs font-semibold text-white bg-[#4B2E25] hover:bg-[#38221B] rounded-xl transition-colors shadow-xs"
        >
          {formOpen ? 'Cancel' : t.btn_write_review}
        </button>
      </div>

      {/* Submission Form Panel */}
      {formOpen && (
        <div className="mb-12 bg-white rounded-3xl p-6 sm:p-8 border border-[#E8D5C8] shadow-sm animate-fade-in">
          {submittedSuccess ? (
            <div className="text-center py-6">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-800 rounded-full flex items-center justify-center mx-auto mb-3">
                <Check className="w-6 h-6" />
              </div>
              <h3 className="font-serif text-xl font-bold text-[#4B2E25]">
                Review Submitted for Moderation
              </h3>
              <p className="mt-1 text-xs text-[#4B2E25]/70 max-w-md mx-auto">
                {t.review_pending_note}
              </p>
              <button
                onClick={() => setFormOpen(false)}
                className="mt-4 px-4 py-2 text-xs font-semibold text-[#4B2E25] bg-[#FFF8EF] border border-[#E8D5C8] rounded-xl hover:bg-[#F4D8D8]/30"
              >
                Close
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <h3 className="font-serif text-lg font-bold text-[#4B2E25]">
                Share Your Cake Experience
              </h3>

              {errorMsg && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#4B2E25]/70 mb-1">
                    Your Name (or initials)
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="e.g. Sanya M."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8D5C8] text-sm text-[#4B2E25] focus:outline-hidden focus:ring-2 focus:ring-[#C5A15A]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#4B2E25]/70 mb-1">
                    Experience Rating
                  </label>
                  <div className="flex items-center gap-1.5 py-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        type="button"
                        key={star}
                        onClick={() => setRating(star)}
                        className="p-1 text-[#C5A15A] hover:scale-110 transition-transform"
                      >
                        <Star className={`w-6 h-6 ${star <= rating ? 'fill-[#C5A15A]' : 'stroke-[#C5A15A]'}`} />
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#4B2E25]/70 mb-1">
                  Your Thoughts on the Sponge, Cream & Service
                </label>
                <textarea
                  rows={3}
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder="How was the texture, sweetness level, delivery condition, and guest reaction?"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8D5C8] text-sm text-[#4B2E25] focus:outline-hidden focus:ring-2 focus:ring-[#C5A15A]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#4B2E25]/70 mb-1">
                  Cake Photo or WhatsApp Chat Screenshot
                </label>
                <div className="flex items-center gap-3">
                  <label className="cursor-pointer inline-flex items-center gap-2 px-3.5 py-2 bg-[#FFF8EF] border border-dashed border-[#C5A15A] rounded-xl text-xs font-medium text-[#4B2E25] hover:bg-[#F4D8D8]/30">
                    <Upload className="w-4 h-4 text-[#C5A15A]" />
                    <span>Upload Picture (PNG/JPG)</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>

                  {uploadedImage && (
                    <div className="relative w-12 h-12 rounded-lg overflow-hidden border border-[#E8D5C8]">
                      <img src={uploadedImage} alt="Preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setUploadedImage(null)}
                        className="absolute inset-0 bg-black/50 text-white text-[10px] flex items-center justify-center font-bold"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-2">
                <label className="flex items-start gap-2.5 cursor-pointer text-xs text-[#4B2E25]/85">
                  <input
                    type="checkbox"
                    checked={consentToPublish}
                    onChange={(e) => setConsentToPublish(e.target.checked)}
                    className="mt-0.5 accent-[#4B2E25]"
                  />
                  <span>{t.review_consent}</span>
                </label>
              </div>

              <button
                type="submit"
                className="w-full py-3 px-4 text-xs font-semibold text-white bg-[#4B2E25] hover:bg-[#38221B] rounded-xl transition-colors"
              >
                {t.btn_submit_review}
              </button>
            </form>
          )}
        </div>
      )}

      {/* Approved Reviews List */}
      <div className="space-y-6">
        {approvedFeedback.length > 0 ? (
          approvedFeedback.map(fb => (
            <div 
              key={fb.id}
              className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E8D5C8]/80 shadow-xs"
            >
              <div className="flex items-center justify-between gap-4 mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-[#F4D8D8] text-[#4B2E25] flex items-center justify-center font-serif font-bold text-sm">
                    {fb.customerName?.charAt(0) || 'G'}
                  </div>
                  <div>
                    <h3 className="font-serif font-bold text-sm text-[#4B2E25]">
                      {fb.customerName || 'Verified Guest'}
                    </h3>
                    {fb.cakeName && (
                      <p className="text-[11px] text-[#4B2E25]/60">
                        Catering: {fb.cakeName}
                      </p>
                    )}
                  </div>
                </div>

                {fb.rating && (
                  <div className="flex items-center gap-0.5 text-[#C5A15A]">
                    {Array.from({ length: fb.rating }).map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-[#C5A15A]" />
                    ))}
                  </div>
                )}
              </div>

              {fb.feedbackText && (
                <p className="text-sm text-[#4B2E25]/85 leading-relaxed">
                  "{fb.feedbackText}"
                </p>
              )}

              {/* Photo attachment */}
              {fb.imageUrls && fb.imageUrls.length > 0 && (
                <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
                  {fb.imageUrls.map((url, i) => (
                    <img
                      key={i}
                      src={url}
                      alt="Customer Cake"
                      className="w-28 h-28 object-cover rounded-xl border border-[#E8D5C8]"
                    />
                  ))}
                </div>
              )}

              {/* Shop reply */}
              {fb.publicReply && (
                <div className="mt-4 pl-4 border-l-2 border-[#C5A15A] text-xs text-[#4B2E25]/80 py-1 bg-[#FFF8EF]/50 rounded-r-lg">
                  <strong className="block text-[#4B2E25] mb-0.5">Bakery Response:</strong>
                  {fb.publicReply}
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="text-center py-12 bg-white/60 rounded-3xl border border-[#E8D5C8] p-8">
            <p className="font-serif text-lg font-semibold text-[#4B2E25]">No reviews published yet</p>
            <p className="mt-1 text-xs text-[#4B2E25]/70">
              Be the first guest to share your celebration cake review!
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
