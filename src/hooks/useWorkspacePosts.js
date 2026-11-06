import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import { useAuth } from '@/lib/AuthContext';
export default function useWorkspacePosts() {
  const { user } = useAuth();
  return useQuery({ queryKey: ['workspace-posts', user?.id], queryFn: () => api.entities.Post.list(), enabled: !!user, staleTime: 0, refetchOnMount: 'always' });
}
