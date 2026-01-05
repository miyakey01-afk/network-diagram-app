
import React, { useState, useEffect } from 'react';
import { DiagramType, ImageProcessingState, GeneratedDiagram } from './types';
import { generateNetworkDiagram, editNetworkDiagram } from './services/geminiService';
import ApiKeySelection from './components/ApiKeySelection';

const App: React.FC = () => {
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  const [editPrompt, setEditPrompt] = useState('');
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [state, setState] = useState<ImageProcessingState>({
    originalImage: null,
    diagrams: [],
    selectedDiagramId: null,
    isGlobalLoading: false,
    isEditing: false
  });

  useEffect(() => {
    const checkKey = async () => {
      const selected = await (window as any).aistudio?.hasSelectedApiKey();
      setHasKey(!!selected);
    };
    checkKey();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setState({
          originalImage: reader.result as string,
          diagrams: [],
          selectedDiagramId: null,
          isGlobalLoading: false,
          isEditing: false
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const generateAll = async () => {
    if (!state.originalImage || state.isGlobalLoading) return;

    const types = [
      DiagramType.TWO_D_PICTO,
      DiagramType.THREE_D_FLAT,
      DiagramType.THREE_D_PERSPECTIVE
    ];

    setState(prev => ({
      ...prev,
      isGlobalLoading: true,
      diagrams: [],
      selectedDiagramId: null
    }));

    const newDiagrams: GeneratedDiagram[] = [];
    
    for (const type of types) {
      for (let v = 1; v <= 2; v++) {
        const id = `${type}-${v}`;
        newDiagrams.push({
          id,
          type,
          variant: v,
          imageUrl: '',
          loading: true
        });
      }
    }
    setState(prev => ({ ...prev, diagrams: newDiagrams }));

    for (let i = 0; i < newDiagrams.length; i++) {
      const d = newDiagrams[i];
      try {
        const url = await generateNetworkDiagram(state.originalImage, d.type, d.variant);
        setState(prev => {
          const updated = [...prev.diagrams];
          updated[i] = { ...updated[i], imageUrl: url, loading: false };
          return { ...prev, diagrams: updated };
        });
      } catch (err: any) {
        setState(prev => {
          const updated = [...prev.diagrams];
          updated[i] = { ...updated[i], loading: false, error: err.message || "エラー" };
          return { ...prev, diagrams: updated };
        });
      }
    }

    setState(prev => ({ ...prev, isGlobalLoading: false }));
  };

  const handleOpenPreview = (id: string) => {
    setPreviewId(id);
  };

  const handleSelectFromPreview = (id: string) => {
    setState(prev => ({ ...prev, selectedDiagramId: id }));
    setPreviewId(null);
  };

  const handleEdit = async () => {
    const selected = state.diagrams.find(d => d.id === state.selectedDiagramId);
    if (!selected || !editPrompt || state.isEditing || !state.originalImage) return;

    setState(prev => ({ ...prev, isEditing: true }));
    try {
      // 元スケッチ、現在の画像、指示、スタイルの4つを渡して精度を高める
      const newUrl = await editNetworkDiagram(
        state.originalImage, 
        selected.imageUrl, 
        editPrompt, 
        selected.type
      );
      
      setState(prev => {
        const updated = prev.diagrams.map(d => 
          d.id === prev.selectedDiagramId ? { ...d, imageUrl: newUrl } : d
        );
        return { ...prev, diagrams: updated, isEditing: false };
      });
      setEditPrompt('');
    } catch (err: any) {
      alert("修正に失敗しました: " + err.message);
      setState(prev => ({ ...prev, isEditing: false }));
    }
  };

  if (hasKey === null) return (
    <div className="flex flex-col items-center justify-center h-screen bg-slate-50">
      <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-600 border-t-transparent mb-4"></div>
      <p className="text-slate-400 font-bold tracking-widest">SYSTEM INITIALIZING</p>
    </div>
  );
  
  if (hasKey === false) return <ApiKeySelection onKeySelected={() => setHasKey(true)} />;

  const selectedDiagram = state.diagrams.find(d => d.id === state.selectedDiagramId);
  const previewDiagram = state.diagrams.find(d => d.id === previewId);

  return (
    <div className="min-h-screen bg-[#fcfdfe] pb-24">
      {/* 拡大プレビューモーダル */}
      {previewDiagram && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-8 bg-slate-900/95 backdrop-blur-md animate-in fade-in duration-300">
          <div className="relative max-w-6xl w-full h-full flex flex-col items-center justify-center">
            <button 
              onClick={() => setPreviewId(null)}
              className="absolute top-0 right-0 p-4 text-white/50 hover:text-white transition-colors"
            >
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            
            <div className="w-full h-full flex flex-col items-center justify-center gap-6">
              <div className="flex flex-col items-center text-center">
                <span className="text-blue-400 text-xs font-black tracking-widest uppercase mb-1">{previewDiagram.type}</span>
                <h3 className="text-white text-xl font-bold">生成結果の確認 (Variant {previewDiagram.variant})</h3>
              </div>

              <div className="flex-1 w-full bg-white rounded-3xl overflow-hidden shadow-2xl relative group">
                <img src={previewDiagram.imageUrl} alt="Preview" className="w-full h-full object-contain" />
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setPreviewId(null)}
                  className="px-8 py-4 rounded-2xl bg-white/10 text-white font-bold hover:bg-white/20 transition-all"
                >
                  閉じる
                </button>
                <button
                  onClick={() => handleSelectFromPreview(previewDiagram.id)}
                  className="px-12 py-4 rounded-2xl bg-blue-600 text-white font-bold hover:bg-blue-500 shadow-xl shadow-blue-600/20 transition-all flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                  この図面を選択して修正する
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <header className="bg-white/80 backdrop-blur-xl border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-[#0066cc] to-[#003399] rounded-full flex items-center justify-center text-white shadow-lg shadow-blue-200">
               <svg viewBox="0 0 100 100" className="w-8 h-8 fill-none stroke-white" style={{ strokeWidth: 10, strokeLinecap: 'round', strokeLinejoin: 'round' }}>
                 <path d="M30 80 V20 H55 C70 20 75 35 55 45 H30 M55 45 L75 80" />
               </svg>
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-none mb-1">RADIX Network Diagram <span className="text-[#0066cc]">Pro</span></h1>
              <div className="text-[10px] text-slate-400 font-bold tracking-[0.3em] uppercase">Enterprise AI Reconstruction</div>
            </div>
          </div>
          <button 
            onClick={async () => {
              if ((window as any).aistudio?.openSelectKey) {
                await (window as any).aistudio.openSelectKey();
                setHasKey(true);
              }
            }}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold text-slate-600 transition-all uppercase tracking-widest border border-slate-200"
          >
            Switch API Key
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12">
        <div className="grid lg:grid-cols-12 gap-12 items-start">
          {/* Left Panel: Input */}
          <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-32">
            <div className="bg-white rounded-[2rem] p-8 shadow-2xl shadow-slate-200/50 border border-slate-100">
              <h2 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-3">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-[#0066cc] text-white font-bold italic text-sm">01</span>
                画像をアップロード
              </h2>
              
              <div className="relative group mb-6">
                <input type="file" accept="image/*" onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                <div className={`aspect-video rounded-3xl border-2 border-dashed flex flex-col items-center justify-center p-4 transition-all overflow-hidden ${state.originalImage ? 'border-blue-400 bg-blue-50/30' : 'border-slate-200 bg-slate-50'}`}>
                  {state.originalImage ? (
                    <img src={state.originalImage} alt="Original" className="w-full h-full object-contain rounded-xl" />
                  ) : (
                    <div className="text-center">
                      <div className="w-12 h-12 text-slate-300 mx-auto mb-2">
                        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                      </div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Drop sketch</p>
                    </div>
                  )}
                </div>
              </div>

              <button
                onClick={generateAll}
                disabled={!state.originalImage || state.isGlobalLoading}
                className={`w-full py-5 rounded-2xl font-black text-lg transition-all shadow-xl flex items-center justify-center gap-3 ${!state.originalImage || state.isGlobalLoading ? 'bg-slate-100 text-slate-300' : 'bg-[#0066cc] text-white hover:bg-blue-700 shadow-blue-200'}`}
              >
                {state.isGlobalLoading ? '生成中...' : '図面を清書 (6種類)'}
              </button>
            </div>

            {selectedDiagram && (
              <div className="bg-slate-900 rounded-[2rem] p-8 text-white shadow-2xl animate-in slide-in-from-bottom-4 duration-500 border border-white/5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-black flex items-center gap-2">
                    <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></span>
                    図面を修正する
                  </h3>
                  <span className="text-[10px] font-bold text-white/40 uppercase tracking-tighter">Selected: {selectedDiagram.type} V{selectedDiagram.variant}</span>
                </div>
                
                <div className="mb-4 aspect-video rounded-xl bg-white/5 overflow-hidden border border-white/10 group relative">
                   <img src={selectedDiagram.imageUrl} alt="Selected" className="w-full h-full object-contain" />
                   <button 
                    onClick={() => setPreviewId(selectedDiagram.id)}
                    className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-xs font-bold"
                   >
                     拡大表示
                   </button>
                </div>

                <textarea
                  value={editPrompt}
                  onChange={(e) => setEditPrompt(e.target.value)}
                  placeholder="例）ALRITをHUBとSEIRIOSの間に移動して"
                  className="w-full h-24 bg-white/10 border border-white/20 rounded-xl p-4 text-sm text-white placeholder:text-white/30 mb-4 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                />
                <button
                  onClick={handleEdit}
                  disabled={state.isEditing || !editPrompt}
                  className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${state.isEditing || !editPrompt ? 'bg-white/10 text-white/30' : 'bg-blue-500 hover:bg-blue-400 text-white shadow-lg shadow-blue-500/20'}`}
                >
                  {state.isEditing ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : null}
                  AIに修正を依頼
                </button>
              </div>
            )}
          </div>

          {/* Right Panel: Results */}
          <div className="lg:col-span-8">
            <div className="mb-8 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black text-slate-900">生成されたデザイン案</h2>
                <p className="text-slate-400 text-sm">画像をクリックして拡大確認し、気に入ったものを選択してください。</p>
              </div>
            </div>

            {state.diagrams.length > 0 ? (
              <div className="grid sm:grid-cols-2 gap-6">
                {state.diagrams.map((d) => (
                  <div 
                    key={d.id} 
                    onClick={() => !d.loading && handleOpenPreview(d.id)}
                    className={`
                      relative bg-white rounded-[2rem] p-6 border-2 transition-all cursor-pointer group
                      ${state.selectedDiagramId === d.id ? 'border-[#0066cc] shadow-2xl ring-4 ring-blue-500/5' : 'border-transparent shadow-sm hover:border-slate-200'}
                    `}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black uppercase tracking-widest text-[#0066cc]">{d.type}</span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase">Variant {d.variant}</span>
                      </div>
                      {state.selectedDiagramId === d.id && (
                        <div className="bg-[#0066cc] text-white px-2 py-1 rounded-full shadow-lg shadow-blue-200 text-[9px] font-bold">
                          選択中
                        </div>
                      )}
                    </div>
                    
                    <div className="aspect-[4/3] bg-slate-50 rounded-2xl flex items-center justify-center overflow-hidden relative">
                      {d.loading ? (
                        <div className="flex flex-col items-center gap-2">
                          <div className="w-8 h-8 border-4 border-blue-100 border-t-[#0066cc] rounded-full animate-spin"></div>
                          <span className="text-[9px] font-bold text-slate-400 animate-pulse">GENERATING</span>
                        </div>
                      ) : d.error ? (
                        <div className="text-red-500 text-center p-4">
                          <p className="text-[10px] font-bold uppercase mb-1">Error</p>
                          <p className="text-[9px]">{d.error}</p>
                        </div>
                      ) : (
                        <img src={d.imageUrl} alt={d.id} className={`w-full h-full object-contain transition-transform duration-500 ${state.selectedDiagramId === d.id ? 'scale-105' : 'group-hover:scale-102'}`} />
                      )}
                      
                      {!d.loading && !d.error && (
                        <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/20 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                          <div className="flex flex-col items-center gap-2">
                            <span className="bg-white text-slate-900 text-[10px] font-black py-2 px-6 rounded-full shadow-2xl scale-90 group-hover:scale-100 transition-transform">拡大して確認</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-[600px] rounded-[3rem] border-4 border-dashed border-slate-100 flex flex-col items-center justify-center bg-slate-50/30 text-slate-200">
                <div className="w-24 h-24 mb-6 opacity-10">
                   <svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                </div>
                <p className="font-black tracking-[0.3em] uppercase text-center">Ready to Reconstruct</p>
                <p className="text-xs text-slate-300 font-medium">スケッチをアップロードして生成を開始してください</p>
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="fixed bottom-0 left-0 right-0 py-6 px-8 flex justify-center z-40">
        <div className="bg-slate-900/95 backdrop-blur-xl px-8 py-3 rounded-full border border-white/10 shadow-2xl flex items-center gap-6">
          <p className="text-[10px] text-white/50 font-black tracking-[0.2em] uppercase">© 2025 RADIX PRO</p>
          <div className="h-4 w-px bg-white/10"></div>
          <div className="flex gap-4">
            <span className="text-[9px] font-bold text-blue-400">AI AGENT ACTIVE</span>
            <span className="text-[9px] font-bold text-slate-400 uppercase">Gemini 2.0 Flash Engine</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
