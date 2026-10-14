import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { SlideshowSlide, SlideshowSettings } from '../types';
import {
  Upload,
  Plus,
  Trash2,
  Edit2,
  Eye,
  EyeOff,
  MoveUp,
  MoveDown,
  Sparkles,
  Settings,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Image as ImageIcon,
  ArrowRight,
  ExternalLink,
  Save,
  RotateCcw,
  Smartphone,
  Monitor
} from 'lucide-react';

export const AdminSlideshowManager: React.FC = () => {
  const {
    slideshowSettings,
    updateSlideshowSettings,
    slideshowSlides,
    addSlideshowSlide,
    updateSlideshowSlide,
    deleteSlideshowSlide,
    reorderSlideshowSlides,
    showToast
  } = useApp();

  const [activeTab, setActiveTab] = useState<'slides' | 'settings' | 'preview'>('slides');
  const [editingSlide, setEditingSlide] = useState<SlideshowSlide | null>(null);
  const [isSlideModalOpen, setIsSlideModalOpen] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [previewIndex, setPreviewIndex] = useState(0);

  // Form state for editing or adding a slide
  const [formTitle, setFormTitle] = useState('');
  const [formCaption, setFormCaption] = useState('');
  const [formAltText, setFormAltText] = useState('');
  const [formImageUrl, setFormImageUrl] = useState('');
  const [formButtonLabel, setFormButtonLabel] = useState('');
  const [formButtonLink, setFormButtonLink] = useState<'gallery' | 'order' | 'configurator' | 'whatsapp' | ''>('gallery');
  const [formStatus, setFormStatus] = useState<'draft' | 'published'>('published');
  const [formIsEnabled, setFormIsEnabled] = useState(true);

  // Upload state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Local settings copy for batch save
  const [settingsForm, setSettingsForm] = useState<SlideshowSettings>({ ...slideshowSettings });

  // Open modal to add new slide
  const handleOpenAddSlide = () => {
    setEditingSlide(null);
    setFormTitle('');
    setFormCaption('');
    setFormAltText('');
    setFormImageUrl('');
    setFormButtonLabel('');
    setFormButtonLink('gallery');
    setFormStatus('published');
    setFormIsEnabled(true);
    setUploadError(null);
    setIsSlideModalOpen(true);
  };

  // Open modal to edit existing slide
  const handleOpenEditSlide = (slide: SlideshowSlide) => {
    setEditingSlide(slide);
    setFormTitle(slide.title);
    setFormCaption(slide.caption || '');
    setFormAltText(slide.altText);
    setFormImageUrl(slide.imageUrl);
    setFormButtonLabel(slide.buttonLabel || '');
    setFormButtonLink((slide.buttonLink as any) || '');
    setFormStatus(slide.status);
    setFormIsEnabled(slide.isEnabled);
    setUploadError(null);
    setIsSlideModalOpen(true);
  };

  // Handle local file selection and convert to safe image URL with validation
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Strict validation
    if (!file.type.startsWith('image/')) {
      setUploadError('Please select a valid image file (JPEG, PNG, WebP).');
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setUploadError('Image size exceeds 8MB. Please optimize the image before uploading.');
      return;
    }

    setUploadError(null);
    setIsUploading(true);
    setUploadProgress(20);

    const reader = new FileReader();
    reader.onprogress = (event) => {
      if (event.lengthComputable) {
        setUploadProgress(Math.round((event.loaded / event.total) * 90));
      }
    };

    reader.onload = () => {
      setUploadProgress(100);
      setTimeout(() => {
        setIsUploading(false);
        const dataUrl = reader.result as string;
        setFormImageUrl(dataUrl);
        if (!formTitle) {
          const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
          setFormTitle(cleanName.charAt(0).toUpperCase() + cleanName.slice(1));
        }
        if (!formAltText) {
          setFormAltText(`Artisanal celebration cake by Cake Junction`);
        }
      }, 400);
    };

    reader.onerror = () => {
      setIsUploading(false);
      setUploadError('Failed to read image file. Please try another image.');
    };

    reader.readAsDataURL(file);
  };

  // Save slide (add or update)
  const handleSaveSlide = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formImageUrl.trim()) {
      setUploadError('Please upload an image or provide a valid photo URL.');
      return;
    }
    if (!formTitle.trim()) {
      setUploadError('Slide title is required.');
      return;
    }

    if (editingSlide) {
      updateSlideshowSlide(editingSlide.id, {
        title: formTitle.trim(),
        caption: formCaption.trim() || undefined,
        altText: formAltText.trim() || formTitle.trim(),
        imageUrl: formImageUrl.trim(),
        buttonLabel: formButtonLabel.trim() || undefined,
        buttonLink: formButtonLink || undefined,
        status: formStatus,
        isEnabled: formIsEnabled
      });
    } else {
      addSlideshowSlide({
        title: formTitle.trim(),
        caption: formCaption.trim() || undefined,
        altText: formAltText.trim() || formTitle.trim(),
        imageUrl: formImageUrl.trim(),
        order: slideshowSlides.length,
        isEnabled: formIsEnabled,
        status: formStatus,
        buttonLabel: formButtonLabel.trim() || undefined,
        buttonLink: formButtonLink || undefined
      });
    }

    setIsSlideModalOpen(false);
  };

  // Move slide up / down
  const handleMoveSlide = (index: number, direction: 'up' | 'down') => {
    const sorted = [...slideshowSlides].sort((a, b) => a.order - b.order);
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= sorted.length) return;

    const currentSlide = sorted[index];
    const targetSlide = sorted[targetIndex];

    sorted[index] = targetSlide;
    sorted[targetIndex] = currentSlide;

    const reorderedIds = sorted.map(s => s.id);
    reorderSlideshowSlides(reorderedIds);
  };

  // Delete slide confirmation
  const handleDeleteSlide = (slide: SlideshowSlide) => {
    if (window.confirm(`Are you sure you want to remove "${slide.title}" from the slideshow?`)) {
      deleteSlideshowSlide(slide.id);
    }
  };

  // Save settings
  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    updateSlideshowSettings(settingsForm);
  };

  const sortedSlides = [...slideshowSlides].sort((a, b) => a.order - b.order);
  const publishedCount = sortedSlides.filter(s => s.status === 'published' && s.isEnabled).length;

  return (
    <div className="space-y-6">
      
      {/* Top Header & Overview */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E8D5C8] shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFF8EF] border border-[#E8D5C8] text-[#C5A15A] text-xs font-semibold mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Dedicated Slideshow Studio</span>
            </div>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#4B2E25]">
              Homepage Cake Slideshow
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-[#4B2E25]/75 max-w-2xl">
              Curate the boutique carousel featured prominently on the homepage. Only images explicitly uploaded, ordered, and published here will appear on the public site.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenAddSlide}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-[#4B2E25] hover:bg-[#38221B] rounded-xl shadow-xs transition-all active:scale-95"
            >
              <Plus className="w-4 h-4 text-[#C5A15A]" />
              <span>+ Add New Slide</span>
            </button>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="mt-6 flex flex-wrap gap-2 border-b border-[#E8D5C8]/60 pb-3">
          <button
            onClick={() => setActiveTab('slides')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'slides'
                ? 'bg-[#4B2E25] text-white shadow-xs'
                : 'bg-[#FFF8EF] text-[#4B2E25] hover:bg-[#F4D8D8]'
            }`}
          >
            Slides Library ({slideshowSlides.length})
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'settings'
                ? 'bg-[#4B2E25] text-white shadow-xs'
                : 'bg-[#FFF8EF] text-[#4B2E25] hover:bg-[#F4D8D8]'
            }`}
          >
            Carousel Settings & Timing
          </button>
          <button
            onClick={() => setActiveTab('preview')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'preview'
                ? 'bg-[#4B2E25] text-white shadow-xs'
                : 'bg-[#FFF8EF] text-[#4B2E25] hover:bg-[#F4D8D8]'
            }`}
          >
            Live Preview Simulator ({publishedCount} Active)
          </button>
        </div>
      </div>

      {/* TAB 1: SLIDES LIBRARY & REORDERING */}
      {activeTab === 'slides' && (
        <div className="space-y-4">
          <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-4 text-xs text-amber-900 flex items-start gap-3">
            <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Strict Publishing Policy</p>
              <p className="mt-0.5 text-amber-800/90 leading-relaxed">
                Catalogue cakes, customer order attachments, and general photos are never shown here automatically. Only slides with <strong>Status: Published</strong> and <strong>Visibility: Enabled</strong> are displayed in the homepage carousel.
              </p>
            </div>
          </div>

          {sortedSlides.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-[#E8D5C8] space-y-4">
              <ImageIcon className="w-12 h-12 text-[#C5A15A]/60 mx-auto" />
              <div className="space-y-1">
                <h3 className="font-serif text-lg font-bold text-[#4B2E25]">No Slides in Library</h3>
                <p className="text-xs text-[#4B2E25]/70 max-w-sm mx-auto">
                  Add your first cake photograph to launch the homepage boutique slideshow.
                </p>
              </div>
              <button
                onClick={handleOpenAddSlide}
                className="px-5 py-2.5 text-xs font-semibold text-white bg-[#4B2E25] hover:bg-[#38221B] rounded-xl shadow-xs"
              >
                + Upload First Slide
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-3xl overflow-hidden border border-[#E8D5C8] shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#FFF8EF] text-[#4B2E25] border-b border-[#E8D5C8] uppercase font-semibold text-[10px] tracking-wider">
                    <tr>
                      <th className="py-3.5 px-4 w-12 text-center">Seq</th>
                      <th className="py-3.5 px-4">Photo Preview</th>
                      <th className="py-3.5 px-4">Title & Description</th>
                      <th className="py-3.5 px-4">Call to Action</th>
                      <th className="py-3.5 px-4">Status & Visibility</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E8D5C8]/60 text-[#4B2E25]">
                    {sortedSlides.map((slide, index) => {
                      const isFirst = index === 0;
                      const isLast = index === sortedSlides.length - 1;

                      return (
                        <tr key={slide.id} className="hover:bg-[#FFF8EF]/40 transition-colors">
                          {/* Sequence and Reorder Arrows */}
                          <td className="py-3 px-4 text-center">
                            <div className="flex flex-col items-center gap-1">
                              <button
                                type="button"
                                disabled={isFirst}
                                onClick={() => handleMoveSlide(index, 'up')}
                                className="p-1 rounded text-[#4B2E25]/60 hover:text-[#4B2E25] disabled:opacity-20 hover:bg-black/5"
                                title="Move slide up"
                              >
                                <MoveUp className="w-3.5 h-3.5" />
                              </button>
                              <span className="font-semibold text-xs text-[#4B2E25] bg-[#FFF8EF] px-1.5 py-0.5 rounded border border-[#E8D5C8]">
                                {index + 1}
                              </span>
                              <button
                                type="button"
                                disabled={isLast}
                                onClick={() => handleMoveSlide(index, 'down')}
                                className="p-1 rounded text-[#4B2E25]/60 hover:text-[#4B2E25] disabled:opacity-20 hover:bg-black/5"
                                title="Move slide down"
                              >
                                <MoveDown className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>

                          {/* Image Thumbnail */}
                          <td className="py-3 px-4">
                            <div className="w-24 h-16 rounded-xl overflow-hidden bg-black/5 border border-[#E8D5C8] relative">
                              <img
                                src={slide.imageUrl}
                                alt={slide.altText}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          </td>

                          {/* Title and details */}
                          <td className="py-3 px-4 max-w-xs">
                            <strong className="font-serif text-sm font-bold text-[#4B2E25] block truncate">
                              {slide.title}
                            </strong>
                            {slide.caption ? (
                              <p className="text-xs text-[#4B2E25]/75 line-clamp-1 mt-0.5">
                                {slide.caption}
                              </p>
                            ) : (
                              <span className="text-[11px] text-[#4B2E25]/40 italic">No caption</span>
                            )}
                            <span className="text-[10px] text-[#4B2E25]/60 block mt-1 truncate">
                              Alt: {slide.altText}
                            </span>
                          </td>

                          {/* CTA */}
                          <td className="py-3 px-4">
                            {slide.buttonLabel ? (
                              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#FFF8EF] border border-[#E8D5C8] text-[11px] font-medium text-[#4B2E25]">
                                <Sparkles className="w-3 h-3 text-[#C5A15A]" />
                                <span>{slide.buttonLabel}</span>
                                <span className="text-[9px] text-[#4B2E25]/60 font-mono">
                                  ({slide.buttonLink || 'link'})
                                </span>
                              </div>
                            ) : (
                              <span className="text-xs text-[#4B2E25]/40 italic">None</span>
                            )}
                          </td>

                          {/* Status and Active Toggles */}
                          <td className="py-3 px-4">
                            <div className="space-y-1.5">
                              <div className="flex items-center gap-1.5">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                                    slide.status === 'published'
                                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                      : 'bg-amber-100 text-amber-800 border border-amber-300'
                                  }`}
                                >
                                  {slide.status}
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateSlideshowSlide(slide.id, {
                                      status: slide.status === 'published' ? 'draft' : 'published'
                                    })
                                  }
                                  className="text-[10px] text-[#4B2E25]/70 hover:underline"
                                >
                                  Toggle
                                </button>
                              </div>

                              <button
                                type="button"
                                onClick={() =>
                                  updateSlideshowSlide(slide.id, { isEnabled: !slide.isEnabled })
                                }
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium border transition-colors ${
                                  slide.isEnabled
                                    ? 'bg-white text-emerald-800 border-emerald-300'
                                    : 'bg-gray-100 text-gray-500 border-gray-300'
                                }`}
                              >
                                {slide.isEnabled ? (
                                  <>
                                    <Eye className="w-3 h-3 text-emerald-600" />
                                    <span>Visible</span>
                                  </>
                                ) : (
                                  <>
                                    <EyeOff className="w-3 h-3 text-gray-400" />
                                    <span>Hidden</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </td>

                          {/* Action Buttons */}
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleOpenEditSlide(slide)}
                                className="p-2 rounded-xl text-[#4B2E25] hover:bg-[#FFF8EF] border border-[#E8D5C8] transition-colors"
                                title="Edit slide content"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteSlide(slide)}
                                className="p-2 rounded-xl text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors"
                                title="Delete slide from slideshow"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: CAROUSEL SETTINGS & TIMING */}
      {activeTab === 'settings' && (
        <form onSubmit={handleSaveSettings} className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E8D5C8] shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-[#E8D5C8]/60 pb-4">
            <div>
              <h3 className="font-serif text-lg font-bold text-[#4B2E25]">Carousel Behaviour & Display Settings</h3>
              <p className="text-xs text-[#4B2E25]/75">Customize auto-sliding intervals, layout, headings, and animations.</p>
            </div>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-5 py-2.5 text-xs font-semibold text-white bg-[#4B2E25] hover:bg-[#38221B] rounded-xl shadow-xs transition-all active:scale-95"
            >
              <Save className="w-3.5 h-3.5 text-[#C5A15A]" />
              <span>Save Settings</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Section Visibility */}
            <div className="p-4 rounded-2xl bg-[#FFF8EF]/50 border border-[#E8D5C8] space-y-2">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-xs font-semibold text-[#4B2E25]">Enable Homepage Slideshow Section</span>
                <input
                  type="checkbox"
                  checked={settingsForm.isEnabled}
                  onChange={e => setSettingsForm({ ...settingsForm, isEnabled: e.target.checked })}
                  className="w-4 h-4 rounded text-[#4B2E25] focus:ring-[#C5A15A]"
                />
              </label>
              <p className="text-[11px] text-[#4B2E25]/70">
                When unchecked, the slideshow section is completely hidden from the public homepage.
              </p>
            </div>

            {/* Autoplay Toggle */}
            <div className="p-4 rounded-2xl bg-[#FFF8EF]/50 border border-[#E8D5C8] space-y-2">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-xs font-semibold text-[#4B2E25]">Automatic Slide Advancement</span>
                <input
                  type="checkbox"
                  checked={settingsForm.autoplay}
                  onChange={e => setSettingsForm({ ...settingsForm, autoplay: e.target.checked })}
                  className="w-4 h-4 rounded text-[#4B2E25] focus:ring-[#C5A15A]"
                />
              </label>
              <p className="text-[11px] text-[#4B2E25]/70">
                Slides advance automatically every few seconds. Pauses during mouse hover, touch interaction, or reduced motion.
              </p>
            </div>

            {/* Heading & Subtitle */}
            <div className="space-y-1.5 md:col-span-2">
              <label className="block text-xs font-semibold text-[#4B2E25]">Section Title</label>
              <input
                type="text"
                value={settingsForm.heading}
                onChange={e => setSettingsForm({ ...settingsForm, heading: e.target.value })}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#E8D5C8] bg-white focus:outline-none focus:ring-2 focus:ring-[#C5A15A]"
                placeholder="A Glimpse of Our Sweet Creations"
                required
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label className="block text-xs font-semibold text-[#4B2E25]">Subtitle</label>
              <input
                type="text"
                value={settingsForm.subtitle}
                onChange={e => setSettingsForm({ ...settingsForm, subtitle: e.target.value })}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#E8D5C8] bg-white focus:outline-none focus:ring-2 focus:ring-[#C5A15A]"
                placeholder="Made fresh with love, for your special moments."
              />
            </div>

            {/* Slide Interval Seconds */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold text-[#4B2E25]">Slide Interval</label>
                <span className="text-xs font-bold text-[#4B2E25]">{settingsForm.slideIntervalSeconds} seconds</span>
              </div>
              <input
                type="range"
                min="3"
                max="12"
                step="1"
                value={settingsForm.slideIntervalSeconds}
                onChange={e => setSettingsForm({ ...settingsForm, slideIntervalSeconds: Number(e.target.value) })}
                className="w-full accent-[#4B2E25]"
              />
              <span className="text-[10px] text-[#4B2E25]/60">Recommended: 4 to 5 seconds per cake image</span>
            </div>

            {/* Transition Style */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[#4B2E25]">Transition Animation</label>
              <select
                value={settingsForm.transitionStyle}
                onChange={e => setSettingsForm({ ...settingsForm, transitionStyle: e.target.value as any })}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#E8D5C8] bg-white focus:outline-none focus:ring-2 focus:ring-[#C5A15A]"
              >
                <option value="slide">Smooth Horizontal Slide</option>
                <option value="fade">Gentle Dissolve Fade</option>
              </select>
            </div>

            {/* Desktop Layout */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[#4B2E25]">Desktop Layout Arrangement</label>
              <select
                value={settingsForm.desktopLayout}
                onChange={e => setSettingsForm({ ...settingsForm, desktopLayout: e.target.value as any })}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#E8D5C8] bg-white focus:outline-none focus:ring-2 focus:ring-[#C5A15A]"
              >
                <option value="featured_with_peek">Featured Slide + Up Next Peek & Mini List</option>
                <option value="single_focus">Single Focus Cinema Carousel</option>
              </select>
            </div>

            {/* Controls Toggles */}
            <div className="space-y-2 p-3 bg-[#FFF8EF]/50 rounded-2xl border border-[#E8D5C8]">
              <span className="text-xs font-semibold text-[#4B2E25] block mb-1">Visual Navigation Elements</span>
              <label className="flex items-center gap-2 text-xs text-[#4B2E25] cursor-pointer">
                <input
                  type="checkbox"
                  checked={settingsForm.showArrows}
                  onChange={e => setSettingsForm({ ...settingsForm, showArrows: e.target.checked })}
                  className="rounded text-[#4B2E25]"
                />
                <span>Show navigation arrows (desktop & tablet)</span>
              </label>
              <label className="flex items-center gap-2 text-xs text-[#4B2E25] cursor-pointer">
                <input
                  type="checkbox"
                  checked={settingsForm.showPaginationDots}
                  onChange={e => setSettingsForm({ ...settingsForm, showPaginationDots: e.target.checked })}
                  className="rounded text-[#4B2E25]"
                />
                <span>Show pagination dots</span>
              </label>
              <label className="flex items-center gap-2 text-xs text-[#4B2E25] cursor-pointer">
                <input
                  type="checkbox"
                  checked={settingsForm.showCaptions}
                  onChange={e => setSettingsForm({ ...settingsForm, showCaptions: e.target.checked })}
                  className="rounded text-[#4B2E25]"
                />
                <span>Show title and captions over images</span>
              </label>
              <label className="flex items-center gap-2 text-xs text-[#4B2E25] cursor-pointer">
                <input
                  type="checkbox"
                  checked={settingsForm.showCounter}
                  onChange={e => setSettingsForm({ ...settingsForm, showCounter: e.target.checked })}
                  className="rounded text-[#4B2E25]"
                />
                <span>Show slide position counter (e.g. 1 / 4)</span>
              </label>
            </div>

          </div>

          <div className="pt-4 flex justify-end">
            <button
              type="submit"
              className="px-6 py-3 text-xs font-semibold text-white bg-[#4B2E25] hover:bg-[#38221B] rounded-xl shadow-xs transition-all"
            >
              Save Carousel Settings
            </button>
          </div>
        </form>
      )}

      {/* TAB 3: LIVE SIMULATOR / PREVIEW */}
      {activeTab === 'preview' && (
        <div className="space-y-4">
          <div className="bg-white rounded-3xl p-4 sm:p-6 border border-[#E8D5C8] shadow-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[#4B2E25]">Device View:</span>
              <button
                type="button"
                onClick={() => setPreviewDevice('desktop')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold ${
                  previewDevice === 'desktop'
                    ? 'bg-[#4B2E25] text-white shadow-xs'
                    : 'bg-[#FFF8EF] text-[#4B2E25]'
                }`}
              >
                <Monitor className="w-3.5 h-3.5" />
                <span>Desktop</span>
              </button>
              <button
                type="button"
                onClick={() => setPreviewDevice('mobile')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold ${
                  previewDevice === 'mobile'
                    ? 'bg-[#4B2E25] text-white shadow-xs'
                    : 'bg-[#FFF8EF] text-[#4B2E25]'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Mobile (375px)</span>
              </button>
            </div>

            <span className="text-xs text-[#4B2E25]/70">
              Only showing {publishedCount} published & enabled slides
            </span>
          </div>

          <div className="flex justify-center p-4 bg-[#F8F1EB] rounded-3xl border border-[#E8D5C8]">
            <div className={previewDevice === 'mobile' ? 'w-[375px] transition-all' : 'w-full max-w-5xl transition-all'}>
              {publishedCount === 0 ? (
                <div className="bg-white rounded-2xl p-8 text-center text-xs text-[#4B2E25]/70 border border-[#E8D5C8]">
                  No published slides available to preview. Mark at least one slide as published and visible.
                </div>
              ) : (
                <div className="bg-[#FFF8EF] rounded-3xl p-4 sm:p-6 border border-[#E8D5C8] shadow-md">
                  <div className="text-center mb-4">
                    <span className="text-[10px] font-semibold text-[#C5A15A] uppercase tracking-wider block">
                      Atelier Showcase
                    </span>
                    <h3 className="font-serif text-xl sm:text-2xl font-bold text-[#4B2E25]">
                      {slideshowSettings.heading}
                    </h3>
                    <p className="text-xs text-[#4B2E25]/70">{slideshowSettings.subtitle}</p>
                  </div>

                  {/* Mock stage */}
                  <div className="relative rounded-2xl overflow-hidden aspect-16/10 bg-black/10 border border-[#E8D5C8]">
                    {sortedSlides.filter(s => s.status === 'published' && s.isEnabled).map((slide, idx) => {
                      if (idx !== previewIndex % publishedCount) return null;
                      return (
                        <div key={slide.id} className="relative w-full h-full">
                          <img src={slide.imageUrl} alt={slide.altText} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-4 text-white">
                            <h4 className="font-serif text-base sm:text-lg font-bold">{slide.title}</h4>
                            {slide.caption && <p className="text-xs text-white/90">{slide.caption}</p>}
                            {slide.buttonLabel && (
                              <div className="mt-2">
                                <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white text-[#4B2E25] text-xs font-semibold">
                                  {slide.buttonLabel} <ArrowRight className="w-3 h-3" />
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Simulator Controls */}
                  <div className="mt-3 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setPreviewIndex(prev => (prev - 1 + publishedCount) % publishedCount)}
                      className="text-xs font-semibold text-[#4B2E25] px-2.5 py-1 bg-white rounded-lg border border-[#E8D5C8]"
                    >
                      ← Prev
                    </button>
                    <span className="text-xs text-[#4B2E25]">
                      Slide {(previewIndex % publishedCount) + 1} of {publishedCount}
                    </span>
                    <button
                      type="button"
                      onClick={() => setPreviewIndex(prev => (prev + 1) % publishedCount)}
                      className="text-xs font-semibold text-[#4B2E25] px-2.5 py-1 bg-white rounded-lg border border-[#E8D5C8]"
                    >
                      Next →
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT SLIDE */}
      {isSlideModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 border border-[#E8D5C8] shadow-2xl my-8 space-y-6">
            <div className="flex items-center justify-between border-b border-[#E8D5C8]/60 pb-3">
              <h3 className="font-serif text-xl font-bold text-[#4B2E25]">
                {editingSlide ? 'Edit Slideshow Cake' : 'Upload & Add Cake to Slideshow'}
              </h3>
              <button
                type="button"
                onClick={() => setIsSlideModalOpen(false)}
                className="w-8 h-8 rounded-full bg-[#FFF8EF] text-[#4B2E25] hover:bg-[#F4D8D8] flex items-center justify-center text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveSlide} className="space-y-4">
              
              {/* Photo Upload Area */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-[#4B2E25]">
                  Cake Photograph * (Upload from Device or paste URL)
                </label>

                {formImageUrl ? (
                  <div className="relative rounded-2xl overflow-hidden aspect-16/9 bg-black/5 border border-[#E8D5C8]">
                    <img src={formImageUrl} alt="Preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => {
                        setFormImageUrl('');
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      className="absolute top-2 right-2 px-2.5 py-1 rounded-lg bg-black/70 text-white text-xs hover:bg-black"
                    >
                      Change Photo
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="cursor-pointer border-2 border-dashed border-[#E8D5C8] hover:border-[#C5A15A] rounded-2xl p-6 text-center bg-[#FFF8EF]/50 hover:bg-[#FFF8EF] transition-all space-y-2"
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <Upload className="w-8 h-8 text-[#C5A15A] mx-auto" />
                    <div className="text-xs text-[#4B2E25]">
                      <span className="font-bold underline text-[#4B2E25]">Click to choose photo</span> or drag and drop
                    </div>
                    <p className="text-[10px] text-[#4B2E25]/60">JPEG, PNG, WebP up to 8MB</p>
                  </div>
                )}

                {/* Progress bar */}
                {isUploading && (
                  <div className="space-y-1">
                    <div className="w-full bg-[#E8D5C8]/40 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-[#4B2E25] h-full transition-all duration-200"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-[#4B2E25]/60">Uploading... {uploadProgress}%</span>
                  </div>
                )}

                {/* Image URL fallback */}
                <div className="pt-1">
                  <input
                    type="url"
                    value={formImageUrl}
                    onChange={e => setFormImageUrl(e.target.value)}
                    placeholder="Or enter direct image URL (https://...)"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[#E8D5C8] bg-white focus:outline-none focus:ring-1 focus:ring-[#C5A15A]"
                  />
                </div>

                {uploadError && (
                  <p className="text-xs text-rose-600 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>{uploadError}</span>
                  </p>
                )}
              </div>

              {/* Title */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-[#4B2E25]">Slide Title *</label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={e => setFormTitle(e.target.value)}
                  placeholder="e.g. Botanical Cascading Wedding Tier"
                  required
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-[#E8D5C8] bg-white focus:outline-none focus:ring-2 focus:ring-[#C5A15A]"
                />
              </div>

              {/* Caption */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-[#4B2E25]">Short Caption / Flavour Note</label>
                <input
                  type="text"
                  value={formCaption}
                  onChange={e => setFormCaption(e.target.value)}
                  placeholder="e.g. Vanilla bean sponge with raspberry compote & handcrafted sugar petals"
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-[#E8D5C8] bg-white focus:outline-none focus:ring-2 focus:ring-[#C5A15A]"
                />
              </div>

              {/* Alt Text for Accessibility & SEO */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-[#4B2E25]">
                  Accessibility Alt Text * (Description for screen readers & SEO)
                </label>
                <input
                  type="text"
                  value={formAltText}
                  onChange={e => setFormAltText(e.target.value)}
                  placeholder="e.g. Three-tiered blush pink celebration cake decorated with edible gold leaf"
                  required
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-[#E8D5C8] bg-white focus:outline-none focus:ring-2 focus:ring-[#C5A15A]"
                />
              </div>

              {/* Action Button Label & Route */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-[#4B2E25]">Button Label (Optional)</label>
                  <input
                    type="text"
                    value={formButtonLabel}
                    onChange={e => setFormButtonLabel(e.target.value)}
                    placeholder="e.g. Explore Cakes or Enquire"
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-[#E8D5C8] bg-white focus:outline-none focus:ring-2 focus:ring-[#C5A15A]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-[#4B2E25]">Button Destination</label>
                  <select
                    value={formButtonLink}
                    onChange={e => setFormButtonLink(e.target.value as any)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-[#E8D5C8] bg-white focus:outline-none focus:ring-2 focus:ring-[#C5A15A]"
                  >
                    <option value="gallery">Browse Cake Gallery</option>
                    <option value="order">Place an Order / Quote</option>
                    <option value="configurator">Custom Cake Configurator</option>
                    <option value="whatsapp">Chat on WhatsApp (Pre-filled enquiry)</option>
                  </select>
                </div>
              </div>

              {/* Status and Active Toggles */}
              <div className="p-3 bg-[#FFF8EF]/50 rounded-2xl border border-[#E8D5C8] flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-[#4B2E25] block">Publication State</span>
                  <span className="text-[10px] text-[#4B2E25]/70">
                    Drafts remain hidden until explicitly published.
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <select
                    value={formStatus}
                    onChange={e => setFormStatus(e.target.value as any)}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-[#E8D5C8] bg-white text-[#4B2E25]"
                  >
                    <option value="published">Published</option>
                    <option value="draft">Draft (Private)</option>
                  </select>

                  <label className="flex items-center gap-1.5 text-xs text-[#4B2E25] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formIsEnabled}
                      onChange={e => setFormIsEnabled(e.target.checked)}
                      className="rounded text-[#4B2E25]"
                    />
                    <span>Enabled</span>
                  </label>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-3 flex items-center justify-end gap-2 border-t border-[#E8D5C8]/60">
                <button
                  type="button"
                  onClick={() => setIsSlideModalOpen(false)}
                  className="px-4 py-2.5 text-xs font-medium text-[#4B2E25] bg-white border border-[#E8D5C8] hover:bg-[#FFF8EF] rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploading}
                  className="px-5 py-2.5 text-xs font-semibold text-white bg-[#4B2E25] hover:bg-[#38221B] rounded-xl shadow-xs transition-all disabled:opacity-50"
                >
                  {editingSlide ? 'Save Slide Updates' : 'Add to Slideshow'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};
