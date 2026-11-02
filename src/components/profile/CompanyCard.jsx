import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/api/client';
import { toast } from 'sonner';
import BrandSettings from '@/components/brand/BrandSettings';
import LogoUpload from '@/components/LogoUpload';
import { brandFromProfile } from '../../../shared/brand.mjs';
import { TEMPLATES } from '../../../shared/templates.mjs';
import { POST_TONES, defaultTone } from '../../../shared/postDefaults.mjs';

const FIELDS = ['Ristorazione','Moda e stile','Fitness e benessere','Bellezza','Tecnologia','Viaggi','Artigianato','Altro'];
export default function CompanyCard({ me, onSaved }) {
  const [companyName, setCompanyName] = useState(me.company_name || '');
  const [companyField, setCompanyField] = useState(me.company_field || '');
  const [brandIdentity, setBrandIdentity] = useState(me.brand_identity || '');
  const [toneVoice, setToneVoice] = useState(defaultTone(me));
  const [brand, setBrand] = useState(() => brandFromProfile(me));
  const [preferredTemplate, setPreferredTemplate] = useState(me.preferred_template || 'foto');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const saveLock = useRef(false);
  const handleSave = async event => {
    event.preventDefault();
    if (saveLock.current || uploading) return;
    saveLock.current = true; setSaving(true);
    try {
      const saved = await api.auth.updateMe({ company_name: companyName.trim(), company_field: companyField, brand_identity: brandIdentity.trim(), tone_of_voice: toneVoice, company_logo_url: brand.logos.color.url || '', brand_settings: brand, preferred_template: preferredTemplate });
      setBrand(brandFromProfile(saved)); onSaved?.(saved); toast.success('Dati azienda aggiornati');
    } catch (error) { toast.error('Salvataggio non riuscito: ' + error.message); }
    finally { saveLock.current = false; setSaving(false); }
  };
  const selectClass = 'min-h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-base md:text-sm';
  return <form onSubmit={handleSave}><fieldset disabled={saving || uploading} className="grid gap-5 sm:grid-cols-2">
    <div className="space-y-2"><Label htmlFor="company">Nome dell’attività</Label><Input id="company" className="h-11" value={companyName} maxLength={200} onChange={event => setCompanyName(event.target.value)} autoComplete="organization" /></div>
    <div className="space-y-2"><Label htmlFor="company-field">Categoria</Label><select id="company-field" value={companyField} onChange={event => setCompanyField(event.target.value)} className={selectClass}>
      <option value="">Seleziona una categoria</option>{companyField && !FIELDS.includes(companyField) && <option value={companyField}>{companyField}</option>}{FIELDS.map(field => <option key={field}>{field}</option>)}
    </select></div>
    <div className="space-y-2 sm:col-span-2"><Label htmlFor="brand">Descrivi la tua attività (facoltativo)</Label><Textarea id="brand" value={brandIdentity} maxLength={5000} onChange={event => setBrandIdentity(event.target.value)} placeholder="Cosa fai e cosa vuoi far conoscere alle persone." className="min-h-24" /></div>
    <div className="sm:col-span-2"><LogoUpload logoUrl={brand.logos.color.url} background={brand.logos.color.background} onChange={url => setBrand(current => ({ ...current, logos: { ...current.logos, color: { ...current.logos.color, url } } }))} onBusyChange={setUploading} label="Logo dell’attività (facoltativo)" /></div>
    <details className="sm:col-span-2 border-t border-border pt-2"><summary className="min-h-11 py-3 cursor-pointer text-sm font-medium">Personalizza lo stile dei nuovi post</summary><div className="space-y-6 pt-4">
      <p className="text-sm text-muted-foreground">Sono impostazioni facoltative. Quando Stile testo automatico è attivo, l’AI può adattare font e colori alla singola foto. Non vengono aggiunti sfondi dietro a testo e logo.</p>
      <div className="space-y-2"><Label htmlFor="company-tone">Tono del testo</Label><select id="company-tone" value={toneVoice} onChange={event => setToneVoice(event.target.value)} className={selectClass}>{Object.entries(POST_TONES).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></div>
      <BrandSettings value={brand} onChange={setBrand} onBusyChange={setUploading} />
      <div className="space-y-2"><Label htmlFor="preferred-template">Schema iniziale</Label><select id="preferred-template" value={preferredTemplate} onChange={event => setPreferredTemplate(event.target.value)} className={selectClass}>{TEMPLATES.map(template => <option key={template.id} value={template.id}>{template.name}</option>)}</select></div>
    </div></details>
    <div className="border-t border-border pt-5 sm:col-span-2"><Button type="submit" data-tour="brand-save" disabled={saving || uploading}>{saving ? 'Salvataggio…' : uploading ? 'Attendi il caricamento…' : 'Salva dati azienda'}</Button></div>
  </fieldset></form>;
}

