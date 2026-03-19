#!/bin/bash
# VerilogSim IDE - Icarus Verilog Installation Script
# Supports: Ubuntu/Debian, Arch Linux, Fedora/RHEL, macOS, and more

set -e

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║     VerilogSim IDE - Icarus Verilog Installer                ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Detect OS
detect_os() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        echo "$ID"
    elif [ -f /etc/arch-release ]; then
        echo "arch"
    elif [ -f /etc/fedora-release ]; then
        echo "fedora"
    elif [ "$(uname)" = "Darwin" ]; then
        echo "macos"
    else
        echo "unknown"
    fi
}

OS=$(detect_os)
echo "Detected OS: $OS"
echo ""

# Check if already installed
check_installed() {
    if command -v iverilog &> /dev/null; then
        echo "✅ Icarus Verilog is already installed!"
        iverilog -V 2>&1 | head -3
        echo ""
        echo "Installation path: $(which iverilog)"
        exit 0
    fi
}

check_installed

# Install based on OS
install_ubuntu_debian() {
    echo "📦 Installing on Ubuntu/Debian..."
    sudo apt-get update
    sudo apt-get install -y iverilog
}

install_arch() {
    echo "📦 Installing on Arch Linux..."
    if command -v yay &> /dev/null; then
        yay -S iverilog
    elif command -v paru &> /dev/null; then
        paru -S iverilog
    else
        sudo pacman -S --noconfirm iverilog
    fi
}

install_fedora() {
    echo "📦 Installing on Fedora/RHEL..."
    sudo dnf install -y iverilog
}

install_opensuse() {
    echo "📦 Installing on openSUSE..."
    sudo zypper install -y iverilog
}

install_macos() {
    echo "📦 Installing on macOS..."
    if command -v brew &> /dev/null; then
        brew install icarus-verilog
    elif command -v port &> /dev/null; then
        sudo port install iverilog
    else
        echo "❌ No package manager found. Please install Homebrew:"
        echo "   /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
        exit 1
    fi
}

install_gentoo() {
    echo "📦 Installing on Gentoo..."
    sudo emerge -a sci-electronics/iverilog
}

install_alpine() {
    echo "📦 Installing on Alpine Linux..."
    sudo apk add iverilog
}

install_solus() {
    echo "📦 Installing on Solus..."
    sudo eopkg install iverilog
}

install_void() {
    echo "📦 Installing on Void Linux..."
    sudo xbps-install -S iverilog
}

install_slackware() {
    echo "📦 Installing on Slackware..."
    echo "Please install from SlackBuilds: https://slackbuilds.org/repository/14.2/development/iverilog/"
    exit 1
}

# Run installation
case "$OS" in
    ubuntu|debian|linuxmint|pop|elementary|kubuntu|xubuntu|zorin|mx|deepin|devuan)
        install_ubuntu_debian
        ;;
    arch|manjaro|endeavouros|garuda|artix|arco|rebornos)
        install_arch
        ;;
    fedora|rhel|centos|rocky|almalinux|ol|scientific)
        install_fedora
        ;;
    opensuse*|suse|opensuse-tumbleweed)
        install_opensuse
        ;;
    gentoo|funtoo)
        install_gentoo
        ;;
    alpine)
        install_alpine
        ;;
    solus)
        install_solus
        ;;
    void)
        install_void
        ;;
    slackware)
        install_slackware
        ;;
    macos)
        install_macos
        ;;
    *)
        echo "❌ Unsupported OS: $OS"
        echo ""
        echo "Please install Icarus Verilog manually:"
        echo "  - Visit: https://steveicarus.github.io/iverilog/usage/install.html"
        echo "  - Or compile from source: https://github.com/steveicarus/iverilog"
        exit 1
        ;;
esac

# Verify installation
echo ""
echo "Verifying installation..."
if command -v iverilog &> /dev/null; then
    echo ""
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║            ✅ Installation Successful!                       ║"
    echo "╠══════════════════════════════════════════════════════════════╣"
    echo "║  Icarus Verilog has been installed successfully.             ║"
    echo "║  Restart VerilogSim IDE to use real simulations.             ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo ""
    iverilog -V 2>&1 | head -5
else
    echo "❌ Installation may have failed. Please check the output above."
    exit 1
fi
