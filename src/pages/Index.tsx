
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building, Users, Clock, CheckCircle, Calendar, Activity, TrendingUp, PieChart, BarChart } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { 
  PieChart as RechartsPieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from "recharts";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";

// Small stat card component
const StatCard = ({ 
  title, 
  value, 
  icon: Icon, 
  iconColor = "bg-blue-100",
  iconTextColor = "text-blue-600",
  onClick,
  suffix = ""
}: { 
  title: string; 
  value: string | number; 
  icon: React.ElementType;
  iconColor?: string;
  iconTextColor?: string;
  onClick?: () => void;
  suffix?: string;
}) => (
  <Card 
    className="bg-white rounded-lg border hover:shadow-md transition-all cursor-pointer"
    onClick={onClick}
  >
    <CardContent className="p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
          <div className="flex items-baseline">
            <h3 className="text-2xl font-bold">{value}</h3>
            {suffix && <span className="ml-1 text-sm text-gray-500">{suffix}</span>}
          </div>
        </div>
        <div className={`p-2 rounded-full ${iconColor}`}>
          <Icon className={`h-6 w-6 ${iconTextColor}`} />
        </div>
      </div>
    </CardContent>
  </Card>
);

// Custom colors for the pie chart - Updated for Em Andamento to use soft green
const COLORS = ['#F2FCE2', '#F59E0B', '#3B82F6'];

// Time periods for the line chart dropdown
const TIME_PERIODS = [
  { label: "Últimos 6 meses", value: "6" },
  { label: "Último ano", value: "12" },
  { label: "Últimos 3 meses", value: "3" },
];

const Index = () => {
  const navigate = useNavigate();
  const [timePeriod, setTimePeriod] = useState("6");

  // Query to get total clients count
  const { data: clientsCount = 0, isLoading: isLoadingClients } = useQuery({
    queryKey: ['clientsCount'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        console.error('Error fetching clients count:', error);
        return 0;
      }

      return count || 0;
    }
  });

  // Query to get all projects count
  const { data: totalProjectsCount = 0, isLoading: isLoadingTotalProjects } = useQuery({
    queryKey: ['totalProjectsCount'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('projects')
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        console.error('Error fetching total projects count:', error);
        return 0;
      }

      return count || 0;
    }
  });

  // Query to get projects in progress count
  const { data: activeProjectsCount = 0, isLoading: isLoadingProjects } = useQuery({
    queryKey: ['activeProjectsCount'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('projects')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'iniciado');
      
      if (error) {
        console.error('Error fetching active projects count:', error);
        return 0;
      }

      return count || 0;
    }
  });

  // Query to get completed projects count
  const { data: completedProjectsCount = 0, isLoading: isLoadingCompletedProjects } = useQuery({
    queryKey: ['completedProjectsCount'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('projects')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'concluido');
      
      if (error) {
        console.error('Error fetching completed projects count:', error);
        return 0;
      }

      return count || 0;
    }
  });

  // Query to get paused projects count
  const { data: pausedProjectsCount = 0, isLoading: isLoadingPausedProjects } = useQuery({
    queryKey: ['pausedProjectsCount'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('projects')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pendente');
      
      if (error) {
        console.error('Error fetching paused projects count:', error);
        return 0;
      }

      return count || 0;
    }
  });

  // Query to get average project duration
  const { data: averageDuration = 0, isLoading: isLoadingDuration } = useQuery({
    queryKey: ['averageDuration'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('start_date, end_date')
        .not('end_date', 'is', null)
        .not('start_date', 'is', null);
      
      if (error || !data || data.length === 0) {
        console.error('Error fetching project duration:', error);
        return 0;
      }

      const durations = data.map(project => {
        const startDate = new Date(project.start_date);
        const endDate = new Date(project.end_date);
        const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24)); // days
      });

      const totalDuration = durations.reduce((sum, days) => sum + days, 0);
      return Math.round(totalDuration / durations.length);
    }
  });

  // Query to get average stages per project
  const { data: averageStages = 0, isLoading: isLoadingStages } = useQuery({
    queryKey: ['averageStages'],
    queryFn: async () => {
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('id');
      
      if (projectsError || !projectsData || projectsData.length === 0) {
        console.error('Error fetching projects:', projectsError);
        return 0;
      }

      const projectIds = projectsData.map(project => project.id);
      
      const { data: stagesData, error: stagesError } = await supabase
        .from('stages')
        .select('project_id');
      
      if (stagesError || !stagesData) {
        console.error('Error fetching stages:', stagesError);
        return 0;
      }

      // Count stages per project
      const stagesPerProject = projectIds.map(projectId => {
        return stagesData.filter(stage => stage.project_id === projectId).length;
      });

      const totalStages = stagesPerProject.reduce((sum, count) => sum + count, 0);
      return projectsData.length > 0 ? Math.round((totalStages / projectsData.length) * 10) / 10 : 0;
    }
  });

  // Calculate efficiency rate (projects completed on time)
  const { data: efficiencyRate = 0, isLoading: isLoadingEfficiency } = useQuery({
    queryKey: ['efficiencyRate'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('status', 'concluido')
        .not('end_date', 'is', null)
        .not('start_date', 'is', null);
      
      if (error || !data) {
        console.error('Error fetching completed projects:', error);
        return 0;
      }

      if (data.length === 0) return 0;

      // Count projects completed on time
      let completedOnTime = 0;
      data.forEach(project => {
        const plannedEndDate = new Date(project.end_date);
        const actualEndDate = new Date(project.updated_at);
        
        if (actualEndDate <= plannedEndDate) {
          completedOnTime++;
        }
      });

      return Math.round((completedOnTime / data.length) * 100);
    }
  });

  // Generate data for the line chart (projects started by month)
  const { data: projectsByMonth = [], isLoading: isLoadingProjectsByMonth } = useQuery({
    queryKey: ['projectsByMonth', timePeriod],
    queryFn: async () => {
      const months = parseInt(timePeriod);
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - months + 1);
      startDate.setDate(1);
      startDate.setHours(0, 0, 0, 0);
      
      const { data, error } = await supabase
        .from('projects')
        .select('created_at')
        .gte('created_at', startDate.toISOString());
      
      if (error || !data) {
        console.error('Error fetching projects by month:', error);
        return [];
      }

      // Generate array of month labels
      const monthLabels = [];
      for (let i = 0; i < months; i++) {
        const date = new Date();
        date.setMonth(date.getMonth() - (months - 1) + i);
        monthLabels.push({
          month: `${date.toLocaleDateString('pt-BR', { month: 'short' })}/${date.getFullYear().toString().slice(2)}`,
          date: new Date(date.getFullYear(), date.getMonth(), 1),
          count: 0
        });
      }

      // Count projects by month
      data.forEach(project => {
        const projectDate = new Date(project.created_at);
        const monthKey = `${projectDate.toLocaleDateString('pt-BR', { month: 'short' })}/${projectDate.getFullYear().toString().slice(2)}`;
        const monthItem = monthLabels.find(item => item.month === monthKey);
        if (monthItem) {
          monthItem.count++;
        }
      });

      return monthLabels.map(item => ({
        name: item.month.toLowerCase(),
        value: item.count
      }));
    }
  });

  // Data for the pie chart - Updated color for "Em Andamento" to soft green
  const projectStatusData = [
    { name: 'Em Andamento', value: activeProjectsCount, color: '#F2FCE2' },
    { name: 'Concluídas', value: completedProjectsCount, color: '#F59E0B' },
    { name: 'Pendentes', value: pausedProjectsCount, color: '#3B82F6' }
  ];

  // Navigation functions - Updating to ensure correct filter parameters
  const navigateToProjects = (status?: string) => {
    if (status) {
      navigate(`/obras?tab=list&status=${status}`);
    } else {
      navigate('/obras?tab=list');
    }
  };

  const navigateToClients = () => {
    navigate('/clientes/lista');
  };

  return (
    <Layout>
      <div className="w-full max-w-7xl mx-auto pb-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold">Dashboard</h2>
        </div>

        {/* Top row stat cards - Updating click handlers with correct status values */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-5">
          <StatCard
            title="Total de Obras"
            value={isLoadingTotalProjects ? "..." : totalProjectsCount.toString()}
            icon={Building}
            iconColor="bg-blue-100"
            iconTextColor="text-blue-600"
            onClick={() => navigateToProjects()}
          />
          <StatCard
            title="Obras Concluídas"
            value={isLoadingCompletedProjects ? "..." : completedProjectsCount.toString()}
            icon={CheckCircle}
            iconColor="bg-orange-100"
            iconTextColor="text-orange-600"
            onClick={() => navigateToProjects('concluido')}
          />
          <StatCard
            title="Em Andamento"
            value={isLoadingProjects ? "..." : activeProjectsCount.toString()}
            icon={Clock}
            iconColor="bg-green-100"
            iconTextColor="text-green-600"
            onClick={() => navigateToProjects('iniciado')}
          />
          <StatCard
            title="Obras Pendentes"
            value={isLoadingPausedProjects ? "..." : pausedProjectsCount.toString()}
            icon={Clock}
            iconColor="bg-blue-100"
            iconTextColor="text-blue-600"
            onClick={() => navigateToProjects('pendente')}
          />
        </div>

        {/* Middle row metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5">
          <StatCard
            title="Média de Duração das Obras"
            value={isLoadingDuration ? "..." : averageDuration.toString()}
            suffix="dias"
            icon={Calendar}
            iconColor="bg-gray-100"
            iconTextColor="text-gray-600"
          />
          <StatCard
            title="Média de Etapas por Obra"
            value={isLoadingStages ? "..." : averageStages.toString()}
            suffix="etapas"
            icon={Activity}
            iconColor="bg-gray-100"
            iconTextColor="text-gray-600"
          />
          <StatCard
            title="Taxa de Eficiência"
            value={isLoadingEfficiency ? "..." : `${efficiencyRate}%`}
            suffix="no prazo"
            icon={TrendingUp}
            iconColor="bg-gray-100"
            iconTextColor="text-gray-600"
          />
        </div>

        {/* Bottom row charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Project Status Pie Chart */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center">
                <PieChart className="h-5 w-5 mr-2 text-gray-500" />
                <CardTitle className="text-xl font-medium">Status das Obras</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      data={projectStatusData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {projectStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RechartsPieChart>
                </ResponsiveContainer>
                <div className="flex justify-center mt-2">
                  <div className="flex flex-wrap justify-center gap-4">
                    {projectStatusData.map((entry, index) => (
                      <div key={`legend-${index}`} className="flex items-center">
                        <div 
                          className="w-3 h-3 mr-2 rounded-sm" 
                          style={{ backgroundColor: entry.color }}
                        />
                        <span>{entry.name}</span>
                        <span className="ml-1 font-semibold">{entry.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Projects by Month Line Chart */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <BarChart className="h-5 w-5 mr-2 text-gray-500" />
                  <CardTitle className="text-xl font-medium">Obras Iniciadas por Mês</CardTitle>
                </div>
                <div className="w-40">
                  <Select
                    value={timePeriod}
                    onValueChange={setTimePeriod}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="Selecione o período" />
                    </SelectTrigger>
                    <SelectContent>
                      {TIME_PERIODS.map((period) => (
                        <SelectItem key={period.value} value={period.value}>
                          {period.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ChartContainer 
                className="h-[300px]" 
                config={{
                  line: {
                    theme: {
                      light: "#4F46E5",
                      dark: "#4F46E5",
                    },
                  },
                }}
              >
                <LineChart
                  data={projectsByMonth}
                  margin={{
                    top: 20,
                    right: 30,
                    left: 10,
                    bottom: 10,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12 }}
                    tickMargin={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12 }}
                    tickMargin={10}
                    domain={[0, 'auto']}
                  />
                  <ChartTooltip />
                  <Line
                    type="monotone"
                    dataKey="value"
                    strokeWidth={2}
                    dot={{ strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                  />
                </LineChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default Index;
