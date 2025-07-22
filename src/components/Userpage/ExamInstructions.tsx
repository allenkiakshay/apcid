import React, { useState } from 'react';
import { FileText, Clock, Upload, CheckCircle, AlertTriangle, Monitor, Keyboard } from 'lucide-react';

interface ExamInstructionsProps {
  onProceed: () => void;
}

const ExamInstructions: React.FC<ExamInstructionsProps> = ({ onProceed }) => {
  const [agreed, setAgreed] = useState(false);

  const handleProceed = () => {
    if (agreed) {
      onProceed();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-8">
      <div className="max-w-5xl mx-auto px-4">
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/20 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white px-8 py-12 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-black/10"></div>
            <div className="relative z-10">
              <Monitor className="w-16 h-16 mx-auto mb-4 opacity-90" />
              <h1 className="text-4xl font-bold mb-2">Computer Skill Test</h1>
              <p className="text-blue-100 text-lg">Digital Assessment Platform</p>
            </div>
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full"></div>
            <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-white/10 rounded-full"></div>
          </div>

          <div className="p-8 space-y-8">
            {/* Test Components */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Typing Speed Test */}
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6 transform hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl">
                <div className="flex items-center mb-4">
                  <div className="bg-green-500 rounded-full p-3 mr-4">
                    <Keyboard className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-green-800">1. Typing Speed Test</h2>
                    <span className="inline-block bg-green-100 text-green-700 text-xs font-medium px-2 py-1 rounded-full mt-1">
                      First Component
                    </span>
                  </div>
                </div>
                <ul className="space-y-3 text-gray-700">
                  <li className="flex items-start">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-1 flex-shrink-0" />
                    <span>Assess both typing speed and accuracy</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-1 flex-shrink-0" />
                    <span>Follow on-screen instructions carefully</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-1 flex-shrink-0" />
                    <span>Complete within the given time limit</span>
                  </li>
                </ul>
              </div>

              {/* MS Office Tasks */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6 transform hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl">
                <div className="flex items-center mb-4">
                  <div className="bg-blue-500 rounded-full p-3 mr-4">
                    <FileText className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-blue-800">2. MS Office Tasks</h2>
                    <span className="inline-block bg-blue-100 text-blue-700 text-xs font-medium px-2 py-1 rounded-full mt-1">
                      Three Applications
                    </span>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="bg-white/80 rounded-lg p-4 border border-blue-100">
                    <h3 className="font-semibold text-blue-800 mb-2">Applications to be tested:</h3>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div className="bg-blue-100 text-blue-700 px-3 py-2 rounded-lg text-center font-medium">
                        MS Word
                      </div>
                      <div className="bg-green-100 text-green-700 px-3 py-2 rounded-lg text-center font-medium">
                        MS Excel
                      </div>
                      <div className="bg-orange-100 text-orange-700 px-3 py-2 rounded-lg text-center font-medium">
                        MS PowerPoint
                      </div>
                    </div>
                  </div>
                  
                  <ul className="space-y-2 text-gray-700">
                    <li className="flex items-start">
                      <CheckCircle className="w-4 h-4 text-blue-500 mr-2 mt-1 flex-shrink-0" />
                      <span>Complete tasks according to provided instructions</span>
                    </li>
                    <li className="flex items-start">
                      <Upload className="w-4 h-4 text-blue-500 mr-2 mt-1 flex-shrink-0" />
                      <span>Upload completed files through platform interface</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* General Guidelines */}
            <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-xl p-6 shadow-lg">
              <div className="flex items-center mb-4">
                <div className="bg-amber-500 rounded-full p-3 mr-4">
                  <AlertTriangle className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-amber-800">General Guidelines</h2>
              </div>
              
              <div className="grid md:grid-cols-3 gap-4">
                <div className="bg-white/80 rounded-lg p-4 border border-amber-100">
                  <div className="flex items-center mb-2">
                    <Clock className="w-5 h-5 text-amber-600 mr-2" />
                    <h3 className="font-semibold text-amber-800">Time Management</h3>
                  </div>
                  <p className="text-gray-700 text-sm">All tasks must be completed and submitted within the allotted time</p>
                </div>
                
                <div className="bg-white/80 rounded-lg p-4 border border-amber-100">
                  <div className="flex items-center mb-2">
                    <CheckCircle className="w-5 h-5 text-amber-600 mr-2" />
                    <h3 className="font-semibold text-amber-800">Accuracy</h3>
                  </div>
                  <p className="text-gray-700 text-sm">Ensure submissions are accurate and complete before uploading</p>
                </div>
                
                <div className="bg-white/80 rounded-lg p-4 border border-amber-100">
                  <div className="flex items-center mb-2">
                    <AlertTriangle className="w-5 h-5 text-amber-600 mr-2" />
                    <h3 className="font-semibold text-amber-800">Evaluation Impact</h3>
                  </div>
                  <p className="text-gray-700 text-sm">Late or incomplete submissions may affect your overall evaluation</p>
                </div>
              </div>
            </div>

            {/* Agreement and Proceed */}
            <div className="bg-gradient-to-r from-gray-50 to-slate-50 border border-gray-200 rounded-xl p-6 text-center">
              <div className="mb-6">
                <div className="flex items-center justify-center mb-4">
                  <input
                    type="checkbox"
                    id="agreement"
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 border-2 border-gray-300"
                  />
                  <label htmlFor="agreement" className="ml-3 text-gray-800 font-medium">
                    I have read and understood all the Computer Skill Test instructions
                  </label>
                </div>
              </div>
              
              <button
                onClick={handleProceed}
                disabled={!agreed}
                className={`relative px-12 py-4 rounded-xl font-bold text-lg transition-all duration-300 transform ${
                  agreed
                    ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 hover:scale-105 hover:shadow-2xl'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                <span className="relative z-10 flex items-center justify-center">
                  <Monitor className="w-5 h-5 mr-2" />
                  Begin Computer Skill Test
                </span>
                {agreed && (
                  <div className="absolute inset-0 bg-white/20 rounded-xl opacity-0 hover:opacity-100 transition-opacity duration-300"></div>
                )}
              </button>
              
              {!agreed && (
                <p className="text-sm text-gray-500 mt-2">Please accept the instructions to proceed</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExamInstructions;