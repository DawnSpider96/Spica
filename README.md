# Spica Writer

A creative writing assistant desktop application with AI integration. Features a three-panel layout for managing story blueprints, working with AI-generated content, and organizing narrative scenes.

## Features

- **Three-Panel Layout**: Blueprint (left), Working Area (center), Scene (right)
- **AI Integration**: OpenAI GPT integration for content generation
- **Blueprint Management**: Character profiles, story notes, and world-building
- **Draft System**: Generate, edit, and organize content drafts
- **Scene Builder**: Drag-and-drop scene organization
- **Auto-Save**: Persistent project storage
- **Dark Theme**: Writing-focused interface

## Tech Stack

- **Frontend**: React + TypeScript + Vite
- **Backend**: Rust + Tauri
- **State Management**: Zustand
- **UI Components**: Custom CSS with Lucide icons
- **Drag & Drop**: @dnd-kit
- **AI**: OpenAI API integration

## Setup Instructions

### Prerequisites

1. **Node.js** (v18 or later)
2. **Rust** (latest stable)
3. **OpenAI API Key**

### Installation

1. **Install Node.js dependencies:**
   ```bash
   npm install
   ```

2. **Install Tauri CLI:**
   ```bash
   npm install --save-dev @tauri-apps/cli
   ```

3. **Set up environment variables:**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and add your OpenAI API key:
   ```
   OPENAI_API_KEY=your_actual_api_key_here
   ```

4. **Install Rust dependencies:**
   ```bash
   cd src-tauri
   cargo build
   cd ..
   ```

### Development

Run the development server:
```bash
npm run tauri dev
```

This will:
- Start the Vite development server
- Build the Rust backend
- Launch the desktop application

### Building

Create a production build:
```bash
npm run tauri build
```

## Project Structure

```
Spica/
├── src/                    # React frontend
│   ├── components/         # UI components
│   ├── store/             # Zustand state management
│   ├── types.ts           # TypeScript type definitions
│   └── App.tsx            # Main application
├── src-tauri/             # Rust backend
│   ├── src/
│   │   ├── main.rs        # Tauri main application
│   │   └── openai_client.rs  # OpenAI integration
│   ├── Cargo.toml         # Rust dependencies
│   └── tauri.conf.json    # Tauri configuration
├── openai_client/         # Original OpenAI client (for reference)
└── package.json           # Node.js dependencies
```

## Usage

### Getting Started

1. **Launch the application**
2. **Set up your story blueprint:**
   - Add world/setting description
   - Create character profiles
   - Add story notes ("Stars")

3. **Generate content:**
   - Enter prompts in the Working Area
   - AI will generate draft tabs
   - Edit and refine the generated content

4. **Build your scene:**
   - Drag draft tabs to the Scene panel
   - Reorder them to create your narrative flow
   - Export or continue writing

### Keyboard Shortcuts

- `Cmd+Enter` / `Ctrl+Enter`: Send prompt
- `Cmd+S` / `Ctrl+S`: Save project
- `Esc`: Close modal

## Configuration

### OpenAI Settings

The application uses GPT-4o-mini by default. You can modify the model in `src-tauri/src/openai_client.rs`:

```rust
model: "gpt-4o-mini".to_string(),
```

### Project Storage

Projects are automatically saved to:
- **macOS/Linux**: `~/Documents/SpicaWriter/`
- **Windows**: `%USERPROFILE%\\Documents\\SpicaWriter\\`

## Development Notes

### Adding New Features

1. **Frontend**: Add React components in `src/components/`
2. **State**: Extend Zustand store in `src/store/useAppStore.ts`
3. **Backend**: Add Tauri commands in `src-tauri/src/main.rs`
4. **Types**: Update shared types in `src/types.ts`

### Tauri Commands

The backend exposes these commands to the frontend:
- `send_prompt`: Process AI prompts
- `save_project`: Save application state
- `load_project`: Load saved project
- `create_new_project_path`: File dialog for project location

## Troubleshooting

### Common Issues

1. **"OPENAI_API_KEY not found"**
   - Ensure `.env` file exists with valid API key
   - Restart the development server

2. **Build errors**
   - Update Rust: `rustup update`
   - Clear cache: `cargo clean`

3. **Frontend errors**
   - Clear node_modules: `rm -rf node_modules && npm install`

### Logs

Application logs are stored in:
- **Development**: Console output
- **Production**: `~/Documents/SpicaWriter/logs/`

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

[Add your license here] 