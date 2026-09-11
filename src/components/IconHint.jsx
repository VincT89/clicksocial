import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

/** @param {{label:string, children:import('react').ReactElement, side?:'top'|'right'|'bottom'|'left'}} props */
export default function IconHint({ label, children, side = 'bottom' }) {
  return <Tooltip>
    <TooltipTrigger asChild>{children}</TooltipTrigger>
    <TooltipContent side={side} sideOffset={8}>{label}</TooltipContent>
  </Tooltip>;
}
