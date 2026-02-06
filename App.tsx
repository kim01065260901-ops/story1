
import React, { useState, useRef } from 'react';
import { 
  Sparkles, Upload, X, Play, Loader2, ImageIcon, 
  Trash2, Layers, Maximize2, Hash, FileText, Palette,
  Info, AlertCircle, ChevronRight, LayoutGrid, Brush, Wand2, Monitor,
  FolderDown, RefreshCw, FileImage, FileType, BookOpen, MousePointer2,
  Lock, Type as TypeIcon, Download, FileArchive, User, Box, Clock,
  Terminal, Settings2, Cpu, Zap
} from 'lucide-react';
import JSZip from 'jszip';
import { AspectRatio, StoryboardConfig, StoryboardScene, AnalysisResult, SceneDetail } from './types';
import { analyzeScript, generateSceneImage } from './services/geminiService';
import ChatBot from './components/ChatBot';

const STYLE_PRESETS = {
  liveAction: [
    { id: "cinematic", name: "시네마틱 실사", sub: "CINEMATIC" },
    { id: "drama", name: "K-드라마 실사", sub: "DRAMA" },
    { id: "noir", name: "누아르", sub: "NOIR" },
    { id: "gopro", name: "초광각 고프로", sub: "WIDE ANGLE" },
    { id: "western", name: "외국형 인물 (실존인물형)", sub: "WESTERN REALISM" },
    { id: "korean", name: "한국형 인물 (실존인물형)", sub: "KOREAN REALISM" },
  ],
  animation: [
    { id: "disney", name: "디즈니 픽사 스타일", sub: "DISNEY PIXAR" },
    { id: "klife", name: "K-라이프 3D 피규어 스타일", sub: "K-LIFE 3D FIGURE" },
    { id: "anime3d", name: "3D 애니메이션", sub: "PIXAR STYLE" },
    { id: "hybrid3d", name: "실사 배경 + 3D 애니메이션", sub: "REAL + 3D MIX" },
    { id: "ghibli", name: "지브리풍", sub: "GHIBLI" },
    { id: "anime2d", name: "2D 애니메이션", sub: "2D ANIME" },
    { id: "hybrid2d", name: "실사 배경 + 2D 애니메이션", sub: "REAL + 2D MIX" },
    { id: "cyberpunk", name: "사이버펑크", sub: "CYBERPUNK" },
    { id: "lowpoly", name: "로우 폴리 스타일", sub: "LOW POLY" },
  ],
  webtoon: [
    { id: "webtoon", name: "웹툰", sub: "WEBTOON" },
    { id: "comics", name: "만화/코믹스", sub: "COMICS" },
    { id: "webnovel", name: "웹소설 시그니처", sub: "WEB NOVEL" },
  ],
  art: [
    { id: "fairy", name: "동화 일러스트", sub: "FAIRY TALE" },
    { id: "historical", name: "감성 사극 일러스트", sub: "EMOTIONAL HISTORICAL" },
    { id: "folklore", name: "동양 설화 일러스트", sub: "ORIENTAL FOLKLORE" },
    { id: "watercolor", name: "수채화", sub: "WATERCOLOR" },
    { id: "oil", name: "유화", sub: "OIL PAINTING" },
    { id: "concept", name: "콘셉트 아트", sub: "CONCEPT ART" },
  ],
  special: [
    { id: "clay", name: "클레이 애니메이션", sub: "CLAY ANIMATION" },
    { id: "wool", name: "동화 양모인형", sub: "WOOL FELT" },
    { id: "diorama", name: "디오라마", sub: "DIORAMA" },
    { id: "stickman", name: "졸라맨 스타일", sub: "STICKMAN" },
    { id: "sketch_c", name: "스케치 컬러", sub: "SKETCH COLOR" },
    { id: "sketch_bw", name: "스케치 흑백", sub: "SKETCH B&W" },
    { id: "pixel", name: "픽셀아트", sub: "PIXEL ART" },
    { id: "lego", name: "레고 스타일", sub: "LEGO BRICK" },
    { id: "roblox", name: "로블록스 스타일", sub: "ROBLOX" },
    { id: "vhs", name: "90s VHS", sub: "VINTAGE" },
    { id: "neon", name: "네온 글로우", sub: "NEON GLOW" },
    { id: "xray", name: "x-ray 해골스타일", sub: "X-RAY SKELETON" },
    { id: "zack", name: "Zack.D.Films 스타일", sub: "ZACK D FILMS" },
  ]
};

const DENSITY_OPTIONS = [
  { label: '롱폼 최적화 (분당 약 2개)', value: SceneDetail.ESSENTIAL, desc: '영화/롱폼 - 여유로운 연출' },
  { label: '표준 (롱폼 1000자당 3-4개)', value: SceneDetail.STANDARD, desc: '대본 분량 기반 밸런스 생성' },
  { label: '숏폼 최적화 (분당 12개 내외)', value: SceneDetail.DETAILED, desc: '쇼츠/틱톡 - 빠른 컷 전환' },
];

const PROMPT_TAGS = [
  "Golden Hour Lighting", "Dutch Angle Shots", "Dynamic Motion Blur",
  "High Contrast Shadows", "Hyper-Realistic Textures", "Macro Close-ups",
  "Anamorphic Lens Flare", "Muted Color Palette", "Aggressive Camera Movement",
  "Film Grain Effect", "Minimalist Composition", "Surreal Atmosphere"
];

export default function App() {
  const [config, setConfig] = useState<StoryboardConfig>({
    style: "시네마틱 실사",
    aspectRatio: AspectRatio.NINE_SIXTEEN,
    sceneDetail: SceneDetail.STANDARD,
    targetSceneCount: 0,
    script: '',
    mainCharacter: '',
    styleImage: undefined,
    characterImage: undefined,
    isNonHumanoid: false,
    focusMode: 'auto',
    customInstructions: ''
  });

  const [customStyle, setCustomStyle] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [scenes, setScenes] = useState<StoryboardScene[]>([]);
  const analysisResultRef = useRef<AnalysisResult | null>(null);
  const stopRequested = useRef(false);

  const handleImageUpload = (file: File, type: 'style' | 'char') => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      if (type === 'style') setConfig(prev => ({ ...prev, styleImage: base64 }));
      else setConfig(prev => ({ ...prev, characterImage: base64 }));
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent, type: 'style' | 'char') => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      handleImageUpload(file, type);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const togglePromptTag = (tag: string) => {
    const current = config.customInstructions || "";
    if (current.includes(tag)) {
      setConfig({ ...config, customInstructions: current.replace(`${tag}, `, "").replace(tag, "").trim() });
    } else {
      setConfig({ ...config, customInstructions: current ? `${current}, ${tag}` : tag });
    }
  };

  const startGeneration = async () => {
    if (!config.script.trim()) return alert("대본을 입력하세요.");
    setIsGenerating(true);
    setScenes([]);
    stopRequested.current = false;

    try {
      const finalConfig = { ...config, style: customStyle || config.style };
      const result = await analyzeScript(finalConfig);
      analysisResultRef.current = result;

      const initialScenes = result.scenes.map((s, i) => ({
        id: `sc-${i}-${Date.now()}`,
        ...s,
        isGenerating: true
      }));
      setScenes(initialScenes);

      for (let i = 0; i < initialScenes.length; i++) {
        if (stopRequested.current) break;
        
        if (i > 0) {
          await new Promise(resolve => setTimeout(resolve, 800));
        }

        try {
          const url = await generateSceneImage(
            initialScenes[i].videoPromptEn,
            result.globalStyleGuide,
            result.characterDescription,
            config.aspectRatio,
            config.styleImage,
            config.characterImage
          );
          setScenes(prev => prev.map((s, idx) => idx === i ? { ...s, imageUrl: url, isGenerating: false } : s));
        } catch (e) {
          console.error("Image generation failed for scene", i, e);
          setScenes(prev => prev.map((s, idx) => idx === i ? { ...s, isGenerating: false } : s));
        }
      }
    } catch (e) {
      alert("생성 실패: " + e);
    } finally {
      setIsGenerating(false);
    }
  };

  const refreshSceneImage = async (index: number) => {
    if (!analysisResultRef.current) return;
    setScenes(prev => prev.map((s, idx) => idx === index ? { ...s, isGenerating: true } : s));
    try {
      const scene = scenes[index];
      const url = await generateSceneImage(
        scene.videoPromptEn,
        analysisResultRef.current.globalStyleGuide,
        analysisResultRef.current.characterDescription,
        config.aspectRatio,
        config.styleImage,
        config.characterImage
      );
      setScenes(prev => prev.map((s, idx) => idx === index ? { ...s, imageUrl: url, isGenerating: false } : s));
    } catch {
      setScenes(prev => prev.map((s, idx) => idx === index ? { ...s, isGenerating: false } : s));
    }
  };

  const downloadPackage = async (type: 'images' | 'script' | 'desc' | 'full') => {
    const timestamp = Date.now();

    if (type === 'images') {
      const zip = new JSZip();
      const imgFolder = zip.folder("images");
      for (let i = 0; i < scenes.length; i++) {
        if (scenes[i].imageUrl) {
          const base64Data = scenes[i].imageUrl!.split(',')[1];
          imgFolder?.file(`scene_${String(i+1).padStart(2, '0')}.png`, base64Data, { base64: true });
        }
      }
      const content = await zip.generateAsync({ type: "blob" });
      saveAs(content, `storyboard_images_${timestamp}.zip`);
      return;
    }

    if (type === 'script') {
      const scriptText = scenes.map((s, i) => `[장면 ${i+1}]\n${s.scriptSegment}`).join('\n\n');
      saveAs(new Blob([scriptText], { type: "text/plain" }), `script_${timestamp}.txt`);
      return;
    }

    if (type === 'desc') {
      const descText = scenes.map((s, i) => `[장면 ${i+1} 연출 안내]\n한글: ${s.videoPromptKo}\n영문: ${s.videoPromptEn}`).join('\n\n');
      saveAs(new Blob([descText], { type: "text/plain" }), `descriptions_${timestamp}.txt`);
      return;
    }

    if (type === 'full') {
      const htmlContent = `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <title>프로페셔널 스토리보드 리포트</title>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"></script>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f0f2f5; padding: 40px; color: #1a1a1a; margin: 0; }
        .container { max-width: 1400px; margin: 0 auto; }
        .header { text-align: center; margin-bottom: 40px; background: white; padding: 30px; border-radius: 20px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); }
        .header h1 { font-weight: 900; font-size: 28px; color: #000; margin: 0; letter-spacing: -0.5px; }
        .header p { color: #666; font-size: 11px; margin-top: 8px; font-weight: 800; letter-spacing: 2px; }
        
        .toolbar { display: flex; justify-content: center; margin-bottom: 30px; }
        .btn-download { background: #2563eb; color: white; border: none; padding: 12px 24px; border-radius: 12px; font-weight: 800; cursor: pointer; display: flex; align-items: center; gap: 8px; font-size: 14px; transition: all 0.2s; box-shadow: 0 4px 12px rgba(37,99,235,0.2); }
        .btn-download:hover { background: #1d4ed8; transform: translateY(-2px); }

        .board-table { width: 100%; border-collapse: separate; border-spacing: 0 15px; table-layout: fixed; }
        .board-table th { padding: 15px; text-align: left; font-size: 11px; color: #888; text-transform: uppercase; font-weight: 900; border-bottom: 2px solid #ddd; }
        
        .col-no { width: 60px; }
        .col-img { width: 420px; }
        .col-script { width: 1.2fr; }
        .col-desc { width: 1.5fr; }

        .scene-row { background: white; box-shadow: 0 2px 10px rgba(0,0,0,0.03); border-radius: 15px; overflow: hidden; transition: transform 0.2s; }
        .scene-row td { padding: 25px; vertical-align: top; border-top: 1px solid #f0f0f0; border-bottom: 1px solid #f0f0f0; word-break: keep-all; }
        .scene-row td:first-child { border-left: 1px solid #f0f0f0; border-radius: 15px 0 0 15px; }
        .scene-row td:last-child { border-right: 1px solid #f0f0f0; border-radius: 0 15px 15px 0; }

        .no-cell { font-weight: 900; color: #2563eb; font-size: 24px; text-align: center; }
        .img-cell img { width: 100%; border-radius: 12px; border: 1px solid #eee; display: block; box-shadow: 0 4px 10px rgba(0,0,0,0.05); }
        .script-cell { font-weight: 700; font-size: 16px; line-height: 1.6; color: #111; }
        .desc-cell { border-left: 1px solid #f0f2f5; padding-left: 30px !important; }

        .meta-label { font-size: 10px; font-weight: 900; color: #2563eb; text-transform: uppercase; display: block; margin-bottom: 8px; }
        .meta-text-ko { font-size: 14px; color: #333; font-weight: 700; margin-bottom: 15px; line-height: 1.5; }
        .meta-text-en { font-size: 12px; color: #777; font-style: italic; background: #f8fafc; padding: 12px; border-radius: 8px; line-height: 1.4; border: 1px solid #edf2f7; }
        
        @media print { .toolbar { display: none; } body { background: white; padding: 0; } .header, .scene-row { box-shadow: none; border: 1px solid #eee; } }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>STORYBOARD PROJECT REPORT</h1>
            <p>AI-GENERATED VISUAL SEQUENCE</p>
        </div>

        <div class="toolbar">
            <button class="btn-download" onclick="downloadAllImages()">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                이미지 전체 다운로드 (ZIP)
            </button>
        </div>

        <table class="board-table">
            <colgroup>
                <col class="col-no">
                <col class="col-img">
                <col class="col-script">
                <col class="col-desc">
            </colgroup>
            <thead>
                <tr>
                    <th>NO</th>
                    <th>VISUAL</th>
                    <th>SCRIPT</th>
                    <th>PRODUCTION DETAIL</th>
                </tr>
            </thead>
            <tbody>
                ${scenes.map((s, i) => `
                <tr class="scene-row">
                    <td class="no-cell">${i+1}</td>
                    <td class="img-cell">
                        <img src="${s.imageUrl}" alt="Scene ${i+1}">
                    </td>
                    <td class="script-cell">${s.scriptSegment}</td>
                    <td class="desc-cell">
                        <span class="meta-label">연출 가이드 (KOR)</span>
                        <div class="meta-text-ko">${s.videoPromptKo}</div>
                        <span class="meta-label">PROMPT METADATA (EN)</span>
                        <div class="meta-text-en">${s.videoPromptEn}</div>
                    </td>
                </tr>`).join('')}
            </tbody>
        </table>
    </div>

    <script>
        async function downloadAllImages() {
            const zip = new JSZip();
            const images = document.querySelectorAll('img');
            const btn = document.querySelector('.btn-download');
            const originalText = btn.innerHTML;
            
            btn.innerHTML = '압축 중...';
            btn.disabled = true;

            for (let i = 0; i < images.length; i++) {
                const img = images[i];
                const base64Data = img.src.split(',')[1];
                zip.file(\`scene_\${String(i+1).padStart(2, '0')}.png\`, base64Data, {base64: true});
            }

            const content = await zip.generateAsync({type: "blob"});
            const link = document.createElement('a');
            link.href = URL.createObjectURL(content);
            link.download = \`storyboard_images_\${Date.now()}.zip\`;
            link.click();

            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    </script>
</body>
</html>`;
      saveAs(new Blob([htmlContent], { type: "text/html" }), `storyboard_report_${timestamp}.html`);
    }
  };

  const saveAs = (blob: Blob, name: string) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
  };

  return (
    <div className="min-h-screen bg-[#05070a] text-slate-100 p-6 md:p-10 font-sans selection:bg-blue-500/30 overflow-x-hidden relative">
      <div className="max-w-[1700px] mx-auto flex flex-col items-center mb-12">
        <div className="p-3 bg-gradient-to-br from-blue-600 to-blue-400 rounded-2xl mb-4 shadow-2xl shadow-blue-500/40">
          <Sparkles className="text-white w-7 h-7" />
        </div>
        <h1 className="text-3xl font-black text-white tracking-tighter uppercase italic flex items-center gap-2">
          AI STORYBOARD <span className="text-blue-500">PRO</span>
        </h1>
        <p className="text-[11px] font-bold text-slate-400 tracking-[0.5em] uppercase mt-2">Next-Gen Visual Production</p>
      </div>

      <div className="max-w-[1700px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
        <div className="space-y-10">
          <section className="bg-[#0f1117] border border-slate-700/80 rounded-[2.5rem] p-10 space-y-8 shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-800 pb-6">
              <h2 className="text-lg font-black flex items-center gap-3 uppercase tracking-tight text-white">
                <Palette className="text-red-500 w-6 h-6" /> 01. 비주얼 스타일
              </h2>
              <div className="flex items-center gap-2 cursor-pointer group" onClick={() => setConfig(prev => ({...prev, isNonHumanoid: !prev.isNonHumanoid}))}>
                <span className={`text-[11px] font-black uppercase tracking-tight transition-colors ${config.isNonHumanoid ? 'text-blue-400' : 'text-slate-400 group-hover:text-slate-200'}`}>시사/정보 모드</span>
                <div className={`w-12 h-6 rounded-full relative transition-all duration-300 ${config.isNonHumanoid ? 'bg-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.6)]' : 'bg-slate-700'}`}>
                  <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all duration-300 ${config.isNonHumanoid ? 'left-7' : 'left-1'}`}></div>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center gap-2.5 text-[12px] font-black text-red-500 uppercase tracking-tight">
                <Sparkles size={16} /> 제작 포커스 (인물 VS 대본)
              </div>
              <div className="grid grid-cols-3 gap-3">
                <button 
                  onClick={() => setConfig({...config, focusMode: 'auto'})}
                  className={`p-5 rounded-[2rem] border transition-all flex flex-col items-center justify-center gap-3 group ${config.focusMode === 'auto' ? 'bg-purple-600 border-purple-500 shadow-[0_10px_30px_rgba(147,51,234,0.4)]' : 'bg-[#1a1c26] border-slate-700 hover:border-slate-500 hover:bg-[#232635]'}`}
                >
                  <Wand2 className={`w-8 h-8 ${config.focusMode === 'auto' ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`} />
                  <div className="text-center">
                    <div className={`text-[15px] font-black ${config.focusMode === 'auto' ? 'text-white' : 'text-white'}`}>자동 판단</div>
                    <div className={`text-[10px] font-bold ${config.focusMode === 'auto' ? 'text-purple-100' : 'text-slate-400 group-hover:text-slate-200'}`}>대본 분석 후 최적화</div>
                  </div>
                </button>
                <button 
                  onClick={() => setConfig({...config, focusMode: 'character'})}
                  className={`p-5 rounded-[2rem] border transition-all flex flex-col items-center justify-center gap-3 group ${config.focusMode === 'character' ? 'bg-red-600 border-red-500 shadow-[0_10px_30px_rgba(220,38,38,0.4)]' : 'bg-[#1a1c26] border-slate-700 hover:border-slate-500 hover:bg-[#232635]'}`}
                >
                  <User className={`w-8 h-8 ${config.focusMode === 'character' ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`} />
                  <div className="text-center">
                    <div className={`text-[15px] font-black ${config.focusMode === 'character' ? 'text-white' : 'text-white'}`}>인물 중심</div>
                    <div className={`text-[10px] font-bold ${config.focusMode === 'character' ? 'text-red-100' : 'text-slate-400 group-hover:text-slate-200'}`}>캐릭터 서사 위주</div>
                  </div>
                </button>
                <button 
                  onClick={() => setConfig({...config, focusMode: 'script'})}
                  className={`p-5 rounded-[2rem] border transition-all flex flex-col items-center justify-center gap-3 group ${config.focusMode === 'script' ? 'bg-blue-700 border-blue-500 shadow-[0_10px_30px_rgba(37,99,235,0.4)]' : 'bg-[#1a1c26] border-slate-700 hover:border-slate-500 hover:bg-[#232635]'}`}
                >
                  <Box className={`w-8 h-8 ${config.focusMode === 'script' ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`} />
                  <div className="text-center">
                    <div className={`text-[15px] font-black ${config.focusMode === 'script' ? 'text-white' : 'text-white'}`}>대본/정보 중심</div>
                    <div className={`text-[10px] font-bold ${config.focusMode === 'script' ? 'text-blue-100' : 'text-slate-400 group-hover:text-slate-200'}`}>사물·배경·정보 위주</div>
                  </div>
                </button>
              </div>
            </div>

            <div className="space-y-8 max-h-[500px] overflow-y-auto pr-3 custom-scrollbar mt-8">
              {Object.entries(STYLE_PRESETS).map(([key, presets]) => (
                <div key={key} className="space-y-4">
                  <p className="text-[12px] font-black text-slate-300 flex items-center gap-2 uppercase border-l-4 border-red-600 pl-3">
                    {key === 'liveAction' ? '영화 & 실사' : key === 'animation' ? '애니메이션 & 3D' : key === 'webtoon' ? '웹툰 & 코믹' : key === 'art' ? '아트 & 일러스트' : '특수 & 기타'}
                  </p>
                  <div className="grid grid-cols-3 gap-3">
                    {presets.map(s => (
                      <button 
                        key={s.id} 
                        onClick={() => setConfig({...config, style: s.name})} 
                        className={`p-4 rounded-2xl border text-left transition-all group ${config.style === s.name ? 'border-red-500 bg-red-600/10 ring-2 ring-red-500/30' : 'border-slate-700 bg-[#1a1c26] hover:bg-[#232635] hover:border-slate-500'}`}
                      >
                        <div className={`text-[13px] font-black ${config.style === s.name ? 'text-white' : 'text-white'}`}>{s.name}</div>
                        <div className={`text-[10px] font-black uppercase mt-1 ${config.style === s.name ? 'text-red-400' : 'text-slate-400 group-hover:text-slate-300'}`}>{s.sub}</div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-6 pt-10 border-t border-slate-700">
              <div className="space-y-3">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">CUSTOM AESTHETIC</label>
                <input 
                  type="text" 
                  value={customStyle} 
                  onChange={e => setCustomStyle(e.target.value)} 
                  placeholder="커스텀 스타일 직접 입력..." 
                  className="w-full bg-[#05070a] border border-slate-700 rounded-xl px-5 py-4 text-[13px] text-white focus:border-blue-500 outline-none transition-all placeholder:text-slate-600 font-bold" 
                />
              </div>
              <div className="space-y-3">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">STYLE REFERENCE (OPTIONAL)</label>
                <div 
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, 'style')}
                  className="h-[120px] border-2 border-dashed border-slate-700 rounded-2xl flex items-center justify-center overflow-hidden hover:border-blue-500 transition-all cursor-pointer group bg-[#05070a]"
                >
                  {config.styleImage ? (
                    <div className="relative w-full h-full">
                       <img src={config.styleImage} className="w-full h-full object-cover" />
                       <button onClick={(e) => { e.preventDefault(); setConfig({...config, styleImage: undefined}); }} className="absolute top-2 right-2 bg-red-600 text-white p-2 rounded-lg hover:bg-red-700 transition-colors shadow-lg"><X size={16}/></button>
                    </div>
                  ) : (
                    <label className="cursor-pointer w-full h-full flex flex-col items-center justify-center gap-2">
                      <Upload size={24} className="text-slate-500 group-hover:text-blue-400 transition-colors" />
                      <span className="text-[11px] font-black text-slate-400 group-hover:text-slate-200 uppercase tracking-tight">클릭 또는 이미지 드래그</span>
                      <input type="file" className="hidden" accept="image/*" onChange={e => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'style')} />
                    </label>
                  )}
                </div>
              </div>
            </div>
          </section>

          <section className="bg-[#0f1117] border border-slate-700/80 rounded-[2.5rem] p-10 space-y-8 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
            <h2 className="text-lg font-black flex items-center gap-3 uppercase tracking-tight text-white">
              <Maximize2 className="text-blue-500 w-6 h-6" /> 02. 비율 및 캐릭터 설정
            </h2>
            
            <div className="flex flex-wrap gap-3">
              {[
                { label: 'Shorts (9:16)', value: AspectRatio.NINE_SIXTEEN },
                { label: 'Long-form (16:9)', value: AspectRatio.SIXTEEN_NINE },
                { label: 'Social (3:4)', value: AspectRatio.THREE_FOUR },
                { label: 'Classic (4:3)', value: AspectRatio.FOUR_THREE },
                { label: 'Square (1:1)', value: AspectRatio.ONE_ONE }
              ].map(r => (
                <button 
                  key={r.value} 
                  onClick={() => setConfig({...config, aspectRatio: r.value})} 
                  className={`px-7 py-4 rounded-xl text-[12px] font-black border transition-all ${config.aspectRatio === r.value ? 'bg-blue-600 border-blue-400 text-white shadow-[0_5px_25px_rgba(37,99,235,0.5)]' : 'bg-[#1a1c26] border-slate-700 text-slate-200 hover:text-white hover:border-slate-500'}`}
                >
                  {r.label}
                </button>
              ))}
            </div>

            <div className="space-y-5">
              <div className="flex items-center gap-2.5 text-[12px] font-black text-slate-200 uppercase tracking-tight">
                <RefreshCw size={14} className="text-blue-500"/> 장면 생성 밀도 최적화
              </div>
              <div className="grid grid-cols-3 gap-4">
                {DENSITY_OPTIONS.map(d => (
                  <button 
                    key={d.value} 
                    onClick={() => setConfig({...config, sceneDetail: d.value})} 
                    className={`p-6 rounded-[1.5rem] border text-left transition-all flex flex-col gap-2 group ${config.sceneDetail === d.value ? 'bg-blue-600 border-blue-400 text-white shadow-lg' : 'bg-[#1a1c26] border-slate-700 text-white hover:border-slate-500 hover:bg-[#232635]'}`}
                  >
                    <div className="text-[14px] font-black leading-tight">{d.label}</div>
                    <div className={`text-[11px] font-bold ${config.sceneDetail === d.value ? 'text-blue-100' : 'text-slate-400 group-hover:text-slate-300'}`}>{d.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">CHARACTER FEATURES</label>
                <textarea 
                  value={config.mainCharacter}
                  onChange={e => setConfig({...config, mainCharacter: e.target.value})}
                  placeholder="주인공 외형 특징 (Consistency Reference)..." 
                  className="w-full bg-[#05070a] border border-slate-700 rounded-2xl px-5 py-4 text-[13px] text-white focus:border-blue-600 outline-none h-[120px] resize-none font-bold placeholder:text-slate-700"
                />
              </div>
              <div className="space-y-3">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">CHARACTER REFERENCE</label>
                <div 
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, 'char')}
                  className="h-[120px] border-2 border-dashed border-slate-700 rounded-2xl flex items-center justify-center overflow-hidden hover:border-blue-500 transition-all cursor-pointer group bg-[#05070a]"
                >
                  {config.characterImage ? (
                    <div className="relative w-full h-full">
                       <img src={config.characterImage} className="w-full h-full object-cover" />
                       <button onClick={(e) => { e.preventDefault(); setConfig({...config, characterImage: undefined}); }} className="absolute top-2 right-2 bg-red-600 text-white p-2 rounded-lg hover:bg-red-700 transition-colors shadow-lg"><X size={16}/></button>
                    </div>
                  ) : (
                    <label className="cursor-pointer w-full h-full flex flex-col items-center justify-center gap-2">
                      <Upload size={24} className="text-slate-500 group-hover:text-blue-400 transition-colors" />
                      <span className="text-[11px] font-black text-slate-400 group-hover:text-slate-200 uppercase tracking-tight">클릭 또는 이미지 드래그</span>
                      <input type="file" className="hidden" accept="image/*" onChange={e => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'char')} />
                    </label>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/40 p-6 rounded-3xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-600 rounded-lg">
                    <Wand2 size={18} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-[14px] font-black text-white uppercase tracking-tight">DYNAMIC IDENTITY MODE</h3>
                    <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">정체성 유지 + 상황별 역동적 생성 활성화</p>
                  </div>
                </div>
                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(37,99,235,0.6)]">
                  <Lock size={18} className="text-white" />
                </div>
              </div>
              <div className="flex items-start gap-4">
                <Info size={20} className="text-blue-500 shrink-0 mt-0.5" />
                <p className="text-[12px] font-bold text-slate-200 leading-relaxed">
                  이 모드가 활성화되었습니다. AI가 참고 이미지의 <span className="text-blue-400">얼굴과 헤어</span>만 고정한 채, 대본의 상황에 따라 <span className="text-purple-400">새로운 포즈, 표정, 의상</span>을 자동으로 생성합니다.
                </p>
              </div>
            </div>
          </section>
        </div>

        <div className="space-y-10 flex flex-col h-full">
          <section className="bg-[#0f1117] border border-slate-700/80 rounded-[2.5rem] p-10 space-y-8 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
            <h2 className="text-lg font-black flex items-center gap-3 uppercase tracking-tight text-white">
              <Terminal className="text-green-500 w-6 h-6" /> 03. 고급 연출 가이드
            </h2>
            <div className="space-y-6">
              <div className="space-y-3">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">PROMPT ENGINEERING INSTRUCTIONS</label>
                <textarea 
                  value={config.customInstructions}
                  onChange={e => setConfig({...config, customInstructions: e.target.value})}
                  placeholder="추가적인 프롬프트 명령어를 입력하세요 (예: 영화적 앵글, 특정 조명 강조, 카메라 무빙 등)..." 
                  className="w-full bg-[#05070a] border border-slate-700 rounded-2xl px-5 py-5 text-[14px] text-white focus:border-green-600 outline-none h-[150px] resize-none font-bold placeholder:text-slate-800"
                />
              </div>
              
              <div className="space-y-3">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                   <Zap size={12} className="text-yellow-500" /> QUICK DIRECTING TAGS
                </label>
                <div className="flex flex-wrap gap-2">
                  {PROMPT_TAGS.map(tag => (
                    <button 
                      key={tag}
                      onClick={() => togglePromptTag(tag)}
                      className={`px-4 py-2 rounded-full text-[11px] font-black border transition-all ${config.customInstructions?.includes(tag) ? 'bg-green-600 border-green-500 text-white shadow-[0_5px_15px_rgba(34,197,94,0.3)]' : 'bg-[#1a1c26] border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-600'}`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="bg-[#0f1117] border border-slate-700/80 rounded-[2.5rem] p-10 space-y-8 shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative">
            <div className="flex items-center justify-between border-b border-slate-800 pb-6">
              <h2 className="text-lg font-black flex items-center gap-3 uppercase tracking-tight text-white">
                <Clock className="text-blue-500 w-6 h-6" /> 04. 생성할 장면 개수
              </h2>
              <button 
                onClick={() => setConfig({...config, targetSceneCount: 0})}
                className={`px-6 py-3 rounded-xl text-[13px] font-black border transition-all ${config.targetSceneCount === 0 ? 'bg-blue-600 border-blue-400 text-white shadow-lg' : 'bg-[#1a1c26] border-slate-700 text-slate-300 hover:text-white hover:border-slate-500'}`}
              >
                자동 설정
              </button>
            </div>
            
            <div className="space-y-12 px-4 py-6">
              <p className="text-[13px] font-bold text-slate-400">
                대본 분량에 관계없이 지정된 수만큼 생성됩니다.
              </p>
              
              <div className="relative pt-4">
                <input 
                  type="range" 
                  min="1" 
                  max="50" 
                  step="1"
                  value={config.targetSceneCount || 1}
                  onChange={(e) => setConfig({...config, targetSceneCount: parseInt(e.target.value)})}
                  className="w-full h-3 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <div className="flex justify-between mt-5 text-[12px] font-black text-slate-400">
                  <span>1장</span>
                  <span>25장</span>
                  <span>50장</span>
                </div>
                <div className="absolute -top-14 right-0 bg-[#1a1c26] px-6 py-3 rounded-2xl border border-slate-700 flex items-baseline gap-1 shadow-[0_10px_25px_rgba(0,0,0,0.3)]">
                  <span className="text-4xl font-black text-white">{config.targetSceneCount || '--'}</span>
                  <span className="text-[14px] font-black text-blue-500 uppercase tracking-widest ml-1">장</span>
                </div>
              </div>
            </div>
          </section>

          <section className="bg-[#0f1117] border border-slate-700/80 rounded-[2.5rem] p-10 space-y-8 shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex-1 flex flex-col">
            <h2 className="text-lg font-black flex items-center gap-3 uppercase tracking-tight text-white">
              <FileText className="text-blue-500 w-6 h-6" /> 05. 대본 입력
            </h2>
            <textarea 
              value={config.script} 
              onChange={e => setConfig({...config, script: e.target.value})} 
              className="w-full flex-1 bg-[#05070a] border-2 border-slate-700 focus:border-blue-600 rounded-[2rem] p-8 text-[15px] text-white outline-none resize-none leading-relaxed transition-all font-bold custom-scrollbar placeholder:text-slate-800 shadow-inner"
              placeholder="대본 내용을 입력하세요. 설정된 밀도나 지정된 수량에 따라 이미지가 자동 배치됩니다."
            />
            <button 
              onClick={isGenerating ? () => stopRequested.current = true : startGeneration}
              disabled={!config.script}
              className={`w-full py-8 rounded-[2rem] font-black text-2xl flex items-center justify-center gap-4 transition-all active:scale-[0.97] ${isGenerating ? 'bg-red-600 hover:bg-red-500 text-white shadow-xl' : 'bg-gradient-to-r from-blue-600 to-purple-700 text-white shadow-[0_15px_45px_rgba(37,99,235,0.4)] hover:brightness-110 hover:shadow-[0_20px_55px_rgba(37,99,235,0.5)]'}`}
            >
              {isGenerating ? <Loader2 className="animate-spin w-9 h-9" /> : <Play fill="white" size={28} className="ml-1" />}
              {isGenerating ? '생성 중단 (STOP)' : '스토리보드 생성 시작'}
            </button>
          </section>
        </div>
      </div>

      {scenes.length > 0 && (
        <div className="max-w-[1700px] mx-auto mt-24 space-y-12 pb-48">
          <div className="text-center space-y-5">
            <h2 className="text-4xl font-black text-white italic uppercase tracking-tighter bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">스토리보드 결과물</h2>
            <p className="text-[12px] font-bold text-slate-500 uppercase tracking-[0.5em]">COMPACT PRODUCTION VIEW</p>
            
            <div className="flex flex-wrap justify-center gap-4 pt-8">
              <button onClick={() => downloadPackage('script')} className="px-7 py-4 bg-[#1a1c26] text-white rounded-xl text-[13px] font-black flex items-center gap-2 hover:bg-slate-700 transition-all border border-slate-700 hover:border-slate-500"><FileType size={18}/> 대본 파일</button>
              <button onClick={() => downloadPackage('desc')} className="px-7 py-4 bg-[#1a1c26] text-white rounded-xl text-[13px] font-black flex items-center gap-2 hover:bg-slate-700 transition-all border border-slate-700 hover:border-slate-500"><BookOpen size={18}/> 설명 파일</button>
              <button onClick={() => downloadPackage('images')} className="px-7 py-4 bg-[#1e293b] text-blue-400 rounded-xl text-[13px] font-black flex items-center gap-2 hover:bg-[#253347] transition-all border border-blue-900/40"><FileArchive size={18}/> 일괄 이미지 (ZIP)</button>
              <button onClick={() => downloadPackage('full')} className="px-10 py-4 bg-blue-600 text-white rounded-xl text-[14px] font-black flex items-center gap-2 shadow-2xl hover:bg-blue-500 transition-all transform hover:-translate-y-1"><Download size={20}/> 전체 리포트 (HTML)</button>
            </div>
          </div>

          <div className="bg-white rounded-[2rem] overflow-hidden shadow-[0_30px_70px_rgba(0,0,0,0.6)] text-slate-900 border border-white/20">
            <div className="grid grid-cols-[60px_420px_1fr_1.5fr] bg-[#f1f5f9] border-b border-slate-200 p-8 font-black text-[12px] uppercase tracking-widest text-slate-500">
                <div className="text-center">NO</div>
                <div className="text-center">SCENE IMAGE</div>
                <div className="px-10">SCRIPT SEGMENT</div>
                <div className="px-10">VISUAL DIRECTION</div>
            </div>

            {scenes.map((s, i) => (
              <div key={s.id} className="grid grid-cols-[60px_420px_1fr_1.5fr] border-b border-slate-100 items-start py-10 px-8 hover:bg-slate-50/90 transition-all group">
                <div className="text-center font-black text-3xl text-blue-600 pt-3">{i+1}</div>
                <div className="px-3">
                  <div className={`rounded-2xl overflow-hidden border border-slate-200 shadow-xl relative bg-slate-100 ${config.aspectRatio === AspectRatio.NINE_SIXTEEN ? 'aspect-[9/16]' : 'aspect-video'}`}>
                    {s.imageUrl ? (
                      <img src={s.imageUrl} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt={`Scene ${i+1}`} />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center"><Loader2 className="animate-spin text-slate-400 w-10 h-10" /></div>
                    )}
                    <button 
                      onClick={() => refreshSceneImage(i)} 
                      className="absolute top-4 right-4 p-4 bg-white/95 backdrop-blur-md rounded-xl text-blue-600 shadow-2xl opacity-0 group-hover:opacity-100 transition-all hover:scale-110 active:rotate-180 z-20 border border-slate-100"
                      title="다시 생성"
                    >
                      <RefreshCw size={22} className={s.isGenerating ? 'animate-spin' : ''} />
                    </button>
                  </div>
                </div>
                <div className="px-10 pt-3">
                  <p className="text-[19px] font-bold text-[#0f172a] leading-relaxed whitespace-pre-wrap tracking-tight">{s.scriptSegment}</p>
                </div>
                <div className="px-10 space-y-7">
                  <div className="space-y-3">
                    <span className="flex items-center gap-2 text-[11px] font-black text-blue-600 uppercase tracking-widest"><ImageIcon size={14}/> 연출 가이드 (KOR)</span>
                    <p className="text-[16px] font-bold text-slate-800 leading-snug">{s.videoPromptKo}</p>
                  </div>
                  <div className="bg-[#f8fafc] p-6 rounded-2xl border border-slate-200/60">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block">AI PROMPT (EN)</span>
                    <p className="text-[13px] text-slate-600 italic font-medium leading-relaxed font-mono">{s.videoPromptEn}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CHAT BOT INTEGRATION */}
      <ChatBot />
    </div>
  );
}
