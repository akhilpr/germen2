
import React, { useState, useRef, useCallback } from 'react';
import { useAppContext } from '../context/AppContext';

export function Writing() {
  const { writingState, selectedImage, latestWritingReport, selectImage, analyzeWriting, resetWriting, geminiError } = useAppContext();
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      selectImage(e.target.files[0]);
    }
  };

  const onDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); }, []);
  const onDragLeave = useCallback((e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); }, []);
  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setIsDragging(false);
    if (e.dataTransfer.files?.[0]) { selectImage(e.dataTransfer.files[0]); }
  }, [selectImage]);

  const renderContent = () => {
    switch (writingState) {
      case 'idle':
      case 'image_selected':
        return (
          <div className="flex flex-col md:flex-row items-stretch gap-6 h-full">
            <div className={`flex-1 flex flex-col p-6 rounded-2xl border-2 border-dashed transition-colors duration-300 ${isDragging ? 'border-blue-500 bg-blue-50 dark:bg-slate-800' : 'border-slate-300 dark:border-slate-600'}`} onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}>
              <div className="flex flex-col items-center justify-center text-center h-full">
                <i className="fas fa-cloud-upload-alt text-5xl text-slate-400 dark:text-slate-500 mb-4"></i>
                <h3 className="text-xl font-semibold text-slate-700 dark:text-slate-200">Upload Your Writing</h3>
                <p className="text-slate-500 dark:text-slate-400 mt-1">Drag & drop an image of your handwritten German text, or click to select a file.</p>
                <button onClick={() => fileInputRef.current?.click()} className="mt-6 px-5 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
                  Browse Files
                </button>
                <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="image/*" className="hidden" />
                {geminiError && <p className="mt-4 text-sm text-red-500">{geminiError}</p>}
              </div>
            </div>
            {selectedImage && (
              <div className="w-full md:w-2/5 flex flex-col bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700">
                <h3 className="text-lg font-bold mb-4">Preview</h3>
                <img src={selectedImage} alt="Handwriting preview" className="rounded-lg mb-4 object-contain max-h-80 w-full" />
                <button onClick={() => analyzeWriting()} className="w-full mt-auto px-6 py-3 bg-blue-500 text-white font-bold rounded-lg hover:bg-blue-600 transition-colors shadow-md">
                  Analyze My Writing
                </button>
              </div>
            )}
          </div>
        );
      case 'analyzing':
        return (
          <div className="flex flex-col items-center justify-center h-full text-center p-6">
            <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin mb-4"></div>
            <h2 className="text-xl font-semibold text-slate-700 dark:text-slate-200">Analyzing your handwriting...</h2>
            <p className="text-slate-500 dark:text-slate-400">This may take a moment. I'm checking for grammar, spelling, and style.</p>
          </div>
        );
      case 'report_ready':
        if (!latestWritingReport) return <p>Error: Report not found.</p>;
        return (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
            <div>
                <h2 className="text-2xl font-bold mb-4">Writing Analysis Complete!</h2>
                <div className="p-6 bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700">
                    <h3 className="font-semibold text-lg mb-2">Overall Feedback</h3>
                    <p className="text-slate-600 dark:text-slate-300 mb-6">{latestWritingReport.overallFeedback}</p>
                    <h3 className="font-semibold text-lg mb-3">What You Did Well</h3>
                    <ul className="space-y-2 mb-6">
                        {latestWritingReport.positivePoints.map((point, i) => (
                            <li key={i} className="flex items-start"><i className="fas fa-check-circle text-green-500 mr-3 mt-1"></i><span>{point}</span></li>
                        ))}
                    </ul>
                    <h3 className="font-semibold text-lg mb-3">Corrections & Suggestions</h3>
                    <div className="space-y-4">
                        {latestWritingReport.corrections.map((c, i) => (
                            <div key={i} className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                                <p className="line-through text-red-500 dark:text-red-400">{c.original}</p>
                                <p className="text-green-600 dark:text-green-400 font-semibold">{c.corrected}</p>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{c.explanation}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            <div className="p-6 bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700">
                <img src={latestWritingReport.imageUrl} alt="Analyzed handwriting" className="rounded-lg object-contain w-full mb-4" />
                <button onClick={resetWriting} className="w-full px-6 py-3 bg-slate-600 text-white font-bold rounded-lg hover:bg-slate-700 transition-colors">
                    Analyze Another Sample
                </button>
            </div>
          </div>
        );
    }
  };
  
  return (
     <div className="flex flex-col h-[calc(100vh-180px)] max-w-6xl mx-auto">
      {renderContent()}
    </div>
  );
}
