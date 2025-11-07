import postgrest from '@/lib/postgrestClient';

export interface ActivityLogEntry {
  user_id: string;
  table_name: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  record_id?: string;
  old_data?: any;
  new_data?: any;
  ip_address?: string;
  user_agent?: string;
}

// Manual activity logging function (fallback when triggers don't work)
export const logActivity = async (entry: ActivityLogEntry) => {
  try {
    const { error } = await postgrest
      .from('activity_log')
      .insert({
        user_id: entry.user_id,
        table_name: entry.table_name,
        action: entry.action,
        record_id: entry.record_id,
        old_data: entry.old_data,
        new_data: entry.new_data,
        ip_address: entry.ip_address,
        user_agent: entry.user_agent || navigator.userAgent,
      })
      .execute();

    if (error) {
      console.error('Failed to log activity:', error);
    }
  } catch (error) {
    console.error('Error logging activity:', error);
  }
};

// Helper function to get user's IP address (simplified)
export const getUserIP = async (): Promise<string | undefined> => {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip;
  } catch (error) {
    console.error('Failed to get IP address:', error);
    return undefined;
  }
};

// Enhanced logging function that includes IP and user agent
export const logActivityWithContext = async (
  user_id: string,
  table_name: string,
  action: 'INSERT' | 'UPDATE' | 'DELETE',
  record_id?: string,
  old_data?: any,
  new_data?: any
) => {
  const ip_address = await getUserIP();
  
  await logActivity({
    user_id,
    table_name,
    action,
    record_id,
    old_data,
    new_data,
    ip_address,
    user_agent: navigator.userAgent,
  });
};
