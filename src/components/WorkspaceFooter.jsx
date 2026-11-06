import { useI18n } from '@/lib/i18n';
export default function WorkspaceFooter({ sidebar = false }) {
  const { t } = useI18n();
  const Tag = sidebar ? 'p' : 'footer';
  return <Tag className={sidebar ? 'workspace-brand-credit' : 'workspace-footer'}><span>{t('Realizzato da')}</span>{' '}<a href="https://sodanoconsulting.it/" target="_blank" rel="noopener noreferrer">Sodano Consulting</a></Tag>;
}
