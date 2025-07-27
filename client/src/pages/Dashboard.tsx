import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, AlertTriangle, Clock, CheckCircle, Upload, Download, Send, Settings as SettingsIcon } from "lucide-react";
import Chart from "chart.js/auto";
import ErrorResolutionSuggestions from "@/components/ErrorResolutionSuggestions";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useEffect as useEffectAuth } from "react";

export default function Dashboard() {
  const { isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const errorTypesRef = useRef<HTMLCanvasElement>(null);
  const timelineRef = useRef<HTMLCanvasElement>(null);
  const errorTypesChart = useRef<Chart | null>(null);
  const timelineChart = useRef<Chart | null>(null);

  // Redirect to home if not authenticated
  useEffectAuth(() => {
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

  const { data: stats, isLoading: statsLoading, error } = useQuery({
    queryKey: ["/api/dashboard/stats"],
    enabled: isAuthenticated,
  }) as { data: any, isLoading: boolean, error: any };

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

  useEffect(() => {
    if (stats && errorTypesRef.current && timelineRef.current) {
      // Initialize Error Types Chart
      if (errorTypesChart.current) {
        errorTypesChart.current.destroy();
      }
      
      errorTypesChart.current = new Chart(errorTypesRef.current, {
        type: 'doughnut',
        data: {
          labels: stats.errorDistribution?.map((item: any) => item.errorType) || [],
          datasets: [{
            data: stats.errorDistribution?.map((item: any) => item.count) || [],
            backgroundColor: [
              'hsl(0, 84%, 60%)',
              'hsl(38, 92%, 50%)',
              'hsl(246, 83%, 58%)',
              'hsl(271, 91%, 65%)',
              'hsl(215, 20%, 65%)',
            ],
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom',
            },
          },
        },
      });

      // Initialize Timeline Chart
      if (timelineChart.current) {
        timelineChart.current.destroy();
      }

      timelineChart.current = new Chart(timelineRef.current, {
        type: 'line',
        data: {
          labels: stats.errorTrends?.map((item: any) => item.date) || [],
          datasets: [{
            label: 'Errors',
            data: stats.errorTrends?.map((item: any) => item.count) || [],
            borderColor: 'hsl(246, 83%, 58%)',
            backgroundColor: 'hsla(246, 83%, 58%, 0.1)',
            tension: 0.1,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true,
            },
          },
        },
      });
    }

    return () => {
      if (errorTypesChart.current) {
        errorTypesChart.current.destroy();
      }
      if (timelineChart.current) {
        timelineChart.current.destroy();
      }
    };
  }, [stats]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  const errorSuggestions = [
    "Implement proper 404 error pages for missing resources",
    "Add error monitoring for 500 server errors",
    "Review authentication flows for 401 errors",
    "Set up automated alerting for critical errors",
  ];

  return (
    <div className="p-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="stat-card">
          <CardContent className="flex items-center p-6">
            <div className="p-3 bg-primary/10 rounded-lg">
              <FileText className="text-primary" size={24} />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">Total Log Files</p>
              <p className="text-3xl font-bold text-foreground">
                {statsLoading ? <Skeleton className="h-8 w-16" /> : stats?.totalFiles || 0}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="stat-card">
          <CardContent className="flex items-center p-6">
            <div className="p-3 bg-destructive/10 rounded-lg">
              <AlertTriangle className="text-destructive" size={24} />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">Errors Detected</p>
              <p className="text-3xl font-bold text-foreground">
                {statsLoading ? <Skeleton className="h-8 w-16" /> : stats?.totalErrors || 0}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="stat-card">
          <CardContent className="flex items-center p-6">
            <div className="p-3 bg-warning/10 rounded-lg">
              <Clock className="text-warning" size={24} />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">Processing Time</p>
              <p className="text-3xl font-bold text-foreground">2.3s</p>
            </div>
          </CardContent>
        </Card>

        <Card className="stat-card">
          <CardContent className="flex items-center p-6">
            <div className="p-3 bg-success/10 rounded-lg">
              <CheckCircle className="text-success" size={24} />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">Success Rate</p>
              <p className="text-3xl font-bold text-foreground">
                {statsLoading ? <Skeleton className="h-8 w-16" /> : `${stats?.successRate?.toFixed(1) || 0}%`}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Error Types Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Error Distribution</span>
              <div className="text-primary cursor-pointer" title="Common error types found in logs">
                ℹ️
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-64" />
            ) : (
              <>
                <div className="h-64">
                  <canvas ref={errorTypesRef}></canvas>
                </div>
                <ErrorResolutionSuggestions 
                  errorType="404" 
                  suggestions={errorSuggestions}
                />
              </>
            )}
          </CardContent>
        </Card>

        {/* Timeline Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Error Trends (Last 7 Days)</span>
              <select className="text-sm border border-input rounded-md px-3 py-1">
                <option>Last 7 days</option>
                <option>Last 30 days</option>
                <option>Last 3 months</option>
              </select>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-64" />
            ) : (
              <div className="h-64">
                <canvas ref={timelineRef}></canvas>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Recent Activity</span>
                <Button variant="ghost" size="sm" className="text-primary">
                  View All
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center space-x-4 p-3 hover:bg-muted rounded-lg">
                  <div className="w-10 h-10 bg-destructive/10 rounded-lg flex items-center justify-center">
                    <AlertTriangle className="text-destructive" size={18} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">
                      High error rate detected in production.log
                    </p>
                    <p className="text-xs text-muted-foreground">
                      2 minutes ago • 45 errors found
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" className="text-primary">
                    View
                  </Button>
                </div>

                <div className="flex items-center space-x-4 p-3 hover:bg-muted rounded-lg">
                  <div className="w-10 h-10 bg-success/10 rounded-lg flex items-center justify-center">
                    <Upload className="text-success" size={18} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">
                      New log file uploaded: api-access.log
                    </p>
                    <p className="text-xs text-muted-foreground">
                      15 minutes ago • Processed successfully
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" className="text-primary">
                    View
                  </Button>
                </div>

                <div className="flex items-center space-x-4 p-3 hover:bg-muted rounded-lg">
                  <div className="w-10 h-10 bg-warning/10 rounded-lg flex items-center justify-center">
                    <Send className="text-warning" size={18} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">
                      Telegram notification sent
                    </p>
                    <p className="text-xs text-muted-foreground">
                      1 hour ago • Critical errors report
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" className="text-primary">
                    View
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Button className="w-full" size="lg">
                <Upload className="mr-2" size={18} />
                Upload New Log
              </Button>

              <Button variant="outline" className="w-full" size="lg">
                <Download className="mr-2" size={18} />
                Export Report
              </Button>

              <Button variant="outline" className="w-full" size="lg">
                <Send className="mr-2" size={18} />
                Send to Telegram
              </Button>

              <Button variant="outline" className="w-full" size="lg">
                <SettingsIcon className="mr-2" size={18} />
                Configure Alerts
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
