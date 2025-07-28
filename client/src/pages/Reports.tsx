import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { FileText, Download, Search, Calendar, Trash2, Eye, ChevronDown } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

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

export default function Reports() {
  const [searchTerm, setSearchTerm] = useState("");
  const [reports, setReports] = useState<any[]>([]);
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      window.location.href = "/login";
    }
  }, [isAuthenticated, isLoading]);

  useEffect(() => {
    // Cargar reportes del historial
    const savedReports = JSON.parse(localStorage.getItem('reports') || '[]');
    
    // Si no hay reportes guardados, crear algunos de ejemplo
    if (savedReports.length === 0) {
      const mockReports = [
        {
          id: '1',
          fileName: 'application.log',
          analyzedAt: new Date(Date.now() - 86400000).toISOString(),
          totalErrors: 45,
          summary: { critical: 3, high: 12, medium: 20, low: 10 }
        },
        {
          id: '2',
          fileName: 'error.log',
          analyzedAt: new Date(Date.now() - 172800000).toISOString(),
          totalErrors: 23,
          summary: { critical: 1, high: 5, medium: 10, low: 7 }
        },
        {
          id: '3',
          fileName: 'access.log',
          analyzedAt: new Date(Date.now() - 259200000).toISOString(),
          totalErrors: 67,
          summary: { critical: 5, high: 18, medium: 25, low: 19 }
        }
      ];
      localStorage.setItem('reports', JSON.stringify(mockReports));
      setReports(mockReports);
    } else {
      setReports(savedReports.reverse()); // Mostrar los más recientes primero
    }
  }, []);

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

  const deleteReport = (reportId: string, fileName: string) => {
    const updatedReports = reports.filter(r => r.id !== reportId);
    setReports(updatedReports);
    localStorage.setItem('reports', JSON.stringify(updatedReports));
    
    toast({
      title: "Reporte eliminado",
      description: `El reporte de ${fileName} ha sido eliminado.`,
    });
  };

  const viewReport = (fileName: string) => {
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

  const getSeverityBadge = (type: string, count: number) => {
    if (count === 0) return null;
    
    const variants = {
      critical: 'destructive',
      high: 'secondary',
      medium: 'outline',
      low: 'default'
    } as const;
    
    return (
      <Badge variant={variants[type as keyof typeof variants] || 'default'} className="mr-1">
        {type}: {count}
      </Badge>
    );
  };

  const filteredReports = reports.filter(report =>
    report.fileName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading || !isAuthenticated) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Reportes de Análisis</h2>
            <p className="text-muted-foreground">Ver y descargar reportes detallados de análisis</p>
          </div>
          <div className="flex items-center space-x-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={16} />
              <Input
                placeholder="Buscar reportes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-64"
              />
            </div>
          </div>
        </div>

        {/* Reports Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredReports.map((report) => (
            <Card key={report.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center">
                    <FileText className="mr-2" size={20} />
                    {report.fileName}
                  </CardTitle>
                </div>
                <div className="flex items-center text-sm text-muted-foreground">
                  <Calendar className="mr-1" size={14} />
                  {new Date(report.analyzedAt).toLocaleDateString()}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium mb-2">Total Errores: {report.totalErrors}</p>
                    <div className="flex flex-wrap gap-1">
                      {getSeverityBadge('critical', report.summary.critical)}
                      {getSeverityBadge('high', report.summary.high)}
                      {getSeverityBadge('medium', report.summary.medium)}
                      {getSeverityBadge('low', report.summary.low)}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => viewReport(report.fileName)}
                        className="flex-1"
                      >
                        <Eye size={16} className="mr-1" />
                        Ver
                      </Button>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                          >
                            <Download size={16} className="mr-1" />
                            Descargar
                            <ChevronDown size={14} className="ml-1" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem onClick={() => downloadCSV(report.fileName)}>
                            <Download size={16} className="mr-2" />
                            Descargar CSV
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => downloadPDF(report.fileName)}>
                            <Download size={16} className="mr-2" />
                            Descargar PDF
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteReport(report.id, report.fileName)}
                      className="w-full text-destructive hover:text-destructive"
                    >
                      <Trash2 size={16} className="mr-1" />
                      Eliminar Reporte
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredReports.length === 0 && (
          <Card className="text-center py-12">
            <CardContent>
              <FileText className="mx-auto mb-4 text-muted-foreground" size={48} />
              <h3 className="text-lg font-semibold mb-2">No se encontraron reportes</h3>
              <p className="text-muted-foreground">
                {searchTerm ? 'No hay reportes que coincidan con tu búsqueda.' : 'Sube algunos archivos de log para generar reportes.'}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}