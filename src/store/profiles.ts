import { isCharacterId, type CharacterId } from '../core/characters';
import { tr } from '../core/lang';
import { newId, ProgressStore } from './progress';
import type { Storage } from './storage';

/**
 * Profils famille : jusqu'à 4 joueurs sur un même appareil, chacun avec sa propre base
 * (niveaux, tests, trophées, réglages). Le premier profil garde la base historique
 * « esprit-vif » : une installation existante n'a rien à migrer.
 */

export const MAX_PROFILES = 4;
export const PROFILE_COLORS = 6;
export const MAIN_DB = 'esprit-vif';
const REGISTRY_DB = 'esprit-vif-profils';

export interface Profile {
  id: string;
  name: string;
  /** Indice de couleur de l'avatar (0 à 5, les couleurs des domaines). */
  color: number;
  /** Le compagnon choisi : avatar du joueur et commentateur de ses parties. */
  character: CharacterId;
  /** Nom de la base qui contient sa progression. */
  db: string;
  createdAt: string;
}

export interface ProfilesState {
  profiles: readonly Profile[];
  active: Profile;
  store: ProgressStore;
}

export interface ProfileBackend {
  /** Ouvre (ou crée) une base par son nom. */
  open(name: string): Promise<Storage>;
  /** Supprime une base et tout son contenu. */
  remove(name: string): Promise<void>;
}

const cleanName = (name: string) => name.trim().replace(/\s+/g, ' ').slice(0, 16);

function isProfile(value: unknown): value is Profile {
  const p = value as Profile;
  return Boolean(p) && typeof p.id === 'string' && typeof p.name === 'string' && typeof p.db === 'string' && Number.isInteger(p.color);
}

export class ProfileManager {
  private state: ProfilesState;
  private readonly listeners = new Set<() => void>();

  private constructor(
    private readonly backend: ProfileBackend,
    private readonly registry: Storage,
    state: ProfilesState,
  ) {
    this.state = state;
  }

  static async open(backend: ProfileBackend, now = new Date()): Promise<ProfileManager> {
    const registry = await backend.open(REGISTRY_DB);
    const { kv } = await registry.readAll();
    let profiles: Profile[] = Array.isArray(kv.profiles)
      ? kv.profiles.filter(isProfile).map((p) => ({ ...p, character: isCharacterId(p.character) ? p.character : 'vif' }))
      : [];
    if (profiles.length === 0) {
      // Première ouverture : le joueur existant (ou le tout premier) devient le profil principal.
      profiles = [{ id: 'principal', name: '', color: 0, character: 'vif', db: MAIN_DB, createdAt: now.toISOString() }];
      await registry.setKv('profiles', profiles);
    }
    const active = profiles.find((p) => p.id === kv.active) ?? profiles[0];
    const store = await ProgressStore.load(await backend.open(active.db));
    return new ProfileManager(backend, registry, { profiles, active, store });
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = (): ProfilesState => this.state;

  private commit(next: ProfilesState) {
    this.state = next;
    for (const listener of this.listeners) listener();
  }

  private async saveProfiles(profiles: Profile[], active: Profile, store = this.state.store) {
    await this.registry.setKv('profiles', profiles);
    await this.registry.setKv('active', active.id);
    this.commit({ profiles, active, store });
  }

  async switchTo(id: string): Promise<void> {
    const target = this.state.profiles.find((p) => p.id === id);
    if (!target || target.id === this.state.active.id) return;
    const store = await ProgressStore.load(await this.backend.open(target.db));
    await this.saveProfiles([...this.state.profiles], target, store);
  }

  /** Nouveau joueur, qui devient aussitôt le profil actif. */
  async add(name: string, color: number, character: CharacterId = 'vif', now = new Date()): Promise<Profile> {
    if (this.state.profiles.length >= MAX_PROFILES) throw new Error(tr(`${MAX_PROFILES} profils au maximum.`, `${MAX_PROFILES} profiles at most.`));
    const id = newId();
    const profile: Profile = { id, name: cleanName(name), color: color % PROFILE_COLORS, character, db: `${MAIN_DB}-${id}`, createdAt: now.toISOString() };
    const store = await ProgressStore.load(await this.backend.open(profile.db));
    await this.saveProfiles([...this.state.profiles, profile], profile, store);
    return profile;
  }

  async update(id: string, patch: { name?: string; color?: number; character?: CharacterId }): Promise<void> {
    const profiles = this.state.profiles.map((p) =>
      p.id === id
        ? {
            ...p,
            ...(patch.name !== undefined ? { name: cleanName(patch.name) } : {}),
            ...(patch.color !== undefined ? { color: patch.color % PROFILE_COLORS } : {}),
            ...(patch.character !== undefined ? { character: patch.character } : {}),
          }
        : p,
    );
    const active = profiles.find((p) => p.id === this.state.active.id) ?? profiles[0];
    await this.saveProfiles(profiles, active);
  }

  /** Supprime un joueur et toute sa progression. Le dernier profil ne se supprime pas. */
  async remove(id: string): Promise<void> {
    const target = this.state.profiles.find((p) => p.id === id);
    if (!target || this.state.profiles.length <= 1) return;
    const profiles = this.state.profiles.filter((p) => p.id !== id);
    if (this.state.active.id === id) {
      const next = profiles[0];
      const store = await ProgressStore.load(await this.backend.open(next.db));
      await this.saveProfiles(profiles, next, store);
    } else {
      await this.saveProfiles(profiles, this.state.active);
    }
    await this.backend.remove(target.db);
  }
}

/** Prénom affichable : « Joueur 2 » (« Player 2 ») tant que le profil n'a pas de nom. */
export function profileName(profile: Profile, profiles: readonly Profile[]): string {
  const rank = profiles.indexOf(profile) + 1;
  return profile.name || tr(`Joueur ${rank}`, `Player ${rank}`);
}
