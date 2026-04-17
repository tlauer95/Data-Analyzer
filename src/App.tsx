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

const COLORS = ['#F197AC', '#35BCED', '#FFDB00', '#0C151C', '#F27D26'];

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
      <div className="min-h-screen bg-[#F5F5F0] flex items-center justify-center p-6 font-sans">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full"
        >
          <Card className="border-2 border-[#0C151C] shadow-[8px_8px_0px_0px_#35BCED] bg-white rounded-none">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto mb-6">
                <img 
                  src="https://ais-pre-5mvoqfhbisg6kkqp2zzeym-212887783175.us-west1.run.app/api/attachments/clxdp8s2e00001401k5m8z9f6/asset.png" 
                  alt="Galileo Logo" 
                  className="h-16 object-contain mx-auto"
                  referrerPolicy="no-referrer"
                />
              </div>
              <CardTitle className="text-2xl font-serif italic text-[#0C151C]">Onboarding Analyzer</CardTitle>
              <CardDescription className="text-[#0C151C]/60">Upload your core report to begin analysis</CardDescription>
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
    <div className="min-h-screen bg-[#F5F5F0] text-[#0C151C] font-sans p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#0C151C] pb-6">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            <img 
              src="https://ais-pre-5mvoqfhbisg6kkqp2zzeym-212887783175.us-west1.run.app/api/attachments/clxdp8s2e00001401k5m8z9f6/asset.png" 
              alt="Galileo Logo" 
              className="h-12 object-contain"
              referrerPolicy="no-referrer"
            />
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="border-[#0C151C] text-[#0C151C] rounded-none px-2 py-0 uppercase text-[10px] tracking-widest font-mono">LIVE REPORT</Badge>
                <span className="text-xs font-mono opacity-60 uppercase tracking-widest">System Status: Active</span>
              </div>
              <h1 className="text-5xl font-serif italic tracking-tight text-[#0C151C]">Onboarding Dashboard</h1>
              <div className="flex flex-wrap items-center gap-2 mt-4">
                {['All', 'Summer Staff', 'HQ', 'Camp Director'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat as any)}
                    className={`px-3 py-1 text-[10px] font-mono uppercase tracking-widest border transition-all ${
                      selectedCategory === cat 
                        ? 'bg-[#0C151C] text-white border-[#0C151C] shadow-[4px_4px_0px_0px_#35BCED]' 
                        : 'bg-white border-[#0C151C]/20 hover:border-[#0C151C] opacity-60 hover:opacity-100'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <button 
            onClick={() => setCandidates([])}
            className="px-4 py-2 border border-[#0C151C] hover:bg-[#0C151C] hover:text-white transition-colors font-mono text-xs uppercase tracking-widest"
          >
            Upload New File
          </button>
        </header>

        {/* Top Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Candidates', value: stats?.totalUniqueCandidates, icon: Users, color: '#35BCED' },
            { label: 'Fully Complete', value: totalComplete, icon: CheckCircle, color: '#FFDB00' },
            { label: 'Avg Completion', value: `${completionRate}%`, icon: BarChart3, color: '#F197AC' },
            { label: 'Resigned/Rescinded', value: stats?.resignedRescindedCount, icon: MapPin, color: '#F197AC' },
          ].map((stat, i) => (
            <Card key={i} className="border border-[#0C151C] shadow-none rounded-none bg-white relative overflow-hidden">
              <div className="absolute top-0 right-0 w-16 h-16 opacity-5 -mr-4 -mt-4">
                <stat.icon size={64} style={{ color: stat.color }} />
              </div>
              <CardContent className="p-6 flex items-center justify-between relative z-10">
                <div>
                  <p className="text-xs font-mono uppercase text-[#0C151C]/60 mb-1">{stat.label}</p>
                  <p className="text-3xl font-serif italic font-bold text-[#0C151C]">{stat.value}</p>
                </div>
                <div className="p-2 border border-[#0C151C]/10 bg-[#F5F5F0]">
                  <stat.icon size={20} style={{ color: stat.color }} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="bg-transparent border-b border-[#0C151C] rounded-none h-auto p-0 gap-8">
            {['overview', 'time', 'regions'].map((tab) => (
              <TabsTrigger 
                key={tab}
                value={tab}
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#35BCED] data-[state=active]:bg-transparent px-0 py-2 text-xs font-mono uppercase tracking-widest text-[#0C151C]/40 data-[state=active]:text-[#0C151C]"
              >
                {tab}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className={`grid grid-cols-1 ${selectedCategory === 'HQ' ? '' : 'lg:grid-cols-2'} gap-6`}>
              <Card className="border border-[#0C151C] shadow-none rounded-none bg-white">
                <CardHeader>
                  <CardTitle className="font-serif italic text-xl text-[#0C151C]">
                    {selectedCategory === 'Summer Staff' || selectedCategory === 'HQ' ? 'Job Title Distribution' : 'Candidate Distribution'}
                  </CardTitle>
                  <CardDescription className="font-mono text-xs uppercase text-[#0C151C]/60">
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
                        contentStyle={{ backgroundColor: '#0C151C', color: '#fff', border: 'none', borderRadius: '0', fontFamily: 'monospace' }}
                        itemStyle={{ color: '#fff' }}
                      />
                      <Legend verticalAlign="bottom" wrapperStyle={{ fontFamily: 'monospace', fontSize: '10px', textTransform: 'uppercase' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {selectedCategory !== 'HQ' && (
                <Card className="border border-[#0C151C] shadow-none rounded-none bg-white underline-offset-4">
                  <CardHeader>
                    <CardTitle className="font-serif italic text-xl text-[#0C151C]">
                      {selectedCategory === 'Summer Staff' ? 'Tenure Breakdown' : 'Category Breakdown'}
                    </CardTitle>
                    <CardDescription className="font-mono text-xs uppercase text-[#0C151C]/60">
                      {selectedCategory === 'Summer Staff' ? 'First Year vs Alumni' : 'Counts and Completion Rates'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {(selectedCategory === 'Summer Staff' ? tenureData : categoryData).map((item, i) => (
                        <div key={i} className="space-y-2">
                          <div className="flex justify-between text-sm font-mono uppercase">
                            <span className="font-bold">{item.name}</span>
                            <span className="opacity-60">{item.complete} / {item.value} Complete</span>
                          </div>
                          <Progress 
                            value={(item.complete / item.value) * 100} 
                            className="h-2 rounded-none bg-[#F5F5F0]"
                            style={{ 
                              // @ts-ignore
                              "--progress-fill": COLORS[i % COLORS.length] 
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card className="border border-[#0C151C] shadow-none rounded-none bg-white lg:col-span-2">
                <CardHeader>
                  <CardTitle className="font-serif italic text-xl text-[#0C151C]">Task Type Breakdown</CardTitle>
                  <CardDescription className="font-mono text-xs uppercase text-[#0C151C]/60">New Hire vs Internal Tasks</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {taskTypeData.map((type, i) => (
                      <div key={i} className="space-y-4">
                        <div className="flex items-end justify-between">
                          <div>
                            <p className="text-[10px] font-mono uppercase text-[#0C151C]/60 mb-1">Type</p>
                            <p className="text-2xl font-serif italic text-[#0C151C]">{type.name}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] font-mono uppercase text-[#0C151C]/60 mb-1">Completion</p>
                            <p className="text-xl font-serif italic text-[#0C151C]">{Math.round((type.complete / type.value) * 100)}%</p>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-[10px] font-mono uppercase opacity-40">
                            <span>{type.complete} Completed</span>
                            <span>{type.value} Total Tasks</span>
                          </div>
                          <Progress 
                            value={(type.complete / type.value) * 100} 
                            className="h-1 rounded-none bg-[#F5F5F0]"
                            style={{ 
                              // @ts-ignore
                              "--progress-fill": COLORS[i % COLORS.length] 
                            }}
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
              <Card className="border border-[#0C151C] shadow-none rounded-none bg-white">
                <CardHeader>
                  <CardTitle className="font-serif italic text-xl text-[#0C151C]">New Hire Task Velocity</CardTitle>
                  <CardDescription className="font-mono text-xs uppercase text-[#0C151C]/60">Avg Days to Complete (New Hire Tasks)</CardDescription>
                </CardHeader>
                <CardContent className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={taskTimeData.newHire}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F5F5F0" vertical={false} />
                      <XAxis 
                        dataKey="name" 
                        tick={{ fontSize: 9, fontFamily: 'monospace', fill: '#0C151C' }}
                        angle={-45}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis 
                        tick={{ fontSize: 9, fontFamily: 'monospace', fill: '#0C151C' }}
                      />
                      <Tooltip 
                        cursor={{ fill: '#F5F5F0' }}
                        contentStyle={{ backgroundColor: '#0C151C', color: '#fff', border: 'none', borderRadius: '0', fontFamily: 'monospace' }}
                        formatter={(value: number) => [`${value} Days`, 'Avg. Time']}
                      />
                      <Bar dataKey="days" fill="#35BCED" radius={0} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="border border-[#0C151C] shadow-none rounded-none bg-white">
                <CardHeader>
                  <CardTitle className="font-serif italic text-xl text-[#0C151C]">Internal Task Velocity</CardTitle>
                  <CardDescription className="font-mono text-xs uppercase text-[#0C151C]/60">Avg Days to Complete (Internal Tasks)</CardDescription>
                </CardHeader>
                <CardContent className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={taskTimeData.internal}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F5F5F0" vertical={false} />
                      <XAxis 
                        dataKey="name" 
                        tick={{ fontSize: 9, fontFamily: 'monospace', fill: '#0C151C' }}
                        angle={-45}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis 
                        tick={{ fontSize: 9, fontFamily: 'monospace', fill: '#0C151C' }}
                      />
                      <Tooltip 
                        cursor={{ fill: '#F5F5F0' }}
                        contentStyle={{ backgroundColor: '#0C151C', color: '#fff', border: 'none', borderRadius: '0', fontFamily: 'monospace' }}
                        formatter={(value: number) => [`${value} Days`, 'Avg. Time']}
                      />
                      <Bar dataKey="days" fill="#FFDB00" radius={0} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            <Card className="border border-[#0C151C] shadow-none rounded-none bg-white">
              <CardHeader>
                <CardTitle className="font-serif italic text-xl text-[#0C151C]">Launch Timeline & Performance</CardTitle>
                <CardDescription className="font-mono text-xs uppercase text-[#0C151C]/60">Launch Date vs. Avg Completion Time</CardDescription>
              </CardHeader>
              <CardContent className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F5F5F0" vertical={false} />
                    <XAxis 
                      dataKey="date" 
                      name="Launch Date"
                      tick={{ fontSize: 9, fontFamily: 'monospace', fill: '#0C151C' }}
                    />
                    <YAxis 
                      dataKey="avgCompletionDays" 
                      name="Avg Days"
                      tick={{ fontSize: 9, fontFamily: 'monospace', fill: '#0C151C' }} 
                      label={{ value: 'Avg Days to Complete', angle: -90, position: 'insideLeft', style: { fontSize: 9, fontFamily: 'monospace', fill: '#0C151C' } }} 
                    />
                    <ZAxis dataKey="candidateCount" range={[50, 400]} name="Candidates" />
                    <Tooltip 
                      cursor={{ strokeDasharray: '3 3', stroke: '#0C151C' }}
                      contentStyle={{ backgroundColor: '#0C151C', color: '#fff', border: 'none', borderRadius: '0', fontFamily: 'monospace' }}
                    />
                    <Legend />
                    <Scatter 
                      name="Launch Performance" 
                      data={stats?.launchTimeline} 
                      fill="#F197AC"
                      line={false}
                    />
                  </ScatterChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border border-[#0C151C] shadow-none rounded-none bg-white">
              <CardHeader>
                <CardTitle className="font-serif italic text-xl text-[#0C151C]">Average Task Sequence</CardTitle>
                <CardDescription className="font-mono text-xs uppercase text-[#0C151C]/60">Order of completion (Avg days from launch)</CardDescription>
              </CardHeader>
              <CardContent className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats?.taskSequence} layout="vertical" margin={{ left: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F5F5F0" />
                    <XAxis type="number" tick={{ fontSize: 9, fontFamily: 'monospace', fill: '#0C151C' }} label={{ value: 'Days from Launch', position: 'insideBottom', offset: -5, style: { fontSize: 9, fontFamily: 'monospace', fill: '#0C151C' } }} />
                    <YAxis 
                      dataKey="taskName" 
                      type="category" 
                      width={180} 
                      tick={{ fontSize: 9, fontFamily: 'monospace', fill: '#0C151C' }}
                    />
                    <Tooltip 
                      cursor={{ fill: '#F5F5F0' }}
                      contentStyle={{ backgroundColor: '#0C151C', color: '#fff', border: 'none', borderRadius: '0', fontFamily: 'monospace' }}
                    />
                    <Bar dataKey="avgDaysFromLaunch" name="Avg Days from Launch" fill="#35BCED" radius={0} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="regions" className="space-y-6">
            <Card className="border border-[#0C151C] shadow-none rounded-none bg-white">
              <CardHeader>
                <CardTitle className="font-serif italic text-xl text-[#0C151C]">Regional Distribution</CardTitle>
                <CardDescription className="font-mono text-xs uppercase text-[#0C151C]/60">Complete breakdown of all active regions</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px] pr-4">
                  <div className="divide-y divide-[#0C151C]/10">
                    {(Object.entries(stats?.regionStats || {}) as [string, { count: number; completeCount: number }][])
                      .sort((a, b) => b[1].count - a[1].count)
                      .map(([name, data], i) => (
                        <div key={i} className="py-4 flex items-center justify-between group hover:bg-[#F5F5F0] transition-colors px-2">
                          <div className="flex items-center gap-4">
                            <span className="text-xs font-mono opacity-40">{(i + 1).toString().padStart(2, '0')}</span>
                            <div>
                              <p className="font-medium text-sm uppercase tracking-tight text-[#0C151C]">{name || 'Unknown Region'}</p>
                              <p className="text-xs font-mono text-[#0C151C]/60">{data.count} Candidates</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-6">
                            <div className="text-right">
                              <p className="text-sm font-serif italic text-[#0C151C]">{Math.round((data.completeCount / data.count) * 100)}%</p>
                              <p className="text-[10px] font-mono uppercase opacity-40">Complete</p>
                            </div>
                            <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity text-[#0C151C]" />
                          </div>
                        </div>
                      ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            <Card className="border border-[#0C151C] shadow-none rounded-none bg-white">
              <CardHeader>
                <CardTitle className="font-serif italic text-xl text-[#0C151C]">Completion by Region</CardTitle>
                <CardDescription className="font-mono text-xs uppercase text-[#0C151C]/60">Top 10 Regions by Volume</CardDescription>
              </CardHeader>
              <CardContent className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={regionData} layout="vertical" margin={{ left: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F5F5F0" />
                    <XAxis type="number" hide />
                    <YAxis 
                      dataKey="name" 
                      type="category" 
                      width={150} 
                      tick={{ fontSize: 10, fontFamily: 'monospace', fill: '#0C151C' }}
                    />
                    <Tooltip 
                      cursor={{ fill: '#F5F5F0' }}
                      contentStyle={{ backgroundColor: '#0C151C', color: '#fff', border: 'none', borderRadius: '0', fontFamily: 'monospace' }}
                    />
                    <Bar dataKey="value" name="Total" fill="#F197AC" opacity={0.1} radius={0} />
                    <Bar dataKey="complete" name="Complete" fill="#35BCED" radius={0} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <footer className="pt-12 pb-6 border-t border-[#0C151C] flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-[10px] font-mono uppercase tracking-widest opacity-40">
            © 2026 Galileo Learning | Innovation & Discovery
          </p>
          <div className="flex gap-6">
            <a href="#" className="text-[10px] font-mono uppercase tracking-widest opacity-40 hover:opacity-100 transition-opacity text-[#0C151C]">Documentation</a>
            <a href="#" className="text-[10px] font-mono uppercase tracking-widest opacity-40 hover:opacity-100 transition-opacity text-[#0C151C]">Support</a>
            <a href="#" className="text-[10px] font-mono uppercase tracking-widest opacity-40 hover:opacity-100 transition-opacity text-[#0C151C]">Systems API</a>
          </div>
        </footer>
      </div>
    </div>
  );
}
