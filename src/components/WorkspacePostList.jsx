import { Link } from 'react-router-dom';
import { CalendarDays, ChevronRight, Facebook, Image as ImageIcon, Instagram } from 'lucide-react';
import { Image } from '@/components/ui/image';
import { editorialDate, editorialStage, platformLabel, scheduledTime, STAGES } from '@/lib/editorialDates.mjs';
import { useI18n } from '@/lib/i18n';
export default function WorkspacePostList({ posts }) {
  const { t, locale } = useI18n();
  const dates = new Intl.DateTimeFormat(locale, { weekday:'short', day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' });
  return <ul className="workspace-post-list">{posts.map(post => {
    const image = post.image_url || post.original_image_url;
    const title = post.title || post.headline || post.planning?.topic || t('Senza titolo');
    const platform = platformLabel(post.platform);
    const NetworkIcon = platform === 'Instagram' ? Instagram : Facebook;
    const programmed = Number.isFinite(scheduledTime(post));
    const date = programmed ? post.scheduled_at : editorialDate(post);
    const stage = editorialStage(post);
    const stageLabel = Object.hasOwn(STAGES, stage) ? STAGES[stage] : 'Stato non indicato';
    const status = programmed ? 'Programmato' : stageLabel;
    return <li key={post.id}>
      <Link to={'/studio?id=' + encodeURIComponent(post.id)} className="workspace-post-row">
        <span className="post-row-thumbnail">
          {image ? <Image src={image} alt="" loading="lazy" /> : <ImageIcon size={24} aria-hidden="true" />}
        </span>
        <span className="post-row-copy">
          <strong>{title}</strong>
          {date && <time className="post-row-date" dateTime={date}><CalendarDays size={14} aria-hidden="true" />{dates.format(new Date(date))}</time>}
          <span className="post-row-detail">
            {platform && <span className={'post-row-network network-' + platform.toLowerCase()}><NetworkIcon size={16} aria-hidden="true" /><span>{platform}</span></span>}
            <span className={'post-state state-' + post.status}>{t(status)}</span>
          </span>
        </span>
        <ChevronRight size={16} aria-hidden="true" />
      </Link>
    </li>;
  })}</ul>;
}
