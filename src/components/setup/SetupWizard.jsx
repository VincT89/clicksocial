import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/api/client';
import { toast } from 'sonner';
import LogoUpload from '@/components/LogoUpload';
import { useAuth } from '@/lib/AuthContext';
import { defaultTone } from '../../../shared/postDefaults.mjs';
import { brandFromProfile } from '../../../shared/brand.mjs';

const FIELDS = ['Ristorazione', 'Moda e stile', 'Fitness e benessere', 'Bellezza', 'Tecnologia', 'Viaggi', 'Artigianato', 'Altro'];

export default function SetupWizard() {
  const { user } = useAuth();
  const [companyName, setCompanyName] = useState(user?.company_name || '');
  const [companyField, setCompanyField] = useState(user?.company_field || '');
  const [brandIdentity, setBrandIdentity] = useState(user?.brand_identity || '');
  const [logoUrl, setLogoUrl] = useState(brandFromProfile(user).logos.color.url || '');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const saveLock = useRef(false);
  const handleFinish = async event => {
    event.preventDefault();
    if (saveLock.current || uploading || !companyName.trim() || !companyField) return;
    saveLock.current = true; setSaving(true);
    try {
      const brand = brandFromProfile(user);
      await api.auth.updateMe({
        company_name: companyName.trim(), company_field: companyField,
        brand_identity: brandIdentity.trim(), tone_of_voice: user?.tone_of_voice || defaultTone(user),
        company_logo_url: logoUrl,
        brand_settings: { ...brand, logos: { ...brand.logos, color: { ...brand.logos.color, url: logoUrl } } },
        setup_completed: true,
      });
      window.location.href = '/studio';
    } catch (error) { toast.error('Salvataggio non riuscito: ' + error.message); }
    finally { saveLock.current = false; setSaving(false); }
  };
  return <form onSubmit={handleFinish} className="w-full max-w-xl mx-auto">
    <fieldset disabled={saving || uploading} className="space-y-4">
      <div className="space-y-2"><Label htmlFor="setup-company">Nome dell’attività</Label><Input id="setup-company" value={companyName} maxLength={200} required onChange={event => setCompanyName(event.target.value)} autoComplete="organization" /></div>
      <div className="space-y-2"><Label htmlFor="setup-category">Di cosa ti occupi?</Label><select id="setup-category" value={companyField} required onChange={event => setCompanyField(event.target.value)} className="w-full min-h-11 rounded-md border border-input bg-background px-3 text-base">
        <option value="">Scegli una categoria</option>{companyField && !FIELDS.includes(companyField) && <option value={companyField}>{companyField}</option>}{FIELDS.map(field => <option key={field}>{field}</option>)}
      </select></div>
      <div className="space-y-2"><Label htmlFor="setup-description">Raccontaci qualcosa in più (facoltativo)</Label><Textarea id="setup-description" rows={3} value={brandIdentity} maxLength={5000} onChange={event => setBrandIdentity(event.target.value)} placeholder="Cosa fai e cosa vuoi far conoscere alle persone." /></div>
      <LogoUpload logoUrl={logoUrl} onChange={setLogoUrl} onBusyChange={setUploading} label="Logo dell’attività (facoltativo)" />
      <p className="text-sm text-muted-foreground">Puoi cambiare questi dati e personalizzare colori e font nel Profilo, anche più avanti.</p>
      <Button type="submit" className="w-full min-h-11" disabled={saving || uploading || !companyName.trim() || !companyField}>{saving ? 'Salvataggio…' : uploading ? 'Caricamento del logo…' : 'Crea il primo post'}</Button>
    </fieldset>
  </form>;
}
