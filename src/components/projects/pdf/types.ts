
export interface Client {
  name: string;
  document?: string;
  email?: string;
  phone?: string;
  responsible?: string;
  street?: string;
  number?: string;
  city?: string;
  state?: string;
}

export interface Stage {
  id: string;
  name: string;
  status: string;
  report: string | null;
  report_start_date: string | null;
  report_end_date: string | null;
  stage_photos?: {
    id: string;
    photo_url: string;
  }[];
}

export interface Project {
  id: string;
  name: string;
  client?: Client;
  status: string;
  start_date: string | null;
  end_date: string | null;
  project_manager?: string | null;
  stages?: Stage[];
}
