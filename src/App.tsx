/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { 
  GraduationCap, 
  UserCircle, 
  CloudUpload, 
  PlayCircle, 
  Video as VideoIcon, 
  Loader2, 
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from "@google/genai";
import type { Video, Category } from './types';

// Helper to extract YouTube ID
const getYouTubeId = (url: string) => {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
};

export default function App() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<Category>('MS Word');
  const [link, setLink] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // Veo State
  const [veoImage, setVeoImage] = useState<string | null>(null);
  const [veoPrompt, setVeoPrompt] = useState('');
  const [veoAspectRatio, setVeoAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
  const [generationStatus, setGenerationStatus] = useState('');
  const [showVeoModal, setShowVeoModal] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchVideos();
  }, []);

  const fetchVideos = async () => {
    try {
      const res = await fetch('/api/videos');
      const data = await res.json();
      setVideos(data);
    } catch (err) {
      console.error("Failed to fetch videos", err);
    }
  };

  const handleAddVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    const youtubeId = getYouTubeId(link);
    if (!title || !youtubeId) {
      alert("সঠিক শিরোনাম এবং ইউটিউব লিঙ্ক দিন!");
      return;
    }

    setIsUploading(true);
    try {
      const res = await fetch('/api/videos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, category, youtube_id: youtubeId })
      });
      if (res.ok) {
        setTitle('');
        setLink('');
        fetchVideos();
      }
    } catch (err) {
      console.error("Upload failed", err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setVeoImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const generateVeoVideo = async () => {
    if (!veoImage) return;

    // Check for API Key
    // @ts-ignore
    const hasKey = await window.aistudio.hasSelectedApiKey();
    if (!hasKey) {
      // @ts-ignore
      await window.aistudio.openSelectKey();
      return;
    }

    setIsGenerating(true);
    setGeneratedVideoUrl(null);
    setGenerationStatus('ভিডিও তৈরি হচ্ছে... অনুগ্রহ করে অপেক্ষা করুন।');

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const base64Data = veoImage.split(',')[1];
      
      let operation = await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt: veoPrompt || 'Animate this image beautifully',
        image: {
          imageBytes: base64Data,
          mimeType: 'image/png',
        },
        config: {
          numberOfVideos: 1,
          resolution: '720p',
          aspectRatio: veoAspectRatio
        }
      });

      while (!operation.done) {
        setGenerationStatus('ভিডিও প্রসেস হচ্ছে... (১০-৩০ সেকেন্ড সময় লাগতে পারে)');
        await new Promise(resolve => setTimeout(resolve, 10000));
        operation = await ai.operations.getVideosOperation({ operation: operation });
      }

      const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
      if (downloadLink) {
        const videoRes = await fetch(downloadLink, {
          method: 'GET',
          headers: {
            'x-goog-api-key': process.env.GEMINI_API_KEY as string,
          },
        });
        const blob = await videoRes.blob();
        setGeneratedVideoUrl(URL.createObjectURL(blob));
        setGenerationStatus('সফলভাবে তৈরি হয়েছে!');
      }
    } catch (err: any) {
      console.error("Veo generation failed", err);
      if (err.message?.includes("Requested entity was not found")) {
        // @ts-ignore
        await window.aistudio.openSelectKey();
      }
      setGenerationStatus('দুঃখিত, ভিডিও তৈরিতে সমস্যা হয়েছে। আবার চেষ্টা করুন।');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen font-sans">
      {/* Header */}
      <header className="bg-secondary text-white py-4 px-6 md:px-12 flex justify-between items-center sticky top-0 z-50 shadow-lg">
        <div className="flex items-center gap-2">
          <GraduationCap className="w-8 h-8 text-primary" />
          <h1 className="text-xl md:text-2xl font-bold">গুজিয়া টেকনিক্যাল ট্রেনিং সেন্টার</h1>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setShowVeoModal(true)}
            className="hidden md:flex items-center gap-2 bg-primary/20 hover:bg-primary/30 px-4 py-2 rounded-full border border-primary/30 transition-all text-sm font-semibold"
          >
            <VideoIcon className="w-4 h-4" />
            AI ভিডিও তৈরি
          </button>
          <div className="flex items-center gap-2 text-sm opacity-80">
            <UserCircle className="w-6 h-6" />
            <span className="hidden sm:inline">এডমিন প্যানেল</span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Mobile AI Button */}
        <button 
          onClick={() => setShowVeoModal(true)}
          className="md:hidden w-full mb-6 flex items-center justify-center gap-2 bg-primary text-white px-4 py-3 rounded-xl shadow-md font-bold"
        >
          <VideoIcon className="w-5 h-5" />
          AI ভিডিও তৈরি করুন
        </button>

        <div className="w-full">
          {/* Video Grid */}
          <section className="w-full">
            <h2 className="text-2xl font-bold mb-6 leading-tight">
              আপনার প্রতিষ্ঠানের জন্য একটি প্রফেশনাল ভিডিও আপলোড এবং লার্নিং প্ল্যাটফর্ম (যেমন: ইউটিউব বা উডেমি-র মতো) ডিজাইন কোড নিচে দেওয়া হলো। এখানে শিক্ষার্থীরা তাদের ক্লাসের ভিডিও দেখতে পারবে এবং আপনি ভিডিও আপলোড করতে পারবেন।
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <AnimatePresence mode="popLayout">
                {videos.map((video) => (
                  <motion.div 
                    key={video.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100 group hover:shadow-md transition-all"
                  >
                    <div className="relative aspect-video bg-black overflow-hidden">
                      <img 
                        src={`https://img.youtube.com/vi/${video.youtube_id}/maxresdefault.jpg`} 
                        alt={video.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${video.youtube_id}/0.jpg`;
                        }}
                      />
                      <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                        <a 
                          href={`https://www.youtube.com/watch?v=${video.youtube_id}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="transform scale-0 group-hover:scale-100 transition-transform duration-300"
                        >
                          <PlayCircle className="w-16 h-16 text-white opacity-90" />
                        </a>
                      </div>
                      <div className="absolute top-3 left-3">
                        <span className="bg-primary/90 text-white text-xs font-bold px-3 py-1 rounded-full backdrop-blur-sm">
                          {video.category}
                        </span>
                      </div>
                    </div>
                    <div className="p-4">
                      <h3 className="font-bold text-lg mb-2 line-clamp-2">{video.title}</h3>
                      <div className="flex items-center justify-between text-sm text-slate-500">
                        <div className="flex items-center gap-1">
                          <UserCircle className="w-4 h-4" />
                          <span>{video.instructor}</span>
                        </div>
                        <a 
                          href={`https://www.youtube.com/watch?v=${video.youtube_id}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-primary hover:underline flex items-center gap-1"
                        >
                          দেখুন <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </section>
        </div>
      </main>

      {/* Veo Modal */}
      <AnimatePresence>
        {showVeoModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isGenerating && setShowVeoModal(false)}
              className="absolute inset-0 bg-secondary/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 md:p-8">
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-xl">
                      <VideoIcon className="w-6 h-6 text-primary" />
                    </div>
                    <h2 className="text-2xl font-bold">AI ভিডিও জেনারেটর</h2>
                  </div>
                  <button 
                    onClick={() => !isGenerating && setShowVeoModal(false)}
                    className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                  >
                    <AlertCircle className="w-6 h-6 rotate-45" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div 
                      onClick={() => !isGenerating && fileInputRef.current?.click()}
                      className={`aspect-square rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden relative ${
                        veoImage ? 'border-primary bg-primary/5' : 'border-slate-200 hover:border-primary hover:bg-slate-50'
                      }`}
                    >
                      {veoImage ? (
                        <img src={veoImage} className="w-full h-full object-cover" alt="Preview" />
                      ) : (
                        <>
                          <ImageIcon className="w-12 h-12 text-slate-300 mb-2" />
                          <p className="text-sm font-medium text-slate-500">ছবি আপলোড করুন</p>
                        </>
                      )}
                      <input 
                        type="file" 
                        ref={fileInputRef}
                        onChange={handleImageUpload}
                        accept="image/*"
                        className="hidden"
                      />
                    </div>

                    <div className="space-y-3">
                      <label className="text-sm font-semibold">অ্যাসপেক্ট রেশিও</label>
                      <div className="flex gap-2">
                        {(['16:9', '9:16'] as const).map((ratio) => (
                          <button
                            key={ratio}
                            onClick={() => setVeoAspectRatio(ratio)}
                            className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-all ${
                              veoAspectRatio === ratio 
                                ? 'bg-primary text-white border-primary' 
                                : 'bg-white text-slate-600 border-slate-200 hover:border-primary'
                            }`}
                          >
                            {ratio === '16:9' ? 'Landscape (16:9)' : 'Portrait (9:16)'}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col h-full">
                    <div className="flex-grow space-y-4">
                      <div>
                        <label className="block text-sm font-semibold mb-2">কি ধরণের ভিডিও চান? (ঐচ্ছিক)</label>
                        <textarea 
                          value={veoPrompt}
                          onChange={(e) => setVeoPrompt(e.target.value)}
                          placeholder="যেমন: এই ছবিটি সুন্দরভাবে এনিমেট করুন..."
                          className="w-full h-32 px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 outline-none resize-none"
                        />
                      </div>

                      {generationStatus && (
                        <div className={`p-4 rounded-xl flex items-start gap-3 ${
                          isGenerating ? 'bg-blue-50 text-blue-700' : 'bg-green-50 text-green-700'
                        }`}>
                          {isGenerating ? <Loader2 className="w-5 h-5 animate-spin shrink-0" /> : <CheckCircle2 className="w-5 h-5 shrink-0" />}
                          <p className="text-sm font-medium">{generationStatus}</p>
                        </div>
                      )}

                      {generatedVideoUrl && (
                        <div className="rounded-xl overflow-hidden border border-slate-200 bg-black">
                          <video 
                            src={generatedVideoUrl} 
                            controls 
                            className="w-full aspect-video"
                            autoPlay
                          />
                        </div>
                      )}
                    </div>

                    <button 
                      onClick={generateVeoVideo}
                      disabled={!veoImage || isGenerating}
                      className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-6"
                    >
                      {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : "ভিডিও তৈরি করুন"}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <footer className="bg-secondary text-white py-12 px-6 mt-20">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 border-b border-white/10 pb-8 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <GraduationCap className="w-8 h-8 text-primary" />
              <h2 className="text-2xl font-bold">গুজিয়া টেকনিক্যাল ট্রেনিং সেন্টার</h2>
            </div>
            <p className="text-slate-400 max-w-md">
              দক্ষ জনশক্তি গড়ার প্রত্যয়ে আমরা দিচ্ছি আধুনিক ও মানসম্মত কারিগরি শিক্ষা।
            </p>
          </div>
          <div className="flex flex-col md:items-end justify-center">
            <p className="font-bold">পরিচালক: মো: শফিউল্লাহ মাসুম</p>
            <p className="text-slate-400">অধ্যক্ষ: মো: মশিফুকর রহমান</p>
          </div>
        </div>
        <div className="text-center text-slate-500 text-sm">
          <p>© ২০২৪-২০২৬ গুজিয়া টেকনিক্যাল ট্রেনিং সেন্টার। সর্বস্বত্ব সংরক্ষিত।</p>
        </div>
      </footer>
    </div>
  );
}
