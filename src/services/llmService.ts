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

    // Recent timeline events
    if (recentTabs.length > 0) {
      context += '### RECENT EVENTS\n';
      const lastThreeTabs = recentTabs.slice(-3); // Last 3 tabs
      lastThreeTabs.forEach((tab) => {
        context += `**Section ${tab.index + 1}**\n`;
        tab.timeline.forEach(event => {
          const dialoguePart = event.dialogue ? ` -> "${event.dialogue}"` : '';
          context += `- ${event.text}${dialoguePart}\n`;
        });
        context += '\n';
      });
    }

    // Key facts (checked stars)
    console.log('Processing stars for context:', checkedStars.length, checkedStars.map(s => ({ title: s.title, checked: s.is_checked })));
    if (checkedStars.length > 0) {
      context += '### KEY FACTS\n';
      checkedStars
        .sort((a, b) => b.priority - a.priority)
        .slice(0, 10) // Top 10 stars
        .forEach(star => {
          context += `- ${star.title}: ${star.body}\n`;
        });
      context += '\n';
      console.log('Added KEY FACTS section with', checkedStars.length, 'stars');
    } else {
      console.log('No checked stars found - KEY FACTS section not added');
    }

    return context;
  }

  /**
   * Assembles a complete prompt for the LLM
   */
  static assemblePrompt(
    promptType: string, 
    userInput: string, 
    context: string
  ): { systemPrompt: string; userPrompt: string } {
    const config = PROMPT_CONFIGS[promptType];
    if (!config) {
      throw new Error(`Unknown prompt type: ${promptType}`);
    }

    const systemPrompt = SYSTEM_PROMPTS[config.systemPromptKey];
    const userPromptTemplate = USER_PROMPT_TEMPLATES[config.userPromptTemplateKey];
    const responseInstructions = RESPONSE_INSTRUCTIONS[config.responseInstructionKey];
    
    const userPrompt = userPromptTemplate
      .replace('{context}', context)
      .replace('{userInput}', userInput)
      .replace('{responseInstructions}', responseInstructions);

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
    const { systemPrompt, userPrompt } = this.assemblePrompt(promptType, userInput, context);

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
} 