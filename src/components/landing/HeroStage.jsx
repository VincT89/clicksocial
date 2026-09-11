import { useEffect, useId, useRef, useState } from 'react';
import { BatteryFull, Bookmark, Heart, Home, MessageCircle, MoreHorizontal, PlusSquare, Search, Send, Wifi } from 'lucide-react';
import './PhoneMockup.css';

const FEED_IMAGE = '/assets/5b4eb4267_generated_image.png';
const BRAND_IMAGE = '/assets/55edd6a0a_generated_image.png';
const BODY_LAYERS = Array.from({ length: 25 }, (_, index) => index);

export function PhoneMockup({ image = FEED_IMAGE, caption = 'Una foto, una storia, il tono giusto.', straight = false, interactive = false }) {
  const instructionId = useId();
  const [rotation, setRotation] = useState({ x: 6, y: 24 });
  const [dragging, setDragging] = useState(false);
  const drag = useRef(null);
  const frame = useRef(0);
  const pending = useRef(rotation);
  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  const rotate = (x, y) => {
    pending.current = { x: Math.max(-26, Math.min(26, x)), y };
    if (!frame.current) frame.current = requestAnimationFrame(() => {
      setRotation(pending.current);
      frame.current = 0;
    });
  };
  const reset = () => rotate(6, 24);
  const startDrag = event => {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, angleX: rotation.x, angleY: rotation.y };
    setDragging(true);
  };
  const moveDrag = event => {
    const start = drag.current;
    if (!start || start.id !== event.pointerId) return;
    rotate(start.angleX - (event.clientY - start.y) * 0.25, start.angleY + (event.clientX - start.x) * 0.6);
  };
  const endDrag = event => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    drag.current = null;
    setDragging(false);
  };
  const keyboardRotate = event => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'Escape'].includes(event.key)) return;
    event.preventDefault();
    const current = pending.current;
    if (event.key === 'Home' || event.key === 'Escape') reset();
    else rotate(current.x + (event.key === 'ArrowUp' ? 5 : event.key === 'ArrowDown' ? -5 : 0), current.y + (event.key === 'ArrowRight' ? 15 : event.key === 'ArrowLeft' ? -15 : 0));
  };
  const interaction = interactive ? {
    tabIndex: 0,
    onPointerDown: startDrag,
    onPointerMove: moveDrag,
    onPointerUp: endDrag,
    onPointerCancel: endDrag,
    onLostPointerCapture: () => { drag.current = null; setDragging(false); },
    onKeyDown: keyboardRotate,
    onDoubleClick: reset,
    onDragStart: event => event.preventDefault(),
    'aria-describedby': instructionId,
  } : {};

  return <div className={`iphone-scene${straight ? ' iphone-scene--front' : ''}${interactive ? ' iphone-scene--interactive' : ''}${dragging ? ' is-dragging' : ''}`} role={interactive ? 'group' : 'img'} aria-label="iPhone 15 Plus nero in 3D" data-rotation-x={rotation.x} data-rotation-y={rotation.y} {...interaction}>
    {interactive && <span id={instructionId} className="sr-only">Trascina per ruotare l’iPhone, anche sul retro. Puoi usare le frecce della tastiera. Doppio clic, Home o Esc ripristinano la posizione. Sullo schermo è mostrato un post dimostrativo.</span>}
    <div className="iphone-model" style={interactive ? { transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg) rotateZ(-9deg)` } : undefined} aria-hidden="true">
      {BODY_LAYERS.map(layer => <div key={layer} className="iphone-body-layer" style={{ transform: `translateZ(-${layer * 10 / 24}cqi)` }} />)}
      <div className="iphone-rail iphone-rail--left">
        <span className="iphone-antenna iphone-antenna--top" />
        <span className="iphone-switch" />
        <span className="iphone-volume iphone-volume--up" />
        <span className="iphone-volume iphone-volume--down" />
        <span className="iphone-antenna iphone-antenna--bottom" />
      </div>
      <div className="iphone-rail iphone-rail--right">
        <span className="iphone-antenna iphone-antenna--top" />
        <span className="iphone-power" />
        <span className="iphone-antenna iphone-antenna--bottom" />
      </div>
      <div className="iphone-bottom-edge"><span className="iphone-speakers" /><span className="iphone-usb" /><span className="iphone-speakers" /></div>
      <div className="iphone-top-edge" />
      <div className="iphone-back">
        <div className="iphone-camera-block"><span className="iphone-lens iphone-lens--main" /><span className="iphone-lens iphone-lens--wide" /><span className="iphone-flash" /><span className="iphone-microphone" /></div>
        <svg className="iphone-back-mark" viewBox="0 0 64 76" fill="currentColor"><path d="M33 20c0-8 5-14 13-15 1 8-5 15-13 15Zm-1 5c-4 0-7-3-12-3C9 22 3 30 3 40c0 9 4 20 10 27 3 4 6 6 10 6 4 0 6-3 11-3 4 0 7 3 11 3 5 0 8-4 11-9 2-3 4-7 5-11-7-3-11-7-11-14 0-6 3-10 8-13-4-5-8-7-14-7-4 0-8 6-12 6Z" /></svg>
      </div>
      <div className="iphone-front">
        <span className="iphone-earpiece" />
        <div className="iphone-glass">
          <div className="iphone-screen">
            <div className="iphone-status">
              <span>9:41</span>
              <div className="iphone-status-icons"><span className="iphone-signal"><i /><i /><i /><i /></span><Wifi /><BatteryFull /></div>
            </div>
            <div className="iphone-island"><span /></div>
            <div className="iphone-feed-header"><span>Instagram</span><Heart /><Send /></div>
            <div className="iphone-account"><img src={BRAND_IMAGE} alt="" /><div><strong>il_tuo_brand</strong><span>Il tuo spazio creativo</span></div><MoreHorizontal /></div>
            <div className="iphone-photo"><img src={image} alt="" fetchPriority="high" decoding="async" /></div>
            <div className="iphone-post-actions"><Heart /><MessageCircle /><Send /><Bookmark /></div>
            <p className="iphone-caption"><strong>il_tuo_brand</strong> {caption}</p>
            <div className="iphone-feed-tabs"><Home /><Search /><PlusSquare /><Send /><img src={BRAND_IMAGE} alt="" /></div>
            <div className="iphone-home-indicator"><span /></div>
          </div>
        </div>
      </div>
    </div>
  </div>;
}

export default function HeroStage() {
  return <figure className="iphone-stage">
    <PhoneMockup interactive />
  </figure>;
}
