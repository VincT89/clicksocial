import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { MoreHorizontal } from 'lucide-react';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { editorialDate, editorialStage, STAGES, PLATFORMS } from '@/lib/editorialDates.mjs';
import { Image } from '@/components/ui/image';
import { downloadPost, isNative, openExternal } from '@/lib/mobile';
import { toast } from 'sonner';

export default function EditorialPost({ post, compact = false, onPlan, onSchedule, onAction, onCopy, onBrief }) {
  const locked = ['in_coda','in_pubblicazione','pubblicato','da_verificare'].includes(post.status);
  const planningOnly = !!post.planning && !post.image_url;
  const date = editorialDate(post);
  return <article data-tour="library-content" aria-label={post.title || 'Senza titolo'} className={['min-w-0 flex flex-col', compact ? 'py-4' : 'border border-border rounded-xl p-4 bg-card'].join(' ')}>
    <div className="flex gap-3">
      <Link to={'/studio?id=' + post.id} className="shrink-0" aria-label={'Apri ' + (post.title || 'post')}>
        {post.image_url || post.original_image_url ? <Image src={post.image_url || post.original_image_url} alt="" loading="lazy" className={['rounded-lg object-contain bg-secondary', compact ? 'w-14 h-14' : 'w-20 h-20'].join(' ')} /> : <div className={'flex items-center justify-center rounded-lg border border-border bg-secondary p-2 text-center text-xs text-muted-foreground ' + (compact ? 'w-14 h-14' : 'w-20 h-20')}>Foto da aggiungere</div>}
      </Link>
      <div className="min-w-0"><p className="text-xs text-muted-foreground">{PLATFORMS[post.platform] || post.platform}</p>
        <h3 className="font-semibold text-sm break-words mt-1"><Link to={'/studio?id=' + post.id} className="hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{post.title || 'Senza titolo'}</Link></h3>
        <p className="text-xs text-muted-foreground mt-1.5">{STAGES[editorialStage(post)]}{post.publication_method === 'manual' ? ' manualmente' : ''}{date && ' · ' + new Date(date).toLocaleString('it-IT',compact ? {hour:'2-digit',minute:'2-digit'} : {dateStyle:'short',timeStyle:'short'})}</p>
      </div>
    </div>
    {!compact && (post.social_job?.caption || post.caption) && <p className="text-sm text-muted-foreground mt-3 line-clamp-2 whitespace-pre-wrap break-words">{post.social_job?.caption || post.caption}</p>}
    {post.editorial_notes && <details className="mt-3 text-xs"><summary className="cursor-pointer py-1 font-medium">Note editoriali</summary><p className="whitespace-pre-wrap text-muted-foreground mt-1 break-words">{post.editorial_notes}</p></details>}
    {post.planning && <div className="mt-3 space-y-2 text-xs text-muted-foreground">{post.planning.objective && <p className="line-clamp-2 break-words">{post.planning.objective}</p>}{post.planning.shooting_at && <p>Shooting: {new Date(post.planning.shooting_at).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' })}</p>}{!locked && <button type="button" className="min-h-11 text-purple underline" onClick={() => onBrief(post)}>Apri brief e scatti da preparare</button>}</div>}
    {post.schedule_error && <p className="text-xs text-destructive mt-3 break-words" role="status">{post.schedule_error}</p>}
    {post.published_url && <a href={post.published_url} target="_blank" rel="noopener noreferrer" onClick={event => { if (isNative) { event.preventDefault(); openExternal(post.published_url).catch(error => toast.error(error.message)); } }} className="text-xs text-purple underline block mt-3">Apri il post pubblicato</a>}
    {post.status === 'da_verificare' && <div className="mt-3 space-y-2"><p className="text-sm">Controlla l’account sul social prima di scegliere.</p><div className="flex flex-wrap gap-2"><Button variant="outline" className="min-h-11" onClick={() => onAction('resolvePublished', post)}>Il post è presente</Button><Button variant="outline" className="min-h-11" onClick={() => onAction('resolveMissing', post)}>Il post non è presente</Button></div></div>}
    <div data-tour="library-actions" className="mt-auto pt-4">
      <div className="flex items-center gap-1">
        <Button variant={planningOnly ? 'default' : 'outline'} size="sm" className="h-11 min-w-min whitespace-normal px-1.5 leading-4" asChild><Link to={'/studio?id=' + post.id}>{locked ? 'Visualizza' : planningOnly ? 'Genera dalla bozza' : 'Modifica'}</Link></Button>
        {!locked && <Button variant={date ? 'outline' : 'default'} size="sm" className="h-11 min-w-min whitespace-normal px-1.5 leading-4" onClick={() => onPlan(post)}>{date ? 'Modifica data' : 'Pianifica'}</Button>}
        {!planningOnly && !locked && <Button size="sm" className="h-11 min-w-min whitespace-normal px-1.5 leading-4" onClick={() => onSchedule(post)}>Pubblica foto</Button>}
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="ml-auto h-11 w-11 shrink-0" aria-label={'Altre azioni per ' + (post.title || 'Senza titolo')}><MoreHorizontal size={18} /></Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64 max-w-[calc(100vw-2rem)]">
            {!planningOnly && <DropdownMenuItem className="min-h-11" onSelect={() => downloadPost(post.id).catch(error => toast.error('Download non riuscito: ' + error.message))}>Scarica foto e testo (ZIP)</DropdownMenuItem>}
            <DropdownMenuItem className="min-h-11" disabled={!post.caption && !post.hashtags} onSelect={() => onCopy(post)}>Copia testo</DropdownMenuItem>
            {!planningOnly && post.status === 'in_coda' && <DropdownMenuItem className="min-h-11" onSelect={() => onSchedule(post)}>Modifica invio automatico</DropdownMenuItem>}
            {post.status === 'in_coda' && <DropdownMenuItem className="min-h-11" onSelect={() => onAction('cancel',post)}>Annulla invio</DropdownMenuItem>}
            {!locked && !planningOnly && <DropdownMenuItem className="min-h-11" onSelect={() => onAction('published',post)}>Segna come pubblicato</DropdownMenuItem>}
            {!['in_coda','in_pubblicazione','da_verificare'].includes(post.status) && <><DropdownMenuSeparator /><DropdownMenuItem className="min-h-11 text-destructive focus:text-destructive" onSelect={() => onAction('delete',post)}>Elimina post</DropdownMenuItem></>}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  </article>;
}

