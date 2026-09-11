import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

export function OptionAvatar({ index, className = '' }) {
  return <span aria-hidden="true" className={cn('block rounded-full bg-[#efedf7] bg-no-repeat shrink-0 aspect-square', className)} style={{ backgroundImage: 'url(/assets/option-avatars-v1.png)', backgroundSize: '400% 400%', backgroundPosition: `${(index % 4) * 100 / 3}% ${Math.floor(index / 4) * 100 / 3}%` }} />;
}
export default function AvatarChoice({ index, label, hint = '', selected = false, onClick, disabled = false, compact = false }) {
  return <button type="button" aria-pressed={selected} disabled={disabled} onClick={onClick} className={cn('group flex min-w-0 flex-col items-center rounded-2xl text-center border-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50', compact ? 'px-0 py-2' : 'px-1 py-3', selected ? 'border-purple bg-accent' : 'border-transparent hover:bg-secondary')}>
    <span className="relative"><OptionAvatar index={index} className={compact ? 'w-12 sm:w-14' : 'w-16 sm:w-[72px]'} />{selected && <span aria-hidden="true" className="absolute right-0 bottom-0 flex h-5 w-5 items-center justify-center rounded-full bg-purple text-white border border-white"><Check size={12} /></span>}</span>
    <span className={cn('leading-snug font-semibold mt-2 break-words w-full', compact ? 'text-[11px] sm:text-xs' : 'text-xs sm:text-sm')}>{label}</span>
    {hint && <span className="text-[11px] text-muted-foreground mt-1 leading-snug">{hint}</span>}
    <span className="sr-only">{selected ? 'Selezionato' : ''}</span>
  </button>;
}

