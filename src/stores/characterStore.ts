import { v4 as uuidv4 } from 'uuid';
import type { Character } from '../types';

/**
 * Character store state interface
 */
export interface CharacterState {
  characters: Record<string, Character>;
}

/**
 * Character store actions interface
 */
export interface CharacterActions {
  createCharacter: (character: Omit<Character, 'id'>) => string;
  updateCharacter: (id: string, updates: Partial<Character>) => void;
  deleteCharacter: (id: string) => void;
}

/**
 * Creates the character store slice
 */
export const createCharacterSlice = (set: any, _get: any) => ({
  // === INITIAL STATE ===
  characters: {},

  // === CHARACTER ACTIONS ===
  
  createCharacter: (character: Omit<Character, 'id'>) => {
    const newCharacter: Character = {
      ...character,
      id: uuidv4()
    };

    set((state: any) => ({
      characters: { ...state.characters, [newCharacter.id]: newCharacter }
    }));

    return newCharacter.id;
  },

  updateCharacter: (id: string, updates: Partial<Character>) => {
    set((state: any) => ({
      characters: {
        ...state.characters,
        [id]: state.characters[id] ? { ...state.characters[id], ...updates } : state.characters[id]
      }
    }));
  },

  deleteCharacter: (id: string) => {
    set((state: any) => {
      const { [id]: deletedCharacter, ...remainingCharacters } = state.characters;
      
      // Clean up references in star tags
      const updatedStars = { ...state.stars };
      Object.values(updatedStars).forEach((star: any) => {
        star.tags.characters = star.tags.characters.filter((charId: string) => charId !== id);
      });
      
      return {
        characters: remainingCharacters,
        stars: updatedStars
      };
    });
  },
}); 