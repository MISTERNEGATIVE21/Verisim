# VerilogSim IDE

A modern, self-hosted Verilog IDE with real-time simulation and waveform viewing. Built with Next.js, Electron, and Icarus Verilog.

Maintainer: **misternegative21**

![VerilogSim Logo](public/logo.svg)

## Features

- **Robust Editor**: Full-featured code editor with Verilog syntax highlighting (Monaco).
- **Live Simulation**: Integrated Icarus Verilog compiler support.
- **Waveform Viewer**: "GTKWave-like" VCD viewer with Binary, Decimal, and Hexadecimal radix switching.
- **Project Management**: Create, delete, and rename projects and files.
- **Responsive Design**: Works seamlessly on Mobile, Tablet, and Desktop.
- **Desktop Ready**: Can be packaged as a standalone Linux AppImage or Windows EXE.

## Local Development (Native)

### Prerequisites
- [Bun](https://bun.sh/) installed.
- [Icarus Verilog](https://steveicarus.github.io/iverilog/usage/install.html) installed on your system path.

### Setup
```bash
# Install dependencies
bun install

# Initialize Database
bun run db:push

# Run development server
PORT=3005 bun run dev
```
Access the app at `http://localhost:3005`.

## Building the Desktop Application

To build portable applications for Linux and Windows:

```bash
# 1. Install dependencies
bun install

# 2. Build the desktop app
bun run electron:build
```

### Outputs (in `dist/` directory):
- **Linux**: `.AppImage` and `.deb`
- **Windows**: `.exe` (Installer and Portable)

## GitHub Repository Setup

To host this project on GitHub:

1. Create a new repository on [GitHub](https://github.com/new).
2. Run the following commands in your project root:

```bash
# Initialize git
git init

# Add all files
git add .

# Create initial commit
git commit -m "Initial commit: VerilogSim IDE by misternegative21"

# Add remote
git remote add origin https://github.com/misternegative21/verilogsim.git

# Push to GitHub
git branch -M main
git push -u origin main
```

## Credits

- **Author**: misternegative21
- **HDL Engine**: [Icarus Verilog](https://github.com/steveicarus/iverilog)
- **UI Components**: shadcn/ui & Radix UI
- **Framework**: Next.js & Electron
