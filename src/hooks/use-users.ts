import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SystemUser {
  id: string;
  email: string;
}

/**
 * Hook to fetch all users from auth.users
 * Note: This requires a custom RPC function or edge function to list users
 * For now, we'll use a workaround with calendar_event_attendees to get known users
 */
export function useUsers() {
  return useQuery({
    queryKey: ["system-users"],
    queryFn: async () => {
      // Get current user
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      // Since we can't directly query auth.users from client,
      // we'll return just the current user for now
      // In production, you'd want to create a profiles table or an edge function
      const users: SystemUser[] = [];
      
      if (currentUser) {
        users.push({
          id: currentUser.id,
          email: currentUser.email || "Usuário",
        });
      }

      return users;
    },
  });
}

/**
 * Get user email by ID from local cache
 */
export function useUserEmail(userId: string | undefined) {
  const { data: users } = useUsers();
  
  if (!userId || !users) return null;
  
  const user = users.find(u => u.id === userId);
  return user?.email || null;
}
