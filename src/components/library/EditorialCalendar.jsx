import { useMemo, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { dayKey, monthDays, moveMonth, editorialStage, STAGES } from '@/lib/editorialDates.mjs';
const weekdays = ['Lun','Mar','Mer','Gio','Ven','Sab','Dom'];

export default function EditorialCalendar({ month, setMonth, selected, onSelect, byDay }) {
  const days = useMemo(() => monthDays(month), [month]);
  const weekCount = Math.ceil(((new Date(month.getFullYear(), month.getMonth(), 1).getDay() + 6) % 7 + new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()) / 7);
  const grid = useRef(null);
  const today = dayKey(new Date());
  const choose = date => { const key = dayKey(date); onSelect(key); if (date.getMonth() !== month.getMonth() || date.getFullYear() !== month.getFullYear()) setMonth(moveMonth(date, 0)); };
  const keyboard = (event, date) => {
    const offsets = { ArrowLeft:-1, ArrowRight:1, ArrowUp:-7, ArrowDown:7, Home:-(date.getDay()+6)%7, End:6-(date.getDay()+6)%7 };
    let next;
    if (event.key in offsets) next = new Date(date.getFullYear(),date.getMonth(),date.getDate()+offsets[event.key],12);
    else if (event.key === 'PageUp' || event.key === 'PageDown') next = moveMonth(date,event.key === 'PageUp' ? -1 : 1);
    else return;
    event.preventDefault(); choose(next);
    requestAnimationFrame(() => grid.current?.querySelector('[data-day="' + dayKey(next) + '"]')?.focus());
  };
  const changeMonth = delta => { const next = moveMonth(month,delta); setMonth(next); onSelect(dayKey(next)); };
  return <section data-tour="library-calendar" className="min-w-0 rounded-xl border border-border bg-card overflow-hidden" aria-label="Calendario editoriale">
    <div className="flex items-center justify-between gap-1 px-3 py-2 sm:px-4 sm:py-3">
      <h2 className="font-heading font-semibold text-base sm:text-lg capitalize" aria-live="polite">{month.toLocaleDateString('it-IT',{month:'long',year:'numeric'})}</h2>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" aria-label="Mese precedente" onClick={() => changeMonth(-1)}><ChevronLeft size={18} /></Button>
        <Button variant="outline" size="sm" onClick={() => { setMonth(moveMonth(new Date(),0)); onSelect(today); }}>Oggi</Button>
        <Button variant="ghost" size="icon" aria-label="Mese successivo" onClick={() => changeMonth(1)}><ChevronRight size={18} /></Button>
      </div>
    </div>
    <div ref={grid} role="grid" aria-label={month.toLocaleDateString('it-IT',{month:'long',year:'numeric'})}>
      <div role="row" className="grid grid-cols-7 border-y border-border bg-secondary/40">{weekdays.map(day => <div role="columnheader" key={day} className="text-center text-xs text-muted-foreground py-2">{day}</div>)}</div>
      {Array.from({length:weekCount},(_,week) => <div role="row" className="grid grid-cols-7" key={week}>
        {days.slice(week*7,week*7+7).map(date => {
          const key = dayKey(date), posts = byDay.get(key) || [], current = key === selected;
          return <div role="gridcell" aria-selected={current} key={key} className="min-w-0">
            <button type="button" data-day={key} tabIndex={current ? 0 : -1} aria-current={key === today ? 'date' : undefined}
              aria-label={date.toLocaleDateString('it-IT',{weekday:'long',day:'numeric',month:'long',year:'numeric'}) + ', ' + posts.length + (posts.length === 1 ? ' contenuto' : ' contenuti')}
              onClick={() => choose(date)} onKeyDown={e => keyboard(e,date)}
              className={['w-full min-w-0 h-14 sm:h-20 p-1 sm:p-2 border-r border-b border-border flex flex-col items-start text-left focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-purple',current ? 'bg-accent ring-2 ring-inset ring-purple' : 'hover:bg-secondary', date.getMonth() === month.getMonth() ? '' : 'text-muted-foreground bg-secondary/30'].join(' ')}>
              <span className={['text-xs sm:text-sm w-6 h-6 flex items-center justify-center rounded-full', key === today ? 'bg-purple text-white font-bold' : ''].join(' ')}>{date.getDate()}</span>
              {posts.length > 0 && <>
                <span className="sm:hidden text-[10px] font-medium mt-1" aria-hidden="true">{posts.length}</span>
                <div className="hidden sm:block w-full min-w-0 mt-1">{posts.slice(0,posts.length > 2 ? 1 : 2).map(p => <span key={p.id} title={STAGES[editorialStage(p)] + ': ' + p.title} className="block truncate text-[11px] leading-4 border-l-2 border-purple pl-1">{p.title || 'Senza titolo'}</span>)}
                  {posts.length > 2 && <span className="block text-[10px] leading-4">Altri {posts.length - 1}</span>}
                </div>
              </>}
            </button>
          </div>;
        })}
      </div>)}
    </div>
  </section>;
}

