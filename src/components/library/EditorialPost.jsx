import { useI18n, translate as translateUI, languageLocale } from '@/lib/i18n';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { MoreHorizontal } from 'lucide-react';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { editorialDate, editorialStage, platformLabel, scheduledTime, STAGES } from '@/lib/editorialDates.mjs';
import { Image } from '@/components/ui/image';
import { downloadPost, isNative, openExternal } from '@/lib/mobile';
import { toast } from 'sonner';
import { postChannels } from '../../../shared/publish-channels.mjs';

export default function EditorialPost({ post, compact = false, onPlan, onSchedule, onAction, onCopy, onBrief }) {
  useI18n();
  const locked = ['in_coda','in_pubblicazione','pubblicato','da_verificare'].includes(post.status);
  const planningOnly = !!post.planning && !post.image_url;
  const date = Number.isFinite(scheduledTime(post)) ? post.scheduled_at : editorialDate(post);
  const channels = postChannels(post);
  const platform = channels.length === 2 ? translateUI('Instagram e Facebook') : platformLabel(channels[0]);
  const title = post.title || post.headline || post.planning?.topic || 'Senza titolo';
  const source = post.image_url || post.original_image_url;
  const link = '/studio?id=' + post.id;
  const stage = editorialStage(post);
  const status = STAGES[post.status] || STAGES[stage] || 'Stato non indicato';
  return <article data-tour="library-content" aria-label={title} className={'library-post ' + (compact ? 'library-post-compact' : 'library-post-tile')}>
    <Link to={link} className="library-post-open" aria-label={translateUI("Apri ") + title}>
      <div className="library-post-cover">
        {source ? <Image src={source} alt="" loading="lazy" unavailable={<span>{translateUI("Anteprima non disponibile")}</span>} /> : <span>{translateUI("Foto da aggiungere")}</span>}
      </div>
      <div className="library-post-info">
        <h3>{title}</h3>
        <p className="library-post-status">{translateUI(status)}{post.publication_method === 'manual' ? translateUI(" manualmente") : ''}</p>
        <p className="library-post-meta">{[platform, stage !== post.status && translateUI(STAGES[stage])].filter(Boolean).join(' · ')}</p>
        {date && <time className="library-post-meta" dateTime={date}>{new Date(date).toLocaleString(languageLocale(), compact ? {hour:'2-digit',minute:'2-digit'} : {dateStyle:'short',timeStyle:'short'})}</time>}
      </div>
    </Link>
    {!compact && (post.social_job?.caption || post.caption) && <p className="library-post-excerpt">{post.social_job?.caption || post.caption}</p>}
    {post.editorial_notes && <details className="mt-3 text-xs"><summary className="cursor-pointer py-1 font-medium">{translateUI("Note editoriali")}</summary><p className="whitespace-pre-wrap text-muted-foreground mt-1 break-words">{post.editorial_notes}</p></details>}
    {post.planning && <div className="mt-3 space-y-2 text-xs text-muted-foreground">{post.planning.objective && <p className="line-clamp-2 break-words">{post.planning.objective}</p>}{post.planning.shooting_at && <p>{translateUI("Shooting:")} {new Date(post.planning.shooting_at).toLocaleString(languageLocale(), { dateStyle: 'short', timeStyle: 'short' })}</p>}{!locked && <button type="button" className="min-h-11 text-purple underline" onClick={() => onBrief(post)}>{translateUI("Apri brief e scatti da preparare")}</button>}</div>}
    {post.schedule_error && <p className="text-xs text-destructive mt-3 break-words" role="status">{post.schedule_error}</p>}
    {post.published_url && <a href={post.published_url} target="_blank" rel="noopener noreferrer" onClick={event => { if (isNative) { event.preventDefault(); openExternal(post.published_url).catch(error => toast.error(translateUI(error.message))); } }} className="text-xs text-purple underline block mt-3">{translateUI("Apri il post pubblicato")}</a>}
    {post.status === 'da_verificare' && <div className="mt-3 space-y-2"><p className="text-sm">{translateUI("Controlla l’account sul social prima di scegliere.")}</p><div className="flex flex-wrap gap-2"><Button variant="outline" className="min-h-11" onClick={() => onAction('resolvePublished', post)}>{translateUI("Il post è presente")}</Button><Button variant="outline" className="min-h-11" onClick={() => onAction('resolveMissing', post)}>{translateUI("Il post non è presente")}</Button></div></div>}
    <div data-tour="library-actions" className="mt-auto pt-2">
      <div className="flex flex-wrap items-center gap-1">
        {(compact || locked || planningOnly) && <Button variant={planningOnly ? 'default' : 'outline'} size="sm" className="min-h-11 h-auto min-w-0 whitespace-normal px-2 leading-4" asChild><Link to={link}>{locked ? translateUI("Visualizza") : planningOnly ? translateUI("Prepara") : translateUI("Modifica")}</Link></Button>}
        {!planningOnly && !locked && <Button size="sm" className="h-11 min-w-min whitespace-normal px-3 leading-4" disabled={!platform} onClick={() => onSchedule(post)}>{post.publication_group && post.status === 'fallito' ? translateUI('Riprova su {platform}', { platform }) : translateUI("Pubblica")}</Button>}
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="ml-auto h-11 w-11 shrink-0" aria-label={translateUI("Altre azioni per ") + (post.title || translateUI("Senza titolo"))}><MoreHorizontal size={18} /></Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64 max-w-[calc(100vw-2rem)]">
            {!compact && !locked && !planningOnly && <DropdownMenuItem asChild className="min-h-11"><Link to={link}>{translateUI("Modifica post")}</Link></DropdownMenuItem>}
            {!locked && <DropdownMenuItem className="min-h-11" onSelect={() => onPlan(post)}>{date ? translateUI("Modifica data prevista") : translateUI("Pianifica")}</DropdownMenuItem>}
            {!planningOnly && <DropdownMenuItem className="min-h-11" onSelect={() => downloadPost(post.id).catch(error => toast.error(translateUI("Download non riuscito: ") + translateUI(error.message)))}>{translateUI("Scarica foto e testo (ZIP)")}</DropdownMenuItem>}
            <DropdownMenuItem className="min-h-11" disabled={!post.caption && !post.hashtags} onSelect={() => onCopy(post)}>{translateUI("Copia testo")}</DropdownMenuItem>
            {!planningOnly && platform && post.status === 'in_coda' && <DropdownMenuItem className="min-h-11" onSelect={() => onSchedule(post)}>{translateUI("Modifica invio automatico")}</DropdownMenuItem>}
            {post.status === 'in_coda' && <DropdownMenuItem className="min-h-11" onSelect={() => onAction('cancel',post)}>{translateUI("Annulla invio")}</DropdownMenuItem>}
            {!locked && !planningOnly && <DropdownMenuItem className="min-h-11" onSelect={() => onAction('published',post)}>{translateUI("Segna come pubblicato")}</DropdownMenuItem>}
            {!['in_coda','in_pubblicazione','da_verificare'].includes(post.status) && <><DropdownMenuSeparator /><DropdownMenuItem className="min-h-11 text-destructive focus:text-destructive" onSelect={() => onAction('delete',post)}>{translateUI("Elimina post")}</DropdownMenuItem></>}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  </article>;
}

