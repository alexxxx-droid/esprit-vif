import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { setLang } from '../core/lang';
import { profileName, type Profile } from './profiles';
import { parseBackup } from './progress';

describe('Messages du stockage en anglais', () => {
  beforeEach(() => setLang('en'));
  afterEach(() => setLang('fr'));

  it('nomme les joueurs sans prénom et explique les sauvegardes refusées', () => {
    const profile: Profile = { id: 'p', name: '', color: 0, character: 'vif', db: 'x', createdAt: '' };
    expect(profileName(profile, [profile])).toBe('Player 1');
    expect(() => parseBackup('not json')).toThrow('This file isn’t a readable backup.');
    expect(() => parseBackup('{"app":"other","format":1,"plays":[],"tests":[]}')).toThrow('This file doesn’t come from Esprit Vif.');
    expect(() => parseBackup('{"app":"esprit-vif","format":99,"plays":[],"tests":[]}')).toThrow('This backup comes from a newer version of the app.');
  });
});
