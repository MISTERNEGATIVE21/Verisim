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
  Plus,
  FilePlus,
  Trash2,
  X,
  Edit2,
  File,
  Database
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { 
  createFile as tauriCreateFile, 
  deleteFile as tauriDeleteFile, 
  renameFile as tauriRenameFile 
} from '@/lib/tauri-db';

export function FileExplorer() {
  const { 
    currentProject, 
    setCurrentProject,
    activeFile, 
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
  const [newFileType, setNewFileType] = useState('verilog');
  const [isCreating, setIsCreating] = useState(false);

  if (sidebarCollapsed || !currentProject) return null;

  const getFileIcon = (type: string, name: string) => {
    if (type === 'testbench') return <FileCog className="h-4 w-4 text-amber-500" />;
    if (type === 'memory') return <Database className="h-4 w-4 text-purple-500" />;
    if (type === 'verilog') return <FileCode className="h-4 w-4 text-blue-500" />;
    return <File className="h-4 w-4 text-muted-foreground" />;
  };

  const getDefaultContent = (name: string, type: string): string => {
    const baseName = name.replace(/\.[^/.]+$/, ''); // strip extension

    if (type === 'testbench') {
      return `\`timescale 1ns/1ps

module ${baseName}();

    // Inputs
    reg clk;
    reg rst;

    // Outputs
    // wire ...

    // Instantiate the Unit Under Test (UUT)
    // uut_name uut (
    //     .clk(clk),
    //     .rst(rst)
    // );

    // Clock generation
    initial begin
        clk = 0;
        forever #5 clk = ~clk;
    end

    initial begin
        // Initialize Inputs
        rst = 1;
        
        // Wait 100 ns for global reset to finish
        #100;
        rst = 0;
        
        // Add stimulus here
        
        #1000 $finish;
    end

    // Generate VCD for waveform viewing
    initial begin
        $dumpfile("${baseName}.vcd");
        $dumpvars(0, ${baseName});
    end

endmodule`;
    }

    if (type === 'verilog') {
      return `module ${baseName}(

);

endmodule`;
    }

    if (type === 'memory') {
      return `// Memory initialization file
// One value per line, hex format
00
01
02
03`;
    }

    // Generic empty file
    return '';
  };

  const createFile = async () => {
    if (!newFileName.trim() || !currentProject) return;
    
    setIsCreating(true);
    try {
      // Use the filename as-is. If it has no extension, add one based on type.
      let name = newFileName.trim();
      if (!name.includes('.')) {
        switch (newFileType) {
          case 'testbench': name += '_tb.v'; break;
          case 'verilog': name += '.v'; break;
          case 'memory': name += '.mem'; break;
          default: name += '.txt'; break;
        }
      }

      const content = getDefaultContent(name, newFileType);
      const newFile = await tauriCreateFile(currentProject.id, name, newFileType, content);
      
      const updatedProject = {
        ...currentProject,
        files: [...(currentProject.files || []), newFile]
      };
      setCurrentProject(updatedProject);
      openFile(newFile);
      
      setNewFileOpen(false);
      setNewFileName('');
    } catch (error) {
      console.error('Failed to create file:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const renameFile = async () => {
    if (!editingFile || !renameValue.trim()) return;
    
    try {
      const name = renameValue.trim();
      const updatedFile = await tauriRenameFile(editingFile.id, name);
      
      const updatedProject = {
        ...currentProject,
        files: currentProject.files.map(f => f.id === editingFile.id ? updatedFile : f)
      };
      setCurrentProject(updatedProject);
      
      setRenameOpen(false);
      setEditingFile(null);
    } catch (error) {
      console.error('Failed to rename file:', error);
    }
  };

  const deleteFile = async (e: React.MouseEvent, fileId: string) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this file?')) return;
    
    try {
      await tauriDeleteFile(fileId);
      
      closeFile(fileId);
      const updatedProject = {
        ...currentProject,
        files: currentProject.files.filter(f => f.id !== fileId)
      };
      setCurrentProject(updatedProject);
    } catch (error) {
      console.error('Failed to delete file:', error);
    }
  };

  const files = currentProject.files || [];
  const verilogFiles = files.filter(f => f.type === 'verilog');
  const testbenchFiles = files.filter(f => f.type === 'testbench');
  const memoryFiles = files.filter(f => f.type === 'memory');
  const otherFiles = files.filter(f => !['verilog', 'testbench', 'memory'].includes(f.type));

  return (
    <div className="h-full flex flex-col bg-muted/30 border-r border-border">
      <div className="p-2 border-b border-border flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Explorer
        </span>
        <div className="flex items-center gap-1">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6" 
            onClick={() => { setNewFileType('verilog'); setNewFileName(''); setNewFileOpen(true); }}
            title="New File"
          >
            <FilePlus className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="p-1">
          <div className="mb-2">
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 px-2 py-1 text-sm font-medium text-muted-foreground hover:text-foreground w-full"
            >
              {expanded ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
              <FolderOpen className="h-4 w-4 text-amber-500" />
              <span className="truncate">{currentProject.name}</span>
            </button>
            
            {expanded && (
              <div className="ml-4">
                {/* Design Files */}
                {verilogFiles.length > 0 && (
                  <div className="mb-1">
                    <div className="text-[10px] text-muted-foreground px-2 py-1 uppercase font-bold opacity-50">
                      Design
                    </div>
                    {verilogFiles.map((file) => (
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
                
                {/* Testbench Files */}
                {testbenchFiles.length > 0 && (
                  <div className="mb-1">
                    <div className="text-[10px] text-muted-foreground px-2 py-1 uppercase font-bold opacity-50">
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

                {/* Memory Files */}
                {memoryFiles.length > 0 && (
                  <div className="mb-1">
                    <div className="text-[10px] text-muted-foreground px-2 py-1 uppercase font-bold opacity-50">
                      Memory
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
                  <div className="mb-1">
                    <div className="text-[10px] text-muted-foreground px-2 py-1 uppercase font-bold opacity-50">
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
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create New File</DialogTitle>
            <DialogDescription>
              Add a new file to the project.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="fileType">File Type</Label>
              <Select value={newFileType} onValueChange={setNewFileType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="verilog">Verilog Module (.v)</SelectItem>
                  <SelectItem value="testbench">Testbench (.v)</SelectItem>
                  <SelectItem value="memory">Memory File (.mem)</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="fileName">File Name</Label>
              <Input
                id="fileName"
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                placeholder={
                  newFileType === 'testbench' ? 'module_tb' :
                  newFileType === 'memory' ? 'init_data' :
                  newFileType === 'other' ? 'readme.txt' :
                  'module_name'
                }
                autoFocus
                onKeyDown={(e) => { if (e.key === 'Enter') createFile(); }}
              />
              <p className="text-xs text-muted-foreground">
                Extension will be added automatically if not provided.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewFileOpen(false)}>
              Cancel
            </Button>
            <Button onClick={createFile} disabled={!newFileName.trim() || isCreating}>
              {isCreating ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Dialog */}
      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Rename File</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="renameValue">New Name</Label>
              <Input
                id="renameValue"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                autoFocus
                onKeyDown={(e) => { if (e.key === 'Enter') renameFile(); }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameOpen(false)}>
              Cancel
            </Button>
            <Button onClick={renameFile} disabled={!renameValue.trim()}>
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
        "flex items-center gap-2 px-2 py-1 text-sm w-full text-left rounded hover:bg-accent group cursor-pointer",
        isActive && "bg-accent text-accent-foreground"
      )}
    >
      {icon}
      <span className="truncate flex-1">{file.name}</span>
      <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
        <button 
          onClick={(e) => { e.stopPropagation(); onRename(file); }}
          className="p-1 hover:text-blue-500"
          title="Rename File"
        >
          <Edit2 className="h-3 w-3" />
        </button>
        <button 
          onClick={onDelete}
          className="p-1 hover:text-red-500"
          title="Delete File"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}
