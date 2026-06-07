import React from 'react';
import { useNavigate } from 'react-router-dom';

interface AuthRequiredProps {
  title?: string;
  message?: string;
}

export const AuthRequired: React.FC<AuthRequiredProps> = ({ 
  title = "Authentication Required", 
  message = "You need to log in with your YouTube account to view this page. Head over to the Profile settings to securely sync your account."
}) => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center w-full min-h-[60vh] gap-6 text-center select-none">
       <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center mb-4">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-white/50">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
       </div>
       <h2 className="text-3xl font-black text-white">{title}</h2>
       <p className="text-white/50 max-w-md">{message}</p>
       <button 
         onClick={() => navigate('/profile')} 
         className="px-8 py-3 mt-4 bg-[#F26B50] text-black font-bold rounded-full hover:scale-105 transition-transform shadow-lg cursor-pointer"
       >
         Go to Profile
       </button>
    </div>
  );
};
