import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/api/client';
import { toast } from 'sonner';
import BrandSettings from '@/components/brand/BrandSettings';
import { brandFromProfile } from '../../../shared/brand.mjs';
import { TEMPLATES } from '../../../shared/templates.mjs';
import AvatarChoice from '@/components/OptionAvatar';

const FIELDS = ['Ristorazione','Moda e stile','Fitness e benessere','Bellezza','Tecnologia','Viaggi','Artigianato','Altro'];
const TONES = [{ label: 'Ispirazionale', index: 7 },{ label: 'Amichevole', index: 3 },{ label: 'Professionale', index: 4 },{ label: 'Ironico', index: 5 }];
export default function CompanyCard({ me, onSaved }) {
  const [companyName, setCompanyName] = useState(me.company_name || '');
  const [companyField, setCompanyField] = useState(me.company_field || '');
  const [brandIdentity, setBrandIdentity] = useState(me.brand_identity || '');
  const [toneVoice, setToneVoice] = useState(me.tone_of_voice || '');
  const [brand, setBrand] = useState(() => brandFromProfile(me));
  const [preferredTemplate, setPreferredTemplate] = useState(me.preferred_template || 'foto');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const handleSave = async e => {
    e.preventDefault();
    if (saving || uploading) return;
    setSaving(true);
    try {
      const saved = await api.auth.updateMe({ company_name: companyName.trim(), company_field: companyField, brand_identity: brandIdentity.trim(), tone_of_voice: toneVoice, company_logo_url: brand.logos.color.url || '', brand_settings: brand, preferred_template: preferredTemplate });
      setBrand(brandFromProfile(saved)); onSaved?.(saved); toast.success('Dati azienda aggiornati');
    } catch (error) { toast.error('Salvataggio non riuscito: ' + error.message); }
    finally { setSaving(false); }
  };
  return <form onSubmit={handleSave}><fieldset disabled={saving || uploading} className="grid gap-5 sm:grid-cols-2">
    <div className="space-y-2"><Label htmlFor="company">Nome dell’attività</Label>
      <Input id="company" className="h-11" value={companyName} maxLength={200} onChange={e => setCompanyName(e.target.value)} placeholder="Il tuo brand" /></div>
    <div className="space-y-2">
      <Label htmlFor="company-field">Categoria</Label>
      <select id="company-field" value={companyField} onChange={e => setCompanyField(e.target.value)}
        className="flex min-h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-base shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm">
        <option value="">Seleziona una categoria</option>
        {companyField && !FIELDS.includes(companyField) && <option value={companyField}>{companyField}</option>}
        {FIELDS.map(f => <option key={f} value={f}>{f}</option>)}
      </select>
    </div>
    <div className="space-y-2 sm:col-span-2"><Label htmlFor="brand">Valori, personalità e missione</Label>
      <Textarea id="brand" value={brandIdentity} maxLength={5000} onChange={e => setBrandIdentity(e.target.value)} placeholder="Descrivi ciò che rende riconoscibile la tua attività." className="min-h-24" /></div>
    <fieldset className="space-y-2 sm:col-span-2"><legend className="text-sm font-medium">Tono di voce</legend>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">{TONES.map(t => <AvatarChoice key={t.label} index={t.index} label={t.label} selected={toneVoice === t.label} onClick={() => setToneVoice(t.label)} />)}</div>
    </fieldset>
    <div className="sm:col-span-2 border-t border-border pt-6"><h2 className="font-heading text-xl mb-5">Identità del brand</h2><BrandSettings value={brand} onChange={setBrand} onBusyChange={setUploading} /></div>
    <div className="sm:col-span-2 space-y-2"><Label htmlFor="preferred-template">Template predefinito per i nuovi post</Label><select id="preferred-template" value={preferredTemplate} onChange={e => setPreferredTemplate(e.target.value)} className="min-h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">{TEMPLATES.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
    <div className="border-t border-border pt-5 sm:col-span-2"><Button type="submit" data-tour="brand-save" disabled={saving || uploading}>{saving ? 'Salvataggio…' : uploading ? 'Attendi il caricamento…' : 'Salva dati azienda'}</Button></div>
  </fieldset></form>;
}

