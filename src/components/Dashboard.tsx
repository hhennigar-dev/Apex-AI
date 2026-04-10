import React, { useEffect, useState } from "react";
import { 
  Activity, TrendingUp, TrendingDown, DollarSign, Percent, BarChart3, 
  Hexagon, Loader2, AlertCircle, Newspaper, Info, Target, Briefcase, 
  Building2, Users, Calendar, ArrowUpRight, ArrowDownRight, Star, Menu,
  Wallet, LineChart as LineChartIcon, PieChart, Settings
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer
} from "recharts";

interface StockOpportunity {
  symbol: string;
  name: string;
  price: number;
  changePercent: number;
  marketCap: number;
  peRatio: number;
  rank: number;
  successRate: number;
  profitPotential: number;
  recommendedInvestment: number;
  rationale: string;
  targetEntry: number;
  targetExit: number;
  stopLoss: number;
  expectedHoldTime: string;
  riskLevel: string;
}

export default function Dashboard() {
  const [opportunities, setOpportunities] = useState<StockOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStock, setSelectedStock] = useState<StockOpportunity | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // API Key state
  const [apiKey, setApiKey] = useState("");
  const [tempApiKey, setTempApiKey] = useState("");
  
  // Detailed data states
  const [stockDetails, setStockDetails] = useState<any>(null);
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [newsData, setNewsData] = useState<any[]>([]);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [chartRange, setChartRange] = useState("1y");

  // Load API key from local storage on mount
  useEffect(() => {
    const storedKey = localStorage.getItem("gemini_api_key");
    if (storedKey) {
      setApiKey(storedKey);
      setTempApiKey(storedKey);
    }
  }, []);

  const fetchOpportunities = (keyToUse: string) => {
    setLoading(true);
    setError(null);
    
    const headers: Record<string, string> = {};
    if (keyToUse) {
      headers['x-gemini-api-key'] = keyToUse;
    }

    fetch("/api/opportunities", { headers })
      .then(async res => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to fetch data");
        return data;
      })
      .then(data => {
        if (Array.isArray(data)) {
          setOpportunities(data);
          if (data.length > 0) setSelectedStock(data[0]);
        } else {
          setError("Received invalid data format from server.");
        }
        setLoading(false);
      })
      .catch(err => {
        setError(err.message || "An unexpected error occurred.");
        setLoading(false);
      });
  };

  // Fetch initial opportunities list
  useEffect(() => {
    fetchOpportunities(apiKey);
  }, []); // Run once on mount, fetchOpportunities will use the initial apiKey state (which might be empty until loaded, but we'll let it try)

  const saveApiKey = () => {
    localStorage.setItem("gemini_api_key", tempApiKey);
    setApiKey(tempApiKey);
    fetchOpportunities(tempApiKey);
  };

  // Fetch detailed data when selected stock or chart range changes
  useEffect(() => {
    if (!selectedStock) return;
    
    let isMounted = true;
    setDetailsLoading(true);

    Promise.all([
      fetch(`/api/stock/${selectedStock.symbol}`).then(res => res.json()),
      fetch(`/api/historical/${selectedStock.symbol}?range=${chartRange}`).then(res => res.json()),
      fetch(`/api/news/${selectedStock.symbol}`).then(res => res.json())
    ]).then(([details, history, news]) => {
      if (!isMounted) return;
      setStockDetails(details);
      
      const formattedHistory = Array.isArray(history) ? history.map(h => ({
        date: new Date(h.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        price: h.close
      })) : [];
      setHistoryData(formattedHistory);
      
      setNewsData(Array.isArray(news) ? news : []);
      setDetailsLoading(false);
    }).catch(err => {
      console.error("Failed to fetch details", err);
      if (isMounted) setDetailsLoading(false);
    });

    return () => { isMounted = false; };
  }, [selectedStock?.symbol, chartRange]);

  const formatCurrency = (val: number | undefined) => {
    if (val === undefined || val === null) return "N/A";
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(val);
  };

  const formatCompactNumber = (number: number | undefined) => {
    if (number === undefined || number === null) return "N/A";
    return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 2 }).format(number);
  };

  const formatPercent = (val: number | undefined) => {
    if (val === undefined || val === null) return "N/A";
    return (val * 100).toFixed(2) + "%";
  };

  if (error) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-50 flex items-center justify-center p-4">
        <Alert variant="destructive" className="max-w-md bg-red-950/50 border-red-900/50 text-red-200">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  const profile = stockDetails?.assetProfile || {};
  const stats = stockDetails?.defaultKeyStatistics || {};
  const financialData = stockDetails?.financialData || {};
  const summaryDetail = stockDetails?.summaryDetail || {};
  const recTrend = stockDetails?.recommendationTrend?.trend?.[0] || {};

  const renderStockListContent = () => (
    <>
      <div className="p-4 border-b border-zinc-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Hexagon className="h-6 w-6 text-emerald-500" />
          <h1 className="text-xl font-bold tracking-tight">Apex AI</h1>
        </div>
        <Dialog>
          <DialogTrigger className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover:bg-zinc-800 hover:text-zinc-50 h-9 w-9 text-zinc-400">
            <Settings className="h-5 w-5" />
          </DialogTrigger>
          <DialogContent className="bg-zinc-950 border-zinc-800 text-zinc-50 sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Settings</DialogTitle>
              <DialogDescription className="text-zinc-400">
                Configure your Gemini API key to enable real-time AI analysis.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="apiKey" className="text-right text-sm font-medium">
                  API Key
                </label>
                <Input
                  id="apiKey"
                  type="password"
                  value={tempApiKey}
                  onChange={(e) => setTempApiKey(e.target.value)}
                  className="col-span-3 bg-zinc-900 border-zinc-700 text-zinc-50"
                  placeholder="AIzaSy..."
                />
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" onClick={saveApiKey} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  Save changes
                </Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <div className="p-4 border-b border-zinc-800 shrink-0">
        <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">AI Top Opportunities</h2>
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {loading ? (
          <div className="p-4 space-y-4">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-10 w-10 rounded-full bg-zinc-800" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-full bg-zinc-800" />
                  <Skeleton className="h-3 w-2/3 bg-zinc-800" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {opportunities.map((stock) => (
              <button
                key={stock.symbol}
                onClick={() => {
                  setSelectedStock(stock);
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full text-left p-3 rounded-lg transition-colors flex items-center gap-3 ${
                  selectedStock?.symbol === stock.symbol 
                    ? "bg-zinc-800 border border-zinc-700" 
                    : "hover:bg-zinc-800/50 border border-transparent"
                }`}
              >
                <div className={`flex items-center justify-center h-8 w-8 rounded-full font-bold text-sm shrink-0 ${
                  stock.rank === 1 ? "bg-amber-500/20 text-amber-500 border border-amber-500/50" :
                  stock.rank === 2 ? "bg-zinc-300/20 text-zinc-300 border border-zinc-300/50" :
                  stock.rank === 3 ? "bg-orange-500/20 text-orange-500 border border-orange-500/50" :
                  "bg-zinc-800 text-zinc-400"
                }`}>
                  {stock.rank}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-bold truncate">{stock.symbol}</span>
                    <span className="font-medium">{formatCurrency(stock.price)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-400 truncate pr-2">{stock.name}</span>
                    <span className={stock.changePercent >= 0 ? "text-emerald-500" : "text-rose-500"}>
                      {stock.changePercent >= 0 ? "+" : ""}{(stock.changePercent * 100).toFixed(2)}%
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-950 text-zinc-50 font-sans">
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent; 
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(63, 63, 70, 0.5); 
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(82, 82, 91, 0.8); 
        }
      `}</style>
      
      {/* Desktop Sidebar */}
      <div className="hidden md:flex w-80 border-r border-zinc-800 bg-zinc-900/50 flex-col overflow-hidden">
        {renderStockListContent()}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        
        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-900/80 backdrop-blur-md z-10 shrink-0">
          <div className="flex items-center gap-2">
            <Hexagon className="h-6 w-6 text-emerald-500" />
            <h1 className="text-xl font-bold tracking-tight">Apex AI</h1>
          </div>
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-zinc-50">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[85vw] sm:w-80 p-0 bg-zinc-950 border-zinc-800 text-zinc-50 flex flex-col">
              <SheetTitle className="sr-only">Stock Opportunities</SheetTitle>
              {renderStockListContent()}
            </SheetContent>
          </Sheet>
        </div>

        {loading || !selectedStock ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 md:space-y-8 pb-24">
              
              {/* Header */}
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-2">
                    <h1 className="text-3xl md:text-4xl font-bold tracking-tight">{selectedStock.name}</h1>
                    <Badge variant="outline" className="text-sm md:text-lg px-2 py-0.5 md:px-3 md:py-1 bg-zinc-900">{selectedStock.symbol}</Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 md:gap-4 text-sm md:text-base text-zinc-400">
                    {profile.sector && (
                      <span className="flex items-center gap-1"><Briefcase className="h-4 w-4"/> {profile.sector}</span>
                    )}
                    {profile.industry && (
                      <span className="flex items-center gap-1"><Building2 className="h-4 w-4"/> {profile.industry}</span>
                    )}
                  </div>
                </div>
                <div className="text-left md:text-right mt-2 md:mt-0">
                  <div className="text-4xl md:text-5xl font-bold tracking-tighter mb-1 md:mb-2">
                    {formatCurrency(selectedStock.price)}
                  </div>
                  <div className={`flex items-center justify-start md:justify-end gap-2 text-base md:text-lg font-medium ${selectedStock.changePercent >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                    {selectedStock.changePercent >= 0 ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
                    <span>{selectedStock.changePercent >= 0 ? "+" : ""}{(selectedStock.changePercent * 100).toFixed(2)}%</span>
                    <span className="text-zinc-500 text-sm ml-1 md:ml-2">Today</span>
                  </div>
                </div>
              </div>

              {/* AI Analysis Banner */}
              <Card className="bg-gradient-to-br from-indigo-950/50 to-purple-950/50 border-indigo-500/20">
                <CardContent className="p-4 md:p-6">
                  <div className="flex flex-col lg:flex-row gap-4 md:gap-6 items-start lg:items-center">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 text-indigo-400 mb-1 md:mb-2">
                        <Star className="h-4 w-4 md:h-5 md:w-5 fill-current" />
                        <span className="font-semibold tracking-wide uppercase text-xs md:text-sm">AI Rationale</span>
                      </div>
                      <p className="text-base md:text-lg leading-relaxed text-indigo-100">{selectedStock.rationale}</p>
                      {selectedStock.rationale.includes("unavailable") && (
                        <div className="mt-2 text-rose-400 text-sm font-medium flex items-center gap-1">
                          <AlertCircle className="h-4 w-4" />
                          Please set a valid Gemini API Key in AI Studio settings to enable real AI analysis.
                        </div>
                      )}
                    </div>
                    <div className="flex gap-3 md:gap-6 w-full lg:w-auto">
                      <div className="bg-black/40 rounded-xl p-3 md:p-4 flex-1 lg:w-40 border border-white/5">
                        <div className="text-zinc-400 text-[10px] md:text-xs mb-1 uppercase tracking-wider">Success Prob</div>
                        <div className="text-xl md:text-2xl font-bold text-emerald-400">{selectedStock.successRate}%</div>
                      </div>
                      <div className="bg-black/40 rounded-xl p-3 md:p-4 flex-1 lg:w-40 border border-white/5">
                        <div className="text-zinc-400 text-[10px] md:text-xs mb-1 uppercase tracking-wider">Suggested Alloc</div>
                        <div className="text-xl md:text-2xl font-bold text-indigo-400">{formatCurrency(selectedStock.recommendedInvestment)}</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Trade Execution Plan */}
              <Card className="border-emerald-900/50 bg-emerald-950/10">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-emerald-500">
                      <Target className="h-5 w-5" />
                      Trade Execution Plan
                    </div>
                    <Badge variant="outline" className={`
                      ${selectedStock.riskLevel === 'Low' ? 'text-emerald-400 border-emerald-400/50' : ''}
                      ${selectedStock.riskLevel === 'Medium' ? 'text-amber-400 border-amber-400/50' : ''}
                      ${selectedStock.riskLevel === 'High' ? 'text-rose-400 border-rose-400/50' : ''}
                    `}>
                      {selectedStock.riskLevel} Risk
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="space-y-1">
                      <div className="text-xs text-zinc-400 uppercase tracking-wider">Target Entry</div>
                      <div className="text-lg font-semibold text-zinc-200">{formatCurrency(selectedStock.targetEntry)}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-xs text-zinc-400 uppercase tracking-wider">Target Exit</div>
                      <div className="text-lg font-semibold text-emerald-400">{formatCurrency(selectedStock.targetExit)}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-xs text-zinc-400 uppercase tracking-wider">Stop Loss</div>
                      <div className="text-lg font-semibold text-rose-400">{formatCurrency(selectedStock.stopLoss)}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-xs text-zinc-400 uppercase tracking-wider">Expected Hold</div>
                      <div className="text-lg font-semibold text-zinc-200">{selectedStock.expectedHoldTime}</div>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white h-auto py-3" asChild>
                      <a href={`https://finance.yahoo.com/quote/${selectedStock.symbol}`} target="_blank" rel="noreferrer" className="flex items-center justify-center text-center">
                        <LineChartIcon className="mr-2 h-4 w-4 shrink-0" />
                        <span className="whitespace-normal text-sm">View on Yahoo Finance</span>
                      </a>
                    </Button>
                    <Button className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700 h-auto py-3" asChild>
                      <a href={`https://robinhood.com/stocks/${selectedStock.symbol}`} target="_blank" rel="noreferrer" className="flex items-center justify-center text-center">
                        <Wallet className="mr-2 h-4 w-4 shrink-0" />
                        <span className="whitespace-normal text-sm">Trade on Robinhood</span>
                      </a>
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Chart Section */}
              <Card className="border-zinc-800 bg-zinc-900/50">
                <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-2 gap-4">
                  <CardTitle>Price History</CardTitle>
                  <Tabs value={chartRange} onValueChange={setChartRange} className="w-full sm:w-auto">
                    <TabsList className="bg-zinc-950 border border-zinc-800 w-full sm:w-auto flex justify-between">
                      <TabsTrigger value="1mo" className="flex-1 sm:flex-none">1M</TabsTrigger>
                      <TabsTrigger value="3mo" className="flex-1 sm:flex-none">3M</TabsTrigger>
                      <TabsTrigger value="6mo" className="flex-1 sm:flex-none">6M</TabsTrigger>
                      <TabsTrigger value="1y" className="flex-1 sm:flex-none">1Y</TabsTrigger>
                      <TabsTrigger value="5y" className="flex-1 sm:flex-none">5Y</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </CardHeader>
                <CardContent>
                  {detailsLoading ? (
                    <div className="h-[250px] md:h-[350px] flex items-center justify-center">
                      <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
                    </div>
                  ) : (
                    <div className="h-[250px] md:h-[350px] w-full mt-4 -ml-4 md:ml-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={historyData} margin={{ top: 5, right: 0, left: 0, bottom: 5 }}>
                          <defs>
                            <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                          <XAxis 
                            dataKey="date" 
                            stroke="#71717a" 
                            fontSize={10} 
                            tickLine={false} 
                            axisLine={false}
                            minTickGap={30}
                          />
                          <YAxis 
                            domain={['auto', 'auto']} 
                            stroke="#71717a" 
                            fontSize={10} 
                            tickLine={false} 
                            axisLine={false}
                            tickFormatter={(value) => `$${value}`}
                            width={45}
                          />
                          <RechartsTooltip 
                            contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px' }}
                            itemStyle={{ color: '#e4e4e7' }}
                            formatter={(value: number) => [formatCurrency(value), 'Price']}
                          />
                          <Area 
                            type="monotone" 
                            dataKey="price" 
                            stroke="#6366f1" 
                            strokeWidth={2}
                            fillOpacity={1} 
                            fill="url(#colorPrice)" 
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Bento Grid for Features */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                
                {/* Key Statistics */}
                <Card className="border-zinc-800 bg-zinc-900/50 lg:col-span-2">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5 text-zinc-400"/> Key Statistics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-4 md:gap-y-6 gap-x-4">
                      <div>
                        <div className="text-xs md:text-sm text-zinc-400 mb-1">Market Cap</div>
                        <div className="text-base md:text-lg font-semibold">{formatCompactNumber(summaryDetail.marketCap)}</div>
                      </div>
                      <div>
                        <div className="text-xs md:text-sm text-zinc-400 mb-1">Trailing P/E</div>
                        <div className="text-base md:text-lg font-semibold">{summaryDetail.trailingPE?.toFixed(2) || "N/A"}</div>
                      </div>
                      <div>
                        <div className="text-xs md:text-sm text-zinc-400 mb-1">Forward P/E</div>
                        <div className="text-base md:text-lg font-semibold">{summaryDetail.forwardPE?.toFixed(2) || "N/A"}</div>
                      </div>
                      <div>
                        <div className="text-xs md:text-sm text-zinc-400 mb-1">Beta (5Y)</div>
                        <div className="text-base md:text-lg font-semibold">{summaryDetail.beta?.toFixed(2) || "N/A"}</div>
                      </div>
                      <div>
                        <div className="text-xs md:text-sm text-zinc-400 mb-1">Dividend Yield</div>
                        <div className="text-base md:text-lg font-semibold">{formatPercent(summaryDetail.dividendYield)}</div>
                      </div>
                      <div>
                        <div className="text-xs md:text-sm text-zinc-400 mb-1">Avg Vol (3M)</div>
                        <div className="text-base md:text-lg font-semibold">{formatCompactNumber(summaryDetail.averageVolume)}</div>
                      </div>
                      <div>
                        <div className="text-xs md:text-sm text-zinc-400 mb-1">50-Day Avg</div>
                        <div className="text-base md:text-lg font-semibold">{formatCurrency(summaryDetail.fiftyDayAverage)}</div>
                      </div>
                      <div>
                        <div className="text-xs md:text-sm text-zinc-400 mb-1">200-Day Avg</div>
                        <div className="text-base md:text-lg font-semibold">{formatCurrency(summaryDetail.twoHundredDayAverage)}</div>
                      </div>
                      <div>
                        <div className="text-xs md:text-sm text-zinc-400 mb-1">Short Ratio</div>
                        <div className="text-base md:text-lg font-semibold">{stats.shortRatio?.toFixed(2) || "N/A"}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* 52 Week Range */}
                <Card className="border-zinc-800 bg-zinc-900/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Target className="h-5 w-5 text-zinc-400"/> 52-Week Range</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4 md:space-y-6 mt-2">
                      <div className="flex justify-between text-xs md:text-sm font-medium">
                        <span className="text-zinc-400">Low: {formatCurrency(summaryDetail.fiftyTwoWeekLow)}</span>
                        <span className="text-zinc-400">High: {formatCurrency(summaryDetail.fiftyTwoWeekHigh)}</span>
                      </div>
                      <div className="relative h-2 bg-zinc-800 rounded-full overflow-hidden">
                        {summaryDetail.fiftyTwoWeekLow && summaryDetail.fiftyTwoWeekHigh && selectedStock.price && (
                          <div 
                            className="absolute top-0 h-full bg-indigo-500 rounded-full"
                            style={{ 
                              left: '0%', 
                              width: `${Math.max(0, Math.min(100, ((selectedStock.price - summaryDetail.fiftyTwoWeekLow) / (summaryDetail.fiftyTwoWeekHigh - summaryDetail.fiftyTwoWeekLow)) * 100))}%` 
                            }}
                          />
                        )}
                      </div>
                      <div className="text-center">
                        <span className="text-xl md:text-2xl font-bold">{formatCurrency(selectedStock.price)}</span>
                        <div className="text-[10px] md:text-xs text-zinc-500 mt-1">Current Price</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Financials Summary */}
                <Card className="border-zinc-800 bg-zinc-900/50 lg:col-span-2">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2"><DollarSign className="h-5 w-5 text-zinc-400"/> Financial Health (TTM)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 text-sm md:text-base">
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-zinc-400">Total Revenue</span>
                          <span className="font-semibold">{formatCompactNumber(financialData.totalRevenue)}</span>
                        </div>
                        <Separator className="bg-zinc-800" />
                        <div className="flex justify-between items-center">
                          <span className="text-zinc-400">Gross Profit</span>
                          <span className="font-semibold">{formatCompactNumber(financialData.grossProfits)}</span>
                        </div>
                        <Separator className="bg-zinc-800" />
                        <div className="flex justify-between items-center">
                          <span className="text-zinc-400">Operating Cash Flow</span>
                          <span className="font-semibold">{formatCompactNumber(financialData.operatingCashflow)}</span>
                        </div>
                        <Separator className="bg-zinc-800" />
                        <div className="flex justify-between items-center">
                          <span className="text-zinc-400">Profit Margin</span>
                          <span className="font-semibold">{formatPercent(financialData.profitMargins)}</span>
                        </div>
                      </div>
                      <div className="space-y-4 mt-4 sm:mt-0">
                        <div className="flex justify-between items-center">
                          <span className="text-zinc-400">Total Cash</span>
                          <span className="font-semibold">{formatCompactNumber(financialData.totalCash)}</span>
                        </div>
                        <Separator className="bg-zinc-800" />
                        <div className="flex justify-between items-center">
                          <span className="text-zinc-400">Total Debt</span>
                          <span className="font-semibold">{formatCompactNumber(financialData.totalDebt)}</span>
                        </div>
                        <Separator className="bg-zinc-800" />
                        <div className="flex justify-between items-center">
                          <span className="text-zinc-400">Return on Assets</span>
                          <span className="font-semibold">{formatPercent(financialData.returnOnAssets)}</span>
                        </div>
                        <Separator className="bg-zinc-800" />
                        <div className="flex justify-between items-center">
                          <span className="text-zinc-400">Return on Equity</span>
                          <span className="font-semibold">{formatPercent(financialData.returnOnEquity)}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Analyst Recommendations */}
                <Card className="border-zinc-800 bg-zinc-900/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5 text-zinc-400"/> Analyst Ratings</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {recTrend.strongBuy !== undefined ? (
                      <div className="space-y-2 md:space-y-3">
                        <div className="flex items-center gap-2 md:gap-3">
                          <span className="w-16 md:w-20 text-[10px] md:text-xs text-zinc-400 text-right">Strong Buy</span>
                          <Progress value={(recTrend.strongBuy / 50) * 100} className="h-1.5 md:h-2 bg-zinc-800 [&>div]:bg-emerald-500" />
                          <span className="w-6 md:w-8 text-[10px] md:text-xs font-medium">{recTrend.strongBuy}</span>
                        </div>
                        <div className="flex items-center gap-2 md:gap-3">
                          <span className="w-16 md:w-20 text-[10px] md:text-xs text-zinc-400 text-right">Buy</span>
                          <Progress value={(recTrend.buy / 50) * 100} className="h-1.5 md:h-2 bg-zinc-800 [&>div]:bg-emerald-400" />
                          <span className="w-6 md:w-8 text-[10px] md:text-xs font-medium">{recTrend.buy}</span>
                        </div>
                        <div className="flex items-center gap-2 md:gap-3">
                          <span className="w-16 md:w-20 text-[10px] md:text-xs text-zinc-400 text-right">Hold</span>
                          <Progress value={(recTrend.hold / 50) * 100} className="h-1.5 md:h-2 bg-zinc-800 [&>div]:bg-zinc-400" />
                          <span className="w-6 md:w-8 text-[10px] md:text-xs font-medium">{recTrend.hold}</span>
                        </div>
                        <div className="flex items-center gap-2 md:gap-3">
                          <span className="w-16 md:w-20 text-[10px] md:text-xs text-zinc-400 text-right">Sell</span>
                          <Progress value={(recTrend.sell / 50) * 100} className="h-1.5 md:h-2 bg-zinc-800 [&>div]:bg-rose-400" />
                          <span className="w-6 md:w-8 text-[10px] md:text-xs font-medium">{recTrend.sell}</span>
                        </div>
                        <div className="flex items-center gap-2 md:gap-3">
                          <span className="w-16 md:w-20 text-[10px] md:text-xs text-zinc-400 text-right">Strong Sell</span>
                          <Progress value={(recTrend.strongSell / 50) * 100} className="h-1.5 md:h-2 bg-zinc-800 [&>div]:bg-rose-600" />
                          <span className="w-6 md:w-8 text-[10px] md:text-xs font-medium">{recTrend.strongSell}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-zinc-500 text-sm text-center py-4">No analyst data available</div>
                    )}
                  </CardContent>
                </Card>

                {/* Price Targets */}
                <Card className="border-zinc-800 bg-zinc-900/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2"><ArrowUpRight className="h-5 w-5 text-zinc-400"/> Price Targets</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col h-full justify-center space-y-4 md:space-y-6 text-sm md:text-base">
                      <div className="flex justify-between items-center">
                        <span className="text-zinc-400">High Target</span>
                        <span className="font-bold text-emerald-400">{formatCurrency(financialData.targetHighPrice)}</span>
                      </div>
                      <Separator className="bg-zinc-800" />
                      <div className="flex justify-between items-center">
                        <span className="text-zinc-400">Median Target</span>
                        <span className="font-bold text-indigo-400">{formatCurrency(financialData.targetMedianPrice)}</span>
                      </div>
                      <Separator className="bg-zinc-800" />
                      <div className="flex justify-between items-center">
                        <span className="text-zinc-400">Low Target</span>
                        <span className="font-bold text-rose-400">{formatCurrency(financialData.targetLowPrice)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Company Profile */}
                <Card className="border-zinc-800 bg-zinc-900/50 lg:col-span-2">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Info className="h-5 w-5 text-zinc-400"/> Company Profile</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs md:text-sm text-zinc-300 leading-relaxed line-clamp-4 md:line-clamp-none mb-4">
                      {profile.longBusinessSummary || "No description available."}
                    </p>
                    <div className="flex flex-wrap gap-3 md:gap-4 text-xs md:text-sm">
                      {profile.website && (
                        <a href={profile.website} target="_blank" rel="noreferrer" className="text-indigo-400 hover:underline flex items-center gap-1">
                          Website <ArrowUpRight className="h-3 w-3" />
                        </a>
                      )}
                      {profile.fullTimeEmployees && (
                        <span className="text-zinc-400 flex items-center gap-1">
                          <Users className="h-3 w-3" /> {new Intl.NumberFormat().format(profile.fullTimeEmployees)} Employees
                        </span>
                      )}
                      {profile.city && profile.country && (
                        <span className="text-zinc-400">
                          HQ: {profile.city}, {profile.country}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Recent News */}
                <Card className="border-zinc-800 bg-zinc-900/50 lg:col-span-3">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Newspaper className="h-5 w-5 text-zinc-400"/> Recent News</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {newsData.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                        {newsData.slice(0, 6).map((newsItem, idx) => (
                          <a 
                            key={idx} 
                            href={newsItem.link} 
                            target="_blank" 
                            rel="noreferrer"
                            className="block p-3 md:p-4 rounded-lg bg-zinc-950 border border-zinc-800 hover:border-zinc-700 transition-colors group"
                          >
                            <div className="text-[10px] md:text-xs text-zinc-500 mb-1.5 md:mb-2 flex items-center justify-between">
                              <span className="truncate mr-2">{newsItem.publisher}</span>
                              <span className="shrink-0">{new Date(newsItem.providerPublishTime * 1000).toLocaleDateString()}</span>
                            </div>
                            <h3 className="font-medium text-xs md:text-sm group-hover:text-indigo-400 transition-colors line-clamp-2">
                              {newsItem.title}
                            </h3>
                          </a>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-zinc-500 text-sm">No recent news available.</div>
                    )}
                  </CardContent>
                </Card>

              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
