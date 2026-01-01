import { api } from './api';

export interface ActivityLog {
  id: string;
  tenant_id: string;
  user_id: string;
  activity_type: string;
  entity_type: string;
  entity_id?: string;
  entity_name?: string;
  description?: string;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
  user_name?: string;
  user_email?: string;
}

export interface ActivityLogFilter {
  user_id?: string;
  activity_type?: string;
  entity_type?: string;
  start_date?: string;
  end_date?: string;
  limit?: number;
  offset?: number;
}

export const activityLogsApi = {
  list: async (filters?: ActivityLogFilter): Promise<ActivityLog[]> => {
    const params = new URLSearchParams();
    if (filters?.user_id) params.append('user_id', filters.user_id);
    if (filters?.activity_type) params.append('activity_type', filters.activity_type);
    if (filters?.entity_type) params.append('entity_type', filters.entity_type);
    if (filters?.limit) params.append('limit', filters.limit.toString());
    if (filters?.offset) params.append('offset', filters.offset.toString());

    const response = await api.get<ActivityLog[]>(`/activity-logs?${params.toString()}`);
    return response.data;
  },

  get: async (id: string): Promise<ActivityLog> => {
    const response = await api.get<ActivityLog>(`/activity-logs/${id}`);
    return response.data;
  },
};
