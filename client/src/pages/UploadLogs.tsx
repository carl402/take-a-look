import { useState, useRef, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileText, CheckCircle, AlertCircle, Loader2, Download, Trash2, Eye, ChevronDown } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";

interface UploadedFile {
  id?: string;
  name: string;
  size: number;
  status: 'uploading' | 'processing' | 'completed' | 'failed';
  progress: number;
  errorCount?: number;
}

// Generar datos simulados de análisis
const generateMockAnalysis = (fileName: string) => {
  const errors = [
    {
      type: 'Critical',
      code: '500',
      message: 'Internal Server Error',
      count: Math.floor(Math.random() * 10) + 1,
      suggestion: 'Check server logs and database connections. Verify application configuration and dependencies.'
    },
    {
      type: 'High',
      code: '404',
      message: 'Not Found',
      count: Math.floor(Math.random() * 20) + 5,
      suggestion: 'Review URL routing configuration. Check for broken links and missing resources.'
    },
    {
      type: 'Medium',
      code: '401',
      message: 'Unauthorized',
      count: Math.floor(Math.random() * 15) + 3,
      suggestion: 'Verify authentication mechanisms. Check token expiration and user permissions.'
    },
    {
      type: 'Low',
      code: '400',
      message: 'Bad Request',
      count: Math.floor(Math.random() * 8) + 2,
      suggestion: 'Validate input parameters. Improve client-side validation and error handling.'
    }
  ];

  return {
    fileName,
    analyzedAt: new Date().toISOString(),
    totalErrors: errors.reduce((sum, error) => sum + error.count, 0),
    errors,
    summary: {
      critical: errors.filter(e => e.type === 'Critical').reduce((sum, e) => sum + e.count, 0),
      high: errors.filter(e => e.type === 'High').reduce((sum, e) => sum + e.count, 0),
      medium: errors.filter(e => e.type === 'Medium').reduce((sum, e) => sum + e.count, 0),
      low: errors.filter(e => e.type === 'Low').reduce((sum, e) => sum + e.count, 0)
    }
  };
};

// Generar reporte CSV
const generateCSVReport = (fileName: string) => {
  const analysis = generateMockAnalysis(fileName);
  
  let csv = 'Error Type,Error Code,Message,Count,Suggestion\n';
  
  analysis.errors.forEach(error => {
    csv += `"${error.type}","${error.code}","${error.message}",${error.count},"${error.suggestion}"\n`;
  });
  
  csv += '\nSummary\n';
  csv += `Total Errors,${analysis.totalErrors}\n`;
  csv += `Critical,${analysis.summary.critical}\n`;
  csv += `High,${analysis.summary.high}\n`;
  csv += `Medium,${analysis.summary.medium}\n`;
  csv += `Low,${analysis.summary.low}\n`;
  
  return csv;
};

// Generar reporte PDF (HTML)
const generatePDFReport = (fileName: string) => {
  const analysis = generateMockAnalysis(fileName);
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Log Analysis Report - ${fileName}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { text-align: center; margin-bottom: 30px; }
        .summary { background: #f5f5f5; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
        .error-item { border: 1px solid #ddd; margin: 10px 0; padding: 15px; border-radius: 5px; }
        .critical { border-left: 5px solid #dc3545; }
        .high { border-left: 5px solid #fd7e14; }
        .medium { border-left: 5px solid #ffc107; }
        .low { border-left: 5px solid #28a745; }
        .error-type { font-weight: bold; color: #333; }
        .suggestion { background: #e9ecef; padding: 10px; margin-top: 10px; border-radius: 3px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Log Analysis Report</h1>
        <h2>${fileName}</h2>
        <p>Generated on: ${new Date().toLocaleString()}</p>
      </div>
      
      <div class="summary">
        <h3>Summary</h3>
        <p><strong>Total Errors:</strong> ${analysis.totalErrors}</p>
        <p><strong>Critical:</strong> ${analysis.summary.critical} | <strong>High:</strong> ${analysis.summary.high} | <strong>Medium:</strong> ${analysis.summary.medium} | <strong>Low:</strong> ${analysis.summary.low}</p>
      </div>
      
      <h3>Error Details</h3>
      ${analysis.errors.map(error => `
        <div class="error-item ${error.type.toLowerCase()}">
          <div class="error-type">${error.type} - ${error.code}: ${error.message}</div>
          <p><strong>Occurrences:</strong> ${error.count}</p>
          <div class="suggestion">
            <strong>Suggestion:</strong> ${error.suggestion}
          </div>
        </div>
      `).join('')}
    </body>
    </html>
  `;
};

export default function UploadLogs() {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      window.location.href = "/login";
    }
  }, [isAuthenticated, isLoading]);

  const saveToHistory = (fileName: string, analysis: any) => {
    const reports = JSON.parse(localStorage.getItem('reports') || '[]');
    const newReport = {
      id: Date.now().toString(),
      fileName,
      analyzedAt: new Date().toISOString(),
      totalErrors: analysis.totalErrors,
      summary: analysis.summary
    };
    reports.push(newReport);
    localStorage.setItem('reports', JSON.stringify(reports));
  };

  const checkFileExists = (fileName: string) => {
    const reports = JSON.parse(localStorage.getItem('reports') || '[]');
    return reports.find((report: any) => report.fileName === fileName);
  };

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const fileId = Date.now().toString();
      
      for (let progress = 0; progress <= 100; progress += 20) {
        await new Promise(resolve => setTimeout(resolve, 300));
        setUploadedFiles(prev =>
          prev.map(f =>
            f.name === file.name
              ? { ...f, progress, status: progress < 100 ? 'uploading' : 'processing' }
              : f
          )
        );
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return { id: fileId, fileName: file.name };
    },
    onSuccess: (response, file) => {
      const analysis = generateMockAnalysis(file.name);
      
      // Guardar en historial
      saveToHistory(file.name, analysis);
      
      setUploadedFiles(prev =>
        prev.map(f =>
          f.name === file.name
            ? { 
                ...f, 
                id: response.id, 
                status: 'completed', 
                progress: 100,
                errorCount: analysis.totalErrors
              }
            : f
        )
      );
      
      toast({
        title: "Archivo analizado exitosamente",
        description: `${file.name} procesado. Se encontraron ${analysis.totalErrors} errores.`,
      });
    },
    onError: (error, file) => {
      setUploadedFiles(prev =>
        prev.map(f =>
          f.name === file.name
            ? { ...f, status: 'failed', progress: 0 }
            : f
        )
      );
      
      toast({
        title: "Error en la carga",
        description: "Error al cargar y analizar el archivo",
        variant: "destructive",
      });
    },
  });

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const existingReport = checkFileExists(file.name);
      
      if (existingReport) {
        toast({
          title: "Archivo ya analizado",
          description: `${file.name} fue procesado el ${new Date(existingReport.analyzedAt).toLocaleDateString('es-ES')}. Elige una opción:`,
          action: (
            <div className="flex space-x-2">
              <Button 
                size="sm" 
                onClick={() => {
                  viewReport(existingReport.fileName);
                }}
              >
                Ver reporte anterior
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => {
                  const newFileName = file.name.includes('.') 
                    ? file.name.replace(/\.([^.]+)$/, '_nuevo.$1')
                    : file.name + '_nuevo';
                  
                  const fileData: UploadedFile = {
                    id: Date.now().toString(),
                    name: newFileName,
                    size: file.size,
                    status: 'uploading',
                    progress: 0,
                  };
                  setUploadedFiles([fileData]);
                  
                  // Crear nuevo archivo con nombre modificado
                  const newFile = new File([file], newFileName, { type: file.type });
                  uploadMutation.mutate(newFile);
                }}
              >
                Analizar de nuevo
              </Button>
            </div>
          ),
          duration: 10000,
        });
        return;
      }
      
      const fileData: UploadedFile = {
        id: Date.now().toString(),
        name: file.name,
        size: file.size,
        status: 'uploading',
        progress: 0,
      };
      setUploadedFiles([fileData]);
      uploadMutation.mutate(file);
    }
  };

  const downloadCSV = (fileName: string) => {
    const csv = generateCSVReport(fileName);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName}_analysis_report.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    toast({
      title: "Reporte CSV Descargado",
      description: `El reporte de ${fileName} ha sido descargado.`,
    });
  };

  const downloadPDF = (fileName: string) => {
    const htmlContent = generatePDFReport(fileName);
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
        }, 500);
      };
    }
    
    toast({
      title: "Reporte PDF Generado",
      description: `El reporte de ${fileName} está listo para imprimir/guardar.`,
    });
  };

  const deleteFile = (fileId: string, fileName: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
    
    // También eliminar del historial
    const reports = JSON.parse(localStorage.getItem('reports') || '[]');
    const updatedReports = reports.filter((report: any) => report.fileName !== fileName);
    localStorage.setItem('reports', JSON.stringify(updatedReports));
    
    toast({
      title: "Archivo eliminado",
      description: `${fileName} ha sido eliminado.`,
    });
  };

  const viewReport = (fileName: string) => {
    const analysis = generateMockAnalysis(fileName);
    const htmlContent = generatePDFReport(fileName);
    
    const reportWindow = window.open('', '_blank');
    if (reportWindow) {
      reportWindow.document.write(htmlContent);
      reportWindow.document.close();
    }
    
    toast({
      title: "Reporte Abierto",
      description: `Visualizando reporte de análisis para ${fileName}.`,
    });
  };

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
            <Upload className="text-primary animate-pulse" size={32} />
          </div>
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        <Card className="mb-8">
          <CardContent className="p-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Upload className="text-primary" size={32} />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">Subir Archivos de Log</h2>
              <p className="text-muted-foreground">
                Sube archivos .log o .txt para análisis.
              </p>
            </div>

            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <div className="space-y-4">
                <Upload className="mx-auto text-muted-foreground" size={48} />
                <div>
                  <p className="text-lg font-medium text-foreground">Selecciona archivos para subir</p>
                  <p className="text-muted-foreground">Formatos soportados: .log, .txt</p>
                </div>
                <Button onClick={() => fileInputRef.current?.click()}>
                  Seleccionar Archivos
                </Button>
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".log,.txt"
              onChange={handleFileInput}
              className="hidden"
            />
          </CardContent>
        </Card>

        {uploadedFiles.length > 0 && (
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4">Archivos Subidos</h3>
              <div className="space-y-3">
                {uploadedFiles.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-muted rounded-lg">
                    <div className="flex items-center space-x-3">
                      <FileText size={20} />
                      <div>
                        <p className="font-medium">{file.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {file.status === 'completed' && file.errorCount 
                            ? `Análisis completo - ${file.errorCount} errores encontrados`
                            : file.status === 'processing' 
                            ? 'Analizando archivo...' 
                            : file.status === 'uploading'
                            ? 'Subiendo...'
                            : file.status
                          }
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {file.status === 'uploading' && (
                        <Progress value={file.progress} className="w-32" />
                      )}
                      {file.status === 'completed' && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => viewReport(file.name)}
                            title="Ver Reporte"
                          >
                            <Eye size={16} className="mr-1" />
                            Ver
                          </Button>
                          
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                title="Descargar Reporte"
                              >
                                <Download size={16} className="mr-1" />
                                Descargar
                                <ChevronDown size={14} className="ml-1" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuItem onClick={() => downloadCSV(file.name)}>
                                <Download size={16} className="mr-2" />
                                Descargar CSV
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => downloadPDF(file.name)}>
                                <Download size={16} className="mr-2" />
                                Descargar PDF
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteFile(file.id!, file.name)}
                            title="Eliminar Archivo"
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 size={16} />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}