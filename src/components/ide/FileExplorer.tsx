'use client';

import { useIDEStore, VerilogFile } from '@/store/ide-store';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { 
  FileCode, 
  FileCog, 
  ChevronDown, 
  ChevronRight, 
  FolderOpen, 
  FilePlus, 
  Trash2, 
  Edit2, 
  File, 
  Database,
  Sparkles,
  Upload
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { importVerilogFiles } from '@/lib/tauri-db';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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

export function FileExplorer() {
  const { 
    currentProject, 
    setCurrentProject, 
    setProjectFiles,
    activeFile, 
    setActiveFile,
    openFile, 
    closeFile, 
    sidebarCollapsed 
  } = useIDEStore();
  
  const [expanded, setExpanded] = useState(true);
  const [newFileOpen, setNewFileOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [editingFile, setEditingFile] = useState<VerilogFile | null>(null);
  const [newFileName, setNewFileName] = useState('');
  const [renameValue, setRenameValue] = useState('');
  const [newFileType, setNewFileType] = useState('systemverilog');
  const [isCreating, setIsCreating] = useState(false);

  if (sidebarCollapsed || !currentProject) return null;

  const getFileIcon = (type: string, name: string) => {
    if (name.endsWith('.sv') || name.endsWith('.svh') || type === 'systemverilog') {
      return <FileCode className="h-4 w-4 text-purple-400" />;
    }
    if (name.endsWith('.py') || type === 'python') {
      return <span className="text-xs mr-0.5">🐍</span>;
    }
    if (name.includes('_tb') || type === 'testbench') {
      return <FileCog className="h-4 w-4 text-amber-500" />;
    }
    if (type === 'memory' || name.endsWith('.hex') || name.endsWith('.mem')) {
      return <Database className="h-4 w-4 text-cyan-400" />;
    }
    if (name.endsWith('.v') || type === 'verilog') {
      return <FileCode className="h-4 w-4 text-blue-500" />;
    }
    return <File className="h-4 w-4 text-muted-foreground" />;
  };

  const getDefaultContent = (name: string, type: string): string => {
    const baseName = name.replace(/\.[^/.]+$/, '');

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

endmodule`;
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
    main()`;
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

endmodule`;
    }

    if (type === 'verilog') {
      return `module ${baseName}(
    input wire clk,
    input wire rst
);

endmodule`;
    }

    if (type === 'memory') {
      return `// Hex memory initialization
00
01
02
03`;
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
          case 'systemverilog': name += '.sv'; break;
          case 'python': name += '.py'; break;
          case 'testbench': name += '_tb.sv'; break;
          case 'verilog': name += '.v'; break;
          case 'memory': name += '.hex'; break;
          default: name += '.txt'; break;
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
        updated_at: now
      };
      
      const updatedFiles = [...(currentProject.files || []), newFile];
      setProjectFiles(updatedFiles);
      openFile(newFile);
      setActiveFile(newFile);
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

  const renameFile = async () => {
    if (!editingFile || !renameValue.trim() || !currentProject) return;
    
    try {
      const name = renameValue.trim();
      const updatedFile = {
        ...editingFile,
        name,
        id: `${currentProject.id}:${name}`
      };
      
      const updatedFiles = currentProject.files.map(f => f.id === editingFile.id ? updatedFile : f);
      setProjectFiles(updatedFiles);
      if (activeFile?.id === editingFile.id) {
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

  const deleteFile = async (e: React.MouseEvent, fileId: string) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this file?')) return;
    
    try {
      closeFile(fileId);
      const updatedFiles = currentProject.files.filter(f => f.id !== fileId);
      setProjectFiles(updatedFiles);
      toast.success('File deleted');
    } catch (error) {
      console.error('Failed to delete file:', error);
    }
  };

  const handleImportFiles = async () => {
    try {
      const res = await importVerilogFiles();
      if (res) {
        toast.success('Loaded files into project');
      }
    } catch (error) {
      console.error('Failed to import files:', error);
      toast.error('Failed to import files');
    }
  };

  const files = currentProject.files || [];
  
  // Clean categorization
  const designFiles = files.filter(f => 
    !f.name.includes('_tb') && 
    (f.name.endsWith('.v') || f.name.endsWith('.sv') || f.type === 'verilog' || f.type === 'systemverilog')
  );

  const testbenchFiles = files.filter(f => 
    f.name.includes('_tb') || f.type === 'testbench'
  );

  const pythonFiles = files.filter(f => 
    f.name.endsWith('.py') || f.type === 'python'
  );

  const memoryFiles = files.filter(f => 
    f.name.endsWith('.hex') || f.name.endsWith('.mem') || f.type === 'memory'
  );

  const otherFiles = files.filter(f => 
    !designFiles.includes(f) && 
    !testbenchFiles.includes(f) && 
    !pythonFiles.includes(f) && 
    !memoryFiles.includes(f)
  );

  return (
    <div className="h-full flex flex-col bg-card border-r border-border/60 text-foreground select-none">
      <div className="p-2 border-b border-border/50 flex items-center justify-between">
        <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
          Project Files
        </span>
        <div className="flex items-center gap-0.5">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6 text-muted-foreground hover:text-foreground" 
            onClick={handleImportFiles}
            title="Load / Import Verilog Files (.v, .sv, .py)"
          >
            <Upload className="h-3.5 w-3.5 text-blue-400" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6 text-muted-foreground hover:text-foreground" 
            onClick={() => { setNewFileType('systemverilog'); setNewFileName(''); setNewFileOpen(true); }}
            title="Create New File"
          >
            <FilePlus className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="p-1">
          <div className="mb-2">
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1.5 px-2 py-1 text-xs font-semibold text-foreground hover:bg-muted/30 rounded w-full"
            >
              {expanded ? (
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-3 w-3 text-muted-foreground" />
              )}
              <FolderOpen className="h-3.5 w-3.5 text-blue-400" />
              <span className="truncate">{currentProject.name}</span>
            </button>
            
            {expanded && (
              <div className="ml-2 pl-2 border-l border-border/30 space-y-2 mt-1">
                {/* Design Modules */}
                {designFiles.length > 0 && (
                  <div>
                    <div className="text-[10px] text-muted-foreground/70 px-2 py-0.5 uppercase font-bold tracking-wider">
                      HDL Modules
                    </div>
                    {designFiles.map((file) => (
                      <FileItem 
                        key={file.id} 
                        file={file} 
                        isActive={activeFile?.id === file.id}
                        onClick={() => openFile(file)}
                        onRename={(f) => { setEditingFile(f); setRenameValue(f.name); setRenameOpen(true); }}
                        onDelete={(e) => deleteFile(e, file.id)}
                        icon={getFileIcon(file.type, file.name)}
                      />
                    ))}
                  </div>
                )}
                
                {/* Testbenches */}
                {testbenchFiles.length > 0 && (
                  <div>
                    <div className="text-[10px] text-muted-foreground/70 px-2 py-0.5 uppercase font-bold tracking-wider">
                      Testbenches
                    </div>
                    {testbenchFiles.map((file) => (
                      <FileItem 
                        key={file.id} 
                        file={file} 
                        isActive={activeFile?.id === file.id}
                        onClick={() => openFile(file)}
                        onRename={(f) => { setEditingFile(f); setRenameValue(f.name); setRenameOpen(true); }}
                        onDelete={(e) => deleteFile(e, file.id)}
                        icon={getFileIcon(file.type, file.name)}
                      />
                    ))}
                  </div>
                )}

                {/* Python Scripts */}
                {pythonFiles.length > 0 && (
                  <div>
                    <div className="text-[10px] text-muted-foreground/70 px-2 py-0.5 uppercase font-bold tracking-wider">
                      Python Verification
                    </div>
                    {pythonFiles.map((file) => (
                      <FileItem 
                        key={file.id} 
                        file={file} 
                        isActive={activeFile?.id === file.id}
                        onClick={() => openFile(file)}
                        onRename={(f) => { setEditingFile(f); setRenameValue(f.name); setRenameOpen(true); }}
                        onDelete={(e) => deleteFile(e, file.id)}
                        icon={getFileIcon(file.type, file.name)}
                      />
                    ))}
                  </div>
                )}

                {/* Memory Files */}
                {memoryFiles.length > 0 && (
                  <div>
                    <div className="text-[10px] text-muted-foreground/70 px-2 py-0.5 uppercase font-bold tracking-wider">
                      Memory & Vectors
                    </div>
                    {memoryFiles.map((file) => (
                      <FileItem 
                        key={file.id} 
                        file={file} 
                        isActive={activeFile?.id === file.id}
                        onClick={() => openFile(file)}
                        onRename={(f) => { setEditingFile(f); setRenameValue(f.name); setRenameOpen(true); }}
                        onDelete={(e) => deleteFile(e, file.id)}
                        icon={getFileIcon(file.type, file.name)}
                      />
                    ))}
                  </div>
                )}

                {/* Other Files */}
                {otherFiles.length > 0 && (
                  <div>
                    <div className="text-[10px] text-muted-foreground/70 px-2 py-0.5 uppercase font-bold tracking-wider">
                      Other
                    </div>
                    {otherFiles.map((file) => (
                      <FileItem 
                        key={file.id} 
                        file={file} 
                        isActive={activeFile?.id === file.id}
                        onClick={() => openFile(file)}
                        onRename={(f) => { setEditingFile(f); setRenameValue(f.name); setRenameOpen(true); }}
                        onDelete={(e) => deleteFile(e, file.id)}
                        icon={getFileIcon(file.type, file.name)}
                      />
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
        <DialogContent className="sm:max-w-[400px] bg-card border-border/80 text-foreground">
          <DialogHeader>
            <DialogTitle>Create New File</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2 text-xs">
            <div className="grid gap-1.5">
              <Label>File Type</Label>
              <Select value={newFileType} onValueChange={setNewFileType}>
                <SelectTrigger className="bg-background border-border/60 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background border-border/80 text-xs">
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
              <Label htmlFor="fileName">File Name</Label>
              <Input
                id="fileName"
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                placeholder={
                  newFileType === 'systemverilog' ? 'alu.sv' :
                  newFileType === 'python' ? 'verify.py' :
                  newFileType === 'testbench' ? 'alu_tb.sv' :
                  'module_name'
                }
                autoFocus
                onKeyDown={(e) => { if (e.key === 'Enter') createFile(); }}
                className="bg-background border-border/60 text-xs"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setNewFileOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={createFile} disabled={!newFileName.trim() || isCreating}>
              {isCreating ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Dialog */}
      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent className="sm:max-w-[400px] bg-card border-border/80 text-foreground">
          <DialogHeader>
            <DialogTitle>Rename File</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2 text-xs">
            <div className="grid gap-1.5">
              <Label htmlFor="renameValue">New Name</Label>
              <Input
                id="renameValue"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                autoFocus
                onKeyDown={(e) => { if (e.key === 'Enter') renameFile(); }}
                className="bg-background border-border/60 text-xs"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setRenameOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={renameFile} disabled={!renameValue.trim()}>
              Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface FileItemProps {
  file: VerilogFile;
  isActive: boolean;
  onClick: () => void;
  onRename: (file: VerilogFile) => void;
  onDelete: (e: React.MouseEvent) => void;
  icon: React.ReactNode;
}

function FileItem({ file, isActive, onClick, onRename, onDelete, icon }: FileItemProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-2 py-1 text-xs w-full text-left rounded hover:bg-muted/60 group cursor-pointer transition-colors",
        isActive ? "bg-accent text-accent-foreground font-medium" : "text-muted-foreground hover:text-foreground"
      )}
    >
      {icon}
      <span className="truncate flex-1">{file.name}</span>
      <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
        <button 
          onClick={(e) => { e.stopPropagation(); onRename(file); }}
          className="p-1 hover:text-blue-400"
          title="Rename File"
        >
          <Edit2 className="h-3 w-3" />
        </button>
        <button 
          onClick={onDelete}
          className="p-1 hover:text-rose-400"
          title="Delete File"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}
