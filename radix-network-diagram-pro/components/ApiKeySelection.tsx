
import React from 'react';

interface ApiKeySelectionProps {
  onKeySelected: () => void;
}

const ApiKeySelection: React.FC<ApiKeySelectionProps> = ({ onKeySelected }) => {
  const handleOpenSelectKey = async () => {
    if ((window as any).aistudio?.openSelectKey) {
      await (window as any).aistudio.openSelectKey();
      onKeySelected();
    } else {
      alert("この環境ではAPIキーの選択が利用できません。");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-6 text-center">
      <div className="max-w-md w-full bg-white border border-slate-200 rounded-3xl p-10 shadow-xl">
        <div className="mb-8">
          <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-4">APIキーの設定が必要です</h1>
          <p className="text-slate-600 mb-6 leading-relaxed">
            高品質なネットワーク図面を生成するために、Google AI Studio で有料プラン設定済みのプロジェクトからAPIキーを選択してください。
          </p>
          <a 
            href="https://ai.google.dev/gemini-api/docs/billing" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-700 font-semibold underline decoration-2 underline-offset-4"
          >
            支払い設定のドキュメント（外部）
          </a>
        </div>
        
        <button
          onClick={handleOpenSelectKey}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-6 rounded-2xl transition-all duration-200 shadow-lg shadow-blue-100 flex items-center justify-center gap-2 text-lg"
        >
          APIキーを選択する
        </button>
      </div>
    </div>
  );
};

export default ApiKeySelection;
