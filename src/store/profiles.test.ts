import { describe, expect, it } from 'vitest';
import { MAIN_DB, MAX_PROFILES, ProfileManager, profileName, type ProfileBackend } from './profiles';
import { createMemoryStorage, type Storage } from './storage';

function memoryBackend() {
  const bases = new Map<string, Storage>();
  const removed: string[] = [];
  const backend: ProfileBackend = {
    async open(name) {
      if (!bases.has(name)) bases.set(name, createMemoryStorage());
      return bases.get(name)!;
    },
    async remove(name) {
      bases.delete(name);
      removed.push(name);
    },
  };
  return { backend, bases, removed };
}

describe('Profils famille', () => {
  it('reprend la base historique comme profil principal', async () => {
    const { backend } = memoryBackend();
    const manager = await ProfileManager.open(backend);
    const { profiles, active } = manager.getSnapshot();
    expect(profiles).toHaveLength(1);
    expect(active.db).toBe(MAIN_DB);
    expect(profileName(active, profiles)).toBe('Joueur 1');
  });

  it('sépare la progression de chaque joueur et retient le profil actif', async () => {
    const { backend } = memoryBackend();
    const manager = await ProfileManager.open(backend);
    await manager.getSnapshot().store.updateSettings({ theme: 'dark' });
    const lea = await manager.add('  Léa   la  grande  ', 2);
    expect(lea.name).toBe('Léa la grande');
    expect(manager.getSnapshot().active.id).toBe(lea.id);
    expect(manager.getSnapshot().store.getSnapshot().settings.theme).toBe('auto');

    const reopened = await ProfileManager.open(backend);
    expect(reopened.getSnapshot().active.id).toBe(lea.id);
    await reopened.switchTo('principal');
    expect(reopened.getSnapshot().store.getSnapshot().settings.theme).toBe('dark');
  });

  it('limite à 4 joueurs et supprime une base avec son profil', async () => {
    const { backend, removed } = memoryBackend();
    const manager = await ProfileManager.open(backend);
    const added = [];
    for (let i = 1; i < MAX_PROFILES; i++) added.push(await manager.add(`J${i}`, i));
    await expect(manager.add('En trop', 0)).rejects.toThrow();
    await manager.remove(added[2].id);
    expect(removed).toEqual([added[2].db]);
    expect(manager.getSnapshot().active.id).toBe('principal');
    await manager.update(added[0].id, { name: 'Tom', color: 9 });
    expect(manager.getSnapshot().profiles[1]).toMatchObject({ name: 'Tom', color: 3 });
  });
});
