# Draft Tab Management - Atomic Actions

This document explains the new atomic action system for managing draft tabs across scenes, workbench, and idea bank.

## Problem Solved

Previously, draft tabs were stored in multiple places:
- `Scene.draft_tab_ids: string[]` - for tabs in scenes
- `idea_bank.stored_draft_tab_ids: string[]` - for tabs in idea bank  
- `workbench.unassigned_draft_tab_ids: string[]` - for tabs in workbench

This led to inconsistencies when these arrays were mutated independently.

## Solution: One Source of Truth + Atomic Actions

### 1. Single Source of Truth
All draft tabs are stored in a flat map:
```typescript
draft_tabs: {  // UUID → DraftTab
  "tab-1": { id: "tab-1", scene_id: "scene-1", ... },
  "tab-2": { id: "tab-2", scene_id: undefined, ... }
}
```

Location arrays only contain IDs:
```typescript
scene: {
  draft_tab_ids: ["tab-1"]  // ordered list of IDs
},
idea_bank: {
  stored_draft_tab_ids: ["tab-2", "tab-3"]
},
workbench: {
  unassigned_draft_tab_ids: ["tab-4"]
}
```

### 2. Atomic Actions

Never mutate location arrays directly. Instead, use these atomic actions:

#### `moveDraftTabToScene(tabId: string, sceneId: string)`
Moves a tab from any location to a specific scene.

```typescript
// Move tab from workbench to scene
moveDraftTabToScene("tab-1", "scene-1");

// Move tab from idea bank to scene  
moveDraftTabToScene("tab-2", "scene-1");

// Move tab from another scene to this scene
moveDraftTabToScene("tab-3", "scene-1");
```

#### `moveDraftTabToIdeaBank(tabId: string)`
Moves a tab from any location to the idea bank.

```typescript
// Move tab from scene to idea bank
moveDraftTabToIdeaBank("tab-1");

// Move tab from workbench to idea bank
moveDraftTabToIdeaBank("tab-2");
```

#### `moveDraftTabToWorkbench(tabId: string)`
Moves a tab from any location to the workbench.

```typescript
// Move tab from scene to workbench
moveDraftTabToWorkbench("tab-1");

// Move tab from idea bank to workbench
moveDraftTabToWorkbench("tab-2");
```

### 3. Reordering Actions

#### `reorderSceneTabs(sceneId: string, newOrder: string[])`
Reorders tabs within a scene using the new order array.

```typescript
// Reorder tabs in scene
const newOrder = ["tab-2", "tab-1", "tab-3"];
reorderSceneTabs("scene-1", newOrder);
```

#### `reorderWorkbenchTabs(newOrder: string[])`
Reorders tabs within the workbench.

```typescript
// Reorder workbench tabs
const newOrder = ["tab-2", "tab-1"];
reorderWorkbenchTabs(newOrder);
```

#### `reorderIdeaBankTabs(newOrder: string[])`
Reorders tabs within the idea bank.

```typescript
// Reorder idea bank tabs
const newOrder = ["tab-3", "tab-2", "tab-1"];
reorderIdeaBankTabs(newOrder);
```

## Benefits

✅ **Consistency**: Moving a tab updates all location arrays atomically
✅ **No Duplicates**: A tab can only be in one location at a time
✅ **Order Preserved**: Tab order is maintained when moving between locations
✅ **Validation**: Built-in checks prevent invalid operations
✅ **Debugging**: Development mode logging and validation utilities

## Debugging Utilities

### `validateDraftTabConsistency()`
Returns errors and warnings about state inconsistencies:

```typescript
const { errors, warnings } = validateDraftTabConsistency();
console.log("Errors:", errors);
console.log("Warnings:", warnings);
```

### `getTabLocation(tabId: string)`
Returns the current location of a tab:

```typescript
const location = getTabLocation("tab-1");
// Returns: 'scene' | 'workbench' | 'idea_bank' | 'nowhere' | null
```

## Migration from Legacy Methods

The following legacy methods are deprecated but still work (they call the new atomic actions):

- `addTabToScene()` → `moveDraftTabToScene()`
- `removeTabFromScene()` → `moveDraftTabToWorkbench()` or `moveDraftTabToIdeaBank()`
- `moveTabToIdeaBank()` → `moveDraftTabToIdeaBank()`
- `moveTabFromIdeaBank()` → `moveDraftTabToScene()`
- `moveTabToWorkbench()` → `moveDraftTabToWorkbench()`

## Example Usage in Components

```typescript
import { useAppStore } from '../stores';

const MyComponent = () => {
  const { 
    moveDraftTabToScene, 
    moveDraftTabToIdeaBank, 
    moveDraftTabToWorkbench,
    reorderSceneTabs 
  } = useAppStore();

  const handleMoveToScene = (tabId: string, sceneId: string) => {
    moveDraftTabToScene(tabId, sceneId);
  };

  const handleMoveToIdeaBank = (tabId: string) => {
    moveDraftTabToIdeaBank(tabId);
  };

  const handleReorder = (sceneId: string, newOrder: string[]) => {
    reorderSceneTabs(sceneId, newOrder);
  };

  return (
    // Your component JSX
  );
};
```

## Best Practices

1. **Always use atomic actions** - Never mutate location arrays directly
2. **Validate state in development** - Use `validateDraftTabConsistency()` during development
3. **Handle errors gracefully** - Atomic actions return early on invalid operations
4. **Use TypeScript** - The interface provides type safety for all operations
5. **Test thoroughly** - The new system makes testing easier with predictable state changes 