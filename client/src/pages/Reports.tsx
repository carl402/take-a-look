import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, Download, Printer, Eye, Lightbulb } from "lucide-react";
import ErrorResolutionSuggestions from "@/components/ErrorResolutionSuggestions";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";

export default function Reports() {
  const [searchTerm, setSearchTerm] = useState("");
  const [errorTypeFilter, setErrorTypeFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("7");
  const { isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();

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

  const { data: logs, isLoading: logsLoading, error } = useQuery({
    queryKey: ["/api/logs"],
    enabled: isAuthenticated,
  });

  useEffect(() => {
    if (error && isUnauthorizedError(error as Error)) {
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
  }, [error, toast]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'processing':
        return <Badge variant="secondary" className="status-badge processing">Processing</Badge>;
      case 'completed':
        return <Badge variant="secondary" className="status-badge completed">Processed</Badge>;
      case 'failed':
        return <Badge variant="secondary" className="status-badge failed">Failed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getErrorCountBadge = (count: number) => {
    if (count === 0) return null;
    if (count > 50) {
      return <span className="error-badge critical">{count} errors</span>;
    } else if (count > 10) {
      return <span className="error-badge high">{count} errors</span>;
    } else {
      return <span className="error-badge medium">{count} errors</span>;
    }
  };

  if (isLoading || !isAuthenticated) {
    return (
      <div className="p-6">
        <Skeleton className="h-8 w-64 mb-6" />
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      </div>
    );
  }

  // Show empty state if no logs
  if (!logsLoading && (!logs || (logs as any[])?.length === 0)) {
    return (
      <div className="p-6">
        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Filter Reports</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Date Range</label>
                <Select value={dateFilter} onValueChange={setDateFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">Last 7 days</SelectItem>
                    <SelectItem value="30">Last 30 days</SelectItem>
                    <SelectItem value="90">Last 3 months</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Error Type</label>
                <Select value={errorTypeFilter} onValueChange={setErrorTypeFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All errors</SelectItem>
                    <SelectItem value="404">404 - Not Found</SelectItem>
                    <SelectItem value="500">500 - Server Error</SelectItem>
                    <SelectItem value="401">401 - Unauthorized</SelectItem>
                    <SelectItem value="403">403 - Forbidden</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">File Name</label>
                <Input
                  placeholder="Search files..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex items-end">
                <Button className="w-full">Apply Filters</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Empty State */}
        <Card>
          <CardContent className="text-center py-16">
            <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center mx-auto mb-4">
              <FileText className="text-muted-foreground" size={32} />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">No Reports Yet</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Upload your first log file to start analyzing errors and generating reports.
            </p>
            <Button onClick={() => window.location.href = "/upload"}>
              Upload Your First Log File
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filter Reports</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Date Range</label>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="90">Last 3 months</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Error Type</label>
              <Select value={errorTypeFilter} onValueChange={setErrorTypeFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All errors</SelectItem>
                  <SelectItem value="404">404 - Not Found</SelectItem>
                  <SelectItem value="500">500 - Server Error</SelectItem>
                  <SelectItem value="401">401 - Unauthorized</SelectItem>
                  <SelectItem value="403">403 - Forbidden</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">File Name</label>
              <Input
                placeholder="Search files..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button className="w-full">Apply Filters</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reports Table */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Log Analysis Reports</CardTitle>
            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="sm">
                <Download size={16} />
              </Button>
              <Button variant="ghost" size="sm">
                <Printer size={16} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {logsLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      File Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Upload Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Errors Found
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-card divide-y divide-border">
                  {logs?.map((log: any) => (
                    <tr key={log.id} className="hover:bg-muted/50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <FileText className="text-muted-foreground mr-3" size={18} />
                          <div>
                            <div className="text-sm font-medium text-foreground">{log.fileName}</div>
                            <div className="text-sm text-muted-foreground">{formatFileSize(log.fileSize)}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                        {formatDate(log.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getErrorCountBadge(log.errorCount || 0)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(log.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                        <div className="flex items-center space-x-2">
                          <Button variant="ghost" size="sm" title="View Details">
                            <Eye size={16} />
                          </Button>
                          <Button variant="ghost" size="sm" title="View Suggestions">
                            <Lightbulb size={16} />
                          </Button>
                          <Button variant="ghost" size="sm" title="Download">
                            <Download size={16} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Error Resolution Suggestions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ErrorResolutionSuggestions
          errorType="404"
          suggestions={[
            "Check for broken internal links and fix them",
            "Implement proper redirects for moved or deleted content",
            "Create custom 404 error pages with helpful navigation",
            "Review and update your sitemap",
            "Set up monitoring for frequently accessed missing resources",
          ]}
        />
        <ErrorResolutionSuggestions
          errorType="500"
          suggestions={[
            "Review server error logs for detailed stack traces",
            "Check database connectivity and query performance",
            "Monitor server resource usage (CPU, memory, disk)",
            "Implement proper error handling in application code",
            "Set up automated alerting for server errors",
          ]}
        />
      </div>
    </div>
  );
}
