import { useState, useRef, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Upload, FileText, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { isUnauthorizedError } from "@/lib/authUtils";

interface UploadedFile {
  name: string;
  size: number;
  status: 'uploading' | 'processing' | 'completed' | 'failed';
  progress: number;
  errorCount?: number;
}

export default function UploadLogs() {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isAuthenticated, isLoading } = useAuth();

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      return await apiRequest('POST', '/api/logs/upload', formData);
    },
    onSuccess: (response, file) => {
      setUploadedFiles(prev => 
        prev.map(f => 
          f.name === file.name 
            ? { ...f, status: 'completed', progress: 100 }
            : f
        )
      );
      toast({
        title: "File uploaded successfully",
        description: `${file.name} has been processed and analyzed.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/logs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
    },
    onError: (error, file) => {
      if (isUnauthorizedError(error as Error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }

      setUploadedFiles(prev => 
        prev.map(f => 
          f.name === file.name 
            ? { ...f, status: 'failed', progress: 0 }
            : f
        )
      );
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload file",
        variant: "destructive",
      });
    },
  });

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      handleFiles(files);
    }
  };

  const handleFiles = (files: File[]) => {
    const validFiles = files.filter(file => {
      const ext = file.name.toLowerCase().split('.').pop();
      return ext === 'log' || ext === 'txt';
    });

    if (validFiles.length !== files.length) {
      toast({
        title: "Invalid file type",
        description: "Only .log and .txt files are supported",
        variant: "destructive",
      });
    }

    validFiles.forEach(file => {
      const fileData: UploadedFile = {
        name: file.name,
        size: file.size,
        status: 'uploading',
        progress: 0,
      };

      setUploadedFiles(prev => [...prev, fileData]);
      uploadMutation.mutate(file);
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'uploading':
      case 'processing':
        return <Loader2 className="animate-spin text-warning" size={20} />;
      case 'completed':
        return <CheckCircle className="text-success" size={20} />;
      case 'failed':
        return <AlertCircle className="text-destructive" size={20} />;
      default:
        return <FileText className="text-muted-foreground" size={20} />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'uploading':
        return <span className="status-badge processing">Uploading</span>;
      case 'processing':
        return <span className="status-badge processing">Processing</span>;
      case 'completed':
        return <span className="status-badge completed">Success</span>;
      case 'failed':
        return <span className="status-badge failed">Failed</span>;
      default:
        return null;
    }
  };

  if (isLoading || !isAuthenticated) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        {/* Upload Form */}
        <Card className="mb-8">
          <CardContent className="p-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Upload className="text-primary" size={32} />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">Upload Log Files</h2>
              <p className="text-muted-foreground">
                Upload .log or .txt files for analysis. Files are validated for duplicates and processed automatically.
              </p>
            </div>

            {/* File Upload Zone */}
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer
                ${dragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}
              `}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="space-y-4">
                <div className="flex justify-center">
                  <Upload className="text-muted-foreground" size={48} />
                </div>
                <div>
                  <p className="text-lg font-medium text-foreground">Drag and drop files here</p>
                  <p className="text-muted-foreground">or click to browse</p>
                </div>
                <div className="flex justify-center">
                  <Button>Choose Files</Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  Supported formats: .log, .txt (Max 10MB per file)
                </p>
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".log,.txt"
              onChange={handleFileInput}
              className="hidden"
            />
          </CardContent>
        </Card>

        {/* File List */}
        {uploadedFiles.length > 0 && (
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">Uploaded Files</h3>
              <div className="space-y-3">
                {uploadedFiles.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-muted rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-card rounded-lg flex items-center justify-center">
                        {getStatusIcon(file.status)}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{file.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatFileSize(file.size)} • {file.status === 'processing' ? 'Processing...' : file.status}
                        </p>
                        {(file.status === 'uploading' || file.status === 'processing') && (
                          <Progress value={file.progress} className="w-32 h-2 mt-1" />
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {getStatusBadge(file.status)}
                      {file.status === 'completed' && (
                        <Button variant="ghost" size="sm">
                          <FileText size={16} />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Processing Settings */}
        <Card className="mt-6 border-l-4 border-l-primary bg-primary/5">
          <CardContent className="p-6">
            <h4 className="font-semibold text-primary mb-3">Processing Options</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="flex items-center space-x-2">
                <input type="checkbox" className="rounded border-input" defaultChecked />
                <span className="text-sm">Real-time error detection</span>
              </label>
              <label className="flex items-center space-x-2">
                <input type="checkbox" className="rounded border-input" defaultChecked />
                <span className="text-sm">Send Telegram notifications</span>
              </label>
              <label className="flex items-center space-x-2">
                <input type="checkbox" className="rounded border-input" />
                <span className="text-sm">Generate PDF report</span>
              </label>
              <label className="flex items-center space-x-2">
                <input type="checkbox" className="rounded border-input" />
                <span className="text-sm">Archive original files</span>
              </label>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
