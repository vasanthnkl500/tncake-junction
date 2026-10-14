import React, { useState, useEffect } from 'react';
import { Cake, CakeImage, CakeWeightOption, CakeSpecification } from '../types';
import { formatIndianCurrency } from '../utils/whatsapp';
import { 
  X, 
  Upload, 
  Plus, 
  Trash2, 
  ArrowLeft, 
  ArrowRight, 
  Star, 
  Check, 
  Eye, 
  Sparkles,
  AlertCircle
} from 'lucide-react';

interface AdminCakeEditorModalProps {
  isOpen: boolean;
  cake: Cake | null;
  onClose: () => void;
  onSave: (cakeData: Omit<Cake, 'id' | 'createdAt' | 'updatedAt'>, publishImmediately: boolean) => void;
}

export const AdminCakeEditorModal: React.FC<AdminCakeEditorModalProps> = ({
  isOpen,
  cake,
  onClose,
  onSave
}) => {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Birthday');
  const [occasions, setOccasions] = useState('Birthday, Anniversary');
  const [colourThemes, setColourThemes] = useState('Pastel Cream, Blush Pink');
  const [flavours, setFlavours] = useState('Belgian Truffle, Vanilla Berry');
  const [weightOptions, setWeightOptions] = useState<CakeWeightOption[]>([
    { id: 'w-1', weight: '0.5 kg', price: 850, description: 'Serves 4–6', isAvailable: true },
    { id: 'w-2', weight: '1.0 kg', price: 1600, description: 'Serves 8–10', isAvailable: true },
    { id: 'w-3', weight: '1.5 kg', price: 2350, description: 'Serves 12–15', isAvailable: true }
  ]);
  const [specifications, setSpecifications] = useState<CakeSpecification[]>([
    { id: 's-1', label: 'Filling', value: 'Whipped Couverture Ganache' },
    { id: 's-2', label: 'Shape', value: 'Classic Round Tier' }
  ]);
  const [isEgglessOption, setIsEgglessOption] = useState(true);
  const [allergens, setAllergens] = useState('Dairy, Wheat Gluten');
  const [leadTimeHours, setLeadTimeHours] = useState(24);
  const [availability, setAvailability] = useState<Cake['availability']>('available_now');
  const [isFeatured, setIsFeatured] = useState(false);
  const [images, setImages] = useState<CakeImage[]>([]);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (cake) {
      setName(cake.name);
      setSlug(cake.slug);
      setShortDescription(cake.shortDescription || '');
      setDescription(cake.description);
      setCategory(cake.category);
      setOccasions(cake.occasions?.join(', ') || 'Birthday');
      setColourThemes(cake.colourThemes?.join(', ') || 'Pastel Cream');
      setFlavours(cake.flavours?.join(', ') || 'Belgian Couverture');
      setWeightOptions(cake.weightOptions && cake.weightOptions.length > 0 ? cake.weightOptions : [
        { id: 'w-1', weight: '1.0 kg', price: 1500, description: 'Serves 8-10', isAvailable: true }
      ]);
      setSpecifications(cake.specifications || []);
      setIsEgglessOption(cake.isEgglessOption);
      setAllergens(cake.allergens || '');
      setLeadTimeHours(cake.leadTimeHours);
      setAvailability(cake.availability);
      setIsFeatured(cake.isFeatured);
      setImages(cake.images && cake.images.length > 0 ? cake.images : [
        { url: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=800&q=80', alt: cake.name, isPrimary: true }
      ]);
    } else {
      setName('');
      setSlug('');
      setShortDescription('');
      setDescription('');
      setCategory('Birthday');
      setOccasions('Birthday, Celebration');
      setColourThemes('Blush Pink, Warm Cream');
      setFlavours('Belgian Truffle, Vanilla Bean');
      setWeightOptions([
        { id: 'w-1', weight: '0.5 kg', price: 850, description: 'Serves 4–6', isAvailable: true },
        { id: 'w-2', weight: '1.0 kg', price: 1600, description: 'Serves 8–10', isAvailable: true },
        { id: 'w-3', weight: '1.5 kg', price: 2350, description: 'Serves 12–15', isAvailable: true }
      ]);
      setSpecifications([
        { id: 's-1', label: 'Filling', value: 'Whipped Couverture Ganache' },
        { id: 's-2', label: 'Shape', value: 'Classic Round Tier' }
      ]);
      setIsEgglessOption(true);
      setAllergens('Dairy, Wheat');
      setLeadTimeHours(24);
      setAvailability('available_now');
      setIsFeatured(false);
      setImages([]);
    }
  }, [cake, isOpen]);

  if (!isOpen) return null;

  // Photo handlers
  const handleMainPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        const newImg: CakeImage = {
          url: reader.result,
          alt: name || 'Cake photo',
          isPrimary: true
        };
        // Set as first image and mark primary
        setImages(prev => [newImg, ...prev.map(img => ({ ...img, isPrimary: false }))]);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAddMorePhotos = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setImages(prev => [
            ...prev,
            {
              url: reader.result as string,
              alt: name || 'Cake angle view',
              isPrimary: prev.length === 0
            }
          ]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleReplacePhoto = (idx: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setImages(prev => prev.map((img, i) => i === idx ? { ...img, url: reader.result as string } : img));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = (idx: number) => {
    setImages(prev => {
      const remaining = prev.filter((_, i) => i !== idx);
      if (remaining.length > 0 && !remaining.some(r => r.isPrimary)) {
        remaining[0].isPrimary = true;
      }
      return remaining;
    });
  };

  const handleSetPrimaryPhoto = (idx: number) => {
    setImages(prev => prev.map((img, i) => ({ ...img, isPrimary: i === idx })));
  };

  const handleReorderPhoto = (fromIdx: number, toIdx: number) => {
    if (toIdx < 0 || toIdx >= images.length) return;
    setImages(prev => {
      const copy = [...prev];
      const item = copy.splice(fromIdx, 1)[0];
      copy.splice(toIdx, 0, item);
      return copy;
    });
  };

  // Weight rows
  const handleAddWeightRow = () => {
    setWeightOptions(prev => [
      ...prev,
      { id: 'w-' + Date.now(), weight: '2.0 kg', price: 3000, description: 'Serves 15–18', isAvailable: true }
    ]);
  };

  const handleRemoveWeightRow = (idx: number) => {
    setWeightOptions(prev => prev.filter((_, i) => i !== idx));
  };

  const handleUpdateWeightRow = (idx: number, field: keyof CakeWeightOption, val: any) => {
    setWeightOptions(prev => prev.map((w, i) => i === idx ? { ...w, [field]: val } : w));
  };

  // Specification rows
  const handleAddSpecRow = () => {
    setSpecifications(prev => [
      ...prev,
      { id: 's-' + Date.now(), label: 'Note', value: 'Handmade edible decor' }
    ]);
  };

  const handleRemoveSpecRow = (idx: number) => {
    setSpecifications(prev => prev.filter((_, i) => i !== idx));
  };

  const handleUpdateSpecRow = (idx: number, field: 'label' | 'value', val: string) => {
    setSpecifications(prev => prev.map((s, i) => i === idx ? { ...s, [field]: val } : s));
  };

  const handleSave = (publish: boolean) => {
    setErrorMsg(null);
    if (!name.trim()) {
      setErrorMsg('Please enter the cake name.');
      return;
    }
    if (!description.trim()) {
      setErrorMsg('Please enter a description for the cake.');
      return;
    }
    if (images.length === 0) {
      setErrorMsg('Please upload at least one photograph of the cake.');
      return;
    }

    const parsedFlavours = flavours.split(',').map(f => f.trim()).filter(Boolean);
    const parsedOccasions = occasions.split(',').map(o => o.trim()).filter(Boolean);
    const parsedColours = colourThemes.split(',').map(c => c.trim()).filter(Boolean);

    const payload: Omit<Cake, 'id' | 'createdAt' | 'updatedAt'> = {
      name: name.trim(),
      slug: slug.trim() || name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      shortDescription: shortDescription.trim() || description.trim().slice(0, 100),
      description: description.trim(),
      category,
      occasions: parsedOccasions.length > 0 ? parsedOccasions : ['Birthday'],
      colourThemes: parsedColours.length > 0 ? parsedColours : ['Classic'],
      flavours: parsedFlavours.length > 0 ? parsedFlavours : ['Signature Truffle'],
      weightOptions: weightOptions.map(w => ({
        weight: w.weight,
        price: Number(w.price) || 0,
        description: w.description,
        isAvailable: w.isAvailable ?? true
      })),
      specifications,
      isEgglessOption,
      allergens,
      leadTimeHours: Number(leadTimeHours) || 24,
      availability,
      isFeatured,
      isPortfolioOnly: false,
      images,
      isPublished: publish,
      status: publish ? 'published' : 'draft'
    };

    onSave(payload, publish);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-fade-in">
      <div 
        className="relative bg-[#FFF8EF] rounded-3xl max-w-4xl w-full max-h-[92vh] overflow-y-auto border border-[#E8D5C8] shadow-2xl p-6 sm:p-8 space-y-6"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Modal Top Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#E8D5C8]/80">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#C5A15A]">
              Cake Studio Management
            </span>
            <h2 className="font-serif text-2xl font-bold text-[#4B2E25]">
              {cake ? `Edit "${cake.name}"` : 'Add New Cake Photograph & Details'}
            </h2>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-[#4B2E25]/70 hover:text-[#4B2E25] bg-white rounded-full border border-[#E8D5C8] shadow-xs"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3.5 bg-red-50 rounded-2xl border border-red-200 text-xs text-red-800 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* PRIORITY 2: PHOTO MANAGEMENT & UPLOADS */}
        <div className="bg-white rounded-3xl p-6 border border-[#E8D5C8] shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E8D5C8]/60">
            <div>
              <h3 className="font-serif text-base font-bold text-[#4B2E25]">
                Cake Photographs & Visual Assets
              </h3>
              <p className="text-xs text-[#4B2E25]/70">
                Upload main photograph, add gallery angles, preview, reorder, replace, or remove.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <label className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#4B2E25] hover:bg-[#38221B] rounded-xl cursor-pointer shadow-xs transition-colors">
                <Upload className="w-3.5 h-3.5 text-[#C5A15A]" />
                <span>Upload Main Photo</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleMainPhotoUpload}
                  className="hidden"
                />
              </label>

              <label className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#4B2E25] bg-[#FFF8EF] border border-[#E8D5C8] hover:bg-white rounded-xl cursor-pointer transition-colors">
                <Plus className="w-3.5 h-3.5 text-[#C5A15A]" />
                <span>+ Add More Photos</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleAddMorePhotos}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Photo Preview & Reordering Grid */}
          {images.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
              {images.map((img, idx) => (
                <div key={idx} className="relative rounded-2xl border border-[#E8D5C8] overflow-hidden bg-[#FFF8EF] group">
                  <div className="aspect-4/3 relative overflow-hidden">
                    <img src={img.url} alt={img.alt} className="w-full h-full object-cover" />
                    {img.isPrimary && (
                      <span className="absolute top-2 left-2 px-2 py-0.5 text-[10px] font-bold uppercase bg-[#4B2E25] text-white rounded-md shadow-xs flex items-center gap-1">
                        <Star className="w-3 h-3 text-[#C5A15A]" />
                        Primary
                      </span>
                    )}
                  </div>

                  {/* Actions Bar */}
                  <div className="p-2 bg-white flex items-center justify-between text-xs border-t border-[#E8D5C8]/60">
                    <div className="flex items-center gap-1">
                      {idx > 0 && (
                        <button
                          type="button"
                          onClick={() => handleReorderPhoto(idx, idx - 1)}
                          className="p-1 text-[#4B2E25]/70 hover:text-[#4B2E25]"
                          title="Move Left"
                        >
                          <ArrowLeft className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {idx < images.length - 1 && (
                        <button
                          type="button"
                          onClick={() => handleReorderPhoto(idx, idx + 1)}
                          className="p-1 text-[#4B2E25]/70 hover:text-[#4B2E25]"
                          title="Move Right"
                        >
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      {!img.isPrimary && (
                        <button
                          type="button"
                          onClick={() => handleSetPrimaryPhoto(idx)}
                          className="text-[10px] text-[#C5A15A] hover:underline font-semibold"
                        >
                          Make Primary
                        </button>
                      )}

                      <label className="text-[10px] text-[#4B2E25]/70 hover:text-[#4B2E25] cursor-pointer">
                        Replace
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleReplacePhoto(idx, e)}
                          className="hidden"
                        />
                      </label>

                      <button
                        type="button"
                        onClick={() => handleRemovePhoto(idx)}
                        className="text-red-600 hover:text-red-800 p-0.5"
                        title="Remove Photo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 border-2 border-dashed border-[#E8D5C8] rounded-2xl bg-[#FFF8EF]/30">
              <Upload className="w-8 h-8 text-[#C5A15A] mx-auto mb-2" />
              <p className="text-xs text-[#4B2E25] font-semibold">No photographs uploaded yet</p>
              <p className="text-[11px] text-[#4B2E25]/60 mt-0.5">Click "Upload Main Photo" to select a picture from your computer or phone.</p>
            </div>
          )}
        </div>

        {/* Section 2: Core Cake Details */}
        <div className="bg-white rounded-3xl p-6 border border-[#E8D5C8] shadow-xs space-y-4">
          <h3 className="font-serif text-base font-bold text-[#4B2E25]">Cake Information & Taxonomies</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#4B2E25] mb-1">Cake Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Belgian Truffle Raspberry Noir"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8D5C8] text-xs text-[#4B2E25]"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#4B2E25] mb-1">Category *</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8D5C8] text-xs text-[#4B2E25]"
              >
                <option value="Birthday">Birthday</option>
                <option value="Wedding">Wedding</option>
                <option value="Anniversary">Anniversary</option>
                <option value="Custom Cakes">Custom Cakes</option>
                <option value="Cupcakes">Cupcakes</option>
                <option value="Eggless">Eggless</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#4B2E25] mb-1">Short Description</label>
            <input
              type="text"
              value={shortDescription}
              onChange={(e) => setShortDescription(e.target.value)}
              placeholder="e.g. Pure dark couverture ganache with hand-piped Swiss petals"
              className="w-full px-3.5 py-2 rounded-xl border border-[#E8D5C8] text-xs text-[#4B2E25]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#4B2E25] mb-1">Full Description *</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe sponges, fillings, texture, and inspiration..."
              className="w-full px-3.5 py-2 rounded-xl border border-[#E8D5C8] text-xs text-[#4B2E25]"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#4B2E25] mb-1">Flavours (comma-separated)</label>
              <input
                type="text"
                value={flavours}
                onChange={(e) => setFlavours(e.target.value)}
                placeholder="e.g. Truffle, Rose Pistachio, Berry"
                className="w-full px-3 py-2 rounded-xl border border-[#E8D5C8] text-xs text-[#4B2E25]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#4B2E25] mb-1">Occasions</label>
              <input
                type="text"
                value={occasions}
                onChange={(e) => setOccasions(e.target.value)}
                placeholder="e.g. Birthday, Wedding, Anniversary"
                className="w-full px-3 py-2 rounded-xl border border-[#E8D5C8] text-xs text-[#4B2E25]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#4B2E25] mb-1">Colour Themes</label>
              <input
                type="text"
                value={colourThemes}
                onChange={(e) => setColourThemes(e.target.value)}
                placeholder="e.g. Blush Pink, Dark Chocolate, Gold"
                className="w-full px-3 py-2 rounded-xl border border-[#E8D5C8] text-xs text-[#4B2E25]"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Weight and Price Variants */}
        <div className="bg-white rounded-3xl p-6 border border-[#E8D5C8] shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-serif text-base font-bold text-[#4B2E25]">Weight & Price Variants</h3>
              <p className="text-xs text-[#4B2E25]/70">Add options for different serving sizes.</p>
            </div>

            <button
              type="button"
              onClick={handleAddWeightRow}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#4B2E25] bg-[#FFF8EF] border border-[#E8D5C8] rounded-xl hover:bg-white"
            >
              <Plus className="w-3.5 h-3.5 text-[#C5A15A]" />
              <span>Add Variant</span>
            </button>
          </div>

          <div className="space-y-2">
            {weightOptions.map((opt, idx) => (
              <div key={idx} className="flex flex-col sm:flex-row items-center gap-2 p-2.5 bg-[#FFF8EF]/40 rounded-xl border border-[#E8D5C8]">
                <input
                  type="text"
                  value={opt.weight}
                  onChange={(e) => handleUpdateWeightRow(idx, 'weight', e.target.value)}
                  placeholder="e.g. 1.0 kg"
                  className="w-full sm:w-28 px-2.5 py-1.5 bg-white rounded-lg border border-[#E8D5C8] text-xs font-bold"
                />
                <div className="flex items-center gap-1 w-full sm:w-32">
                  <span className="text-xs text-[#4B2E25]/60 font-bold">₹</span>
                  <input
                    type="number"
                    value={opt.price}
                    onChange={(e) => handleUpdateWeightRow(idx, 'price', Number(e.target.value))}
                    placeholder="1600"
                    className="w-full px-2.5 py-1.5 bg-white rounded-lg border border-[#E8D5C8] text-xs font-mono font-bold"
                  />
                </div>
                <input
                  type="text"
                  value={opt.description || ''}
                  onChange={(e) => handleUpdateWeightRow(idx, 'description', e.target.value)}
                  placeholder="Serves 8-10 guests"
                  className="flex-1 px-2.5 py-1.5 bg-white rounded-lg border border-[#E8D5C8] text-xs"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveWeightRow(idx)}
                  className="p-1.5 text-red-600 hover:text-red-800"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Section 4: Specifications */}
        <div className="bg-white rounded-3xl p-6 border border-[#E8D5C8] shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-serif text-base font-bold text-[#4B2E25]">Cake Specifications</h3>
              <p className="text-xs text-[#4B2E25]/70">Add details like Filling, Shape, Decoration, etc.</p>
            </div>

            <button
              type="button"
              onClick={handleAddSpecRow}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#4B2E25] bg-[#FFF8EF] border border-[#E8D5C8] rounded-xl hover:bg-white"
            >
              <Plus className="w-3.5 h-3.5 text-[#C5A15A]" />
              <span>Add Specification</span>
            </button>
          </div>

          <div className="space-y-2">
            {specifications.map((spec, idx) => (
              <div key={idx} className="flex items-center gap-2 p-2 bg-[#FFF8EF]/40 rounded-xl border border-[#E8D5C8]">
                <input
                  type="text"
                  value={spec.label}
                  onChange={(e) => handleUpdateSpecRow(idx, 'label', e.target.value)}
                  placeholder="Label (e.g. Filling)"
                  className="w-1/3 px-2.5 py-1.5 bg-white rounded-lg border border-[#E8D5C8] text-xs font-semibold"
                />
                <input
                  type="text"
                  value={spec.value}
                  onChange={(e) => handleUpdateSpecRow(idx, 'value', e.target.value)}
                  placeholder="Details (e.g. Belgian Ganache & Raspberries)"
                  className="flex-1 px-2.5 py-1.5 bg-white rounded-lg border border-[#E8D5C8] text-xs"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveSpecRow(idx)}
                  className="p-1.5 text-red-600 hover:text-red-800"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Section 5: Availability & Publishing Status */}
        <div className="bg-white rounded-3xl p-6 border border-[#E8D5C8] shadow-xs space-y-4">
          <h3 className="font-serif text-base font-bold text-[#4B2E25]">Availability & Inventory Rules</h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#4B2E25] mb-1">Availability Status *</label>
              <select
                value={availability}
                onChange={(e) => setAvailability(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl border border-[#E8D5C8] text-xs text-[#4B2E25]"
              >
                <option value="available_now">Available Now</option>
                <option value="made_to_order">Made to Order</option>
                <option value="temporarily_unavailable">Temporarily Unavailable</option>
                <option value="sold_out">Sold Out</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#4B2E25] mb-1">Preparation Lead Time (Hours)</label>
              <input
                type="number"
                min={0}
                value={leadTimeHours}
                onChange={(e) => setLeadTimeHours(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-[#E8D5C8] text-xs text-[#4B2E25]"
              />
            </div>

            <div className="flex flex-col justify-end space-y-2">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-[#4B2E25]">
                <input
                  type="checkbox"
                  checked={isEgglessOption}
                  onChange={(e) => setIsEgglessOption(e.target.checked)}
                  className="w-4 h-4 text-[#C5A15A] rounded-sm"
                />
                <span>Offer Eggless Option</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-[#4B2E25]">
                <input
                  type="checkbox"
                  checked={isFeatured}
                  onChange={(e) => setIsFeatured(e.target.checked)}
                  className="w-4 h-4 text-[#C5A15A] rounded-sm"
                />
                <span>Feature on Homepage</span>
              </label>
            </div>
          </div>
        </div>

        {/* Modal Action Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-[#E8D5C8]/80">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-[#4B2E25] hover:bg-white rounded-xl border border-transparent hover:border-[#E8D5C8]"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => handleSave(false)}
              className="px-4 py-2.5 text-xs font-semibold text-[#4B2E25] bg-white border border-[#E8D5C8] hover:bg-[#FFF8EF] rounded-xl transition-colors shadow-2xs"
            >
              Save as Draft
            </button>

            <button
              type="button"
              onClick={() => handleSave(true)}
              className="px-5 py-2.5 text-xs font-semibold text-white bg-[#4B2E25] hover:bg-[#38221B] rounded-xl transition-colors shadow-xs"
            >
              Publish to Public Gallery
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
