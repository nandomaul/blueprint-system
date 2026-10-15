import type { Project, ProfileId, Version } from '../domain/model.ts';
export type ActiveRecord = { key: 'active'; token: string; project: Project };
export type SaveResult = { token: string; version: Version };
export interface Repository {
  kind: 'device' | 'supabase';
  load(): Promise<ActiveRecord | null>;
  history(): Promise<Version[]>;
  save(project: Project, expectedToken: string | null, label: string, profile?: ProfileId): Promise<SaveResult>;
  rename(id: string, label: string): Promise<void>;
  trash(id: string): Promise<void>;
  untrash(id: string): Promise<void>;
  restore(id: string, expectedToken: string | null, profile: ProfileId): Promise<SaveResult>;
  close(): Promise<void>;
}
