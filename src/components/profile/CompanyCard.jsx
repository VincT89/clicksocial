import AppSelect from '@/components/AppSelect';
import { useI18n } from '@/lib/i18n';
import { useMemo, useRef, useState } from 'react';
import { Image, Megaphone, Palette, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Image as PrivateImage } from '@/components/ui/image';
import { api } from '@/api/client';
import { toast } from 'sonner';
import BrandSettings from '@/components/brand/BrandSettings';
import { brandFromProfile, LOGO_VARIANTS, normalizeBrand, normalizeColor } from '../../../shared/brand.mjs';
import { TEMPLATES } from '../../../shared/templates.mjs';
import { POST_TONES, defaultTone } from '../../../shared/postDefaults.mjs';

const FIELDS = ['Ristorazione','Moda e stile','Fitness e benessere','Bellezza','Tecnologia','Viaggi','Artigianato','Altro'];
function BrandSummary({ icon: Icon, title, description, children = null }) {
  const { t } = useI18n();
  return <summary>
    <Icon className="brand-setting-icon" size={23} aria-hidden="true" />
    <span className="brand-summary-copy"><strong>{t(title)}</strong><small>{t(description)}</small></span>
    {children}
  </summary>;
}

function changedBrandFields(saved, edited) {
  const changes = {};
  for (const group of ['colors', 'logos', 'fonts']) {
    const fields = Object.entries(edited[group]).filter(([key, value]) => JSON.stringify(value) !== JSON.stringify(saved[group][key]));
    if (fields.length) changes[group] = Object.fromEntries(fields);
  }
  return changes;
}

export default function CompanyCard({ me, onSaved, hideUnchangedSave = false }) {
  const { t } = useI18n();
  const savedForm = useMemo(() => {
    try {
      return { company_name:me.company_name || '', company_field:me.company_field || '', brand_identity:me.brand_identity || '',
        tone_of_voice:defaultTone(me), brand_settings:brandFromProfile(me), preferred_template:me.preferred_template || 'foto' };
    } catch { return null; }
  }, [me]);
  const [draft, setDraft] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const saveLock = useRef(false);
  if (!savedForm) return <p role="alert">{t('Impossibile leggere le impostazioni del brand salvate.')}</p>;
  const savedBrand = savedForm.brand_settings;
  const brandChanges = draft?.brand_settings;
  /** Se l’anteprima ha salvato nuovi dati, solo i campi modificati qui restano sopra la versione aggiornata. */
  const brand = brandChanges ? {
    colors:savedBrand.colors.map((color, index) => brandChanges.colors?.[index] ?? color),
    logos:{ ...savedBrand.logos, ...brandChanges.logos },
    fonts:{ ...savedBrand.fonts, ...brandChanges.fonts },
  } : savedBrand;
  const form = { ...savedForm, ...draft, brand_settings:brand };
  const logoVariant = Object.keys(LOGO_VARIANTS).find(key => brand.logos[key].url);
  const change = (field, value) => setDraft(previous => {
    const next = { ...previous };
    if (value === undefined || value === savedForm[field]) delete next[field];
    else next[field] = value;
    return Object.keys(next).length ? next : null;
  });
  const changeBrand = value => {
    const fields = changedBrandFields(savedBrand, value);
    change('brand_settings', Object.keys(fields).length ? fields : undefined);
  };
  const handleSave = async event => {
    event.preventDefault();
    if (saveLock.current || uploading || (hideUnchangedSave && !draft)) return;
    const formElement = event.currentTarget;
    const restoreFocus = hideUnchangedSave && document.activeElement === formElement.querySelector('[data-tour="brand-save"]');
    saveLock.current = true; setSaving(true);
    try {
      const update = { ...(draft || form) };
      if (Object.hasOwn(update, 'company_name')) update.company_name = form.company_name.trim();
      if (Object.hasOwn(update, 'brand_identity')) update.brand_identity = form.brand_identity.trim();
      if (Object.hasOwn(update, 'brand_settings')) {
        update.brand_settings = normalizeBrand(brand);
        update.company_logo_url = update.brand_settings.logos.color.url;
      }
      const saved = await api.auth.updateMe(update);
      await onSaved?.(saved);
      setDraft(null);
      toast.success(t('Dati azienda aggiornati'));
      if (restoreFocus) (formElement.querySelector('details[open] > summary') || formElement.querySelector('summary'))?.focus({ preventScroll:true });
    } catch (error) { toast.error(t('Salvataggio non riuscito: ') + t(error.message)); }
    finally { saveLock.current = false; setSaving(false); }
  };
  const selectClass = 'min-h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-base md:text-sm';
  return <form onSubmit={handleSave} onInvalid={event => {
    const panel = event.target instanceof HTMLElement && event.target.closest('details');
    if (panel) panel.open = true;
  }}><fieldset disabled={saving || uploading} className="brand-preferences">
    <details className="brand-preference">
      <BrandSummary icon={Image} title="Logo aziendale" description="Carica o aggiorna il tuo logo">
        {logoVariant && <PrivateImage src={brand.logos[logoVariant].url} alt="" unavailable={<></>}
          className={'brand-summary-logo' + (logoVariant === 'light' ? ' for-light-logo' : '')} />}
      </BrandSummary>
      <div className="brand-preference-body"><BrandSettings value={brand} onChange={changeBrand} onBusyChange={setUploading} showFonts={false} showColors={false} /></div>
    </details>
    <details className="brand-preference">
      <BrandSummary icon={Megaphone} title="Tono di voce" description="Definisci lo stile dei tuoi post">
        <span className="brand-summary-value">{t(POST_TONES[form.tone_of_voice])}</span>
      </BrandSummary>
      <div className="brand-preference-body">
        <Label htmlFor="company-tone">{t('Tono del testo')}</Label>
        <AppSelect id="company-tone" value={form.tone_of_voice} onChange={event => change('tone_of_voice', event.target.value)} className={selectClass}>
          {Object.entries(POST_TONES).map(([value,label]) => <option key={value} value={value}>{t(label)}</option>)}
        </AppSelect>
      </div>
    </details>
    <details className="brand-preference">
      <BrandSummary icon={Palette} title="Colori del brand" description="Scegli i colori principali">
        <span className="brand-swatches" aria-hidden="true">{brand.colors.map((color,index) => <i key={index} style={{ backgroundColor:normalizeColor(color) }} />)}</span>
      </BrandSummary>
      <div className="brand-preference-body">
        <p className="text-sm text-muted-foreground">{t('Sono impostazioni facoltative. Quando Stile testo automatico è attivo, l’AI può adattare font e colori alla singola foto. Non vengono aggiunti sfondi dietro a testo e logo.')}</p>
        <BrandSettings value={brand} onChange={changeBrand} onBusyChange={setUploading} showLogos={false} />
        <div className="space-y-2">
          <Label htmlFor="preferred-template">{t('Schema iniziale')}</Label>
          <AppSelect id="preferred-template" value={form.preferred_template} onChange={event => change('preferred_template', event.target.value)} className={selectClass}>
            {TEMPLATES.map(template => <option key={template.id} value={template.id}>{t(template.name)}</option>)}
          </AppSelect>
        </div>
      </div>
    </details>
    <details className="brand-preference" open={!me.company_name}>
      <BrandSummary icon={Building2} title="Informazioni azienda" description="Nome, categoria e descrizione" />
      <div className="brand-preference-body brand-company-fields">
        <div className="space-y-2">
          <Label htmlFor="company">{t('Nome dell’attività')}</Label>
          <Input id="company" className="h-11" value={form.company_name} maxLength={200} onChange={event => change('company_name', event.target.value)} autoComplete="organization" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="company-field">{t('Categoria')}</Label>
          <AppSelect id="company-field" value={form.company_field} onChange={event => change('company_field', event.target.value)} className={selectClass}>
            <option value="">{t('Seleziona una categoria')}</option>
            {form.company_field && !FIELDS.includes(form.company_field) && <option value={form.company_field}>{form.company_field}</option>}
            {FIELDS.map(field => <option key={field} value={field}>{t(field)}</option>)}
          </AppSelect>
        </div>
        <div className="space-y-2 brand-description-field">
          <Label htmlFor="brand">{t('Descrivi la tua attività (facoltativo)')}</Label>
          <Textarea id="brand" value={form.brand_identity} maxLength={5000} onChange={event => change('brand_identity', event.target.value)}
            placeholder={t('Cosa fai e cosa vuoi far conoscere alle persone.')} className="min-h-24" />
        </div>
      </div>
    </details>
    {(!hideUnchangedSave || draft) && <Button type="submit" data-tour="brand-save" disabled={saving || uploading}>
      {saving ? t('Salvataggio…') : uploading ? t('Attendi il caricamento…') : t('Salva dati azienda')}
    </Button>}
  </fieldset></form>;
}
