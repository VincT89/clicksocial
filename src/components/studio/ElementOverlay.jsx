import { useRef } from 'react';
import { ELEMENT_LABELS, changeElement, moveBox, scaleElement } from '../../../shared/designElements.mjs';

export default function ElementOverlay({ design, onChange, layout, selected, onSelect, disabled }) {
  const frame = useRef(null), drag = useRef(null);
  const start = (event, role, resize = false) => {
    if (disabled || event.button !== 0 || drag.current) return;
    const rect = frame.current.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    event.preventDefault(); event.stopPropagation();
    onSelect(role);
    event.currentTarget.focus({ preventScroll: true });
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { pointer: event.pointerId, role, resize, rect, x: event.clientX, y: event.clientY, box: layout[role].box, fontSize: layout[role].fontSize, design };
  };
  const move = event => {
    const active = drag.current;
    if (!active || event.pointerId !== active.pointer || disabled) return;
    const dx = (event.clientX - active.x) / active.rect.width, dy = (event.clientY - active.y) / active.rect.height;
    if (active.resize) {
      const w = active.box.width * active.rect.width, h = active.box.height * active.rect.height;
      const factor = 1 + ((event.clientX - active.x) * w + (event.clientY - active.y) * h) / (w * w + h * h);
      onChange(scaleElement(active.design, active.role, active.box, factor, active.fontSize));
    } else onChange(changeElement(active.design, active.role, moveBox(active.box, active.box.x + dx, active.box.y + dy)));
  };
  const finish = event => {
    if (drag.current?.pointer !== event.pointerId) return;
    drag.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };
  const keyboard = (event, role, resize = false) => {
    if (disabled) return;
    const direction = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[event.key];
    if (!direction && !['+', '-', '='].includes(event.key)) return;
    event.preventDefault();
    const { box, fontSize } = layout[role], step = event.shiftKey ? .02 : .005;
    if (resize || !direction) {
      const sign = direction ? direction[0] + direction[1] : event.key === '-' ? -1 : 1;
      onChange(scaleElement(design, role, box, 1 + sign * (event.shiftKey ? .1 : .025), fontSize));
    } else onChange(changeElement(design, role, moveBox(box, box.x + direction[0] * step, box.y + direction[1] * step)));
  };
  return <div ref={frame} className="studio-elements" onPointerDown={event => { if (event.target === event.currentTarget) onSelect(''); }}>
    <p id="studio-element-help" className="sr-only">Trascina per spostare. Usa la maniglia per ridimensionare. Con la tastiera usa le frecce per spostare, più e meno per la dimensione. Gli stessi controlli sono nelle impostazioni.</p>
    {Object.entries(ELEMENT_LABELS).map(([role, label]) => {
      const item = layout[role];
      if (!item?.visible) return null;
      const box = item.box, active = selected === role;
      return <div key={role} className={'studio-element' + (active ? ' is-selected' : '')} style={{ left: box.x * 100 + '%', top: box.y * 100 + '%', width: box.width * 100 + '%', height: box.height * 100 + '%', zIndex: active ? 3 : 1 }}>
        <button type="button" className="studio-element-move" disabled={disabled} aria-label={'Sposta ' + label.toLowerCase()} aria-pressed={active} aria-describedby="studio-element-help" onFocus={() => onSelect(role)} onPointerDown={event => start(event, role)} onPointerMove={move} onPointerUp={finish} onPointerCancel={finish} onLostPointerCapture={() => { drag.current = null; }} onClick={() => onSelect(role)} onKeyDown={event => keyboard(event, role)} />
        {active && !disabled && <button type="button" className="studio-element-resize" aria-label={'Ridimensiona ' + label.toLowerCase()} aria-describedby="studio-element-help" onPointerDown={event => start(event, role, true)} onPointerMove={move} onPointerUp={finish} onPointerCancel={finish} onLostPointerCapture={() => { drag.current = null; }} onKeyDown={event => keyboard(event, role, true)}><span /></button>}
      </div>;
    })}
  </div>;
}
