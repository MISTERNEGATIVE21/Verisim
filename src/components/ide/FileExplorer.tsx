'use client';

import { useIDEStore, VerilogFile } from '@/store/ide-store';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import {
  FileCode,
  FileCog,
  ChevronDown,
  ChevronRight,
  Folder,
  FolderOpen,
  FolderPlus,
  FilePlus,
  Trash2,
  Edit2,
  Copy,
  File,
  Database,
  Upload,
  RefreshCw,
  ChevronsDownUp,
  X,
  ArrowRight,
  ArrowLeft,
  ArrowLeftRight,
  Hash,
  Layers,
  Zap,
  Cpu,
  Box,
  FileText,
  Search,
} from 'lucide-react';
import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { importVerilogFiles } from '@/lib/tauri-db';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import * as monaco from 'monaco-editor';

interface OutlineItem {
  id: string;
  name: string;
  kind:
    | 'module'
    | 'port-in'
    | 'port-out'
    | 'port-inout'
    | 'signal'
    | 'instance'
    | 'block'
    | 'task'
    | 'function'
    | 'class';
  detail?: string;
  line: number;
}

function parseOutline(content: string, fileName: string): OutlineItem[] {
  if (!content) return [];
  const lines = content.split('\n');
  const items: OutlineItem[] = [];

  // Python file parsing
  if (fileName.endsWith('.py')) {
    for (let i = 0; i < lines.length; i++) {
      const lineNum = i + 1;
      const rawLine = lines[i];
      const line = rawLine.replace(/#.*$/, '').trim();
      if (!line) continue;

      const classMatch = line.match(/^class\s+([a-zA-Z_][a-zA-Z0-9_]*)/);
      if (classMatch) {
        items.push({
          id: `class-${lineNum}`,
          name: classMatch[1],
          kind: 'class',
          detail: 'class',
          line: lineNum,
        });
        continue;
      }

      const funcMatch = line.match(/^def\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/);
      if (funcMatch) {
        items.push({
          id: `def-${lineNum}`,
          name: `${funcMatch[1]}()`,
          kind: 'function',
          detail: 'def',
          line: lineNum,
        });
        continue;
      }

      if (line.startsWith('if __name__')) {
        items.push({
          id: `main-${lineNum}`,
          name: '__main__ entry',
          kind: 'block',
          detail: 'main',
          line: lineNum,
        });
      }
    }
    return items;
  }

  // Verilog & SystemVerilog parsing
  const keywords = new Set([
    'module',
    'endmodule',
    'always',
    'always_ff',
    'always_comb',
    'always_latch',
    'initial',
    'final',
    'task',
    'endtask',
    'function',
    'endfunction',
    'begin',
    'end',
    'case',
    'endcase',
    'generate',
    'endgenerate',
    'assign',
    'for',
    'if',
    'else',
    'while',
    'repeat',
    'forever',
    'fork',
    'join',
    'input',
    'output',
    'inout',
    'wire',
    'reg',
    'logic',
    'integer',
    'genvar',
    'parameter',
    'localparam',
    'typedef',
    'struct',
    'union',
    'enum',
    'import',
    'export',
    'package',
    'interface',
    'assert',
    'cover',
    'property',
    'sequence',
    'return',
  ]);

  for (let i = 0; i < lines.length; i++) {
    const lineNum = i + 1;
    const rawLine = lines[i];
    // Strip line comments
    const line = rawLine.replace(/\/\/.*$/, '').trim();
    if (!line) continue;

    // Module definition
    const modMatch = line.match(/^module\s+([a-zA-Z_][a-zA-Z0-9_$]*)/);
    if (modMatch) {
      items.push({
        id: `mod-${lineNum}`,
        name: modMatch[1],
        kind: 'module',
        detail: 'module',
        line: lineNum,
      });
      continue;
    }

    // Ports: input, output, inout
    const portMatch = line.match(
      /^(input|output|inout)\s+(?:(?:wire|reg|logic)\s+)?(?:(\[[^\]]+\])\s+)?([a-zA-Z_][a-zA-Z0-9_$,\s]*)/
    );
    if (portMatch) {
      const dir = portMatch[1];
      const range = portMatch[2] ? ` ${portMatch[2]}` : '';
      const names = portMatch[3]
        .split(',')
        .map((s) => s.trim().replace(/;$/, ''))
        .filter(Boolean);

      for (const name of names) {
        items.push({
          id: `port-${dir}-${name}-${lineNum}`,
          name,
          kind: dir === 'input' ? 'port-in' : dir === 'output' ? 'port-out' : 'port-inout',
          detail: `${dir}${range}`,
          line: lineNum,
        });
      }
      continue;
    }

    // Signals: wire, reg, logic
    const sigMatch = line.match(
      /^(wire|reg|logic)\s+(?:(\[[^\]]+\])\s+)?([a-zA-Z_][a-zA-Z0-9_$,\s]*);/
    );
    if (sigMatch) {
      const type = sigMatch[1];
      const range = sigMatch[2] ? ` ${sigMatch[2]}` : '';
      const names = sigMatch[3].split(',').map((s) => s.trim()).filter(Boolean);
      for (const name of names) {
        items.push({
          id: `sig-${name}-${lineNum}`,
          name,
          kind: 'signal',
          detail: `${type}${range}`,
          line: lineNum,
        });
      }
      continue;
    }

    // Sub-instances: <module_type> #(...) <instance_name> ( or <module_type> <instance_name> (
    const instMatch = line.match(
      /^([a-zA-Z_][a-zA-Z0-9_]*)\s+(?:#\s*\([\s\S]*?\)\s+)?([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/
    );
    if (instMatch && !keywords.has(instMatch[1]) && !keywords.has(instMatch[2])) {
      items.push({
        id: `inst-${instMatch[2]}-${lineNum}`,
        name: `${instMatch[2]} (${instMatch[1]})`,
        kind: 'instance',
        detail: `instance of ${instMatch[1]}`,
        line: lineNum,
      });
      continue;
    }

    // Always / initial blocks
    const blockMatch = line.match(/^(always_ff|always_comb|always_latch|always|initial)\b(.*)$/);
    if (blockMatch) {
      const trigger = blockMatch[2].replace(/begin\s*$/, '').trim();
      items.push({
        id: `block-${lineNum}`,
        name: `${blockMatch[1]}${trigger ? ' ' + trigger : ''}`,
        kind: 'block',
        detail: blockMatch[1],
        line: lineNum,
      });
      continue;
    }

    // Tasks
    const taskMatch = line.match(/^task\s+(?:(?:automatic|static)\s+)?([a-zA-Z_][a-zA-Z0-9_$]*)/);
    if (taskMatch) {
      items.push({
        id: `task-${taskMatch[1]}-${lineNum}`,
        name: taskMatch[1],
        kind: 'task',
        detail: 'task',
        line: lineNum,
      });
      continue;
    }

    // Functions
    const funcMatch = line.match(
      /^function\s+(?:(?:automatic|static)\s+)?(?:(?:logic|bit|reg|wire|integer|void|int|byte|string)\s*(?:\[[^\]]+\])?\s+)?([a-zA-Z_][a-zA-Z0-9_$]*)/
    );
    if (funcMatch) {
      items.push({
        id: `func-${funcMatch[1]}-${lineNum}`,
        name: `${funcMatch[1]}()`,
        kind: 'function',
        detail: 'function',
        line: lineNum,
      });
      continue;
    }
  }

  return items;
}

export function FileExplorer() {
  const {
    currentProject,
    setProjectFiles,
    activeFile,
    setActiveFile,
    openFiles,
    setOpenFiles,
    openFile,
    closeFile,
    sidebarCollapsed,
    setIsNewProjectDialogOpen,
  } = useIDEStore();

  // Accordion Section States
  const [openEditorsExpanded, setOpenEditorsExpanded] = useState(true);
  const [workspaceExpanded, setWorkspaceExpanded] = useState(true);
  const [outlineExpanded, setOutlineExpanded] = useState(true);

  // Category Folder States
  const [hdlExpanded, setHdlExpanded] = useState(true);
  const [tbExpanded, setTbExpanded] = useState(true);
  const [pyExpanded, setPyExpanded] = useState(true);
  const [memExpanded, setMemExpanded] = useState(true);
  const [otherExpanded, setOtherExpanded] = useState(true);

  // Dialog States
  const [newFileOpen, setNewFileOpen] = useState(false);
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [editingFile, setEditingFile] = useState<VerilogFile | null>(null);
  const [newFileName, setNewFileName] = useState('');
  const [newFolderName, setNewFolderName] = useState('');
  const [renameValue, setRenameValue] = useState('');
  const [newFileType, setNewFileType] = useState('systemverilog');
  const [isCreating, setIsCreating] = useState(false);

  // Outline filter
  const [outlineFilter, setOutlineFilter] = useState('');

  // Dirty state tracking (saved content snapshot)
  const savedContentRef = useRef<Record<string, string>>({});
  const [, setDirtyTick] = useState(0);

  // Initialize saved snapshot
  useEffect(() => {
    if (currentProject?.files) {
      const snapshot: Record<string, string> = { ...savedContentRef.current };
      for (const file of currentProject.files) {
        if (snapshot[file.id] === undefined) {
          snapshot[file.id] = file.content;
        }
      }
      savedContentRef.current = snapshot;
    }
  }, [currentProject?.id]);

  // Sync dirty snapshot on Ctrl+S
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
        if (currentProject?.files) {
          const snapshot: Record<string, string> = {};
          for (const file of currentProject.files) {
            snapshot[file.id] = file.content;
          }
          savedContentRef.current = snapshot;
          setDirtyTick((t) => t + 1);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentProject?.files]);

  const isFileDirty = useCallback((file: VerilogFile) => {
    const original = savedContentRef.current[file.id];
    if (original !== undefined) {
      return original !== file.content;
    }
    return false;
  }, []);

  const jumpToLine = useCallback((lineNumber: number) => {
    if (typeof window !== 'undefined') {
      try {
        const monacoInstance = (window as any).monaco || monaco;
        const editors = monacoInstance?.editor?.getEditors?.();
        if (editors && editors.length > 0) {
          const editor = editors[0];
          editor.revealLineInCenter(lineNumber);
          editor.setPosition({ lineNumber, column: 1 });
          editor.focus();
        }
      } catch (err) {
        console.warn('Failed to jump to line in Monaco:', err);
      }
      window.dispatchEvent(
        new CustomEvent('verisim:jump-to-line', { detail: { line: lineNumber } })
      );
    }
  }, []);

  const getFileIcon = (type: string, name: string) => {
    if (name.endsWith('.sv') || name.endsWith('.svh') || type === 'systemverilog') {
      return <FileCode className="h-4 w-4 text-purple-400 shrink-0" />;
    }
    if (name.endsWith('.py') || type === 'python') {
      return <span className="text-xs mr-0.5 shrink-0">🐍</span>;
    }
    if (name.includes('_tb') || type === 'testbench') {
      return <FileCog className="h-4 w-4 text-amber-500 shrink-0" />;
    }
    if (type === 'memory' || name.endsWith('.hex') || name.endsWith('.mem')) {
      return <Database className="h-4 w-4 text-cyan-400 shrink-0" />;
    }
    if (name.endsWith('.v') || type === 'verilog') {
      return <FileCode className="h-4 w-4 text-blue-400 shrink-0" />;
    }
    return <File className="h-4 w-4 text-muted-foreground shrink-0" />;
  };

  const getOutlineIcon = (kind: OutlineItem['kind']) => {
    switch (kind) {
      case 'module':
        return <Cpu className="h-3.5 w-3.5 text-blue-400 shrink-0" />;
      case 'port-in':
        return <ArrowRight className="h-3.5 w-3.5 text-emerald-400 shrink-0" />;
      case 'port-out':
        return <ArrowLeft className="h-3.5 w-3.5 text-sky-400 shrink-0" />;
      case 'port-inout':
        return <ArrowLeftRight className="h-3.5 w-3.5 text-purple-400 shrink-0" />;
      case 'signal':
        return <Hash className="h-3.5 w-3.5 text-amber-400 shrink-0" />;
      case 'instance':
        return <Layers className="h-3.5 w-3.5 text-violet-400 shrink-0" />;
      case 'block':
        return <Zap className="h-3.5 w-3.5 text-orange-400 shrink-0" />;
      case 'task':
      case 'function':
        return <FileCode className="h-3.5 w-3.5 text-yellow-400 shrink-0" />;
      case 'class':
        return <Box className="h-3.5 w-3.5 text-cyan-400 shrink-0" />;
      default:
        return <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />;
    }
  };

  const getDefaultContent = (name: string, type: string): string => {
    const baseName = name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_]/g, '_');

    if (type === 'systemverilog' || name.endsWith('.sv')) {
      return `// SystemVerilog Module
module ${baseName} #(
    parameter int DATA_WIDTH = 8
) (
    input  logic                  clk,
    input  logic                  rst_n,
    input  logic [DATA_WIDTH-1:0] data_in,
    output logic [DATA_WIDTH-1:0] data_out
);

    always_ff @(posedge clk or negedge rst_n) begin
        if (!rst_n) begin
            data_out <= '0;
        end else begin
            data_out <= data_in;
        end
    end

endmodule
`;
    }

    if (type === 'python' || name.endsWith('.py')) {
      return `#!/usr/bin/env python3
"""
Python Verification Script: ${baseName}
"""

def main():
    print("Running Python verification for ${baseName}...")
    # Add your test stimulus or output analysis here

if __name__ == "__main__":
    main()
`;
    }

    if (type === 'testbench' || name.includes('_tb')) {
      return `\`timescale 1ns/1ps

module ${baseName}();

    reg clk;
    reg rst;

    initial begin
        clk = 0;
        forever #5 clk = ~clk;
    end

    initial begin
        rst = 1;
        #20 rst = 0;
        #100 $finish;
    end

    initial begin
        $dumpfile("${baseName}.vcd");
        $dumpvars(0, ${baseName});
    end

endmodule
`;
    }

    if (type === 'verilog') {
      return `module ${baseName}(
    input wire clk,
    input wire rst
);

endmodule
`;
    }

    if (type === 'memory') {
      return `// Hex memory initialization
00
01
02
03
`;
    }

    return '';
  };

  const createFile = async () => {
    if (!newFileName.trim() || !currentProject) return;

    setIsCreating(true);
    try {
      let name = newFileName.trim();
      if (!name.includes('.')) {
        switch (newFileType) {
          case 'systemverilog':
            name += '.sv';
            break;
          case 'python':
            name += '.py';
            break;
          case 'testbench':
            name += '_tb.sv';
            break;
          case 'verilog':
            name += '.v';
            break;
          case 'memory':
            name += '.hex';
            break;
          default:
            name += '.txt';
            break;
        }
      }

      const content = getDefaultContent(name, newFileType);
      const now = new Date().toISOString();
      const newFile: VerilogFile = {
        id: `${currentProject.id}:${name}`,
        name,
        content,
        type: newFileType,
        project_id: currentProject.id,
        created_at: now,
        updated_at: now,
      };

      const updatedFiles = [...(currentProject.files || []), newFile];
      setProjectFiles(updatedFiles);
      openFile(newFile);
      setActiveFile(newFile);
      savedContentRef.current[newFile.id] = content;
      toast.success(`Created file ${name}`);

      setNewFileOpen(false);
      setNewFileName('');
    } catch (error) {
      console.error('Failed to create file:', error);
      toast.error('Failed to create file');
    } finally {
      setIsCreating(false);
    }
  };

  const createFolder = () => {
    if (!newFolderName.trim() || !currentProject) return;
    const folder = newFolderName.trim().replace(/\/+$/, '');
    const cleanPrefix = folder.replace(/[^a-zA-Z0-9_]/g, '_');
    const starterFileName = `${folder}/module_${cleanPrefix}.sv`;
    const now = new Date().toISOString();
    const content = `// Module inside folder: ${folder}\nmodule ${cleanPrefix}_top;\n\nendmodule\n`;

    const newFile: VerilogFile = {
      id: `${currentProject.id}:${starterFileName}`,
      name: starterFileName,
      content,
      type: 'systemverilog',
      project_id: currentProject.id,
      created_at: now,
      updated_at: now,
    };

    const updatedFiles = [...(currentProject.files || []), newFile];
    setProjectFiles(updatedFiles);
    openFile(newFile);
    setActiveFile(newFile);
    savedContentRef.current[newFile.id] = content;
    setNewFolderOpen(false);
    setNewFolderName('');
    toast.success(`Created folder "${folder}" with starter module`);
  };

  const renameFile = async () => {
    if (!editingFile || !renameValue.trim() || !currentProject) return;

    try {
      const name = renameValue.trim();
      const oldId = editingFile.id;
      const updatedFile = {
        ...editingFile,
        name,
        id: `${currentProject.id}:${name}`,
      };

      const updatedFiles = currentProject.files.map((f) =>
        f.id === oldId ? updatedFile : f
      );
      setProjectFiles(updatedFiles);

      // Synchronize openFiles so open tabs do not retain stale name/id references
      const updatedOpenFiles = openFiles.map((f) =>
        f.id === oldId ? updatedFile : f
      );
      setOpenFiles(updatedOpenFiles);

      if (savedContentRef.current[oldId] !== undefined) {
        savedContentRef.current[updatedFile.id] = savedContentRef.current[oldId];
        delete savedContentRef.current[oldId];
      }

      if (activeFile?.id === oldId) {
        setActiveFile(updatedFile);
      }

      setRenameOpen(false);
      setEditingFile(null);
      toast.success(`Renamed to ${name}`);
    } catch (error) {
      console.error('Failed to rename file:', error);
      toast.error('Failed to rename file');
    }
  };

  const duplicateFile = (file: VerilogFile) => {
    if (!currentProject) return;
    const dotIndex = file.name.lastIndexOf('.');
    const baseName = dotIndex !== -1 ? file.name.substring(0, dotIndex) : file.name;
    const ext = dotIndex !== -1 ? file.name.substring(dotIndex) : '';

    let newName = `${baseName}_copy${ext}`;
    let counter = 2;
    while (currentProject.files.some((f) => f.name === newName)) {
      newName = `${baseName}_copy${counter}${ext}`;
      counter++;
    }

    const now = new Date().toISOString();
    const newFile: VerilogFile = {
      id: `${currentProject.id}:${newName}`,
      name: newName,
      content: file.content,
      type: file.type,
      project_id: currentProject.id,
      created_at: now,
      updated_at: now,
    };

    const updatedFiles = [...currentProject.files, newFile];
    setProjectFiles(updatedFiles);
    openFile(newFile);
    setActiveFile(newFile);
    savedContentRef.current[newFile.id] = file.content;
    toast.success(`Duplicated ${file.name} to ${newName}`);
  };

  const deleteFile = async (e: React.MouseEvent, fileId: string) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this file?')) return;

    try {
      closeFile(fileId);
      if (currentProject) {
        const updatedFiles = currentProject.files.filter((f) => f.id !== fileId);
        setProjectFiles(updatedFiles);
        delete savedContentRef.current[fileId];
        toast.success('File deleted');
      }
    } catch (error) {
      console.error('Failed to delete file:', error);
    }
  };

  const handleImportFiles = async () => {
    try {
      const res = await importVerilogFiles();
      if (res) {
        toast.success('Loaded files into workspace');
      }
    } catch (error) {
      console.error('Failed to import files:', error);
      toast.error('Failed to import files');
    }
  };

  const handleCollapseAll = () => {
    const isAnyOpen = openEditorsExpanded || workspaceExpanded || outlineExpanded;
    const nextState = !isAnyOpen;
    setOpenEditorsExpanded(nextState);
    setWorkspaceExpanded(nextState);
    setOutlineExpanded(nextState);
    setHdlExpanded(nextState);
    setTbExpanded(nextState);
    setPyExpanded(nextState);
    setMemExpanded(nextState);
    setOtherExpanded(nextState);
  };

  const handleCloseAllOpenEditors = (e: React.MouseEvent) => {
    e.stopPropagation();
    for (const f of [...openFiles]) {
      closeFile(f.id);
    }
  };

  // Outline parsing for active file
  const outlineItems = useMemo(() => {
    if (!activeFile?.content) return [];
    const items = parseOutline(activeFile.content, activeFile.name);
    if (!outlineFilter.trim()) return items;
    const q = outlineFilter.toLowerCase();
    return items.filter(
      (item) => item.name.toLowerCase().includes(q) || item.detail?.toLowerCase().includes(q)
    );
  }, [activeFile?.content, activeFile?.name, outlineFilter]);

  if (sidebarCollapsed) return null;

  if (!currentProject) {
    return (
      <div className="h-full flex flex-col bg-[#1e1e1e] border-r border-[#2b2b2b] text-[#cccccc] select-none text-xs">
        <div className="h-9 px-4 flex items-center justify-between border-b border-[#2b2b2b] bg-[#1e1e1e]">
          <span className="text-[11px] font-semibold text-[#bbbbbb] uppercase tracking-wider">
            Explorer
          </span>
        </div>
        <div className="p-4 flex flex-col items-center justify-center flex-1 text-center text-[#858585]">
          <FolderOpen className="h-10 w-10 mb-3 opacity-40 text-blue-400" />
          <p className="text-xs font-medium text-[#cccccc] mb-1">No Workspace Opened</p>
          <p className="text-[11px] mb-4 text-[#858585]">
            Open an existing Verilog project or create a new workspace.
          </p>
          <div className="flex flex-col gap-2 w-full max-w-[200px]">
            <Button
              size="sm"
              className="bg-[#0078d4] hover:bg-[#006abc] text-white text-xs h-7"
              onClick={() => setIsNewProjectDialogOpen(true)}
            >
              New Project
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="border-[#333333] text-[#cccccc] hover:bg-[#2a2d2e] text-xs h-7"
              onClick={handleImportFiles}
            >
              Import Files
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const files = currentProject.files || [];

  const designFiles = files.filter(
    (f) =>
      !f.name.includes('_tb') &&
      (f.name.endsWith('.v') ||
        f.name.endsWith('.sv') ||
        f.type === 'verilog' ||
        f.type === 'systemverilog')
  );

  const testbenchFiles = files.filter(
    (f) => f.name.includes('_tb') || f.type === 'testbench'
  );

  const pythonFiles = files.filter(
    (f) => f.name.endsWith('.py') || f.type === 'python'
  );

  const memoryFiles = files.filter(
    (f) => f.name.endsWith('.hex') || f.name.endsWith('.mem') || f.type === 'memory'
  );

  const otherFiles = files.filter(
    (f) =>
      !designFiles.includes(f) &&
      !testbenchFiles.includes(f) &&
      !pythonFiles.includes(f) &&
      !memoryFiles.includes(f)
  );

  return (
    <div className="h-full flex flex-col bg-[#1e1e1e] border-r border-[#2b2b2b] text-[#cccccc] select-none text-xs">
      {/* Top Header: EXPLORER and Action Icons */}
      <div className="h-9 px-3 flex items-center justify-between border-b border-[#2b2b2b] bg-[#1e1e1e] shrink-0">
        <span className="text-[11px] font-semibold text-[#bbbbbb] uppercase tracking-wider">
          Explorer
        </span>
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => {
              setNewFileType('systemverilog');
              setNewFileName('');
              setNewFileOpen(true);
            }}
            className="p-1 rounded text-[#858585] hover:text-[#e0e0e0] hover:bg-[#2a2d2e] transition-colors"
            title="New File"
          >
            <FilePlus className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => {
              setNewFolderName('');
              setNewFolderOpen(true);
            }}
            className="p-1 rounded text-[#858585] hover:text-[#e0e0e0] hover:bg-[#2a2d2e] transition-colors"
            title="New Folder"
          >
            <FolderPlus className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={handleImportFiles}
            className="p-1 rounded text-[#858585] hover:text-[#e0e0e0] hover:bg-[#2a2d2e] transition-colors"
            title="Import Files"
          >
            <Upload className="h-3.5 w-3.5 text-blue-400" />
          </button>
          <button
            onClick={() => toast.success('Workspace files refreshed')}
            className="p-1 rounded text-[#858585] hover:text-[#e0e0e0] hover:bg-[#2a2d2e] transition-colors"
            title="Refresh Explorer"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={handleCollapseAll}
            className="p-1 rounded text-[#858585] hover:text-[#e0e0e0] hover:bg-[#2a2d2e] transition-colors"
            title="Collapse All Sections"
          >
            <ChevronsDownUp className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="flex flex-col">
          {/* ======================================================== */}
          {/* ACCORDION 1: OPEN EDITORS                                */}
          {/* ======================================================== */}
          <div className="border-b border-[#2b2b2b]">
            <div
              onClick={() => setOpenEditorsExpanded(!openEditorsExpanded)}
              className="h-[22px] flex items-center justify-between px-2 bg-[#252526]/70 hover:bg-[#2a2d2e] cursor-pointer select-none text-[11px] font-bold text-[#bbbbbb] tracking-wider uppercase group"
            >
              <div className="flex items-center gap-1">
                {openEditorsExpanded ? (
                  <ChevronDown className="h-3.5 w-3.5 text-[#858585] shrink-0" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5 text-[#858585] shrink-0" />
                )}
                <span>OPEN EDITORS</span>
                {openFiles.length > 0 && (
                  <span className="text-[10px] text-[#858585] font-normal ml-0.5">
                    ({openFiles.length})
                  </span>
                )}
              </div>
              {openFiles.length > 0 && (
                <button
                  onClick={handleCloseAllOpenEditors}
                  className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-[#858585] hover:text-white hover:bg-[#333333] transition-opacity"
                  title="Close All Editors"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>

            {openEditorsExpanded && (
              <div className="py-1">
                {openFiles.length === 0 ? (
                  <div className="px-4 py-1.5 text-[11px] text-[#858585] italic">
                    No open editors
                  </div>
                ) : (
                  openFiles.map((file) => {
                    const isActive = activeFile?.id === file.id;
                    const dirty = isFileDirty(file);

                    return (
                      <div
                        key={file.id}
                        onClick={() => setActiveFile(file)}
                        className={cn(
                          'flex items-center gap-2 px-3 py-1 text-xs cursor-pointer group select-none transition-colors',
                          isActive
                            ? 'bg-[#37373d] text-white font-medium'
                            : 'text-[#cccccc] hover:bg-[#2a2d2e] hover:text-white'
                        )}
                      >
                        {getFileIcon(file.type, file.name)}
                        <span className="truncate flex-1 text-[13px]">{file.name}</span>

                        <div className="flex items-center">
                          {dirty && (
                            <span
                              className="w-2 h-2 rounded-full bg-white/80 group-hover:hidden mr-1"
                              title="Unsaved changes"
                            />
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              closeFile(file.id);
                            }}
                            className={cn(
                              'p-0.5 rounded text-[#858585] hover:text-white hover:bg-[#454545] transition-colors',
                              dirty
                                ? 'hidden group-hover:block'
                                : 'opacity-0 group-hover:opacity-100'
                            )}
                            title="Close"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* ======================================================== */}
          {/* ACCORDION 2: VERISIM WORKSPACE [PROJECT NAME]           */}
          {/* ======================================================== */}
          <div className="border-b border-[#2b2b2b]">
            <div
              onClick={() => setWorkspaceExpanded(!workspaceExpanded)}
              className="h-[22px] flex items-center justify-between px-2 bg-[#252526]/70 hover:bg-[#2a2d2e] cursor-pointer select-none text-[11px] font-bold text-[#bbbbbb] tracking-wider uppercase group"
            >
              <div className="flex items-center gap-1 truncate">
                {workspaceExpanded ? (
                  <ChevronDown className="h-3.5 w-3.5 text-[#858585] shrink-0" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5 text-[#858585] shrink-0" />
                )}
                <span className="truncate">
                  VERISIM WORKSPACE [{currentProject.name.toUpperCase()}]
                </span>
              </div>
              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setNewFileType('systemverilog');
                    setNewFileName('');
                    setNewFileOpen(true);
                  }}
                  className="p-0.5 rounded text-[#858585] hover:text-white"
                  title="New File"
                >
                  <FilePlus className="h-3 w-3" />
                </button>
              </div>
            </div>

            {workspaceExpanded && (
              <div className="py-1">
                {files.length === 0 ? (
                  <div className="px-4 py-2 text-[11px] text-[#858585] italic">
                    Workspace is empty. Create or import files.
                  </div>
                ) : (
                  <div className="space-y-0.5">
                    {/* HDL Design Modules */}
                    {designFiles.length > 0 && (
                      <div>
                        <div
                          onClick={() => setHdlExpanded(!hdlExpanded)}
                          className="flex items-center gap-1.5 px-2 py-0.5 text-xs text-[#858585] hover:text-[#cccccc] hover:bg-[#2a2d2e]/60 cursor-pointer rounded"
                        >
                          {hdlExpanded ? (
                            <ChevronDown className="h-3 w-3 shrink-0" />
                          ) : (
                            <ChevronRight className="h-3 w-3 shrink-0" />
                          )}
                          {hdlExpanded ? (
                            <FolderOpen className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                          ) : (
                            <Folder className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                          )}
                          <span className="font-semibold text-[11px] tracking-wide uppercase">
                            HDL Modules ({designFiles.length})
                          </span>
                        </div>
                        {hdlExpanded && (
                          <div className="space-y-0.5">
                            {designFiles.map((file) => (
                              <WorkspaceFileRow
                                key={file.id}
                                file={file}
                                isActive={activeFile?.id === file.id}
                                onOpen={() => openFile(file)}
                                onRename={(f) => {
                                  setEditingFile(f);
                                  setRenameValue(f.name);
                                  setRenameOpen(true);
                                }}
                                onDuplicate={duplicateFile}
                                onDelete={(e) => deleteFile(e, file.id)}
                                icon={getFileIcon(file.type, file.name)}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Testbenches */}
                    {testbenchFiles.length > 0 && (
                      <div>
                        <div
                          onClick={() => setTbExpanded(!tbExpanded)}
                          className="flex items-center gap-1.5 px-2 py-0.5 text-xs text-[#858585] hover:text-[#cccccc] hover:bg-[#2a2d2e]/60 cursor-pointer rounded"
                        >
                          {tbExpanded ? (
                            <ChevronDown className="h-3 w-3 shrink-0" />
                          ) : (
                            <ChevronRight className="h-3 w-3 shrink-0" />
                          )}
                          {tbExpanded ? (
                            <FolderOpen className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                          ) : (
                            <Folder className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                          )}
                          <span className="font-semibold text-[11px] tracking-wide uppercase">
                            Testbenches ({testbenchFiles.length})
                          </span>
                        </div>
                        {tbExpanded && (
                          <div className="space-y-0.5">
                            {testbenchFiles.map((file) => (
                              <WorkspaceFileRow
                                key={file.id}
                                file={file}
                                isActive={activeFile?.id === file.id}
                                onOpen={() => openFile(file)}
                                onRename={(f) => {
                                  setEditingFile(f);
                                  setRenameValue(f.name);
                                  setRenameOpen(true);
                                }}
                                onDuplicate={duplicateFile}
                                onDelete={(e) => deleteFile(e, file.id)}
                                icon={getFileIcon(file.type, file.name)}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Python Verification */}
                    {pythonFiles.length > 0 && (
                      <div>
                        <div
                          onClick={() => setPyExpanded(!pyExpanded)}
                          className="flex items-center gap-1.5 px-2 py-0.5 text-xs text-[#858585] hover:text-[#cccccc] hover:bg-[#2a2d2e]/60 cursor-pointer rounded"
                        >
                          {pyExpanded ? (
                            <ChevronDown className="h-3 w-3 shrink-0" />
                          ) : (
                            <ChevronRight className="h-3 w-3 shrink-0" />
                          )}
                          {pyExpanded ? (
                            <FolderOpen className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                          ) : (
                            <Folder className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                          )}
                          <span className="font-semibold text-[11px] tracking-wide uppercase">
                            Python Verification ({pythonFiles.length})
                          </span>
                        </div>
                        {pyExpanded && (
                          <div className="space-y-0.5">
                            {pythonFiles.map((file) => (
                              <WorkspaceFileRow
                                key={file.id}
                                file={file}
                                isActive={activeFile?.id === file.id}
                                onOpen={() => openFile(file)}
                                onRename={(f) => {
                                  setEditingFile(f);
                                  setRenameValue(f.name);
                                  setRenameOpen(true);
                                }}
                                onDuplicate={duplicateFile}
                                onDelete={(e) => deleteFile(e, file.id)}
                                icon={getFileIcon(file.type, file.name)}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Memory & Vectors */}
                    {memoryFiles.length > 0 && (
                      <div>
                        <div
                          onClick={() => setMemExpanded(!memExpanded)}
                          className="flex items-center gap-1.5 px-2 py-0.5 text-xs text-[#858585] hover:text-[#cccccc] hover:bg-[#2a2d2e]/60 cursor-pointer rounded"
                        >
                          {memExpanded ? (
                            <ChevronDown className="h-3 w-3 shrink-0" />
                          ) : (
                            <ChevronRight className="h-3 w-3 shrink-0" />
                          )}
                          {memExpanded ? (
                            <FolderOpen className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                          ) : (
                            <Folder className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                          )}
                          <span className="font-semibold text-[11px] tracking-wide uppercase">
                            Memory & Vectors ({memoryFiles.length})
                          </span>
                        </div>
                        {memExpanded && (
                          <div className="space-y-0.5">
                            {memoryFiles.map((file) => (
                              <WorkspaceFileRow
                                key={file.id}
                                file={file}
                                isActive={activeFile?.id === file.id}
                                onOpen={() => openFile(file)}
                                onRename={(f) => {
                                  setEditingFile(f);
                                  setRenameValue(f.name);
                                  setRenameOpen(true);
                                }}
                                onDuplicate={duplicateFile}
                                onDelete={(e) => deleteFile(e, file.id)}
                                icon={getFileIcon(file.type, file.name)}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Other Files */}
                    {otherFiles.length > 0 && (
                      <div>
                        <div
                          onClick={() => setOtherExpanded(!otherExpanded)}
                          className="flex items-center gap-1.5 px-2 py-0.5 text-xs text-[#858585] hover:text-[#cccccc] hover:bg-[#2a2d2e]/60 cursor-pointer rounded"
                        >
                          {otherExpanded ? (
                            <ChevronDown className="h-3 w-3 shrink-0" />
                          ) : (
                            <ChevronRight className="h-3 w-3 shrink-0" />
                          )}
                          {otherExpanded ? (
                            <FolderOpen className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          ) : (
                            <Folder className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          )}
                          <span className="font-semibold text-[11px] tracking-wide uppercase">
                            Other Files ({otherFiles.length})
                          </span>
                        </div>
                        {otherExpanded && (
                          <div className="space-y-0.5">
                            {otherFiles.map((file) => (
                              <WorkspaceFileRow
                                key={file.id}
                                file={file}
                                isActive={activeFile?.id === file.id}
                                onOpen={() => openFile(file)}
                                onRename={(f) => {
                                  setEditingFile(f);
                                  setRenameValue(f.name);
                                  setRenameOpen(true);
                                }}
                                onDuplicate={duplicateFile}
                                onDelete={(e) => deleteFile(e, file.id)}
                                icon={getFileIcon(file.type, file.name)}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ======================================================== */}
          {/* ACCORDION 3: OUTLINE                                     */}
          {/* ======================================================== */}
          <div>
            <div
              onClick={() => setOutlineExpanded(!outlineExpanded)}
              className="h-[22px] flex items-center justify-between px-2 bg-[#252526]/70 hover:bg-[#2a2d2e] cursor-pointer select-none text-[11px] font-bold text-[#bbbbbb] tracking-wider uppercase group"
            >
              <div className="flex items-center gap-1 truncate">
                {outlineExpanded ? (
                  <ChevronDown className="h-3.5 w-3.5 text-[#858585] shrink-0" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5 text-[#858585] shrink-0" />
                )}
                <span className="truncate">OUTLINE</span>
                {activeFile && (
                  <span className="text-[10px] lowercase text-[#858585] font-normal truncate max-w-[120px]">
                    ({activeFile.name})
                  </span>
                )}
              </div>
            </div>

            {outlineExpanded && (
              <div className="p-1 space-y-1">
                {activeFile && outlineItems.length > 4 && (
                  <div className="px-1 py-0.5">
                    <div className="relative flex items-center">
                      <Search className="absolute left-2 h-3 w-3 text-[#858585]" />
                      <input
                        value={outlineFilter}
                        onChange={(e) => setOutlineFilter(e.target.value)}
                        placeholder="Filter symbols..."
                        className="w-full h-6 pl-7 pr-6 text-[11px] bg-[#252526] border border-[#333333] rounded text-[#cccccc] placeholder:text-[#666666] focus:outline-none focus:border-[#0078d4]"
                      />
                      {outlineFilter && (
                        <button
                          onClick={() => setOutlineFilter('')}
                          className="absolute right-1.5 text-[#858585] hover:text-white"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {!activeFile ? (
                  <div className="px-3 py-2 text-[11px] text-[#858585] italic">
                    No active file selected
                  </div>
                ) : outlineItems.length === 0 ? (
                  <div className="px-3 py-2 text-[11px] text-[#858585] italic">
                    {outlineFilter
                      ? 'No matching symbols'
                      : 'No symbols parsed in active HDL file'}
                  </div>
                ) : (
                  <div className="space-y-0.5 max-h-[320px] overflow-y-auto no-scrollbar">
                    {outlineItems.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => jumpToLine(item.line)}
                        className="flex items-center justify-between px-2 py-1 text-xs rounded hover:bg-[#2a2d2e] cursor-pointer group select-none text-[#cccccc] hover:text-white transition-colors"
                        title={`Jump to line ${item.line}: ${item.detail || item.name}`}
                      >
                        <div className="flex items-center gap-1.5 truncate flex-1 mr-1">
                          {getOutlineIcon(item.kind)}
                          <span className="truncate text-[12px] font-mono">
                            {item.name}
                          </span>
                          {item.detail && item.detail !== item.name && (
                            <span className="text-[10px] text-[#858585] truncate">
                              {item.detail}
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-[#858585] group-hover:text-blue-400 font-mono shrink-0">
                          :{item.line}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </ScrollArea>

      {/* New File Dialog */}
      <Dialog open={newFileOpen} onOpenChange={setNewFileOpen}>
        <DialogContent className="sm:max-w-[400px] bg-[#252526] border-[#333333] text-[#cccccc]">
          <DialogHeader>
            <DialogTitle className="text-white text-sm">Create New File</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2 text-xs">
            <div className="grid gap-1.5">
              <Label className="text-[#cccccc]">File Type</Label>
              <Select value={newFileType} onValueChange={setNewFileType}>
                <SelectTrigger className="bg-[#1e1e1e] border-[#333333] text-[#cccccc] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#252526] border-[#333333] text-[#cccccc] text-xs">
                  <SelectItem value="systemverilog">SystemVerilog (.sv)</SelectItem>
                  <SelectItem value="verilog">Verilog (.v)</SelectItem>
                  <SelectItem value="python">Python Script (.py)</SelectItem>
                  <SelectItem value="testbench">Testbench (_tb.sv)</SelectItem>
                  <SelectItem value="memory">Memory Vector (.hex / .mem)</SelectItem>
                  <SelectItem value="other">Generic File</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="fileName" className="text-[#cccccc]">
                File Name
              </Label>
              <Input
                id="fileName"
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                placeholder={
                  newFileType === 'systemverilog'
                    ? 'alu.sv'
                    : newFileType === 'python'
                    ? 'verify.py'
                    : newFileType === 'testbench'
                    ? 'alu_tb.sv'
                    : 'module_name'
                }
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') createFile();
                }}
                className="bg-[#1e1e1e] border-[#333333] text-white text-xs"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              size="sm"
              className="text-[#858585] hover:text-white"
              onClick={() => setNewFileOpen(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="bg-[#0078d4] hover:bg-[#006abc] text-white"
              onClick={createFile}
              disabled={!newFileName.trim() || isCreating}
            >
              {isCreating ? 'Creating...' : 'Create File'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Folder Dialog */}
      <Dialog open={newFolderOpen} onOpenChange={setNewFolderOpen}>
        <DialogContent className="sm:max-w-[400px] bg-[#252526] border-[#333333] text-[#cccccc]">
          <DialogHeader>
            <DialogTitle className="text-white text-sm">Create New Folder</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2 text-xs">
            <div className="grid gap-1.5">
              <Label htmlFor="folderName" className="text-[#cccccc]">
                Folder Name
              </Label>
              <Input
                id="folderName"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="e.g. rtl, tb, or include"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') createFolder();
                }}
                className="bg-[#1e1e1e] border-[#333333] text-white text-xs"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              size="sm"
              className="text-[#858585] hover:text-white"
              onClick={() => setNewFolderOpen(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="bg-[#0078d4] hover:bg-[#006abc] text-white"
              onClick={createFolder}
              disabled={!newFolderName.trim()}
            >
              Create Folder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Dialog */}
      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent className="sm:max-w-[400px] bg-[#252526] border-[#333333] text-[#cccccc]">
          <DialogHeader>
            <DialogTitle className="text-white text-sm">Rename File</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2 text-xs">
            <div className="grid gap-1.5">
              <Label htmlFor="renameValue" className="text-[#cccccc]">
                New Name
              </Label>
              <Input
                id="renameValue"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') renameFile();
                }}
                className="bg-[#1e1e1e] border-[#333333] text-white text-xs"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              size="sm"
              className="text-[#858585] hover:text-white"
              onClick={() => setRenameOpen(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="bg-[#0078d4] hover:bg-[#006abc] text-white"
              onClick={renameFile}
              disabled={!renameValue.trim()}
            >
              Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface WorkspaceFileRowProps {
  file: VerilogFile;
  isActive: boolean;
  onOpen: () => void;
  onRename: (file: VerilogFile) => void;
  onDuplicate: (file: VerilogFile) => void;
  onDelete: (e: React.MouseEvent) => void;
  icon: React.ReactNode;
}

function WorkspaceFileRow({
  file,
  isActive,
  onOpen,
  onRename,
  onDuplicate,
  onDelete,
  icon,
}: WorkspaceFileRowProps) {
  return (
    <ContextMenu key={file.id}>
      <ContextMenuTrigger asChild>
        <div
          onClick={onOpen}
          className={cn(
            'flex items-center gap-2 pl-6 pr-2 py-1 text-[13px] w-full text-left rounded hover:bg-[#2a2d2e] group cursor-pointer transition-colors',
            isActive
              ? 'bg-[#37373d] text-white font-medium'
              : 'text-[#cccccc] hover:text-white'
          )}
        >
          {icon}
          <span className="truncate flex-1">{file.name}</span>
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRename(file);
              }}
              className="p-1 text-[#858585] hover:text-blue-400"
              title="Rename File"
            >
              <Edit2 className="h-3 w-3" />
            </button>
            <button
              onClick={onDelete}
              className="p-1 text-[#858585] hover:text-rose-400"
              title="Delete File"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-48 bg-[#252526] border-[#333333] text-[#cccccc] text-xs">
        <ContextMenuItem
          onClick={onOpen}
          className="cursor-pointer hover:bg-[#0078d4] hover:text-white"
        >
          <FileText className="h-3.5 w-3.5 mr-2" />
          <span>Open</span>
          <ContextMenuShortcut>Enter</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuSeparator className="bg-[#333333]" />
        <ContextMenuItem
          onClick={() => onRename(file)}
          className="cursor-pointer hover:bg-[#0078d4] hover:text-white"
        >
          <Edit2 className="h-3.5 w-3.5 mr-2" />
          <span>Rename...</span>
          <ContextMenuShortcut>F2</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem
          onClick={() => onDuplicate(file)}
          className="cursor-pointer hover:bg-[#0078d4] hover:text-white"
        >
          <Copy className="h-3.5 w-3.5 mr-2" />
          <span>Duplicate</span>
        </ContextMenuItem>
        <ContextMenuSeparator className="bg-[#333333]" />
        <ContextMenuItem
          variant="destructive"
          onClick={onDelete}
          className="cursor-pointer text-rose-400 hover:bg-rose-900/40 hover:text-rose-200"
        >
          <Trash2 className="h-3.5 w-3.5 mr-2" />
          <span>Delete</span>
          <ContextMenuShortcut>Del</ContextMenuShortcut>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
