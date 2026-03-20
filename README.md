# VerilogSim IDE

A modern, high-performance Verilog IDE with real-time simulation and waveform viewing. Built with Next.js, Tauri, and Icarus Verilog.

<img width="590" height="446" alt="{DC064833-D2D0-4216-81DE-43293716EA37}" src="https://github.com/user-attachments/assets/67e7bf8b-2c6b-4978-82fb-400db7688731" />


Maintainer: **MISTERNEGATIVE21**

![VerilogSim Logo](public/logo.svg)

## Features

- **Robust Editor**: Full-featured code editor with Verilog syntax highlighting (Monaco).
- **Live Simulation**: Integrated Icarus Verilog compiler support powered by a Rust backend.
- **Waveform Viewer**: "GTKWave-like" VCD viewer with Binary, Decimal, and Hexadecimal radix switching.
- **Project Management**: Local SQLite database for persistent storage of projects and files.
- **Responsive Design**: Works seamlessly on Desktop with GPU acceleration.
- **Desktop Ready**: Standalone high-performance binaries for Linux and Windows.

## Local Development (Native)

### Prerequisites
- [Bun](https://bun.sh/) installed.
- [Rust](https://www.rust-lang.org/tools/install) (latest stable) installed.
- [Icarus Verilog](https://steveicarus.github.io/iverilog/usage/install.html) installed on your system path.
- Linux Dependencies (if on Linux): `libgtk-3-dev`, `libwebkit2gtk-4.1-dev`, `libayatana-appindicator3-dev`, `librsvg2-dev`.

### Setup
```bash
# Install dependencies
bun install

# Run development server (Next.js + Tauri)
bun x tauri dev
```

## Building the Desktop Application

To build optimized binaries for your current platform:

```bash
# Build the production binary
bun x tauri build
```

### Outputs (in `src-tauri/target/release/bundle/` directory):
- **Linux**: `.AppImage`, `.deb`
- **Windows**: `.msi`, `.exe`

## GPU Acceleration
This application utilizes GPU acceleration via WebKit2GTK (Linux) and WebView2 (Windows). Ensure your graphics drivers are up to date for the best experience.
<img width="587" height="363" alt="{10B9E4E9-995C-43E1-B174-9C64E2E52649}" src="https://github.com/user-attachments/assets/9c305017-58f7-4944-ac36-fd54053e8c68" />
For windows add the path of win to System Environment Vaariables 
For Linux install icarus verilog inside the system which is accessible globally 
## Credits

- **Author**: MISTERNEGATIVE21
- **HDL Engine**: [Icarus Verilog](https://github.com/steveicarus/iverilog)
- **UI Components**: shadcn/ui & Radix UI
- **Framework**: Next.js & Tauri
