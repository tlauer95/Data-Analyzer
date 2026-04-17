import React, { useState, useMemo } from 'react';
import { Upload, FileText, Users, CheckCircle, Clock, MapPin, BarChart3, ChevronRight, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { processCSV, calculateStats } from './lib/data-processor';
import { Candidate, Category } from './types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { Badge } from './components/ui/badge';
import { ScrollArea } from './components/ui/scroll-area';
import { Progress } from './components/ui/progress';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
  ScatterChart,
  Scatter,
  ZAxis
} from 'recharts';

const COLORS = ['#141414', '#5A5A40', '#F27D26', '#8E9299', '#D1D1D1'];

export default function App() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<Category | 'All'>('All');

  const filteredCandidates = useMemo(() => {
    if (selectedCategory === 'All') return candidates;
    return candidates.filter(c => c.category === selectedCategory);
  }, [candidates, selectedCategory]);

  const stats = useMemo(() => (filteredCandidates.length > 0 ? calculateStats(filteredCandidates) : null), [filteredCandidates]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setError(null);
    try {
      const result = await processCSV(file);
      if (result.length === 0) {
        setError('No valid candidate data found. Please check if the CSV headers match the expected format (Employee email, Region, Task, etc.).');
        setCandidates([]);
      } else {
        setCandidates(result);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to process CSV file. An error occurred during parsing.');
    } finally {
      setIsProcessing(false);
    }
  };

  const categoryData = useMemo(() => {
    if (!stats) return [];
    return (Object.entries(stats.categoryStats) as [Category, { count: number; completeCount: number }][]).map(([name, data]) => ({
      name,
      value: data.count,
      complete: data.completeCount
    })).filter(d => d.value > 0);
  }, [stats]);

  const regionData = useMemo(() => {
    if (!stats) return [];
    return (Object.entries(stats.regionStats) as [string, { count: number; completeCount: number }][])
      .map(([name, data]) => ({
        name,
        value: data.count,
        complete: data.completeCount
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [stats]);

  const taskTimeData = useMemo(() => {
    if (!stats) return { newHire: [], internal: [] };
    const allTasks = (Object.entries(stats.taskStats) as [string, { avgCompletionTimeDays: number; totalCompleted: number; type: string }][])
      .map(([name, data]) => ({
        name: name.length > 20 ? name.substring(0, 20) + '...' : name,
        fullName: name,
        days: data.avgCompletionTimeDays,
        count: data.totalCompleted,
        type: data.type
      }))
      .sort((a, b) => b.days - a.days);

    return {
      newHire: allTasks.filter(t => t.type === 'New Hire Task'),
      internal: allTasks.filter(t => t.type === 'Internal Task')
    };
  }, [stats]);

  const taskTypeData = useMemo(() => {
    if (!stats) return [];
    return (Object.entries(stats.taskTypeStats) as [string, { count: number; completeCount: number }][]).map(([name, data]) => ({
      name,
      value: data.count,
      complete: data.completeCount
    })).sort((a, b) => b.value - a.value);
  }, [stats]);

  const jobTitleData = useMemo(() => {
    if (!stats) return [];
    return (Object.entries(stats.jobTitleStats) as [string, { count: number; completeCount: number }][])
      .map(([name, data]) => ({
        name,
        value: data.count,
        complete: data.completeCount
      }))
      .filter(item => {
        // Exclude Summer Camp Directors from Summer Staff view
        if (selectedCategory === 'Summer Staff') {
          const lowerName = item.name.toLowerCase();
          return !lowerName.includes('camp director');
        }
        // For HQ, only include HQ Seasonal and HQ FT YR
        if (selectedCategory === 'HQ') {
          const lowerName = item.name.toLowerCase();
          return lowerName.includes('hq seasonal') || lowerName.includes('hq ft yr');
        }
        return true;
      })
      .sort((a, b) => b.value - a.value);
  }, [stats, selectedCategory]);

  const tenureData = useMemo(() => {
    if (!stats) return [];
    return (Object.entries(stats.tenureStats) as [string, { count: number; completeCount: number }][]).map(([name, data]) => ({
      name,
      value: data.count,
      complete: data.completeCount
    })).sort((a, b) => b.value - a.value);
  }, [stats]);

  if (candidates.length === 0) {
    return (
      <div className="min-h-screen bg-[#E4E3E0] flex items-center justify-center p-6 font-sans">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full"
        >
          <Card className="border-2 border-[#141414] shadow-none bg-white">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto w-16 h-16 bg-[#141414] rounded-full flex items-center justify-center mb-4">
                <FileText className="text-white w-8 h-8" />
              </div>
              <CardTitle className="text-2xl font-serif italic">Onboarding Analyzer</CardTitle>
              <CardDescription>Upload your report to begin analysis</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="relative group">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    disabled={isProcessing}
                  />
                  <div className={`
                    border-2 border-dashed border-[#8E9299] rounded-lg p-8 text-center
                    transition-all duration-200 group-hover:border-[#141414] group-hover:bg-[#f5f5f5]
                    ${isProcessing ? 'opacity-50' : ''}
                  `}>
                    <Upload className="mx-auto w-8 h-8 text-[#8E9299] mb-2 group-hover:text-[#141414]" />
                    <p className="text-sm font-medium text-[#141414]">
                      {isProcessing ? 'Processing...' : 'Click or drag CSV file'}
                    </p>
                    <p className="text-xs text-[#8E9299] mt-1">Report with columns G, R, T, U, V, Y, Z</p>
                  </div>
                </div>
                {error && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-md text-sm">
                    <AlertCircle className="w-4 h-4" />
                    <span>{error}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  const activeCandidatesCount = stats ? stats.totalUniqueCandidates - stats.resignedRescindedCount : 0;
  const totalComplete = stats ? (Object.values(stats.categoryStats) as { count: number; completeCount: number }[]).reduce((acc, curr) => acc + curr.completeCount, 0) : 0;
  const completionRate = stats ? Math.round((totalComplete / (activeCandidatesCount || 1)) * 100) : 0;

  return (
    <div className="min-h-screen bg-[#E4E3E0] text-[#141414] font-sans p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#141414] pb-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className="border-[#141414] text-[#141414] rounded-none px-2 py-0">LIVE REPORT</Badge>
              <span className="text-xs font-mono opacity-60 uppercase tracking-widest">System Status: Active</span>
            </div>
            <h1 className="text-5xl font-serif italic tracking-tight">Onboarding Dashboard</h1>
            <div className="flex flex-wrap items-center gap-2 mt-4">
              {['All', 'Summer Staff', 'HQ', 'Camp Director'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat as any)}
                  className={`px-3 py-1 text-[10px] font-mono uppercase tracking-widest border transition-all ${
                    selectedCategory === cat 
                      ? 'bg-[#141414] text-white border-[#141414]' 
                      : 'border-[#141414]/20 hover:border-[#141414] opacity-60 hover:opacity-100'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
            <p className="text-[#8E9299] mt-4 font-mono text-sm uppercase tracking-wider">
              Analyzing {filteredCandidates.length} {selectedCategory !== 'All' ? selectedCategory : ''} candidates
            </p>
          </div>
          <button 
            onClick={() => setCandidates([])}
            className="px-4 py-2 border border-[#141414] hover:bg-[#141414] hover:text-white transition-colors font-mono text-xs uppercase tracking-widest"
          >
            Upload New File
          </button>
        </header>

        {/* Top Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Candidates', value: stats?.totalUniqueCandidates, icon: Users },
            { label: 'Fully Complete', value: totalComplete, icon: CheckCircle },
            { label: 'Avg Completion', value: `${completionRate}%`, icon: BarChart3 },
            { label: 'Resigned/Rescinded Staff', value: stats?.resignedRescindedCount, icon: MapPin },
          ].map((stat, i) => (
            <Card key={i} className="border border-[#141414] shadow-none rounded-none bg-white">
              <CardContent className="p-6 flex items-center justify-between">
                <div>
                  <p className="text-xs font-mono uppercase text-[#8E9299] mb-1">{stat.label}</p>
                  <p className="text-3xl font-serif italic">{stat.value}</p>
                </div>
                <stat.icon className="w-8 h-8 opacity-20" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="bg-transparent border-b border-[#141414] rounded-none h-auto p-0 gap-8">
            {['overview', 'time', 'regions'].map((tab) => (
              <TabsTrigger 
                key={tab}
                value={tab}
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#141414] data-[state=active]:bg-transparent px-0 py-2 text-xs font-mono uppercase tracking-widest"
              >
                {tab}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className={`grid grid-cols-1 ${selectedCategory === 'HQ' ? '' : 'lg:grid-cols-2'} gap-6`}>
              <Card className="border border-[#141414] shadow-none rounded-none bg-white">
                <CardHeader>
                  <CardTitle className="font-serif italic text-xl">
                    {selectedCategory === 'Summer Staff' || selectedCategory === 'HQ' ? 'Job Title Distribution' : 'Candidate Distribution'}
                  </CardTitle>
                  <CardDescription className="font-mono text-xs uppercase">
                    {selectedCategory === 'Summer Staff' || selectedCategory === 'HQ' ? 'By Normalized Job Title' : 'By Requisition Category'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={selectedCategory === 'Summer Staff' || selectedCategory === 'HQ' ? jobTitleData : categoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {(selectedCategory === 'Summer Staff' || selectedCategory === 'HQ' ? jobTitleData : categoryData).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#141414', color: '#fff', border: 'none', borderRadius: '0' }}
                        itemStyle={{ color: '#fff' }}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {selectedCategory !== 'HQ' && (
                <Card className="border border-[#141414] shadow-none rounded-none bg-white">
                  <CardHeader>
                    <CardTitle className="font-serif italic text-xl">
                      {selectedCategory === 'Summer Staff' ? 'Tenure Breakdown' : 'Category Breakdown'}
                    </CardTitle>
                    <CardDescription className="font-mono text-xs uppercase">
                      {selectedCategory === 'Summer Staff' ? 'First Year vs Alumni' : 'Counts and Completion Rates'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {(selectedCategory === 'Summer Staff' ? tenureData : categoryData).map((item, i) => (
                        <div key={i} className="space-y-2">
                          <div className="flex justify-between text-sm font-mono uppercase">
                            <span>{item.name}</span>
                            <span className="opacity-60">{item.complete} / {item.value} Complete</span>
                          </div>
                          <Progress 
                            value={(item.complete / item.value) * 100} 
                            className="h-2 rounded-none bg-[#E4E3E0]"
                          />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card className="border border-[#141414] shadow-none rounded-none bg-white lg:col-span-2">
                <CardHeader>
                  <CardTitle className="font-serif italic text-xl">Task Type Breakdown</CardTitle>
                  <CardDescription className="font-mono text-xs uppercase">New Hire vs Internal Tasks</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {taskTypeData.map((type, i) => (
                      <div key={i} className="space-y-4">
                        <div className="flex items-end justify-between">
                          <div>
                            <p className="text-xs font-mono uppercase text-[#8E9299] mb-1">Type</p>
                            <p className="text-2xl font-serif italic">{type.name}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-mono uppercase text-[#8E9299] mb-1">Completion</p>
                            <p className="text-xl font-serif italic">{Math.round((type.complete / type.value) * 100)}%</p>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-[10px] font-mono uppercase opacity-60">
                            <span>{type.complete} Completed</span>
                            <span>{type.value} Total Tasks</span>
                          </div>
                          <Progress 
                            value={(type.complete / type.value) * 100} 
                            className="h-1 rounded-none bg-[#E4E3E0]"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="time" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="border border-[#141414] shadow-none rounded-none bg-white">
                <CardHeader>
                  <CardTitle className="font-serif italic text-xl">New Hire Task Velocity</CardTitle>
                  <CardDescription className="font-mono text-xs uppercase">Avg Days to Complete (New Hire Tasks)</CardDescription>
                </CardHeader>
                <CardContent className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={taskTimeData.newHire}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E4E3E0" vertical={false} />
                      <XAxis 
                        dataKey="name" 
                        tick={{ fontSize: 9, fontFamily: 'monospace' }}
                        angle={-45}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis 
                        tick={{ fontSize: 9, fontFamily: 'monospace' }}
                      />
                      <Tooltip 
                        cursor={{ fill: '#f5f5f5' }}
                        contentStyle={{ backgroundColor: '#141414', color: '#fff', border: 'none', borderRadius: '0' }}
                        formatter={(value: number) => [`${value} Days`, 'Avg. Time']}
                      />
                      <Bar dataKey="days" fill="#F27D26" radius={0} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="border border-[#141414] shadow-none rounded-none bg-white">
                <CardHeader>
                  <CardTitle className="font-serif italic text-xl">Internal Task Velocity</CardTitle>
                  <CardDescription className="font-mono text-xs uppercase">Avg Days to Complete (Internal Tasks)</CardDescription>
                </CardHeader>
                <CardContent className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={taskTimeData.internal}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E4E3E0" vertical={false} />
                      <XAxis 
                        dataKey="name" 
                        tick={{ fontSize: 9, fontFamily: 'monospace' }}
                        angle={-45}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis 
                        tick={{ fontSize: 9, fontFamily: 'monospace' }}
                      />
                      <Tooltip 
                        cursor={{ fill: '#f5f5f5' }}
                        contentStyle={{ backgroundColor: '#141414', color: '#fff', border: 'none', borderRadius: '0' }}
                        formatter={(value: number) => [`${value} Days`, 'Avg. Time']}
                      />
                      <Bar dataKey="days" fill="#5A5A40" radius={0} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            <Card className="border border-[#141414] shadow-none rounded-none bg-white">
              <CardHeader>
                <CardTitle className="font-serif italic text-xl">Launch Timeline & Performance</CardTitle>
                <CardDescription className="font-mono text-xs uppercase">Launch Date vs. Avg Completion Time</CardDescription>
              </CardHeader>
              <CardContent className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E4E3E0" vertical={false} />
                    <XAxis 
                      dataKey="date" 
                      name="Launch Date"
                      tick={{ fontSize: 9, fontFamily: 'monospace' }}
                    />
                    <YAxis 
                      dataKey="avgCompletionDays" 
                      name="Avg Days"
                      tick={{ fontSize: 9, fontFamily: 'monospace' }} 
                      label={{ value: 'Avg Days to Complete', angle: -90, position: 'insideLeft', style: { fontSize: 9, fontFamily: 'monospace' } }} 
                    />
                    <ZAxis dataKey="candidateCount" range={[50, 400]} name="Candidates" />
                    <Tooltip 
                      cursor={{ strokeDasharray: '3 3' }}
                      contentStyle={{ backgroundColor: '#141414', color: '#fff', border: 'none', borderRadius: '0' }}
                    />
                    <Legend />
                    <Scatter 
                      name="Launch Performance" 
                      data={stats?.launchTimeline} 
                      fill="#F27D26"
                      line={false}
                    />
                  </ScatterChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border border-[#141414] shadow-none rounded-none bg-white">
              <CardHeader>
                <CardTitle className="font-serif italic text-xl">Average Task Sequence</CardTitle>
                <CardDescription className="font-mono text-xs uppercase">Order of completion (Avg days from launch)</CardDescription>
              </CardHeader>
              <CardContent className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats?.taskSequence} layout="vertical" margin={{ left: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E4E3E0" />
                    <XAxis type="number" tick={{ fontSize: 9, fontFamily: 'monospace' }} label={{ value: 'Days from Launch', position: 'insideBottom', offset: -5, style: { fontSize: 9, fontFamily: 'monospace' } }} />
                    <YAxis 
                      dataKey="taskName" 
                      type="category" 
                      width={180} 
                      tick={{ fontSize: 9, fontFamily: 'monospace' }}
                    />
                    <Tooltip 
                      cursor={{ fill: '#f5f5f5' }}
                      contentStyle={{ backgroundColor: '#141414', color: '#fff', border: 'none', borderRadius: '0' }}
                    />
                    <Bar dataKey="avgDaysFromLaunch" name="Avg Days from Launch" fill="#141414" radius={0} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="regions" className="space-y-6">
            <Card className="border border-[#141414] shadow-none rounded-none bg-white">
              <CardHeader>
                <CardTitle className="font-serif italic text-xl">Regional Distribution</CardTitle>
                <CardDescription className="font-mono text-xs uppercase">Complete breakdown of all active regions</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px] pr-4">
                  <div className="divide-y divide-[#E4E3E0]">
                    {(Object.entries(stats?.regionStats || {}) as [string, { count: number; completeCount: number }][])
                      .sort((a, b) => b[1].count - a[1].count)
                      .map(([name, data], i) => (
                        <div key={i} className="py-4 flex items-center justify-between group hover:bg-[#f5f5f5] transition-colors px-2">
                          <div className="flex items-center gap-4">
                            <span className="text-xs font-mono opacity-40">{(i + 1).toString().padStart(2, '0')}</span>
                            <div>
                              <p className="font-medium text-sm uppercase tracking-tight">{name || 'Unknown Region'}</p>
                              <p className="text-xs font-mono text-[#8E9299]">{data.count} Candidates</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-6">
                            <div className="text-right">
                              <p className="text-sm font-serif italic">{Math.round((data.completeCount / data.count) * 100)}%</p>
                              <p className="text-[10px] font-mono uppercase opacity-40">Complete</p>
                            </div>
                            <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </div>
                      ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            <Card className="border border-[#141414] shadow-none rounded-none bg-white">
              <CardHeader>
                <CardTitle className="font-serif italic text-xl">Completion by Region</CardTitle>
                <CardDescription className="font-mono text-xs uppercase">Top 10 Regions by Volume</CardDescription>
              </CardHeader>
              <CardContent className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={regionData} layout="vertical" margin={{ left: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E4E3E0" />
                    <XAxis type="number" hide />
                    <YAxis 
                      dataKey="name" 
                      type="category" 
                      width={150} 
                      tick={{ fontSize: 10, fontFamily: 'monospace' }}
                    />
                    <Tooltip 
                      cursor={{ fill: '#f5f5f5' }}
                      contentStyle={{ backgroundColor: '#141414', color: '#fff', border: 'none', borderRadius: '0' }}
                    />
                    <Bar dataKey="value" name="Total" fill="#8E9299" radius={0} />
                    <Bar dataKey="complete" name="Complete" fill="#141414" radius={0} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <footer className="pt-12 pb-6 border-t border-[#141414] flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-[10px] font-mono uppercase tracking-widest opacity-40">
            © 2026 Galileo Learning Onboarding Systems
          </p>
          <div className="flex gap-6">
            <a href="#" className="text-[10px] font-mono uppercase tracking-widest opacity-40 hover:opacity-100 transition-opacity">Documentation</a>
            <a href="#" className="text-[10px] font-mono uppercase tracking-widest opacity-40 hover:opacity-100 transition-opacity">Support</a>
            <a href="#" className="text-[10px] font-mono uppercase tracking-widest opacity-40 hover:opacity-100 transition-opacity">Privacy</a>
          </div>
        </footer>
      </div>
    </div>
  );
}
