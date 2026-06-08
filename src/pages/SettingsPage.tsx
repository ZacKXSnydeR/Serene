import React from "react";
import { useUIStore } from "../store/useUIStore";

export const SettingsPage: React.FC = () => {
  const discordRpcEnabled = useUIStore((state) => state.discordRpcEnabled);
  const setDiscordRpcEnabled = useUIStore((state) => state.setDiscordRpcEnabled);

  return (
    <div className="w-full h-full flex flex-col p-6 animate-fade-in relative z-10 text-white">
      <div className="flex items-center gap-4 mb-8 sticky top-0 bg-transparent py-4 z-20">
        <h1 className="text-4xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60 leading-normal pb-1">
          Settings
        </h1>
      </div>

      <div className="flex flex-col gap-6 max-w-2xl">
        {/* Discord Rich Presence Setting */}
        <div className="flex items-center justify-between p-5 rounded-2xl bg-white/5 backdrop-blur-md border border-white/5 hover:bg-white/10 transition-all duration-300">
          <div className="flex flex-col gap-1">
            <h2 className="text-xl font-semibold text-white/90">Discord Rich Presence</h2>
            <p className="text-sm text-white/50">
              Show what you're listening to on your Discord profile.
            </p>
          </div>
          <button
            onClick={() => setDiscordRpcEnabled(!discordRpcEnabled)}
            className={`relative w-14 h-8 rounded-full transition-colors duration-300 focus:outline-none cursor-pointer ${
              discordRpcEnabled ? "bg-[#F26B50]" : "bg-white/10"
            }`}
          >
            <div
              className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-transform duration-300 shadow-md ${
                discordRpcEnabled ? "translate-x-6" : "translate-x-0"
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  );
};
