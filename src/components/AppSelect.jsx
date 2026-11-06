import LanguageFlag from '@/components/LanguageFlag';
import { Children, Fragment, isValidElement } from 'react';
import { ListFilter, CalendarDays, Type, Image, AlignLeft, Megaphone, Instagram, Facebook, LayoutTemplate, CircleCheck } from 'lucide-react';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
function optionsOf(children) {
  return Children.toArray(children).flatMap(child => !isValidElement(child) ? [] : child.type === Fragment ? optionsOf(child.props.children) : child.type === 'option' ? [{ value: String(child.props.value ?? child.props.children), label: child.props.children, disabled: child.props.disabled }] : []);
}
function fieldIcon(id = '') {
  if (/font|weight/.test(id)) return Type;
  if (/logo|backdrop/.test(id)) return Image;
  if (/align/.test(id)) return AlignLeft;
  if (/tone/.test(id)) return Megaphone;
  if (/format|template|element/.test(id)) return LayoutTemplate;
  if (/period|planning-view/.test(id)) return CalendarDays;
  if (/stage/.test(id)) return CircleCheck;
  return ListFilter;
}
/** Il menu condivide colori e controlli della tastiera dell’app anche nei portali e in modalità scura. */
export default function AppSelect({ children, value, onChange, id = undefined, name = undefined, required = false, disabled = false, className = '', icon = undefined, ...props }) {
  const options = optionsOf(children);
  const selected = String(value ?? '');
  const languageField = /language/.test(id || '');
  const selectedOption = options.find(option => option.value === selected);
  const Icon = selected.toLowerCase() === 'instagram' ? Instagram : selected.toLowerCase() === 'facebook' ? Facebook : icon || fieldIcon(id);
  const chooseOption = next => {
    /** Il controllo nativo interno può azzerarsi quando cambiano le opzioni. Anche una scelta vuota esplicita ha il prefisso value:. */
    const option = options.find(item => 'value:' + item.value === next && !item.disabled);
    if (option) onChange?.({ target:{ value:option.value, name, id } });
  };
  return <Select value={'value:' + selected} onValueChange={chooseOption} name={name} required={required} disabled={disabled}>
    <SelectTrigger id={id} className={'app-select ' + className} {...props}>{languageField ? <LanguageFlag language={selected} /> : <Icon size={18} aria-hidden="true" />}<SelectValue>{selectedOption?.label}</SelectValue></SelectTrigger>
    <SelectContent className="app-select-menu" position="popper" sideOffset={5}>{options.map(option => {
      const OptionIcon = option.value.toLowerCase() === 'instagram' ? Instagram : option.value.toLowerCase() === 'facebook' ? Facebook : null;
      return <SelectItem key={option.value} value={'value:' + option.value} data-option-value={option.value} disabled={option.disabled} className="app-select-option"><span className="app-select-option-label">{languageField && <LanguageFlag language={option.value} />}{OptionIcon && <OptionIcon size={17} aria-hidden="true" />}{option.label}</span></SelectItem>;
    })}</SelectContent>
  </Select>;
}
