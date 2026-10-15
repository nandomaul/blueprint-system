import { validateProject, VersionSchema } from '../domain/model.ts';
import type { Project, ProfileId, Version } from '../domain/model.ts';
import type { ActiveRecord, Repository, SaveResult } from './repository.ts';
export function createRepository(factory: IDBFactory, name = 'adfriends-blueprint-v1'): Repository {
  let connection: Promise<IDBDatabase> | null = null;
  function database(): Promise<IDBDatabase> {
    if (!connection) connection = new Promise((resolve, reject) => {
      const open = factory.open(name, 1);
      open.onupgradeneeded = () => { const db = open.result; db.createObjectStore('projects', { keyPath: 'key' }); db.createObjectStore('versions', { keyPath: 'id' }); };
      open.onerror = () => { connection = null; reject(open.error ?? new Error('Penyimpanan browser tidak tersedia.')); };
      open.onblocked = () => { connection = null; reject(new Error('Tutup tab blueprint lama lalu coba kembali.')); };
      open.onsuccess = () => { const db = open.result; db.onversionchange = () => { db.close(); connection = null; }; resolve(db); };
    });
    return connection;
  }
  async function load(): Promise<ActiveRecord | null> {
    const db = await database();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('projects', 'readonly'), read = tx.objectStore('projects').get('active');
      let value: ActiveRecord | null = null;
      read.onsuccess = () => { try { const r = read.result as ActiveRecord | undefined; value = r ? { key: 'active', token: String(r.token), project: validateProject(r.project) } : null; } catch (e) { reject(e); } };
      tx.oncomplete = () => resolve(value); tx.onerror = () => reject(tx.error);
    });
  }
  async function commit(project: Project | null, expectedToken: string | null, label: string, profile: ProfileId, restoreId?: string): Promise<SaveResult> {
    if (project) validateProject(project);
    const db = await database();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['projects', 'versions'], 'readwrite'), projects = tx.objectStore('projects'), versions = tx.objectStore('versions');
      let result: SaveResult | undefined, reason: unknown;
      function fail(e: unknown) { reason = e; tx.abort(); }
      function write(snapshot: Project, name: string) {
        try {
          const version = VersionSchema.parse({ id: crypto.randomUUID(), label: name.trim(), savedAt: new Date().toISOString(), project: snapshot, profile, deletedAt: null });
          const token = crypto.randomUUID(); versions.add(version); projects.put({ key: 'active', token, project: version.project }); result = { token, version };
        } catch (e) { fail(e); }
      }
      const read = projects.get('active');
      read.onsuccess = () => {
        const current = read.result as ActiveRecord | undefined;
        if ((current?.token ?? null) !== expectedToken) { fail(new Error('Proyek berubah di tab lain. Ekspor perubahan tab ini, lalu muat ulang sebelum menyimpan.')); return; }
        if (restoreId) {
          const old = versions.get(restoreId);
          old.onsuccess = () => { try { const v = VersionSchema.parse(old.result); if (v.deletedAt) throw new Error('Pulihkan versi dari Trash terlebih dahulu.'); write(v.project, `Restore — ${v.label}`.slice(0, 100)); } catch (e) { fail(e); } };
        } else if (project) write(project, label);
      };
      tx.oncomplete = () => result ? resolve(result) : reject(new Error('Penyimpanan belum selesai.'));
      tx.onerror = tx.onabort = () => reject(reason ?? tx.error ?? new Error('Penyimpanan dibatalkan. Gunakan Ekspor JSON sebagai cadangan.'));
    });
  }
  async function history(): Promise<Version[]> {
    const db = await database();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('versions', 'readonly'), read = tx.objectStore('versions').getAll(); let versions: Version[] = [];
      read.onsuccess = () => { try { versions = (read.result as unknown[]).map(v => VersionSchema.parse(v)).sort((a,b) => b.savedAt.localeCompare(a.savedAt)); } catch (e) { reject(e); } };
      tx.oncomplete = () => resolve(versions); tx.onerror = () => reject(tx.error);
    });
  }
  async function edit(id: string, patch: (v: Version) => Version) {
    const db = await database();
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction('versions', 'readwrite'), store = tx.objectStore('versions'), read = store.get(id); let reason: unknown;
      read.onsuccess = () => { try { store.put(VersionSchema.parse(patch(VersionSchema.parse(read.result)))); } catch (e) { reason = e; tx.abort(); } };
      tx.oncomplete = () => resolve(); tx.onerror = tx.onabort = () => reject(reason ?? tx.error ?? new Error('Perubahan history gagal.'));
    });
  }
  return {
    kind: 'device', load, history,
    save: (p, token, label, profile = 'nando') => commit(p, token, label, profile),
    restore: (id, token, profile) => commit(null, token, '', profile, id),
    rename: (id, label) => edit(id, v => ({ ...v, label: label.trim() })),
    trash: id => edit(id, v => ({ ...v, deletedAt: v.deletedAt ?? new Date().toISOString() })),
    untrash: id => edit(id, v => ({ ...v, deletedAt: null })),
    close: async () => { if (connection) (await connection).close(); connection = null; },
  };
}
