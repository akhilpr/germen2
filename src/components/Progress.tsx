
import React, { useState, useEffect, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { ConversationReport } from '../models/conversation.model';
import { WritingReport } from '../models/writing.model';

type ProgressView = 'conversations' | 'writing';

const ScoreGauge = ({ score, label }: { score: number, label: string }) => {
  const circumference = 2 * Math.PI * 45;
  const offset = circumference - (score / 100) * circumference;
  const colorClass = score >= 75 ? 'text-green-500' : score >= 50 ? 'text-yellow-500' : 'text-red-500';

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-28 h-28">
        <svg className="w-full h-full" viewBox="0 0 100 100">
          <circle className="text-slate-200 dark:text-slate-700" strokeWidth="10" stroke="currentColor" fill="transparent" r="45" cx="50" cy="50" />
          <circle className={`${colorClass} transition-all duration-500 ease-in-out`} strokeWidth="10" strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" stroke="currentColor" fill="transparent" r="45" cx="50" cy="50" transform="rotate(-90 50 50)" />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-2xl font-bold">{score}</span>
      </div>
      <p className="mt-2 text-sm font-semibold text-slate-600 dark:text-slate-300">{label}</p>
    </div>
  );
};

export function Progress() {
  const { conversationReports, writingReports, latestConversationReport, latestWritingReport, averageScore, level } = useAppContext();
  const [progressView, setProgressView] = useState<ProgressView>('conversations');
  const [selectedConversation, setSelectedConversation] = useState<ConversationReport | null>(null);
  const [selectedWriting, setSelectedWriting] = useState<WritingReport | null>(null);
  
  const sortedConversationReports = useMemo(() => [...conversationReports].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()), [conversationReports]);
  const sortedWritingReports = useMemo(() => [...writingReports].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()), [writingReports]);

  useEffect(() => {
    if (latestConversationReport) {
      setSelectedConversation(latestConversationReport);
      setProgressView('conversations');
    } else if (sortedConversationReports.length > 0) {
      setSelectedConversation(sortedConversationReports[0]);
    }
  }, [latestConversationReport, sortedConversationReports]);
  
  useEffect(() => {
    if (latestWritingReport) {
      setSelectedWriting(latestWritingReport);
      setProgressView('writing');
    } else if (sortedWritingReports.length > 0) {
      setSelectedWriting(sortedWritingReports[0]);
    }
  }, [latestWritingReport, sortedWritingReports]);

  const formatDate = (date: Date) => new Date(date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const formatTime = (date: Date) => new Date(date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

  const renderConversationDetails = (report: ConversationReport) => (
    <div className="p-6">
      <h3 className="text-xl font-bold mb-4">Conversation Details</h3>
      <div className="grid grid-cols-3 gap-4 mb-6">
        <ScoreGauge score={report.grammarScore} label="Grammar" />
        <ScoreGauge score={report.vocabularyScore} label="Vocabulary" />
        <ScoreGauge score={report.fluencyScore} label="Fluency" />
      </div>
      <div className="space-y-4">
        <div>
          <h4 className="font-semibold mb-2">Overall Feedback</h4>
          <p className="text-slate-600 dark:text-slate-300">{report.overallFeedback}</p>
        </div>
        <div>
          <h4 className="font-semibold mb-2">Areas for Improvement</h4>
          <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-300">
            {report.areasForImprovement.map((item, i) => <li key={i}>{item}</li>)}
          </ul>
        </div>
        <div>
          <h4 className="font-semibold mb-2">What You Did Well</h4>
          <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-300">
            {report.positivePoints.map((item, i) => <li key={i}>{item}</li>)}
          </ul>
        </div>
      </div>
    </div>
  );
  
  const renderWritingDetails = (report: WritingReport) => (
      <div className="p-6">
          <h3 className="text-xl font-bold mb-4">Writing Details</h3>
          <img src={report.imageUrl} alt="Handwriting sample" className="rounded-lg mb-4" />
          <div>
            <h4 className="font-semibold mb-2">Overall Feedback</h4>
            <p className="text-slate-600 dark:text-slate-300 mb-4">{report.overallFeedback}</p>
          </div>
          <div>
            <h4 className="font-semibold mb-2">Corrections</h4>
            <div className="space-y-2">
                {report.corrections.map((c, i) => (
                    <div key={i} className="p-2 bg-slate-100 dark:bg-slate-700/50 rounded">
                        <p className="line-through text-red-500 text-sm">{c.original}</p>
                        <p className="text-green-600 font-medium text-sm">{c.corrected}</p>
                    </div>
                ))}
            </div>
          </div>
      </div>
  );
  
  const NoReports = ({ type }: {type: string}) => (
      <div className="flex flex-col items-center justify-center h-full text-center text-slate-500 p-8">
          <i className="fas fa-folder-open text-4xl mb-4"></i>
          <h3 className="font-semibold text-lg">No {type} Reports Yet</h3>
          <p className="text-sm">Complete a session to see your progress here.</p>
      </div>
  );

  return (
    <div className="max-w-7xl mx-auto animate-fade-in">
      <div className="p-6 bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Your Progress</h2>
          <p className="text-slate-600 dark:text-slate-300">Level {level.number}: {level.name}</p>
        </div>
        <div className="text-right">
          <p className="text-4xl font-bold text-blue-500">{averageScore}<span className="text-xl text-slate-400">/100</span></p>
          <p className="text-sm text-slate-500">Avg. Conversation Score</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-700">
              <div className="flex bg-slate-100 dark:bg-slate-700 rounded-lg p-1">
                  <button onClick={() => setProgressView('conversations')} className={`w-1/2 py-2 text-sm font-semibold rounded-md transition-colors ${progressView === 'conversations' ? 'bg-white dark:bg-slate-600 shadow' : 'text-slate-600 dark:text-slate-300'}`}>Conversations</button>
                  <button onClick={() => setProgressView('writing')} className={`w-1/2 py-2 text-sm font-semibold rounded-md transition-colors ${progressView === 'writing' ? 'bg-white dark:bg-slate-600 shadow' : 'text-slate-600 dark:text-slate-300'}`}>Writing</button>
              </div>
          </div>
          <div className="h-[450px] overflow-y-auto">
              {progressView === 'conversations' && (
                  sortedConversationReports.length > 0 ? (
                      <ul>
                          {sortedConversationReports.map(report => (
                              <li key={report.id}>
                                  <button onClick={() => setSelectedConversation(report)} className={`w-full text-left p-4 border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors ${selectedConversation?.id === report.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}>
                                      <p className="font-semibold">{formatDate(report.date)}</p>
                                      <p className="text-sm text-slate-500 dark:text-slate-400">{formatTime(report.date)}</p>
                                  </button>
                              </li>
                          ))}
                      </ul>
                  ) : <NoReports type="Conversation" />
              )}
              {progressView === 'writing' && (
                  sortedWritingReports.length > 0 ? (
                       <ul>
                          {sortedWritingReports.map(report => (
                              <li key={report.id}>
                                  <button onClick={() => setSelectedWriting(report)} className={`w-full text-left p-4 border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors ${selectedWriting?.id === report.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}>
                                      <p className="font-semibold">{formatDate(report.date)}</p>
                                      <p className="text-sm text-slate-500 dark:text-slate-400">{formatTime(report.date)}</p>
                                  </button>
                              </li>
                          ))}
                      </ul>
                  ) : <NoReports type="Writing" />
              )}
          </div>
        </div>
        <div className="lg:col-span-2 bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="h-[550px] overflow-y-auto">
            {progressView === 'conversations' && selectedConversation && renderConversationDetails(selectedConversation)}
            {progressView === 'writing' && selectedWriting && renderWritingDetails(selectedWriting)}
            {progressView === 'conversations' && !selectedConversation && <NoReports type="Conversation" />}
            {progressView === 'writing' && !selectedWriting && <NoReports type="Writing" />}
          </div>
        </div>
      </div>
    </div>
  );
}
