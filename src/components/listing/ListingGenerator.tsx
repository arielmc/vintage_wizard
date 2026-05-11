import React, { useState } from 'react';
import {
  Check,
  ChevronDown,
  Copy,
  ExternalLink,
  Loader,
  RefreshCw,
  Settings,
  Sparkles,
} from 'lucide-react';
import { playSuccessFeedback } from '../../utils/helpers';
import { generateListingCopy } from '../../services/gemini';
import type { MarketplaceLink } from '../../types';

type EmojiStyle = 'none' | 'minimal' | 'full';

interface ToneSettings {
  salesIntensity: number;
  nerdFactor: number;
  formality: number;
  includeFunFact: boolean;
  includeDadJoke: boolean;
  emojiStyle: EmojiStyle;
}

// formData is the in-flight edit state from EditModal — it's an InventoryItem
// plus a handful of UI-only listing/tone fields. Keep the type permissive here
// to avoid forcing a parallel migration of the App.tsx state shape.
interface ListingGeneratorProps {
  formData: any;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  marketLinks?: MarketplaceLink[];
}

const CATEGORY_PRESETS: Record<string, ToneSettings> = {
  Books: { salesIntensity: 2, nerdFactor: 5, formality: 4, includeFunFact: true, includeDadJoke: true, emojiStyle: 'none' },
  'Jewelry & Watches': { salesIntensity: 4, nerdFactor: 2, formality: 3, includeFunFact: false, includeDadJoke: true, emojiStyle: 'minimal' },
  Fashion: { salesIntensity: 5, nerdFactor: 1, formality: 2, includeFunFact: false, includeDadJoke: true, emojiStyle: 'full' },
  Electronics: { salesIntensity: 2, nerdFactor: 4, formality: 3, includeFunFact: true, includeDadJoke: true, emojiStyle: 'none' },
  Collectibles: { salesIntensity: 3, nerdFactor: 5, formality: 3, includeFunFact: true, includeDadJoke: true, emojiStyle: 'minimal' },
  Art: { salesIntensity: 3, nerdFactor: 4, formality: 5, includeFunFact: true, includeDadJoke: true, emojiStyle: 'none' },
  'Vinyl & Music': { salesIntensity: 3, nerdFactor: 5, formality: 2, includeFunFact: true, includeDadJoke: true, emojiStyle: 'minimal' },
  Furniture: { salesIntensity: 3, nerdFactor: 3, formality: 4, includeFunFact: false, includeDadJoke: true, emojiStyle: 'minimal' },
  'Ceramics & Glass': { salesIntensity: 3, nerdFactor: 4, formality: 3, includeFunFact: true, includeDadJoke: true, emojiStyle: 'minimal' },
};

const DEFAULT_TONE: ToneSettings = {
  salesIntensity: 4,
  nerdFactor: 3,
  formality: 3,
  includeFunFact: true,
  includeDadJoke: true,
  emojiStyle: 'minimal',
};

const EMOJI_INSTRUCTIONS: Record<EmojiStyle, string> = {
  none: `=== EMOJI STYLE: NONE ===
- Do NOT use ANY emojis anywhere - not in title, not in description, nowhere
- Use plain text section headers like "DETAILS:" and "CONDITION:" (no emojis)
- Zero emojis total. This is critical.`,
  minimal: `=== EMOJI STYLE: MINIMAL (Section Headers Only) ===
- NO emojis in title
- NO emojis in body paragraph text
- ONLY use emojis as section header markers, like this:
  🏷️ DETAILS:
  ✨ CONDITION:
  📏 MEASUREMENTS:
- Total emojis: exactly 2-4, only at start of section headers
- The body text after each header should be plain text with no emojis`,
  full: `=== EMOJI STYLE: MAXIMUM EMOJIS 🎉 (CRITICAL - MUST FOLLOW) ===

TITLE: Start with a relevant emoji (e.g., "🏺 Vintage Vase..." or "📚 Rare First Edition...")

SECTION HEADERS - ALWAYS include emoji markers:
  🏷️ DETAILS:
  ✨ CONDITION:
  📏 MEASUREMENTS:

BODY TEXT - ADD 15-25 EMOJIS throughout the paragraphs:
Every sentence should have 1-3 emojis inline. Examples:

"This stunning ✨ vintage piece showcases the artistry 🎨 of mid-century design 📅"
"Crafted from solid brass 🔩 with delicate hand-painted florals 🌸 in vibrant colors 🌈"
"Excellent condition 💎 with gorgeous patina ✨ that adds character 🏛️"
"Measures 8" tall 📏 by 4" wide 📐 and weighs approximately 2 lbs ⚖️"

EMOJI CHEAT SHEET - use liberally:
✨🌟💫 = beauty/quality | 🎨🖼️ = art/design | 📅⏳🏛️ = age/vintage
💎👌💯 = condition | 🔩🪵🏺 = materials | 📏📐⚖️ = measurements
🌸🌺🌻 = florals | 💝🎁 = gifting | 🏠🪑 = home/furniture

Make it look like an enthusiastic social media post with emojis scattered EVERYWHERE in the text.`,
};

const ListingGenerator: React.FC<ListingGeneratorProps> = ({ formData, setFormData, marketLinks = [] }) => {
  const [toneSettings, setToneSettings] = useState<ToneSettings>({
    salesIntensity: formData.tone_sales ?? 4,
    nerdFactor: formData.tone_nerd ?? 3,
    formality: formData.tone_formality ?? 3,
    includeFunFact: formData.tone_funfact ?? true,
    includeDadJoke: formData.tone_dadjoke ?? true,
    emojiStyle: (formData.tone_emoji as EmojiStyle) ?? 'minimal',
  });
  const [isTunerOpen, setIsTunerOpen] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [showSearchTerms, setShowSearchTerms] = useState(false);

  const currentPreset = CATEGORY_PRESETS[formData.category as string] || DEFAULT_TONE;

  const applyPreset = (presetName: string) => {
    setToneSettings(CATEGORY_PRESETS[presetName] || currentPreset);
    playSuccessFeedback();
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    playSuccessFeedback();
    const toast = document.createElement('div');
    toast.className = 'fixed bottom-20 left-1/2 -translate-x-1/2 bg-stone-900 text-white px-4 py-2 rounded-xl shadow-xl text-sm font-medium z-[100] animate-in fade-in slide-in-from-bottom-4';
    toast.textContent = '✓ Copied to clipboard';
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2000);
  };

  const handleRegenerate = async () => {
    setIsRegenerating(true);

    const prompt = `You are an expert marketplace listing copywriter. Generate BOTH a compelling title AND description for this vintage item.

CRITICAL STYLE RULE: Do NOT use exclamation points anywhere.

=== TONE SETTINGS (FOLLOW THESE EXACTLY - the differences should be DRAMATIC) ===

SALES INTENSITY: ${toneSettings.salesIntensity}/5
${toneSettings.salesIntensity === 1 ? `LEVEL 1 - JUST THE FACTS: Write like an inventory list. NO adjectives except factual ones (condition: "good", "fair"). NO persuasive language. NO words like "charming", "lovely", "beautiful", "stunning", "rare". Just state what it IS. BUT STILL INCLUDE ALL THE SAME DETAILS/FACTS as other levels - maker, era, materials, condition, markings. The content should be comprehensive, just delivered without flourish.` : ''}
${toneSettings.salesIntensity === 2 ? `LEVEL 2 - MOSTLY FACTUAL: Minimal flourish. One or two mild descriptors allowed. Focus on facts but include all relevant details.` : ''}
${toneSettings.salesIntensity === 3 ? `LEVEL 3 - BALANCED: Mix of facts and light sales appeal. Moderate use of appealing language.` : ''}
${toneSettings.salesIntensity === 4 ? `LEVEL 4 - PERSUASIVE: Emphasize appeal and desirability. Use compelling language freely.` : ''}
${toneSettings.salesIntensity === 5 ? `LEVEL 5 - FULL CHARM: Maximum appeal. Paint a picture. Make them WANT it. Every sentence sells.` : ''}

NERD/EXPERTISE LEVEL: ${toneSettings.nerdFactor}/5
${toneSettings.nerdFactor === 1 ? `LEVEL 1 - GENERAL AUDIENCE: Assume reader knows nothing. No jargon. Simple descriptions only.` : ''}
${toneSettings.nerdFactor === 2 ? `LEVEL 2 - SOME CONTEXT: Brief background. Light context for non-experts.` : ''}
${toneSettings.nerdFactor === 3 ? `LEVEL 3 - MODERATE: Include relevant context that adds value.` : ''}
${toneSettings.nerdFactor === 4 ? `LEVEL 4 - COLLECTOR-FOCUSED: Include details collectors care about: edition points, variations, provenance clues, market context.` : ''}
${toneSettings.nerdFactor === 5 ? `LEVEL 5 - DEEP EXPERTISE: Full geek mode. Reference specific variations, printings, maker histories, obscure details. Assume reader is a fellow expert who appreciates deep knowledge.` : ''}

${EMOJI_INSTRUCTIONS[toneSettings.emojiStyle]}

ADDITIONAL FEATURES:
${toneSettings.includeFunFact ? '- Include a "💡 Tidbit:" with a genuinely interesting/obscure fact about this specific item, maker, era, or category.' : '- Do NOT include trivia or fun facts.'}
${toneSettings.includeDadJoke ? `- End with a hilarious dad joke related to this specific item. Use unique features or specifics that add delight. The best jokes reference something SPECIFIC - the maker name, a visual detail, the era, or a quirky feature. Generic jokes are boring. Format as: "🤓 [your dad joke]" at the very end.` : ''}

ITEM DETAILS:
- Current Title: ${formData.title || 'Vintage Item'}
- Category: ${formData.category || 'Other'}
- Maker/Brand: ${formData.maker || 'Unknown'}
- Style: ${formData.style || 'Unknown'}
- Era: ${formData.era || 'Unknown'}
- Materials: ${formData.materials || 'Unknown'}
- Condition: ${formData.condition || 'Good'}
- Markings: ${formData.markings || 'None visible'}
- Original AI Description: ${formData.sales_blurb || ''}

TITLE GUIDELINES (CRITICAL - FOLLOW EXACTLY):
- ABSOLUTE MAXIMUM: 70 characters. Count every character including spaces.
- NEVER cut off a word mid-way. If adding a word would exceed 70 chars, OMIT it entirely.
- The title MUST make complete sense and be fully readable - no partial words.
- Apply the SAME tone settings to the title:
  * Sales 1-2: Factual title (maker, item type, era). No adjectives like "stunning" or "beautiful".
  * Sales 3: Balanced title with light appeal.
  * Sales 4-5: Compelling title with "Rare", "Stunning", "Exquisite", etc.
  * Nerd 4-5: Include collector-relevant details (edition, variation, specific model).
- Example good titles at different levels:
  * Sales 1: "Pyrex Spring Blossom Casserole Dish 1970s"
  * Sales 5: "Stunning Rare Pyrex Spring Blossom Casserole Mint Condition 1970s"

DESCRIPTION FORMATTING:
- Use line breaks (\\n) to separate sections for readability
- Structure: Opening hook\\n\\nDetails section\\n\\nCondition\\n\\n[Tidbit if enabled]\\n\\n[Dad joke if enabled]
- 120-200 words max
- NO call to action at the end
${toneSettings.emojiStyle === 'none' ? '- Use plain text headers like "DETAILS:" "CONDITION:" (no emojis anywhere)' : ''}
${toneSettings.emojiStyle === 'minimal' ? '- Use emoji section headers (🏷️ DETAILS:, ✨ CONDITION:) but NO emojis in body text' : ''}
${toneSettings.emojiStyle === 'full' ? '- Use emoji section headers (🏷️ DETAILS:, ✨ CONDITION:) AND scatter 15-25 emojis throughout ALL body paragraphs' : ''}

OUTPUT FORMAT - Generate a JSON response:
{
  "title": "Your title (MUST be 70 chars or less, no cut-off words)",
  "description": "Your description with \\n for line breaks between sections"
}

Return ONLY valid JSON, no markdown or extra text.`;

    try {
      const responseText = await generateListingCopy(prompt, 0.7);
      if (!responseText) return;

      const cleanedResponse = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      try {
        const parsed = JSON.parse(cleanedResponse);
        setFormData((prev: any) => {
          let newTitle: string = parsed.title || prev.listing_title;
          if (newTitle && newTitle.length > 70) {
            newTitle = newTitle.substring(0, 70).replace(/\s+\S*$/, '').trim();
          }
          return {
            ...prev,
            listing_title: newTitle,
            listing_description: parsed.description?.trim() || prev.listing_description,
            tone_sales: toneSettings.salesIntensity,
            tone_nerd: toneSettings.nerdFactor,
            tone_formality: toneSettings.formality,
            tone_funfact: toneSettings.includeFunFact,
            tone_dadjoke: toneSettings.includeDadJoke,
            tone_emoji: toneSettings.emojiStyle,
          };
        });
        playSuccessFeedback();
      } catch (parseError) {
        // Fallback: treat response as just description
        setFormData((prev: any) => ({
          ...prev,
          listing_description: responseText.trim(),
          tone_sales: toneSettings.salesIntensity,
          tone_nerd: toneSettings.nerdFactor,
          tone_formality: toneSettings.formality,
          tone_funfact: toneSettings.includeFunFact,
          tone_dadjoke: toneSettings.includeDadJoke,
          tone_emoji: toneSettings.emojiStyle,
        }));
        playSuccessFeedback();
      }
    } catch (error) {
      console.error('Regeneration failed:', error);
      alert('Failed to regenerate. Please try again.');
    } finally {
      setIsRegenerating(false);
    }
  };

  const generateTitle = (): string => {
    const parts: string[] = [];
    if (formData.maker && formData.maker.toLowerCase() !== 'unknown') parts.push(formData.maker);
    if (formData.style && formData.style.toLowerCase() !== 'unknown') parts.push(formData.style);
    if (formData.title) {
      const cleanTitle = formData.title.replace(/^Unknown\s*/i, '').trim();
      if (cleanTitle) parts.push(cleanTitle);
    }
    if (formData.era && formData.era.toLowerCase() !== 'unknown') parts.push(formData.era);
    if (formData.materials) parts.push(formData.materials);
    const uniqueParts = [...new Set(parts.join(' ').split(' '))];
    return uniqueParts.join(' ').substring(0, 80) || 'Vintage Item';
  };

  const generateDescription = (): string => {
    const hook = formData.sales_blurb || '';
    const isReal = (val: any): boolean => {
      if (!val) return false;
      const lower = String(val).toLowerCase().trim();
      return lower !== 'unknown' && lower !== 'vintage' && lower !== 'see photos' &&
             lower !== 'contemporary' && lower !== 'modern' && lower !== 'n/a' && lower.length > 0;
    };
    const details: string[] = [];
    if (isReal(formData.maker)) details.push(`• Maker/Brand: ${formData.maker}`);
    if (isReal(formData.style)) details.push(`• Style/Period: ${formData.style}`);
    if (isReal(formData.era)) details.push(`• Era: ${formData.era}`);
    if (isReal(formData.materials)) details.push(`• Material: ${formData.materials}`);
    if (formData.markings) details.push(`• Markings: ${formData.markings}`);
    const conditionText = isReal(formData.condition) ? formData.condition : '';
    let desc = hook;
    if (details.length > 0) desc += `\n\n🏷️ DETAILS:\n${details.join('\n')}`;
    if (conditionText) desc += `\n\n💎 CONDITION:\n${conditionText}`;
    if (formData.userNotes) desc += `\n\n📏 NOTES:\n${formData.userNotes}`;
    desc += '\n\n💬 Message me for measurements, shipping quotes, or more photos!';
    return desc.trim();
  };

  const generateTags = (): string => {
    const baseTags: string[] = [
      formData.category, formData.style, formData.era, 'vintage', 'retro', 'preloved', formData.maker,
    ].filter((t: any): t is string => !!t && t.toLowerCase() !== 'unknown');
    if (formData.search_terms_broad) {
      baseTags.push(...String(formData.search_terms_broad).split(' ').filter((t) => t.toLowerCase() !== 'unknown'));
    }
    return [...new Set(baseTags)].map((t) => `#${t.replace(/\s+/g, '')}`).join(' ');
  };

  const currentTitle: string = formData.listing_title ?? generateTitle();
  const currentDesc: string = formData.listing_description ?? generateDescription();
  const currentTags: string = formData.listing_tags ?? generateTags();
  const itemSku = formData.id ? String(formData.id).substring(0, 8).toUpperCase() : 'N/A';

  const derivedListingPrice = (): number | '' => {
    const low = Number(formData.valuation_low) || 0;
    const high = Number(formData.valuation_high) || 0;
    if (low === 0 && high === 0) return '';
    return Math.round(low + (high - low) * 0.6);
  };
  const currentListingPrice = formData.listing_price ?? derivedListingPrice();

  const handleTitleChange = (value: string) => setFormData((prev: any) => ({ ...prev, listing_title: value }));
  const handleDescChange = (value: string) => setFormData((prev: any) => ({ ...prev, listing_description: value }));
  const handleTagsChange = (value: string) => setFormData((prev: any) => ({ ...prev, listing_tags: value }));
  const handleListingPriceChange = (value: string) => setFormData((prev: any) => ({ ...prev, listing_price: value ? Number(value) : null }));

  const handleReset = (field: 'title' | 'description' | 'tags') => {
    if (field === 'title') setFormData((prev: any) => ({ ...prev, listing_title: null }));
    if (field === 'description') setFormData((prev: any) => ({ ...prev, listing_description: null }));
    if (field === 'tags') setFormData((prev: any) => ({ ...prev, listing_tags: null }));
  };

  return (
    <div className="space-y-4 pb-6">
      {/* === LISTING TUNER PANEL === */}
      <div className={`relative overflow-hidden rounded-2xl transition-all duration-300 ${
        isTunerOpen
          ? 'bg-gradient-to-br from-slate-900 via-violet-950 to-fuchsia-950 shadow-2xl shadow-violet-500/20'
          : 'bg-gradient-to-r from-violet-600 via-fuchsia-600 to-rose-500 shadow-lg shadow-violet-300/40 hover:shadow-xl hover:shadow-violet-400/50'
      }`}>
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-20 -right-20 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-fuchsia-400/20 rounded-full blur-2xl" />
        </div>

        <button
          onClick={() => setIsTunerOpen(!isTunerOpen)}
          className="relative w-full px-5 py-4 flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
              isTunerOpen
                ? 'bg-gradient-to-br from-violet-500 to-fuchsia-500 shadow-lg shadow-violet-500/50'
                : 'bg-white/20 backdrop-blur-sm'
            }`}>
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div className="text-left">
              <span className="text-base font-bold text-white block tracking-tight">Listing Tuner</span>
              {!isTunerOpen && (
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[10px] text-white/70 bg-white/10 px-2 py-0.5 rounded-full">
                    Sales {toneSettings.salesIntensity}/5
                  </span>
                  <span className="text-[10px] text-white/70 bg-white/10 px-2 py-0.5 rounded-full">
                    Nerd {toneSettings.nerdFactor}/5
                  </span>
                  <span className="text-[10px]">
                    {toneSettings.includeFunFact && '💡'}
                    {toneSettings.includeDadJoke && '🤓'}
                    {toneSettings.emojiStyle === 'none' ? ' 🚫' : toneSettings.emojiStyle === 'minimal' ? ' ✨' : ' 🎉'}
                  </span>
                </div>
              )}
              {isTunerOpen && (
                <span className="text-xs text-white/60">Customize your listing style</span>
              )}
            </div>
          </div>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
            isTunerOpen ? 'bg-white/10' : 'bg-white/20 group-hover:bg-white/30'
          }`}>
            <ChevronDown className={`w-5 h-5 text-white transition-transform duration-300 ${isTunerOpen ? 'rotate-180' : ''}`} />
          </div>
        </button>

        {isTunerOpen && (
          <div className="relative px-5 pb-5 space-y-5 animate-in slide-in-from-top-2 duration-300">
            <div>
              <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest mb-3">Quick Presets</p>
              <div className="flex flex-wrap gap-2">
                {Object.keys(CATEGORY_PRESETS).slice(0, 6).map((preset) => (
                  <button
                    key={preset}
                    onClick={() => applyPreset(preset)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all ${
                      formData.category === preset
                        ? 'bg-white text-violet-900 shadow-lg'
                        : 'bg-white/10 text-white/80 hover:bg-white/20 border border-white/10'
                    }`}
                  >
                    {preset === 'Jewelry & Watches' ? '💎 Jewelry' :
                     preset === 'Books' ? '📚 Books' :
                     preset === 'Fashion' ? '👗 Fashion' :
                     preset === 'Electronics' ? '📻 Electronics' :
                     preset === 'Collectibles' ? '🎯 Collectibles' :
                     preset === 'Art' ? '🎨 Art' : preset}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-5">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold text-white">Sales Intensity</span>
                  <span className="text-xs font-mono bg-white/10 px-2 py-0.5 rounded text-white/80">{toneSettings.salesIntensity}/5</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-white/40 w-14 text-right">Just facts</span>
                  <input
                    type="range" min="1" max="5"
                    value={toneSettings.salesIntensity}
                    onChange={(e) => setToneSettings((prev) => ({ ...prev, salesIntensity: parseInt(e.target.value, 10) }))}
                    className="flex-1 h-2 bg-white/20 rounded-full appearance-none cursor-pointer
                      [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5
                      [&::-webkit-slider-thumb]:bg-gradient-to-br [&::-webkit-slider-thumb]:from-rose-400 [&::-webkit-slider-thumb]:to-fuchsia-500
                      [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:shadow-fuchsia-500/50
                      [&::-webkit-slider-thumb]:hover:scale-110 [&::-webkit-slider-thumb]:transition-transform"
                  />
                  <span className="text-[10px] text-white/40 w-14">Full charm</span>
                </div>
                <p className="text-[10px] text-white/30 italic">How persuasive should the copy be?</p>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold text-white">Nerd Factor</span>
                  <span className="text-xs font-mono bg-white/10 px-2 py-0.5 rounded text-white/80">{toneSettings.nerdFactor}/5</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-white/40 w-14 text-right">General</span>
                  <input
                    type="range" min="1" max="5"
                    value={toneSettings.nerdFactor}
                    onChange={(e) => setToneSettings((prev) => ({ ...prev, nerdFactor: parseInt(e.target.value, 10) }))}
                    className="flex-1 h-2 bg-white/20 rounded-full appearance-none cursor-pointer
                      [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5
                      [&::-webkit-slider-thumb]:bg-gradient-to-br [&::-webkit-slider-thumb]:from-violet-400 [&::-webkit-slider-thumb]:to-indigo-500
                      [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:shadow-violet-500/50
                      [&::-webkit-slider-thumb]:hover:scale-110 [&::-webkit-slider-thumb]:transition-transform"
                  />
                  <span className="text-[10px] text-white/40 w-14">Deep cuts</span>
                </div>
                <p className="text-[10px] text-white/30 italic">Include collector knowledge &amp; obscure details</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setToneSettings((prev) => ({ ...prev, includeFunFact: !prev.includeFunFact })); }}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                  toneSettings.includeFunFact
                    ? 'bg-amber-400 text-amber-950 shadow-lg shadow-amber-500/30'
                    : 'bg-white/10 text-white/60 hover:bg-white/20 border border-white/10'
                }`}
              >
                <span className="text-sm">💡</span>
                <span>Fun Fact</span>
                {toneSettings.includeFunFact && <Check className="w-3.5 h-3.5" />}
              </button>

              <button
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setToneSettings((prev) => ({ ...prev, includeDadJoke: !prev.includeDadJoke })); }}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                  toneSettings.includeDadJoke
                    ? 'bg-fuchsia-400 text-fuchsia-950 shadow-lg shadow-fuchsia-500/30'
                    : 'bg-white/10 text-white/60 hover:bg-white/20 border border-white/10'
                }`}
              >
                <span className="text-sm">🤓</span>
                <span>Dad Joke</span>
                {toneSettings.includeDadJoke && <Check className="w-3.5 h-3.5" />}
              </button>

              <div className="flex items-center bg-white/10 rounded-xl p-1 border border-white/10">
                {([
                  { value: 'none', label: '🚫 None' },
                  { value: 'minimal', label: '✨ Some' },
                  { value: 'full', label: '🎉 Lots' },
                ] as { value: EmojiStyle; label: string }[]).map((style) => (
                  <button
                    key={style.value}
                    type="button"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setToneSettings((prev) => ({ ...prev, emojiStyle: style.value })); }}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                      toneSettings.emojiStyle === style.value
                        ? 'bg-white text-violet-900 shadow-md'
                        : 'text-white/60 hover:text-white/80'
                    }`}
                  >
                    {style.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleRegenerate}
              disabled={isRegenerating}
              className="btn-ai w-full py-4 bg-gradient-to-r from-rose-500 via-fuchsia-500 to-violet-500 hover:from-rose-400 hover:via-fuchsia-400 hover:to-violet-400 text-white text-sm font-bold rounded-xl shadow-xl shadow-fuchsia-500/30 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed group"
            >
              {isRegenerating ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  <span>Regenerating...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 group-hover:animate-pulse" />
                  <span>Regenerate with AI</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Listing Price */}
      <div className="flex items-center gap-3 p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl">
        <label className="text-xs font-bold text-emerald-700 uppercase tracking-wider whitespace-nowrap">Price</label>
        <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-lg border border-emerald-200 shadow-sm">
          <span className="text-emerald-600 font-bold">$</span>
          <input
            type="number"
            value={currentListingPrice || ''}
            onChange={(e) => handleListingPriceChange(e.target.value)}
            className="w-20 bg-transparent font-bold text-emerald-800 focus:outline-none"
            placeholder="0"
          />
        </div>
        {formData.valuation_low && formData.valuation_high && (
          <span className="text-[10px] text-stone-500">
            Est. ${formData.valuation_low}-${formData.valuation_high}
          </span>
        )}
        {formData.confidence && (
          <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
            formData.confidence === 'high' ? 'bg-emerald-100 text-emerald-700' :
            formData.confidence === 'medium' ? 'bg-amber-100 text-amber-700' :
            'bg-red-100 text-red-700'
          }`}>
            {formData.confidence}
          </span>
        )}
        {formData.listing_price && (
          <button
            onClick={() => setFormData((prev: any) => ({ ...prev, listing_price: null }))}
            className="text-stone-400 text-[10px] hover:text-stone-600 ml-auto"
          >
            Reset
          </button>
        )}
      </div>

      {/* Title */}
      <div className="space-y-1">
        <div className="flex justify-between items-center">
          <label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">Title</label>
          <div className="flex items-center gap-1.5">
            <span className={`text-[9px] font-mono ${currentTitle.length > 70 ? 'text-red-500 font-bold' : currentTitle.length > 60 ? 'text-amber-500' : 'text-stone-400'}`}>
              {currentTitle.length}/70
            </span>
            {formData.listing_title && (
              <button onClick={() => handleReset('title')} className="text-stone-400 text-[10px] hover:text-stone-600 flex items-center gap-0.5">
                <RefreshCw className="w-2.5 h-2.5" /> Reset
              </button>
            )}
            <button onClick={() => handleCopy(currentTitle)} className="btn-copy text-rose-600 text-[10px] font-bold flex items-center gap-0.5">
              <Copy className="w-2.5 h-2.5" /> Copy
            </button>
          </div>
        </div>
        <input
          type="text"
          value={currentTitle}
          onChange={(e) => handleTitleChange(e.target.value)}
          maxLength={80}
          className={`w-full p-2 bg-white border rounded-lg text-xs font-medium text-stone-800 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent ${currentTitle.length > 70 ? 'border-red-300 bg-red-50' : 'border-stone-200'}`}
          placeholder="Enter listing title..."
        />
      </div>

      {/* Description */}
      <div className="space-y-1">
        <div className="flex justify-between items-center">
          <label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">Description</label>
          <div className="flex items-center gap-1.5">
            {formData.listing_description && (
              <button onClick={() => handleReset('description')} className="text-stone-400 text-[10px] hover:text-stone-600 flex items-center gap-0.5">
                <RefreshCw className="w-2.5 h-2.5" /> Reset
              </button>
            )}
            <button onClick={() => handleCopy(currentDesc)} className="btn-copy text-rose-600 text-[10px] font-bold flex items-center gap-0.5">
              <Copy className="w-2.5 h-2.5" /> Copy
            </button>
          </div>
        </div>
        <textarea
          ref={(el) => {
            if (el && window.innerWidth >= 768) {
              el.style.height = 'auto';
              el.style.height = Math.max(el.scrollHeight, 150) + 'px';
            }
          }}
          value={currentDesc}
          onChange={(e) => {
            handleDescChange(e.target.value);
            if (window.innerWidth >= 768) {
              e.target.style.height = 'auto';
              e.target.style.height = e.target.scrollHeight + 'px';
            }
          }}
          className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl text-sm text-stone-700 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:bg-white leading-relaxed mobile-web-textarea-scroll"
          style={{ minHeight: '150px', resize: 'none', overflow: 'hidden' }}
          placeholder="Enter listing description..."
        />
      </div>

      {/* SEO Tags */}
      <div className="space-y-1">
        <div className="flex justify-between items-center">
          <label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider flex items-center gap-1">
            <span className="text-blue-500">#</span> SEO Tags
          </label>
          <div className="flex items-center gap-1.5">
            {formData.listing_tags && (
              <button onClick={() => handleReset('tags')} className="text-stone-400 text-[10px] hover:text-stone-600 flex items-center gap-0.5">
                <RefreshCw className="w-2.5 h-2.5" /> Reset
              </button>
            )}
            <button onClick={() => handleCopy(currentTags)} className="btn-copy text-rose-600 text-[10px] font-bold flex items-center gap-0.5">
              <Copy className="w-2.5 h-2.5" /> Copy
            </button>
          </div>
        </div>
        <textarea
          value={currentTags}
          onChange={(e) => handleTagsChange(e.target.value)}
          rows={1}
          className="w-full p-2 bg-blue-50 border border-blue-200 rounded-lg text-[11px] font-medium text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
          placeholder="#vintage #retro #collectible..."
        />
      </div>

      {/* SKU */}
      <div className="flex items-center justify-between py-1.5">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">SKU:</span>
          <span className="px-1.5 py-0.5 bg-stone-100 border border-stone-200 rounded text-[10px] font-mono text-stone-700">{itemSku}</span>
        </div>
        <button onClick={() => handleCopy(itemSku)} className="btn-copy text-rose-600 text-[10px] font-bold flex items-center gap-0.5">
          <Copy className="w-2.5 h-2.5" /> Copy
        </button>
      </div>

      {/* Copy All */}
      <div className="pt-2 border-t border-stone-200">
        <button
          onClick={() => handleCopy(`${currentTitle}\n\nPrice: $${currentListingPrice || 'TBD'}\n\n${currentDesc}\n\n${currentTags}\n\nSKU: ${itemSku}`)}
          className="btn-rose w-full py-3 bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-700 hover:to-rose-600 text-white text-sm font-bold rounded-lg shadow-md shadow-rose-200/50 flex items-center justify-center gap-2"
        >
          <Copy className="w-4 h-4" /> Copy All Listing
        </button>
      </div>

      {/* Market Comps */}
      {marketLinks.length > 0 && (
        <div className="pt-3 space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider flex items-center gap-1">
              <ExternalLink className="w-3 h-3" /> Market Comps
            </h4>
            <button
              onClick={() => setShowSearchTerms(!showSearchTerms)}
              className="text-[10px] text-violet-600 hover:text-violet-700 font-medium flex items-center gap-1"
            >
              <Settings className="w-3 h-3" />
              {showSearchTerms ? 'Hide' : 'Edit'} Keywords
            </button>
          </div>

          {showSearchTerms && (
            <div className="bg-violet-50/50 border border-violet-100 rounded-xl p-3 space-y-2">
              <p className="text-[10px] text-violet-600 mb-2">
                Edit search keywords to refine market comp results. Changes apply immediately.
              </p>

              <div>
                <label className="text-[10px] font-medium text-stone-600 flex items-center gap-1 mb-0.5">
                  eBay Search <span className="text-stone-400">(detailed)</span>
                </label>
                <input
                  type="text"
                  value={formData.search_terms || ''}
                  onChange={(e) => setFormData((prev: any) => ({ ...prev, search_terms: e.target.value }))}
                  className="w-full px-2 py-1.5 text-xs border border-violet-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-violet-400"
                  placeholder="e.g., Men's star sapphire ring 14k gold vintage"
                />
              </div>

              <div>
                <label className="text-[10px] font-medium text-stone-600 flex items-center gap-1 mb-0.5">
                  Broad Search <span className="text-stone-400">(Ruby Lane, 1stDibs, etc.)</span>
                </label>
                <input
                  type="text"
                  value={formData.search_terms_broad || ''}
                  onChange={(e) => setFormData((prev: any) => ({ ...prev, search_terms_broad: e.target.value }))}
                  className="w-full px-2 py-1.5 text-xs border border-violet-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-violet-400"
                  placeholder="e.g., star sapphire ring"
                />
              </div>

              <div>
                <label className="text-[10px] font-medium text-stone-600 flex items-center gap-1 mb-0.5">
                  Auction Search <span className="text-stone-400">(LiveAuctioneers, etc.)</span>
                </label>
                <input
                  type="text"
                  value={formData.search_terms_auction || ''}
                  onChange={(e) => setFormData((prev: any) => ({ ...prev, search_terms_auction: e.target.value }))}
                  className="w-full px-2 py-1.5 text-xs border border-violet-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-violet-400"
                  placeholder="e.g., star sapphire cabochon ring"
                />
              </div>

              {((formData.category || '').toLowerCase().includes('music') ||
                (formData.category || '').toLowerCase().includes('record') ||
                (formData.category || '').toLowerCase().includes('vinyl')) && (
                <div>
                  <label className="text-[10px] font-medium text-stone-600 flex items-center gap-1 mb-0.5">
                    Discogs Search <span className="text-stone-400">(Artist + Album)</span>
                  </label>
                  <input
                    type="text"
                    value={formData.search_terms_discogs || ''}
                    onChange={(e) => setFormData((prev: any) => ({ ...prev, search_terms_discogs: e.target.value }))}
                    className="w-full px-2 py-1.5 text-xs border border-violet-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-violet-400"
                    placeholder="e.g., Artist Album Name"
                  />
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-4 md:grid-cols-5 gap-1">
            {marketLinks.map((link, i) => (
              <a
                key={i}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                referrerPolicy="no-referrer"
                className={`btn-comp flex items-center justify-center px-1.5 py-1.5 rounded border text-[10px] font-medium ${link.color}`}
              >
                {link.name}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ListingGenerator;
