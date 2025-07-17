import React from 'react';

interface ExamInstructionsProps {
  onProceed: () => void;
}

const ExamInstructions: React.FC<ExamInstructionsProps> = ({ onProceed }) => {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-center mb-8 text-gray-800">
            Exam Instructions
          </h1>
          
          <div className="space-y-6">
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4">
              <h2 className="text-xl font-semibold mb-3 text-blue-800">
                Important Guidelines
              </h2>
              <ul className="list-disc list-inside space-y-2 text-gray-700">
                <li>Read all questions carefully before answering</li>
                <li>Manage your time effectively throughout the exam</li>
                <li>Ensure all required files are submitted before the deadline</li>
                <li>Do not refresh the page or navigate away during the exam</li>
              </ul>
            </div>

            <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4">
              <h2 className="text-xl font-semibold mb-3 text-yellow-800">
                Technical Requirements
              </h2>
              <ul className="list-disc list-inside space-y-2 text-gray-700">
                <li>Ensure stable internet connection</li>
                <li>Use supported file formats only</li>
                <li>Keep file sizes within specified limits</li>
                <li>Test your upload functionality before starting</li>
              </ul>
            </div>

            <div className="bg-red-50 border-l-4 border-red-500 p-4">
              <h2 className="text-xl font-semibold mb-3 text-red-800">
                Exam Rules
              </h2>
              <ul className="list-disc list-inside space-y-2 text-gray-700">
                <li>No external help or resources allowed</li>
                <li>Maintain academic integrity at all times</li>
                <li>Submit your work before the time limit expires</li>
                <li>Contact support immediately if you encounter technical issues</li>
              </ul>
            </div>

            <div className="bg-green-50 border-l-4 border-green-500 p-4">
              <h2 className="text-xl font-semibold mb-3 text-green-800">
                Before You Begin
              </h2>
              <ul className="list-disc list-inside space-y-2 text-gray-700">
                <li>Review the question paper thoroughly</li>
                <li>Plan your approach and time allocation</li>
                <li>Ensure you have all necessary materials ready</li>
                <li>Close all unnecessary applications and tabs</li>
              </ul>
            </div>
          </div>

          <div className="mt-8 text-center">
            <div className="mb-4">
              <input
                type="checkbox"
                id="agreement"
                className="mr-2 h-4 w-4 text-blue-600"
                required
              />
              <label htmlFor="agreement" className="text-gray-700">
                I have read and understood all the exam instructions
              </label>
            </div>
            
            <button
              onClick={onProceed}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg transition duration-200 transform hover:scale-105"
            >
              Proceed to Exam
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExamInstructions;