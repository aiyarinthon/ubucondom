export interface UbuLocation {
  id: string | number;
  name: string;
  status: 'มีอยู่' | 'หมดแล้ว' | string;
  lat: number;
  lng: number;
  zone?: string;
  landmark?: string;
  lastUpdated?: string;
}

export interface VolunteerLog {
  id?: string;
  date: string;
  name: string;
  year: string | number;
  faculty: string;
  studentId: string;
  location: string;
  lubricant: number;
  size49: number;
  size52: number;
  size54: number;
  size56: number;
  comment: string;
  imageUrl?: string;
}

export interface VolunteerFormData {
  name: string;
  year: string | number;
  faculty: string;
  studentId: string;
  location: string;
  lubricant: number;
  size49: number;
  size52: number;
  size54: number;
  size56: number;
  comment: string;
  imageUrl?: string;
}

export interface SurveyRecord {
  id?: string;
  date: string;
  rating: number; // 1 - 5
  feedback: string;
}

export interface AdminData {
  logs: VolunteerLog[];
  ratings: number[];
}
