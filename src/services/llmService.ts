import { invoke } from '@tauri-apps/api/tauri';
import { 
  SYSTEM_PROMPTS, 
  USER_PROMPT_TEMPLATES,
  RESPONSE_INSTRUCTIONS,
  SystemPromptKey,
  UserPromptTemplateKey,
  ResponseInstructionKey
} from './prompts';
import type { 
  Scene, 
  Character, 
  Star, 
  DraftTab, 
  LLMResponse, 
  ApiError
} from '../types';

/**
 * Configuration for different types of LLM prompts
 */
export interface PromptConfig {
  systemPromptKey: SystemPromptKey;
  userPromptTemplateKey: UserPromptTemplateKey;
  responseInstructionKey: ResponseInstructionKey;
}

/**
 * Available prompt types in the application
 */
export const PROMPT_CONFIGS: Record<string, PromptConfig> = {
  SCENE_TIMELINE: {
    systemPromptKey: 'SCENE_TIMELINE_GENERATOR',
    userPromptTemplateKey: 'SCENE_TIMELINE_TEMPLATE',
    responseInstructionKey: 'SCENE_TIMELINE_INSTRUCTIONS'
  },
  EVENT_DESCRIPTION: {
    systemPromptKey: 'EVENT_DESCRIPTION_GENERATOR',
    userPromptTemplateKey: 'EVENT_DESCRIPTION_TEMPLATE',
    responseInstructionKey: 'EVENT_DESCRIPTION_INSTRUCTIONS'
  },
  // Future prompt types can be added here:
  // CHARACTER_DEVELOPMENT: { ... },
  // DIALOGUE_ENHANCEMENT: { ... },
};

/**
 * Parameters for building LLM context
 */
export interface ContextParams {
  scene: Scene;
  characters: Character[];
  checkedStars: Star[];
  recentTabs: DraftTab[];
  targetEvent?: string; // Optional target event for description generation
}

/**
 * LLM Service class to handle all prompt-related functionality
 */
export class LLMService {
  /**
   * Builds context string from project data for LLM prompts
   */
  static buildContext(params: ContextParams): string {
    const { scene, characters, checkedStars, recentTabs } = params;
    let context = '';

    // Scene info
    context += `### SCENE: ${scene.name}\n`;
    if (scene.setting) context += `Setting: ${scene.setting}\n`;
    if (scene.backstory) context += `Backstory: ${scene.backstory}\n`;
    context += '\n';

    // Characters
    if (characters.length > 0) {
      context += '### CHARACTERS\n';
      characters.forEach(char => {
        context += `**${char.name}**\n`;
        Object.entries(char.fields).forEach(([key, value]) => {
          context += `- ${key}: ${value}\n`;
        });
        context += '\n';
      });
    }

    // Scene plan
    if (scene.plan.raw_text) {
      context += '### SCENE PLAN\n';
      context += scene.plan.raw_text + '\n\n';
    }

    // Recent timeline events - use summaries for older tabs, full content for latest 3
    if (recentTabs.length > 0) {
      context += '### RECENT EVENTS\n';
      
      // Split tabs: older tabs (summaries) and recent tabs (full content)
      const olderTabs = recentTabs.slice(0, -3); // All except last 3
      const lastThreeTabs = recentTabs.slice(-3); // Last 3 tabs
      
      // Add summaries for older tabs (chronological order)
      olderTabs.forEach((tab) => {
        if (tab.summary && tab.summary.trim()) {
          context += `- ${tab.summary}\n`;
        }
      });
      
      // Add full timeline content for recent tabs (chronological order)
      lastThreeTabs.forEach((tab) => {
        tab.timeline
          .filter(event => event.checked) // Only include checked events
          .forEach(event => {
            const dialoguePart = event.dialogue ? ` -> "${event.dialogue}"` : '';
            context += `- ${event.text}${dialoguePart}\n`;
          });
      });
      
      context += '\n';
    }

    // Character constraints (filter constraints from checked stars)
    const characterConstraints = checkedStars.filter(star => star.constraint_type && star.applies_to_character);
    if (characterConstraints.length > 0) {
      context += '### CHARACTER BEHAVIORAL CONSTRAINTS\n';
      
      // Group constraints by character
      const constraintsByCharacter = characterConstraints.reduce((acc, star) => {
        const characterId = star.applies_to_character!;
        const character = characters.find(c => c.id === characterId);
        const characterName = character?.name || 'Unknown Character';
        
        if (!acc[characterName]) {
          acc[characterName] = [];
        }
        acc[characterName].push(star);
        return acc;
      }, {} as Record<string, typeof characterConstraints>);
      
      // Add constraints organized by character
      Object.entries(constraintsByCharacter).forEach(([characterName, constraints]) => {
        context += `**${characterName}**\n`;
        constraints
          .sort((a, b) => b.priority - a.priority)
          .forEach(constraint => {
            const situationText = constraint.situation_context ? ` (${constraint.situation_context})` : '';
            const typeLabel = constraint.constraint_type!.replace('character_', '').replace('_', ' ');
            context += `- ${typeLabel}${situationText}: ${constraint.body}\n`;
          });
        context += '\n';
      });
      console.log('Added CHARACTER CONSTRAINTS section with', characterConstraints.length, 'constraints');
    }

    // Key facts (non-constraint checked stars)
    const nonConstraintStars = checkedStars.filter(star => !star.constraint_type);
    console.log('Processing stars for context:', nonConstraintStars.length, nonConstraintStars.map(s => ({ title: s.title, checked: s.is_checked })));
    if (nonConstraintStars.length > 0) {
      context += '### KEY FACTS\n';
      nonConstraintStars
        .sort((a, b) => b.priority - a.priority)
        .slice(0, 10) // Top 10 stars
        .forEach(star => {
          context += `- ${star.title}: ${star.body}\n`;
        });
      context += '\n';
      console.log('Added KEY FACTS section with', nonConstraintStars.length, 'stars');
    } else {
      console.log('No checked non-constraint stars found - KEY FACTS section not added');
    }

    return context;
  }

  /**
   * Assembles a complete prompt for the LLM
   */
  static assemblePrompt(
    promptType: string, 
    userInput: string, 
    context: string,
    targetEvent?: string
  ): { systemPrompt: string; userPrompt: string } {
    const config = PROMPT_CONFIGS[promptType];
    if (!config) {
      throw new Error(`Unknown prompt type: ${promptType}`);
    }

    const systemPrompt = SYSTEM_PROMPTS[config.systemPromptKey];
    const userPromptTemplate = USER_PROMPT_TEMPLATES[config.userPromptTemplateKey];
    const responseInstructions = RESPONSE_INSTRUCTIONS[config.responseInstructionKey];
    
    let userPrompt = userPromptTemplate
      .replace('{context}', context)
      .replace('{userInput}', userInput)
      .replace('{responseInstructions}', responseInstructions);

    // Handle targetEvent replacement for description generation
    if (targetEvent) {
      userPrompt = userPrompt.replace('{targetEvent}', targetEvent);
    }

    return { systemPrompt, userPrompt };
  }

  /**
   * Sends a prompt to the LLM backend
   */
  static async sendPrompt(
    promptType: string,
    userInput: string,
    contextParams: ContextParams
  ): Promise<LLMResponse> {
    console.log('LLMService.sendPrompt called with:', { promptType, userInput: userInput.substring(0, 100) + '...' });
    
    const context = this.buildContext(contextParams);
    const { systemPrompt, userPrompt } = this.assemblePrompt(promptType, userInput, context, contextParams.targetEvent);

    console.log('Assembled prompts:', { 
      systemPrompt: systemPrompt.substring(0, 100) + '...',
      userPrompt: userPrompt.substring(0, 200) + '...'
    });

    // Call Rust backend with both system and user prompts
    console.log('Calling Tauri backend...');
    const response = await invoke<LLMResponse | ApiError>('send_prompt', { 
      systemPrompt: systemPrompt,
      userPrompt: userPrompt 
    });
    
    console.log('Backend response:', response);
    
    if ('error' in response) {
      throw new Error(`LLM Error: ${response.message}`);
    }

    return response;
  }

  /**
   * Convenience method for scene timeline generation (current default)
   */
  static async generateSceneTimeline(
    userInput: string,
    contextParams: ContextParams
  ): Promise<LLMResponse> {
    return this.sendPrompt('SCENE_TIMELINE', userInput, contextParams);
  }

  /**
   * Convenience method for event description generation
   */
  static async generateEventDescription(
    targetEvent: { text: string; dialogue?: string },
    userInput: string,
    contextParams: ContextParams
  ): Promise<{ description: string }> {
    const targetEventText = `${targetEvent.text}${targetEvent.dialogue ? ` -> "${targetEvent.dialogue}"` : ''}`;
    
    // Build context and assemble prompt
    const context = this.buildContext(contextParams);
    const { systemPrompt, userPrompt } = this.assemblePrompt('EVENT_DESCRIPTION', userInput, context, targetEventText);

    console.log('Generating description with prompts:', { 
      systemPrompt: systemPrompt.substring(0, 100) + '...',
      userPrompt: userPrompt.substring(0, 200) + '...'
    });

    // Call the new Tauri command for description generation
    const response = await invoke('generate_description', { 
      systemPrompt: systemPrompt,
      userPrompt: userPrompt 
    }) as string | ApiError;
    
    console.log('Description generation response:', response);
    
    if (typeof response === 'object' && 'error' in response) {
      throw new Error(`LLM Error: ${(response as ApiError).message}`);
    }

    // Return the raw string response as the description
    return { description: response as string };
  }
} 