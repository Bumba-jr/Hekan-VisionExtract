import React, { useState, useCallback } from 'react';
import { useDropzone, DropzoneOptions } from 'react-dropzone';
import { motion, AnimatePresence } from 'motion/react';
import {
  Upload,
  FileText,
  Download,
  Trash2,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Image as ImageIcon,
  FileSpreadsheet,
  Users,
  ArrowUp,
  ArrowDown,
  Type as TypeIcon,
  Clock,
  Edit2,
  Save,
  X,
  History,
  TrendingUp,
  DollarSign,
  Search,
  Filter,
  BarChart3,
  Calendar,
  ChevronRight
} from 'lucide-react';
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
  LineChart,
  Line,
  Legend
} from 'recharts';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { Toaster, toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { extractTextFromImage, ExtractedData, RegistrationRow } from './lib/gemini';
import { cn } from '@/lib/utils';
import { supabase, isSupabaseConfigured } from './lib/supabase';

interface FileWithStatus {
  id: string;
  file: File;
  preview: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  result?: ExtractedData;
  progress: number;
}

export default function App() {
  const [files, setFiles] = useState<FileWithStatus[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [batchName, setBatchName] = useState('HEKAN_Registration_Batch');
  const [previewImage, setPreviewImage] = useState<{ url: string; name: string } | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [editingRow, setEditingRow] = useState<{ fileId: string; rowIndex: number; data: RegistrationRow } | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isBatchSaved, setIsBatchSaved] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<{ batch: any; registrations: any[] } | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [globalSearchResults, setGlobalSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [filterDCC, setFilterDCC] = useState('All');
  const [filterLCC, setFilterLCC] = useState('All');
  const [analyticsData, setAnalyticsData] = useState<{
    dccDistribution: any[];
    registrationTrend: any[];
    amountTrend: any[];
  }>({
    dccDistribution: [],
    registrationTrend: [],
    amountTrend: []
  });
  const timerRef = React.useRef<NodeJS.Timeout | null>(null);

  const fetchHistory = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    setIsLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from('batches')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setHistory(data || []);

      // Prepare analytics data
      if (data && data.length > 0) {
        const trend = data.slice().reverse().map(b => ({
          name: b.name.length > 10 ? b.name.substring(0, 10) + '...' : b.name,
          registrants: b.registrant_count,
          amount: b.total_amount,
          date: new Date(b.created_at).toLocaleDateString()
        }));

        // Fetch DCC distribution
        const { data: regData } = await supabase
          .from('registrations')
          .select('dcc');

        if (regData) {
          const dccCounts: Record<string, number> = {};
          regData.forEach(r => {
            const dcc = r.dcc || 'Unknown';
            dccCounts[dcc] = (dccCounts[dcc] || 0) + 1;
          });

          const dccDist = Object.entries(dccCounts).map(([name, value]) => ({ name, value }));
          setAnalyticsData({
            dccDistribution: dccDist,
            registrationTrend: trend,
            amountTrend: trend
          });
        }
      }
    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      setIsLoadingHistory(false);
    }
  }, []);

  const performGlobalSearch = async (query: string) => {
    if (!query.trim() || !isSupabaseConfigured) {
      setGlobalSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const { data, error } = await supabase
        .from('registrations')
        .select(`
          *,
          batches (
            name
          )
        `)
        .or(`full_name.ilike.%${query}%,phone.ilike.%${query}%,email.ilike.%${query}%,dcc.ilike.%${query}%,lcc.ilike.%${query}%`)
        .limit(50);

      if (error) throw error;
      setGlobalSearchResults(data || []);
    } catch (error) {
      console.error('Search error:', error);
      toast.error("Search failed");
    } finally {
      setIsSearching(false);
    }
  };

  React.useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const fetchBatchDetails = async (batch: any) => {
    setIsLoadingDetails(true);
    try {
      const { data, error } = await supabase
        .from('registrations')
        .select('*')
        .eq('batch_id', batch.id);

      if (error) throw error;
      setSelectedBatch({ batch, registrations: data || [] });
    } catch (error) {
      console.error('Error fetching batch details:', error);
      toast.error("Failed to load batch details");
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const deleteBatch = async (id: string) => {
    try {
      const { error } = await supabase
        .from('batches')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success("Batch deleted");
      fetchHistory();
    } catch (error) {
      console.error('Error deleting batch:', error);
      toast.error("Failed to delete batch");
    }
  };

  const onDrop: DropzoneOptions['onDrop'] = useCallback((acceptedFiles) => {
    const newFiles = acceptedFiles.map(file => ({
      id: Math.random().toString(36).substring(7),
      file,
      preview: URL.createObjectURL(file),
      status: 'pending' as const,
      progress: 0
    }));
    setFiles(prev => [...prev, ...newFiles]);
    setIsBatchSaved(false);
    toast.success(`Added ${acceptedFiles.length} images`);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true,
    accept: {
      'image/jpeg': ['.jpeg', '.jpg'],
      'image/png': ['.png'],
      'image/webp': ['.webp']
    }
  } as any);

  const removeFile = (id: string) => {
    setFiles(prev => {
      const fileToRemove = prev.find(f => f.id === id);
      if (fileToRemove) URL.revokeObjectURL(fileToRemove.preview);
      return prev.filter(f => f.id !== id);
    });
  };

  const moveFile = (id: string, direction: 'up' | 'down') => {
    setFiles(prev => {
      const index = prev.findIndex(f => f.id === id);
      if (index === -1) return prev;

      const newFiles = [...prev];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;

      if (targetIndex < 0 || targetIndex >= newFiles.length) return prev;

      [newFiles[index], newFiles[targetIndex]] = [newFiles[targetIndex], newFiles[index]];
      return newFiles;
    });
  };

  const processFiles = async () => {
    if (files.length === 0) return;

    setIsProcessing(true);
    setElapsedTime(0);

    // Start global timer
    timerRef.current = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);

    const pendingFiles = files.filter(f => f.status === 'pending' || f.status === 'error');

    for (const fileStatus of pendingFiles) {
      setFiles(prev => prev.map(f =>
        f.id === fileStatus.id ? { ...f, status: 'processing', progress: 10 } : f
      ));

      try {
        // Simulate granular progress while waiting for AI
        const progressInterval = setInterval(() => {
          setFiles(prev => prev.map(f => {
            if (f.id === fileStatus.id && f.status === 'processing' && f.progress < 90) {
              return { ...f, progress: f.progress + 2 };
            }
            return f;
          }));
        }, 800);

        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve) => {
          reader.onload = () => {
            const base64 = (reader.result as string).split(',')[1];
            resolve(base64);
          };
          reader.readAsDataURL(fileStatus.file);
        });

        const base64Data = await base64Promise;

        const result = await extractTextFromImage(
          base64Data,
          fileStatus.file.name,
          fileStatus.file.type
        );

        clearInterval(progressInterval);

        setFiles(prev => prev.map(f =>
          f.id === fileStatus.id ? { ...f, status: 'completed', result, progress: 100 } : f
        ));
      } catch (error) {
        console.error(error);
        setFiles(prev => prev.map(f =>
          f.id === fileStatus.id ? { ...f, status: 'error', progress: 0 } : f
        ));
        toast.error(`Failed to process ${fileStatus.file.name}`);
      }
    }

    if (timerRef.current) clearInterval(timerRef.current);
    setIsProcessing(false);

    toast.success("All files processed! You can now review and save to database.");
  };

  const saveBatchToSupabase = async () => {
    if (!isSupabaseConfigured) {
      toast.error("Supabase is not configured. Please add your API keys in the Secrets panel.");
      return;
    }

    if (isBatchSaved) {
      toast.error("This batch has already been saved to the database.");
      return;
    }

    const completedFiles = files.filter(f => f.status === 'completed' && f.result);
    if (completedFiles.length === 0) {
      toast.error("No processed data to save");
      return;
    }

    setIsSaving(true);

    try {
      // Check if batch name already exists
      const { data: existingBatch } = await supabase
        .from('batches')
        .select('id')
        .eq('name', batchName)
        .maybeSingle();

      if (existingBatch) {
        // In a real app we'd show a dialog, but confirm() is blocked in iframes
        // We'll proceed but notify the user
        toast.info(`Saving as a new entry (batch "${batchName}" already exists)`);
      }

      const allRows = completedFiles.flatMap(f => f.result?.rows || []);
      const totalAmount = allRows.reduce((sum, row) => {
        const val = parseFloat(row.amount.replace(/[^0-9.]/g, '')) || 0;
        return sum + val;
      }, 0);

      const { data: batch, error: batchError } = await supabase
        .from('batches')
        .insert({
          name: batchName,
          registrant_count: allRows.length,
          total_amount: totalAmount
        })
        .select()
        .single();

      if (batchError) throw batchError;

      const registrations = allRows.map(row => ({
        batch_id: batch.id,
        s_no: row.sNo,
        full_name: row.fullName,
        position: row.position,
        dcc: row.dcc,
        lcc: row.lcc,
        phone: row.phone,
        email: row.email,
        payment_info: row.paymentInfo,
        amount: row.amount
      }));

      const { error: regError } = await supabase
        .from('registrations')
        .insert(registrations);

      if (regError) throw regError;

      setIsBatchSaved(true);
      fetchHistory();
      toast.success("Batch saved to database successfully!");
    } catch (error) {
      console.error('Error saving batch:', error);
      toast.error("Failed to save batch to database");
    } finally {
      setIsSaving(false);
    }
  };

  const updateRow = (fileId: string, rowIndex: number, newData: RegistrationRow) => {
    setFiles(prev => prev.map(f => {
      if (f.id === fileId && f.result) {
        const newRows = [...f.result.rows];
        newRows[rowIndex] = newData;
        return { ...f, result: { ...f.result, rows: newRows } };
      }
      return f;
    }));
    setEditingRow(null);
    toast.success("Row updated locally");
  };

  const deleteRow = (fileId: string, rowIndex: number) => {
    setFiles(prev => prev.map(f => {
      if (f.id === fileId && f.result) {
        const newRows = f.result.rows.filter((_, idx) => idx !== rowIndex);
        return { ...f, result: { ...f.result, rows: newRows } };
      }
      return f;
    }));
    toast.success("Registrant removed from preview");
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const downloadExcel = async () => {
    const completedFiles = files.filter(f => f.status === 'completed' && f.result);
    if (completedFiles.length === 0) {
      toast.error("No processed data to export");
      return;
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Registration Form');

    // Main Title
    worksheet.mergeCells('A1:I2');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = 'HEKAN 60TH NATIONAL CONVENTION\nREGISTRATION FORM';
    titleCell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    titleCell.font = { name: 'Arial Black', size: 20, color: { argb: 'FFFFFFFF' } }; // Increased font size
    titleCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF166534' } // Dark Green
    };
    worksheet.getRow(1).height = 60; // Increased height
    worksheet.getRow(2).height = 60; // Total title height 120

    // Column Headers
    const headers = [
      'S/NO',
      'Full Name',
      'Position in the church',
      'District Church Council (DCC) & GCC Office/Mission Field',
      'Local Church Council (LCC) & GCC Office/Mission Field',
      'Phone Number (if Available)',
      'Email address (If available)',
      'Bank (POS) Payment Receipt/Transaction ID or Cash',
      'Amount'
    ];

    const headerRow = worksheet.addRow(headers);
    headerRow.height = 95; // Further increased height
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFDCFCE7' } // Light Green
      };
      cell.font = { bold: true, color: { argb: 'FF166534' }, size: 11 };
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });

    // Add Data
    let globalSNo = 1;
    completedFiles.forEach(file => {
      file.result?.rows.forEach(row => {
        const dataRow = worksheet.addRow([
          globalSNo++,
          row.fullName,
          row.position,
          row.dcc,
          row.lcc,
          row.phone,
          row.email,
          row.paymentInfo,
          row.amount
        ]);

        dataRow.eachCell((cell) => {
          cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };
        });
      });
    });

    // Column Widths
    worksheet.columns = [
      { width: 8 },  // S/NO
      { width: 35 }, // Full Name
      { width: 25 }, // Position
      { width: 35 }, // DCC
      { width: 35 }, // LCC
      { width: 20 }, // Phone
      { width: 25 }, // Email
      { width: 40 }, // Payment Info
      { width: 15 }  // Amount
    ];

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `${batchName.replace(/[^a-z0-9]/gi, '_')}_${new Date().getTime()}.xlsx`);
    toast.success("Professional Excel document downloaded");
  };

  const historyRegistrants = history.reduce((acc, b) => acc + (b.registrant_count || 0), 0);
  const currentRegistrants = isBatchSaved ? 0 : files.reduce((acc, f) => acc + (f.result?.rows.length || 0), 0);
  const totalRegistrants = historyRegistrants + currentRegistrants;

  const historyAmount = history.reduce((acc, b) => acc + (b.total_amount || 0), 0);
  const currentAmount = isBatchSaved ? 0 : files.reduce((acc, f) => {
    const rows = f.result?.rows || [];
    return acc + rows.reduce((sum, row) => {
      const val = parseFloat(row.amount.replace(/[^0-9.]/g, '')) || 0;
      return sum + val;
    }, 0);
  }, 0);
  const totalAmount = historyAmount + currentAmount;

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#1A1A1A] font-sans p-4 md:p-8">
      <Toaster position="top-center" />

      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-[#166534] rounded-2xl flex items-center justify-center shadow-lg transform -rotate-3">
              <FileSpreadsheet className="text-white h-8 w-8" />
            </div>
            <div>
              <h1 className="text-4xl font-black tracking-tight text-[#0F172A] uppercase">VisionExtract</h1>
              <p className="text-[#166534] font-medium flex items-center gap-2 italic">
                <span className="w-2 h-2 bg-[#166534] rounded-full animate-pulse"></span>
                HEKAN 60th Convention Edition
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative mr-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
              <Input
                placeholder="Search all records..."
                className="pl-9 w-[200px] md:w-[300px] border-[#E2E8F0] focus-visible:ring-[#166534] bg-white"
                value={globalSearchQuery}
                onChange={(e) => {
                  setGlobalSearchQuery(e.target.value);
                  performGlobalSearch(e.target.value);
                }}
              />
            </div>
            {isSupabaseConfigured ? (
              <Badge variant="outline" className="bg-[#F0FDF4] text-[#166534] border-[#BBF7D0] py-1.5 px-3">
                <div className="w-2 h-2 bg-[#166534] rounded-full mr-2 animate-pulse"></div>
                Database Connected
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-[#FEF2F2] text-[#EF4444] border-[#FECACA] py-1.5 px-3">
                <div className="w-2 h-2 bg-[#EF4444] rounded-full mr-2"></div>
                Database Disconnected
              </Badge>
            )}
            <Button
              variant="outline"
              onClick={() => setFiles([])}
              disabled={files.length === 0 || isProcessing}
              className="border-[#E2E8F0] hover:bg-white text-[#64748B]"
            >
              Reset Queue
            </Button>
            <Button
              onClick={processFiles}
              disabled={files.length === 0 || isProcessing || !files.some(f => f.status === 'pending' || f.status === 'error')}
              className="bg-[#166534] hover:bg-[#14532D] text-white px-8 shadow-md transition-all active:scale-95"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing Forms...
                </>
              ) : (
                <>
                  <FileText className="mr-2 h-4 w-4" />
                  Process All Forms
                </>
              )}
            </Button>
            <Button
              onClick={saveBatchToSupabase}
              disabled={!files.some(f => f.status === 'completed') || isSaving || !isSupabaseConfigured || isBatchSaved}
              className={cn(
                "shadow-md transition-all active:scale-95",
                isBatchSaved
                  ? "bg-[#F1F5F9] text-[#94A3B8] cursor-not-allowed"
                  : "bg-[#6366F1] hover:bg-[#4F46E5] text-white"
              )}
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : isBatchSaved ? (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4 text-[#10B981]" />
                  Batch Saved
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save to Database
                </>
              )}
            </Button>
            <Button
              onClick={downloadExcel}
              disabled={!files.some(f => f.status === 'completed')}
              className="bg-[#10B981] hover:bg-[#059669] text-white shadow-md transition-all active:scale-95"
            >
              <Download className="mr-2 h-4 w-4" />
              Download Excel
            </Button>
          </div>
        </header>

        {/* Analytics Dashboard */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
          <Card className="border-none shadow-sm bg-white overflow-hidden">
            <div className="h-1 bg-[#166534]"></div>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-[#F0FDF4] rounded-lg flex items-center justify-center">
                  <Users className="h-4 w-4 text-[#166534]" />
                </div>
                <p className="text-xs font-bold text-[#64748B] uppercase tracking-wider">Overall Registrants</p>
              </div>
              <div className="flex items-end justify-between">
                <p className="text-3xl font-black text-[#0F172A] leading-none">{totalRegistrants}</p>
                <TrendingUp className="h-5 w-5 text-[#166534]" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-white overflow-hidden">
            <div className="h-1 bg-[#10B981]"></div>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-[#ECFDF5] rounded-lg flex items-center justify-center">
                  <DollarSign className="h-4 w-4 text-[#10B981]" />
                </div>
                <p className="text-xs font-bold text-[#64748B] uppercase tracking-wider">Overall Amount</p>
              </div>
              <div className="flex items-end justify-between">
                <p className="text-3xl font-black text-[#0F172A] leading-none">₦{totalAmount.toLocaleString()}</p>
                <TrendingUp className="h-5 w-5 text-[#10B981]" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-white overflow-hidden">
            <div className="h-1 bg-[#F59E0B]"></div>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-[#FFFBEB] rounded-lg flex items-center justify-center">
                  <Users className="h-4 w-4 text-[#F59E0B]" />
                </div>
                <p className="text-xs font-bold text-[#64748B] uppercase tracking-wider">Current Registrants</p>
              </div>
              <div className="flex items-end justify-between">
                <p className="text-3xl font-black text-[#0F172A] leading-none">{currentRegistrants}</p>
                <TrendingUp className="h-5 w-5 text-[#F59E0B]" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-white overflow-hidden">
            <div className="h-1 bg-[#EA580C]"></div>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-[#FFF7ED] rounded-lg flex items-center justify-center">
                  <DollarSign className="h-4 w-4 text-[#EA580C]" />
                </div>
                <p className="text-xs font-bold text-[#64748B] uppercase tracking-wider">Current Amount</p>
              </div>
              <div className="flex items-end justify-between">
                <p className="text-3xl font-black text-[#0F172A] leading-none">₦{currentAmount.toLocaleString()}</p>
                <TrendingUp className="h-5 w-5 text-[#EA580C]" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-white overflow-hidden">
            <div className="h-1 bg-[#6366F1]"></div>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-[#EEF2FF] rounded-lg flex items-center justify-center">
                  <History className="h-4 w-4 text-[#6366F1]" />
                </div>
                <p className="text-xs font-bold text-[#64748B] uppercase tracking-wider">Saved Batches</p>
              </div>
              <div className="flex items-end justify-between">
                <p className="text-3xl font-black text-[#0F172A] leading-none">{history.length}</p>
                <TrendingUp className="h-5 w-5 text-[#6366F1]" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="extract" className="space-y-8">
          <TabsList className="bg-white border border-[#E2E8F0] p-1 h-12 rounded-xl">
            <TabsTrigger value="extract" className="rounded-lg px-6 data-[state=active]:bg-[#166534] data-[state=active]:text-white">
              <FileText className="h-4 w-4 mr-2" />
              Extraction Tool
            </TabsTrigger>
            <TabsTrigger value="history" className="rounded-lg px-6 data-[state=active]:bg-[#166534] data-[state=active]:text-white">
              <History className="h-4 w-4 mr-2" />
              Batch History
            </TabsTrigger>
            <TabsTrigger value="search" className="rounded-lg px-6 data-[state=active]:bg-[#166534] data-[state=active]:text-white">
              <Search className="h-4 w-4 mr-2" />
              Global Search
            </TabsTrigger>
            <TabsTrigger value="analytics" className="rounded-lg px-6 data-[state=active]:bg-[#166534] data-[state=active]:text-white">
              <BarChart3 className="h-4 w-4 mr-2" />
              Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="extract" className="m-0">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
              {/* Sidebar */}
              <div className="lg:col-span-1 space-y-6">
                <Card className="border-[#E2E8F0] shadow-sm overflow-hidden">
                  <div className="h-2 bg-[#166534]"></div>
                  <CardHeader>
                    <CardTitle className="text-lg">Batch Settings</CardTitle>
                    <CardDescription>Configure your export details</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-[#64748B] uppercase tracking-wider flex items-center gap-2">
                        <TypeIcon className="h-3 w-3" />
                        Section / File Name
                      </label>
                      <Input
                        value={batchName}
                        onChange={(e) => {
                          setBatchName(e.target.value);
                          setIsBatchSaved(false);
                        }}
                        placeholder="Enter section name..."
                        className="border-[#CBD5E1] focus-visible:ring-[#166534]"
                      />
                      <p className="text-[10px] text-[#94A3B8]">This name will be used for the final Excel file.</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-[#E2E8F0] shadow-sm overflow-hidden">
                  <CardHeader>
                    <CardTitle className="text-lg">Drop Zone</CardTitle>
                    <CardDescription>Upload scanned registration forms</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div
                      {...getRootProps()}
                      className={cn(
                        "border-2 border-dashed rounded-xl p-8 transition-all cursor-pointer flex flex-col items-center justify-center text-center gap-4",
                        isDragActive ? "border-[#166534] bg-[#F0FDF4]" : "border-[#CBD5E1] hover:border-[#166534] bg-white"
                      )}
                    >
                      <input {...getInputProps()} />
                      <div className="w-14 h-14 rounded-full bg-[#F1F5F9] flex items-center justify-center group-hover:bg-[#DCFCE7] transition-colors">
                        <Upload className="h-7 w-7 text-[#475569] group-hover:text-[#166534]" />
                      </div>
                      <div>
                        <p className="font-bold text-[#1E293B]">Drop images here</p>
                        <p className="text-xs text-[#64748B] mt-1 uppercase tracking-widest">PNG • JPG • WEBP</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Statistics */}
                <Card className="border-[#E2E8F0] shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-lg">Extraction Stats</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="p-4 bg-[#F8F9FA] rounded-xl border border-[#F1F5F9] flex items-center gap-4">
                      <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
                        <ImageIcon className="h-5 w-5 text-[#64748B]" />
                      </div>
                      <div>
                        <p className="text-xs text-[#64748B] uppercase font-bold">Forms</p>
                        <p className="text-xl font-black text-[#0F172A]">{files.length}</p>
                      </div>
                    </div>
                    <div className="p-4 bg-[#F0FDF4] rounded-xl border border-[#DCFCE7] flex items-center gap-4">
                      <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
                        <Users className="h-5 w-5 text-[#166534]" />
                      </div>
                      <div>
                        <p className="text-xs text-[#166534] uppercase font-bold">Current Batch Rows</p>
                        <p className="text-xl font-black text-[#166534]">{files.reduce((acc, f) => acc + (f.result?.rows.length || 0), 0)}</p>
                      </div>
                    </div>

                    {isProcessing && (
                      <div className="space-y-4 pt-2">
                        <div className="p-3 bg-[#FFFBEB] rounded-lg border border-[#FEF3C7] flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-[#D97706] animate-pulse" />
                            <span className="text-xs font-bold text-[#D97706] uppercase">Time Elapsed</span>
                          </div>
                          <span className="text-sm font-mono font-bold text-[#D97706]">{formatTime(elapsedTime)}</span>
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between text-xs font-bold uppercase text-[#64748B]">
                            <span>Batch Progress</span>
                            <span>
                              {Math.round((files.filter(f => f.status === 'completed').length / files.length) * 100)}%
                            </span>
                          </div>
                          <Progress
                            value={(files.filter(f => f.status === 'completed').length / files.length) * 100}
                            className="h-2 bg-[#E2E8F0]"
                          />
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Results Area */}
              <div className="lg:col-span-3">
                <Card className="border-[#E2E8F0] shadow-sm min-h-[500px] overflow-hidden">
                  <CardHeader className="border-b border-[#F1F5F9] bg-white">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">Extracted Data Preview</CardTitle>
                      <Badge variant="outline" className="text-[#64748B] font-mono">
                        {files.reduce((acc, f) => acc + (f.result?.rows.length || 0), 0)} Rows Found
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    {files.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-[500px] text-[#94A3B8] bg-[#F8F9FA]">
                        <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center shadow-sm mb-6">
                          <ImageIcon className="h-10 w-10 opacity-20" />
                        </div>
                        <p className="font-medium">No forms uploaded yet</p>
                        <p className="text-sm opacity-60">Upload scanned images to begin extraction</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader className="bg-[#F8F9FA]">
                            <TableRow>
                              <TableHead className="w-[80px]">Preview</TableHead>
                              <TableHead>File Source</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Rows Extracted</TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            <AnimatePresence>
                              {files.flatMap((file) => {
                                const rows = [
                                  <motion.tr
                                    key={file.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    className="group border-b border-[#F1F5F9] hover:bg-[#F8F9FA] transition-colors"
                                  >
                                    <TableCell>
                                      <div
                                        className="relative w-12 h-12 rounded-lg overflow-hidden border border-[#E2E8F0] shadow-sm cursor-zoom-in hover:ring-2 hover:ring-[#166534] transition-all"
                                        onClick={() => setPreviewImage({ url: file.preview, name: file.file.name })}
                                      >
                                        <img
                                          src={file.preview}
                                          alt={file.file.name}
                                          className="object-cover w-full h-full"
                                          referrerPolicy="no-referrer"
                                        />
                                      </div>
                                    </TableCell>
                                    <TableCell className="font-medium">
                                      <div className="flex flex-col">
                                        <span className="text-[#1E293B] truncate max-w-[200px]">{file.file.name}</span>
                                        <span className="text-[10px] text-[#94A3B8] uppercase tracking-tighter">
                                          {(file.file.size / 1024 / 1024).toFixed(2)} MB
                                        </span>
                                      </div>
                                    </TableCell>
                                    <TableCell>
                                      {file.status === 'pending' && (
                                        <Badge variant="outline" className="text-[#64748B] border-[#CBD5E1] bg-white">
                                          Waiting
                                        </Badge>
                                      )}
                                      {file.status === 'processing' && (
                                        <div className="flex items-center gap-2">
                                          <Loader2 className="h-3 w-3 animate-spin text-[#166534]" />
                                          <span className="text-xs font-bold text-[#166534] uppercase">Scanning...</span>
                                        </div>
                                      )}
                                      {file.status === 'completed' && (
                                        <Badge className="bg-[#DCFCE7] text-[#166534] hover:bg-[#DCFCE7] border-none font-bold">
                                          <CheckCircle2 className="h-3 w-3 mr-1" />
                                          Success
                                        </Badge>
                                      )}
                                      {file.status === 'error' && (
                                        <Badge variant="destructive" className="bg-[#FEE2E2] text-[#991B1B] hover:bg-[#FEE2E2] border-none font-bold">
                                          <AlertCircle className="h-3 w-3 mr-1" />
                                          Failed
                                        </Badge>
                                      )}
                                    </TableCell>
                                    <TableCell>
                                      {file.status === 'completed' ? (
                                        <span className="text-sm font-bold text-[#475569]">
                                          {file.result?.rows.length} People Found
                                        </span>
                                      ) : file.status === 'processing' ? (
                                        <Progress value={file.progress} className="h-1.5 w-24 bg-[#E2E8F0]" />
                                      ) : (
                                        <span className="text-xs text-[#94A3B8]">Ready for processing</span>
                                      )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                      <div className="flex items-center justify-end gap-1">
                                        <div className="flex flex-col mr-2">
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => moveFile(file.id, 'up')}
                                            disabled={isProcessing || files.indexOf(file) === 0}
                                            className="h-6 w-6 text-[#94A3B8] hover:text-[#166534]"
                                          >
                                            <ArrowUp className="h-3 w-3" />
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => moveFile(file.id, 'down')}
                                            disabled={isProcessing || files.indexOf(file) === files.length - 1}
                                            className="h-6 w-6 text-[#94A3B8] hover:text-[#166534]"
                                          >
                                            <ArrowDown className="h-3 w-3" />
                                          </Button>
                                        </div>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => removeFile(file.id)}
                                          disabled={isProcessing}
                                          className="text-[#94A3B8] hover:text-[#EF4444] hover:bg-[#FEE2E2] rounded-full"
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    </TableCell>
                                  </motion.tr>
                                ];

                                if (file.status === 'completed' && file.result && file.result.rows.length > 0) {
                                  rows.push(
                                    <motion.tr
                                      key={`${file.id}-details`}
                                      initial={{ opacity: 0 }}
                                      animate={{ opacity: 1 }}
                                      exit={{ opacity: 0 }}
                                      className="bg-[#F8F9FA]/50 border-b border-[#F1F5F9]"
                                    >
                                      <TableCell colSpan={5} className="py-0 px-8">
                                        <div className="py-4 space-y-2">
                                          <p className="text-[10px] font-black text-[#94A3B8] uppercase tracking-widest mb-2">Data Preview:</p>
                                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                            {file.result.rows.map((row, idx) => (
                                              <div key={idx} className="bg-white p-3 rounded-lg border border-[#E2E8F0] shadow-sm group/row relative">
                                                <div className="absolute top-2 right-2 opacity-0 group-hover/row:opacity-100 transition-opacity flex gap-1">
                                                  <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6 text-[#64748B] hover:text-[#166534] bg-white/80 backdrop-blur-sm shadow-sm"
                                                    onClick={() => setEditingRow({ fileId: file.id, rowIndex: idx, data: { ...row } })}
                                                  >
                                                    <Edit2 className="h-3 w-3" />
                                                  </Button>
                                                  <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6 text-[#94A3B8] hover:text-[#EF4444] hover:bg-[#FEE2E2] bg-white/80 backdrop-blur-sm shadow-sm"
                                                    onClick={() => deleteRow(file.id, idx)}
                                                  >
                                                    <Trash2 className="h-3 w-3" />
                                                  </Button>
                                                </div>
                                                <p className="text-xs font-bold text-[#1E293B] truncate pr-6">{row.fullName}</p>
                                                <p className="text-[10px] text-[#64748B] truncate">{row.position}</p>
                                                <div className="mt-2 pt-2 border-t border-[#F1F5F9] flex justify-between items-center">
                                                  <span className="text-[9px] font-bold text-[#166534] px-1.5 py-0.5 bg-[#F0FDF4] rounded uppercase">
                                                    ₦{row.amount}
                                                  </span>
                                                  <span className="text-[9px] text-[#94A3B8] italic">{row.lcc}</span>
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      </TableCell>
                                    </motion.tr>
                                  );
                                }

                                return rows;
                              })}
                            </AnimatePresence>
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="history" className="m-0">
            <Card className="border-[#E2E8F0] shadow-sm overflow-hidden">
              <CardHeader className="border-b border-[#F1F5F9] bg-white">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-lg">Saved Batches</CardTitle>
                    <CardDescription>View and manage previously processed registration batches</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 bg-[#F8F9FA] p-1 rounded-lg border border-[#E2E8F0]">
                      <Filter className="h-3 w-3 text-[#64748B] ml-2" />
                      <select
                        className="bg-transparent text-xs font-bold text-[#64748B] outline-none pr-2"
                        value={filterDCC}
                        onChange={(e) => setFilterDCC(e.target.value)}
                      >
                        <option value="All">All DCCs</option>
                        {Array.from(new Set(analyticsData.dccDistribution.map(d => d.name))).map(dcc => (
                          <option key={dcc} value={dcc}>{dcc}</option>
                        ))}
                      </select>
                    </div>
                    <Button variant="outline" size="sm" onClick={fetchHistory} disabled={isLoadingHistory}>
                      {isLoadingHistory ? <Loader2 className="h-4 w-4 animate-spin" /> : <Clock className="h-4 w-4 mr-2" />}
                      Refresh
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {!isSupabaseConfigured ? (
                  <div className="flex flex-col items-center justify-center h-[400px] text-[#94A3B8] bg-[#F8F9FA] p-8 text-center">
                    <AlertCircle className="h-12 w-12 text-[#D97706] mb-4" />
                    <p className="font-bold text-[#1E293B]">Supabase Not Configured</p>
                    <p className="text-sm mt-2 max-w-md">
                      To enable Batch History and persistence, please add <code className="bg-[#E2E8F0] px-1 rounded">VITE_SUPABASE_URL</code> and <code className="bg-[#E2E8F0] px-1 rounded">VITE_SUPABASE_ANON_KEY</code> to the <strong>Secrets</strong> panel in AI Studio settings.
                    </p>
                  </div>
                ) : history.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-[400px] text-[#94A3B8] bg-[#F8F9FA]">
                    <History className="h-12 w-12 opacity-10 mb-4" />
                    <p className="font-medium">No batches saved yet</p>
                    <p className="text-sm opacity-60">Complete a processing batch to see it here</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader className="bg-[#F8F9FA]">
                      <TableRow>
                        <TableHead>Batch Name</TableHead>
                        <TableHead>Date Processed</TableHead>
                        <TableHead>Registrants</TableHead>
                        <TableHead>Total Amount</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {history
                        .filter(batch => filterDCC === 'All' || batch.name.includes(filterDCC)) // Simple filter for now
                        .map((batch) => (
                          <TableRow key={batch.id} className="hover:bg-[#F8F9FA]">
                            <TableCell className="font-bold text-[#1E293B]">{batch.name}</TableCell>
                            <TableCell className="text-[#64748B]">
                              {new Date(batch.created_at).toLocaleDateString()} {new Date(batch.created_at).toLocaleTimeString()}
                            </TableCell>
                            <TableCell>
                              <Badge className="bg-[#EEF2FF] text-[#6366F1] hover:bg-[#EEF2FF] border-none">
                                {batch.registrant_count} People
                              </Badge>
                            </TableCell>
                            <TableCell className="font-mono font-bold text-[#166534]">
                              ₦{batch.total_amount.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-[#64748B] hover:text-[#166534]"
                                  onClick={() => fetchBatchDetails(batch)}
                                  disabled={isLoadingDetails}
                                >
                                  {isLoadingDetails && selectedBatch?.batch.id === batch.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    "View Details"
                                  )}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-[#94A3B8] hover:text-[#EF4444] hover:bg-[#FEE2E2]"
                                  onClick={() => deleteBatch(batch.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="search" className="m-0">
            <Card className="border-[#E2E8F0] shadow-sm overflow-hidden">
              <CardHeader className="border-b border-[#F1F5F9] bg-white">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Global Search Results</CardTitle>
                    <CardDescription>
                      {globalSearchQuery ? `Showing results for "${globalSearchQuery}"` : "Enter a search term in the header to find records"}
                    </CardDescription>
                  </div>
                  {isSearching && <Loader2 className="h-5 w-5 animate-spin text-[#166534]" />}
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {!globalSearchQuery ? (
                  <div className="flex flex-col items-center justify-center h-[400px] text-[#94A3B8] bg-[#F8F9FA]">
                    <Search className="h-12 w-12 opacity-10 mb-4" />
                    <p className="font-medium">Ready to search</p>
                    <p className="text-sm opacity-60">Search by Name, Phone, Email, DCC or LCC</p>
                  </div>
                ) : globalSearchResults.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-[400px] text-[#94A3B8] bg-[#F8F9FA]">
                    <X className="h-12 w-12 opacity-10 mb-4" />
                    <p className="font-medium">No results found</p>
                    <p className="text-sm opacity-60">Try a different search term</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader className="bg-[#F8F9FA]">
                      <TableRow>
                        <TableHead>Full Name</TableHead>
                        <TableHead>DCC / LCC</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Batch</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {globalSearchResults.map((reg) => (
                        <TableRow key={reg.id} className="hover:bg-[#F8F9FA]">
                          <TableCell className="font-bold text-[#1E293B]">{reg.full_name}</TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="text-xs font-medium text-[#1E293B]">{reg.dcc}</span>
                              <span className="text-[10px] text-[#94A3B8]">{reg.lcc}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="text-xs text-[#1E293B]">{reg.phone}</span>
                              <span className="text-[10px] text-[#64748B]">{reg.email}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="bg-[#F1F5F9] text-[#475569] border-[#E2E8F0]">
                              {reg.batches?.name}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono font-bold text-[#166534]">
                            ₦{reg.amount}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="m-0">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Card className="border-[#E2E8F0] shadow-sm overflow-hidden">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-[#166534]" />
                    Registration Trend
                  </CardTitle>
                  <CardDescription>Number of registrants per batch over time</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px] pt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analyticsData.registrationTrend}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                      <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis fontSize={10} tickLine={false} axisLine={false} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        cursor={{ fill: '#F8F9FA' }}
                      />
                      <Bar dataKey="registrants" fill="#166534" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="border-[#E2E8F0] shadow-sm overflow-hidden">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-[#10B981]" />
                    Revenue Growth
                  </CardTitle>
                  <CardDescription>Total amount collected per batch</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px] pt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={analyticsData.amountTrend}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                      <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis fontSize={10} tickLine={false} axisLine={false} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      />
                      <Line type="monotone" dataKey="amount" stroke="#10B981" strokeWidth={3} dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="border-[#E2E8F0] shadow-sm overflow-hidden lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="h-5 w-5 text-[#6366F1]" />
                    DCC Distribution
                  </CardTitle>
                  <CardDescription>Breakdown of registrants by District Church Council</CardDescription>
                </CardHeader>
                <CardContent className="h-[400px] pt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={analyticsData.dccDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={80}
                        outerRadius={140}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      >
                        {analyticsData.dccDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={['#166534', '#10B981', '#F59E0B', '#EA580C', '#6366F1', '#8B5CF6', '#EC4899'][index % 7]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #E2E8F0' }}
                      />
                      <Legend verticalAlign="bottom" height={36} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Batch Details Dialog */}
      <Dialog open={!!selectedBatch} onOpenChange={(open) => !open && setSelectedBatch(null)}>
        <DialogContent className="w-[95vw] max-w-[95vw] max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between pr-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#F0FDF4] rounded-lg flex items-center justify-center">
                  <History className="h-5 w-5 text-[#166534]" />
                </div>
                <div>
                  <span className="text-xl font-black text-[#0F172A]">{selectedBatch?.batch.name}</span>
                  <p className="text-xs text-[#64748B] font-normal">
                    Processed on {selectedBatch && new Date(selectedBatch.batch.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <Badge className="bg-[#EEF2FF] text-[#6366F1] border-none">
                {selectedBatch?.registrations.length} Registrants
              </Badge>
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-auto mt-4 border rounded-xl">
            <Table>
              <TableHeader className="bg-[#F8F9FA] sticky top-0 z-10">
                <TableRow>
                  <TableHead className="w-[50px]">S/NO</TableHead>
                  <TableHead>Full Name</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead>DCC</TableHead>
                  <TableHead>LCC</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Payment Info</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedBatch?.registrations.map((reg, idx) => (
                  <TableRow key={reg.id} className="hover:bg-[#F8F9FA]/50">
                    <TableCell className="font-mono text-xs text-[#64748B]">{reg.s_no || idx + 1}</TableCell>
                    <TableCell className="font-bold text-[#1E293B] whitespace-nowrap">{reg.full_name}</TableCell>
                    <TableCell className="text-xs text-[#64748B]">{reg.position}</TableCell>
                    <TableCell className="text-xs text-[#1E293B]">{reg.dcc}</TableCell>
                    <TableCell className="text-xs text-[#94A3B8]">{reg.lcc}</TableCell>
                    <TableCell className="text-xs text-[#1E293B] whitespace-nowrap">{reg.phone}</TableCell>
                    <TableCell className="text-xs text-[#64748B]">{reg.email}</TableCell>
                    <TableCell className="text-xs text-[#64748B] max-w-[180px] truncate">{reg.payment_info}</TableCell>
                    <TableCell className="text-right font-mono font-bold text-[#166534] whitespace-nowrap">
                      ₦{reg.amount}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex justify-between items-center pt-4 border-t mt-4">
            <p className="text-xs text-[#94A3B8]">
              Total: <span className="font-bold text-[#166534]">
                ₦{selectedBatch?.registrations.reduce((sum, r) => sum + (parseFloat(r.amount?.replace(/[^0-9.]/g, '') || '0') || 0), 0).toLocaleString()}
              </span>
            </p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setSelectedBatch(null)}>
                Close
              </Button>
              <Button
                className="bg-[#10B981] hover:bg-[#059669] text-white"
                onClick={async () => {
                  if (!selectedBatch) return;
                  const workbook = new ExcelJS.Workbook();
                  const worksheet = workbook.addWorksheet('Registration Form');

                  worksheet.mergeCells('A1:I2');
                  const titleCell = worksheet.getCell('A1');
                  titleCell.value = 'HEKAN 60TH NATIONAL CONVENTION\nREGISTRATION FORM';
                  titleCell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
                  titleCell.font = { name: 'Arial Black', size: 20, color: { argb: 'FFFFFFFF' } };
                  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF166534' } };
                  worksheet.getRow(1).height = 60;
                  worksheet.getRow(2).height = 60;

                  const headers = [
                    'S/NO', 'Full Name', 'Position in the church',
                    'District Church Council (DCC) & GCC Office/Mission Field',
                    'Local Church Council (LCC) & GCC Office/Mission Field',
                    'Phone Number (if Available)', 'Email address (If available)',
                    'Bank (POS) Payment Receipt/Transaction ID or Cash', 'Amount'
                  ];
                  const headerRow = worksheet.addRow(headers);
                  headerRow.height = 95;
                  headerRow.eachCell((cell) => {
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCFCE7' } };
                    cell.font = { bold: true, color: { argb: 'FF166534' }, size: 11 };
                    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
                    cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
                  });

                  selectedBatch.registrations.forEach((reg, idx) => {
                    const dataRow = worksheet.addRow([
                      reg.s_no || idx + 1, reg.full_name, reg.position,
                      reg.dcc, reg.lcc, reg.phone, reg.email, reg.payment_info, reg.amount
                    ]);
                    dataRow.eachCell((cell) => {
                      cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
                      cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
                    });
                  });

                  worksheet.columns = [
                    { width: 8 }, { width: 35 }, { width: 25 }, { width: 35 },
                    { width: 35 }, { width: 20 }, { width: 25 }, { width: 40 }, { width: 15 }
                  ];

                  const buffer = await workbook.xlsx.writeBuffer();
                  saveAs(new Blob([buffer]), `${selectedBatch.batch.name.replace(/[^a-z0-9]/gi, '_')}_${new Date().getTime()}.xlsx`);
                  toast.success("Batch exported successfully!");
                }}
              >
                <Download className="h-4 w-4 mr-2" />
                Download Excel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Row Dialog */}
      <Dialog open={!!editingRow} onOpenChange={(open) => !open && setEditingRow(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Registration Data</DialogTitle>
          </DialogHeader>
          {editingRow && (
            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#64748B] uppercase">Full Name</label>
                <Input
                  value={editingRow.data.fullName}
                  onChange={(e) => setEditingRow({ ...editingRow, data: { ...editingRow.data, fullName: e.target.value } })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#64748B] uppercase">Position</label>
                <Input
                  value={editingRow.data.position}
                  onChange={(e) => setEditingRow({ ...editingRow, data: { ...editingRow.data, position: e.target.value } })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#64748B] uppercase">DCC</label>
                <Input
                  value={editingRow.data.dcc}
                  onChange={(e) => setEditingRow({ ...editingRow, data: { ...editingRow.data, dcc: e.target.value } })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#64748B] uppercase">LCC</label>
                <Input
                  value={editingRow.data.lcc}
                  onChange={(e) => setEditingRow({ ...editingRow, data: { ...editingRow.data, lcc: e.target.value } })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#64748B] uppercase">Phone</label>
                <Input
                  value={editingRow.data.phone}
                  onChange={(e) => setEditingRow({ ...editingRow, data: { ...editingRow.data, phone: e.target.value } })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#64748B] uppercase">Email</label>
                <Input
                  value={editingRow.data.email}
                  onChange={(e) => setEditingRow({ ...editingRow, data: { ...editingRow.data, email: e.target.value } })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#64748B] uppercase">Payment Info</label>
                <Input
                  value={editingRow.data.paymentInfo}
                  onChange={(e) => setEditingRow({ ...editingRow, data: { ...editingRow.data, paymentInfo: e.target.value } })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#64748B] uppercase">Amount</label>
                <Input
                  value={editingRow.data.amount}
                  onChange={(e) => setEditingRow({ ...editingRow, data: { ...editingRow.data, amount: e.target.value } })}
                />
              </div>
            </div>
          )}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => setEditingRow(null)}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button className="bg-[#166534] hover:bg-[#14532D]" onClick={() => editingRow && updateRow(editingRow.fileId, editingRow.rowIndex, editingRow.data)}>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!previewImage} onOpenChange={(open) => !open && setPreviewImage(null)}>
        <DialogContent className="max-w-[98vw] w-[98vw] h-[98vh] p-0 overflow-hidden bg-black/90 border-none flex flex-col">
          <DialogHeader className="absolute top-4 left-4 z-50 bg-white/90 backdrop-blur-md p-3 rounded-xl shadow-2xl border border-white/20">
            <DialogTitle className="text-sm font-black uppercase tracking-tight truncate max-w-[400px] text-[#0F172A]">
              {previewImage?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 w-full h-full flex items-center justify-center p-2 md:p-6">
            {previewImage && (
              <img
                src={previewImage.url}
                alt={previewImage.name}
                className="max-w-full max-h-full object-contain shadow-2xl rounded-sm transition-transform duration-300"
                referrerPolicy="no-referrer"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
