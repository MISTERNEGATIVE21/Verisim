#!/usr/bin/env bash
# Verisim - OSS CAD Suite Ingestion Script
# Automatically verifies, downloads, and stages precompiled open-source EDA toolchain binaries
# (Yosys, ABC, Icarus Verilog, VVP, Verilator, GTKWave) from YosysHQ OSS CAD Suite releases.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DEST_DIR="${DEST_DIR:-$REPO_ROOT/src-tauri/toolchain}"

# Default pinned fallback release tag (Linux x86_64)
DEFAULT_RELEASE_TAG="2026-09-29"
FALLBACK_URL="https://github.com/YosysHQ/oss-cad-suite-build/releases/download/${DEFAULT_RELEASE_TAG}/oss-cad-suite-linux-x64-${DEFAULT_RELEASE_TAG//-/}.tgz"

FORCE=false
CHECK_ONLY=false
SPECIFIED_URL=""
SPECIFIED_TAG=""

usage() {
    cat <<EOF
Usage: $(basename "$0") [OPTIONS]

Checks if bundled EDA tools (yosys, abc, iverilog, vvp, verilator) exist and work.
If missing, invalid, or if --force is passed, downloads precompiled binaries
from YosysHQ OSS CAD Suite releases and stages bin/, lib/, and share/ into destination.

Options:
  -f, --force         Force download and overwrite existing toolchain
  -c, --check-only    Only check if toolchain is present and valid, then exit
  -u, --url <url>     Specify custom download URL for oss-cad-suite tarball
  -t, --tag <tag>     Specify release tag (e.g. 2026-09-29)
  -d, --dest <dir>    Specify destination directory (default: src-tauri/toolchain)
  -h, --help          Show this help message
EOF
}

# Parse options
while [[ $# -gt 0 ]]; do
    case "$1" in
        -f|--force)
            FORCE=true
            shift
            ;;
        -c|--check-only)
            CHECK_ONLY=true
            shift
            ;;
        -u|--url)
            SPECIFIED_URL="$2"
            shift 2
            ;;
        -t|--tag)
            SPECIFIED_TAG="$2"
            shift 2
            ;;
        -d|--dest)
            DEST_DIR="$2"
            shift 2
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        *)
            echo "Error: Unknown option '$1'" >&2
            usage
            exit 1
            ;;
    esac
done

# Ensure libraries and binaries from target toolchain are in environment during validation
export LD_LIBRARY_PATH="$DEST_DIR/lib:$DEST_DIR/lib/ivl${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}"
export PATH="$DEST_DIR/bin:$PATH"
export YOSYS_DATDIR="$DEST_DIR/share/yosys"
export VERILATOR_ROOT="$DEST_DIR/share/verilator"

validate_toolchain() {
    local verbose="${1:-true}"
    local bin_dir="$DEST_DIR/bin"
    local failed=0

    if [[ ! -d "$bin_dir" ]]; then
        if [[ "$verbose" = true ]]; then
            echo "Error: Binary directory does not exist: $bin_dir" >&2
        fi
        return 1
    fi

    if [[ "$verbose" = true ]]; then
        echo "==> Validating EDA toolchain binaries in: $bin_dir"
    fi

    # Ensure executable permissions
    chmod +x "$bin_dir"/* 2>/dev/null || true
    chmod +x "$DEST_DIR/lib/ivl/ivl" "$DEST_DIR/lib/ivl/ivlpp" 2>/dev/null || true

    # 1. Yosys
    if [[ -x "$bin_dir/yosys" ]]; then
        local yosys_raw=""
        if yosys_raw="$("$bin_dir/yosys" -V 2>&1)"; then
            local yosys_ver=""
            IFS= read -r yosys_ver <<< "$yosys_raw"
            if [[ "$verbose" = true ]]; then
                echo "  [OK] yosys:     $yosys_ver"
            fi
        else
            if [[ "$verbose" = true ]]; then
                echo "  [FAIL] yosys failed to execute properly" >&2
            fi
            failed=1
        fi
    else
        if [[ "$verbose" = true ]]; then
            echo "  [MISSING] yosys not found in $bin_dir" >&2
        fi
        failed=1
    fi

    # 2. ABC / Yosys-ABC
    local abc_bin=""
    if [[ -x "$bin_dir/abc" ]]; then
        abc_bin="$bin_dir/abc"
    elif [[ -x "$bin_dir/yosys-abc" ]]; then
        abc_bin="$bin_dir/yosys-abc"
    fi

    if [[ -n "$abc_bin" ]]; then
        local abc_raw=""
        if abc_raw="$(echo "quit" | "$abc_bin" -s 2>&1)"; then
            local abc_ver=""
            IFS= read -r abc_ver <<< "$abc_raw"
            if [[ -n "$abc_ver" ]]; then
                if [[ "$verbose" = true ]]; then
                    echo "  [OK] abc:       $abc_ver"
                fi
            else
                if [[ "$verbose" = true ]]; then
                    echo "  [OK] abc:       $(basename "$abc_bin") (executable)"
                fi
            fi
        else
            if [[ "$verbose" = true ]]; then
                echo "  [FAIL] abc failed to execute properly" >&2
            fi
            failed=1
        fi
    else
        if [[ "$verbose" = true ]]; then
            echo "  [MISSING] abc / yosys-abc not found in $bin_dir" >&2
        fi
        failed=1
    fi

    # 3. Icarus Verilog (iverilog)
    if [[ -x "$bin_dir/iverilog" ]]; then
        local iv_raw=""
        if iv_raw="$("$bin_dir/iverilog" -V 2>&1)"; then
            local iv_ver=""
            IFS= read -r iv_ver <<< "$iv_raw"
            if [[ "$verbose" = true ]]; then
                echo "  [OK] iverilog:  $iv_ver"
            fi
        else
            if [[ "$verbose" = true ]]; then
                echo "  [FAIL] iverilog failed to execute properly" >&2
            fi
            failed=1
        fi
    else
        if [[ "$verbose" = true ]]; then
            echo "  [MISSING] iverilog not found in $bin_dir" >&2
        fi
        failed=1
    fi

    # 4. VVP runtime
    if [[ -x "$bin_dir/vvp" ]]; then
        local vvp_raw=""
        if vvp_raw="$("$bin_dir/vvp" -V 2>&1)"; then
            local vvp_ver=""
            IFS= read -r vvp_ver <<< "$vvp_raw"
            if [[ "$verbose" = true ]]; then
                echo "  [OK] vvp:       $vvp_ver"
            fi
        else
            if [[ "$verbose" = true ]]; then
                echo "  [FAIL] vvp failed to execute properly" >&2
            fi
            failed=1
        fi
    else
        if [[ "$verbose" = true ]]; then
            echo "  [MISSING] vvp not found in $bin_dir" >&2
        fi
        failed=1
    fi

    # 5. Verilator
    if [[ -x "$bin_dir/verilator" ]]; then
        local vl_raw=""
        if vl_raw="$("$bin_dir/verilator" --version 2>&1)"; then
            local vl_ver=""
            IFS= read -r vl_ver <<< "$vl_raw"
            if [[ "$verbose" = true ]]; then
                echo "  [OK] verilator: $vl_ver"
            fi
        else
            if [[ "$verbose" = true ]]; then
                echo "  [FAIL] verilator failed to execute properly" >&2
            fi
            failed=1
        fi
    else
        if [[ "$verbose" = true ]]; then
            echo "  [MISSING] verilator not found in $bin_dir" >&2
        fi
        failed=1
    fi

    # Optional / auxiliary binaries:
    if [[ -x "$bin_dir/verilator_bin" && "$verbose" = true ]]; then
        echo "  [OK] verilator_bin (present and executable)"
    fi

    if [[ -x "$bin_dir/gtkwave" && "$verbose" = true ]]; then
        local gtk_raw=""
        if gtk_raw="$("$bin_dir/gtkwave" --version 2>&1)"; then
            local gtk_ver=""
            IFS= read -r gtk_ver <<< "$gtk_raw"
            echo "  [OK] gtkwave:   $gtk_ver"
        else
            echo "  [OK] gtkwave (present and executable)"
        fi
    fi

    return $failed
}

download_file() {
    local url="$1"
    local output="$2"
    echo "==> Downloading: $url"

    if command -v curl &>/dev/null; then
        curl -fSL --progress-bar -o "$output" "$url"
    elif command -v wget &>/dev/null; then
        wget -q --show-progress -O "$output" "$url"
    else
        echo "Error: Neither curl nor wget is available on this system." >&2
        exit 1
    fi
}

resolve_download_url() {
    if [[ -n "$SPECIFIED_URL" ]]; then
        echo "$SPECIFIED_URL"
        return 0
    fi

    if [[ -n "$SPECIFIED_TAG" ]]; then
        local tag_clean="${SPECIFIED_TAG//-/}"
        echo "https://github.com/YosysHQ/oss-cad-suite-build/releases/download/${SPECIFIED_TAG}/oss-cad-suite-linux-x64-${tag_clean}.tgz"
        return 0
    fi

    # Query GitHub API for latest release
    local api_url="https://api.github.com/repos/YosysHQ/oss-cad-suite-build/releases/latest"
    local resolved=""

    if command -v curl &>/dev/null; then
        resolved=$(curl -sL "$api_url" 2>/dev/null | grep -o 'https://github.com/YosysHQ/oss-cad-suite-build/releases/download/[^"]*oss-cad-suite-linux-x64-[0-9]*\.tgz' | head -n 1 || true)
    elif command -v wget &>/dev/null; then
        resolved=$(wget -qO- "$api_url" 2>/dev/null | grep -o 'https://github.com/YosysHQ/oss-cad-suite-build/releases/download/[^"]*oss-cad-suite-linux-x64-[0-9]*\.tgz' | head -n 1 || true)
    fi

    if [[ -n "$resolved" ]]; then
        echo "$resolved"
    else
        echo "Notice: Could not resolve latest release via GitHub API. Using fallback: $FALLBACK_URL" >&2
        echo "$FALLBACK_URL"
    fi
}

# Check-only mode
if [[ "$CHECK_ONLY" = true ]]; then
    if validate_toolchain true; then
        echo "==> Toolchain check passed."
        exit 0
    else
        echo "==> Toolchain check failed." >&2
        exit 1
    fi
fi

# Check existing toolchain before downloading
if [[ "$FORCE" = false ]]; then
    if validate_toolchain false 2>/dev/null; then
        echo "==> Precompiled EDA toolchain already present and verified at: $DEST_DIR"
        echo "    (Pass --force to re-download)"
        echo ""
        validate_toolchain true
        exit 0
    else
        echo "==> Toolchain missing or incomplete in $DEST_DIR."
        echo "    Proceeding to download from GitHub releases..."
    fi
else
    echo "==> --force specified: Re-downloading toolchain from GitHub releases..."
fi

# Download and extract toolchain
TARGET_URL="$(resolve_download_url)"

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT INT TERM

ARCHIVE="$TMP_DIR/oss-cad-suite.tgz"
download_file "$TARGET_URL" "$ARCHIVE"

echo "==> Staging toolchain into: $DEST_DIR"
mkdir -p "$DEST_DIR"

# Detect archive member prefix
STRIP_LEVEL=0
MEMBERS=()

if tar -tzf "$ARCHIVE" "oss-cad-suite/bin" &>/dev/null; then
    STRIP_LEVEL=1
    MEMBERS+=("oss-cad-suite/bin")
    if tar -tzf "$ARCHIVE" "oss-cad-suite/lib" &>/dev/null; then
        MEMBERS+=("oss-cad-suite/lib")
    fi
    if tar -tzf "$ARCHIVE" "oss-cad-suite/share" &>/dev/null; then
        MEMBERS+=("oss-cad-suite/share")
    fi
elif tar -tzf "$ARCHIVE" "bin" &>/dev/null; then
    STRIP_LEVEL=0
    MEMBERS+=("bin")
    if tar -tzf "$ARCHIVE" "lib" &>/dev/null; then
        MEMBERS+=("lib")
    fi
    if tar -tzf "$ARCHIVE" "share" &>/dev/null; then
        MEMBERS+=("share")
    fi
fi

echo "==> Extracting components (bin, lib, share)..."
if [[ ${#MEMBERS[@]} -gt 0 ]]; then
    if [[ "$STRIP_LEVEL" -gt 0 ]]; then
        tar -xzf "$ARCHIVE" -C "$DEST_DIR" --strip-components="$STRIP_LEVEL" "${MEMBERS[@]}"
    else
        tar -xzf "$ARCHIVE" -C "$DEST_DIR" "${MEMBERS[@]}"
    fi
else
    tar -xzf "$ARCHIVE" -C "$DEST_DIR"
fi

# Ensure yosys-abc symlink exists
if [[ -f "$DEST_DIR/bin/abc" && ! -e "$DEST_DIR/bin/yosys-abc" ]]; then
    ln -sf abc "$DEST_DIR/bin/yosys-abc"
elif [[ -f "$DEST_DIR/bin/yosys-abc" && ! -e "$DEST_DIR/bin/abc" ]]; then
    ln -sf yosys-abc "$DEST_DIR/bin/abc"
fi

# Ensure executable and read permissions
echo "==> Setting permissions..."
chmod +x "$DEST_DIR/bin/"* 2>/dev/null || true
chmod +x "$DEST_DIR/lib/ivl/ivl" "$DEST_DIR/lib/ivl/ivlpp" 2>/dev/null || true
chmod -R a+rX "$DEST_DIR/lib" "$DEST_DIR/share" 2>/dev/null || true

# Validate newly staged toolchain
echo ""
if validate_toolchain true; then
    echo ""
    echo "==> Toolchain ingestion completed successfully at: $DEST_DIR"
    exit 0
else
    echo "Error: Staged toolchain validation failed." >&2
    exit 1
fi
