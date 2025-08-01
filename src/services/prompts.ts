/**
 * Central repository for all LLM prompts and templates
 * This file contains all prompts, templates, and instructions used throughout the application
 */

export const SYSTEM_PROMPTS = {
  /**
   * Creative writing assistant for scene timeline generation
   * Used for generating structured timeline events from user requests
   */
  SCENE_TIMELINE_GENERATOR:
  [
    "You are a genius planner; world-class memory and empathy.",
    "Be CONSISTENT with all given information; not compulsory to use all.",
    "Use names not pronouns.",
  ].join(' '),

  /**
   * Creative writing assistant for event description generation
   * Used for generating detailed descriptions of timeline events
   */
  EVENT_DESCRIPTION_GENERATOR:
  [
    "You are a Hyperphantasic, eros-minded visualiser. NOT afraid of profanity.",
    "Be CONSISTENT with ALL given information, especially DIALOGUE.",
    "Extrapolate from ALL non-literal information, do not blindly repeat it.",
    "Do not add UNMENTIONED elements or characteristics.",
    "Use names not pronouns.",
  ].join(' ')

  // Future prompts can be added here as the app expands
  // CHARACTER_DEVELOPMENT: "...",
  // DIALOGUE_ENHANCEMENT: "...",
  // PLOT_ANALYSIS: "...",
} as const;

export const USER_PROMPT_TEMPLATES = {
  /**
   * Template for scene timeline generation requests
   */
  SCENE_TIMELINE_TEMPLATE: '{context}\n### USER REQUEST\n{userInput}\n\n{responseInstructions}',

  /**
   * Template for event description generation requests
   */
  EVENT_DESCRIPTION_TEMPLATE: '{context}\n### TARGET EVENT\n{targetEvent}\n### USER REQUEST\n{userInput}\n\n{responseInstructions}',

  // Future templates can be added here
  // CHARACTER_DEVELOPMENT_TEMPLATE: "...",
  // DIALOGUE_ENHANCEMENT_TEMPLATE: "...",
} as const;

export const RESPONSE_INSTRUCTIONS = {
  /**
   * Instructions for scene timeline generation output format
   */
  SCENE_TIMELINE_INSTRUCTIONS: 
  [
    'You need not cover the whole SCENE PLAN in this message.',
    'Now, plan strictly for the USER REQUEST,',
    'consistent with RECENT EVENTS but not referencing them.',
    'One simple sentence per line, no dialogue or descriptions; just events.',
    'At the end, give a STANDALONE summary that explains who does what.',
    'then give a STANDALONE sentence that explains the Atmosphere: surroundings and scene significance.',
    'Enclose both in pipes: |TheSummary|TheAtmosphere|'
  ].join(' '),

  /**
   * Instructions for event description generation output format
   */
  EVENT_DESCRIPTION_INSTRUCTIONS:
  [
    'USER REQUEST is king. Aim to make user vividly imagine TARGET EVENT',
    'Write in Present-tense only. Describe snapshot BLUNTLY and OBJECTIVELY.',
    'Prioritise body language, physical, sensory details.',
    'Limit 200 words.',
  ].join(' ')

  // Future instructions can be added here
  // CHARACTER_DEVELOPMENT_INSTRUCTIONS: "...",
  // DIALOGUE_ENHANCEMENT_INSTRUCTIONS: "...",
} as const;

export type SystemPromptKey = keyof typeof SYSTEM_PROMPTS;
export type UserPromptTemplateKey = keyof typeof USER_PROMPT_TEMPLATES;
export type ResponseInstructionKey = keyof typeof RESPONSE_INSTRUCTIONS; 