import BrandLink from '@/components/BrandLink';
import WorkspaceNav from '@/components/WorkspaceNav';
import ThemeToggle from '@/components/ThemeToggle';
import HelpButton from '@/components/HelpButton';

export default function WorkspaceHeader({ subtitle = '', actions = null, showGuide = true, navigation = null }) {
  return <header className="sticky top-0 z-20 border-b border-border bg-background/95 safe-top">
    <div className="workspace-x-insets mx-auto grid h-16 max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-1 sm:gap-2 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
      <BrandLink subtitle={subtitle} />
      <div className="workspace-header-nav">{navigation || <WorkspaceNav />}</div>
      <div className="flex items-center justify-end gap-1">{showGuide && <HelpButton />}<ThemeToggle />{actions}</div>
    </div>
  </header>;
}
