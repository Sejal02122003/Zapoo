import React from 'react';
import { motion } from 'framer-motion';
import { Play } from 'lucide-react';

export default function FestBanner() {
  return (
    <div className="px-0 py-1 w-full">
      {/* Banner Container */}
      <div className="relative overflow-hidden w-full h-[200px] rounded-[1.5rem] bg-gradient-to-b from-[#0e5fa3] to-[#124278] shadow-[0_10px_25px_rgba(18,66,120,0.2)] flex flex-col items-center justify-between py-3 px-6 select-none">

        {/* Animated Sunburst Rays Background */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
          className="absolute w-[300px] h-[300px] top-[-50px] opacity-15 pointer-events-none z-0"
          style={{
            backgroundImage: `repeating-conic-gradient(from 0deg, white 0deg 15deg, transparent 15deg 30deg)`
          }}
        />

        {/* Floating Background Elements (Balloons/Clouds) */}
        <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
          <motion.span
            animate={{ y: [-5, 5, -5], rotate: [-5, 5, -5] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="absolute left-6 top-6 text-xl opacity-20"
          >
            🎈
          </motion.span>
          <motion.span
            animate={{ y: [5, -5, 5], rotate: [5, -5, 5] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            className="absolute right-8 top-10 text-xl opacity-20"
          >
            🎈
          </motion.span>
        </div>

        {/* Top Text Header: "PAYDAY PARTY" */}
        <div className="relative z-10 flex flex-col items-center text-center mt-1">
          <motion.div
            animate={{ scale: [1, 1.03, 1], rotate: [-1, 1, -1] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="flex flex-col items-center"
          >
            <span className="text-[10px] font-black text-yellow-300 tracking-[0.2em] uppercase drop-shadow-md">
              Limited Time Feast
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#FFAA00] tracking-tighter uppercase italic leading-none mt-0.5 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] flex items-center gap-1">
              <span className="text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">PAYDAY</span>
              <span className="text-red-500 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">PARTY</span>
            </h2>
          </motion.div>
        </div>

        {/* Marching Cartoon Food Characters */}
        <div className="relative z-10 w-full flex justify-center items-end gap-5 sm:gap-7 pb-2.5">
          {/* Character 1: Soda Cup */}
          <motion.div
            animate={{
              y: [0, -6, 0],
              rotate: [-6, 6, -6],
              scaleY: [1, 0.95, 1.05, 1]
            }}
            transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
            className="flex flex-col items-center cursor-pointer active:scale-90 transition-transform"
          >
            <span className="text-3xl filter drop-shadow-md">🥤</span>
          </motion.div>

          {/* Character 2: Pizza */}
          <motion.div
            animate={{
              y: [0, -8, 0],
              rotate: [8, -8, 8],
              scaleY: [1, 0.93, 1.07, 1]
            }}
            transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut", delay: 0.15 }}
            className="flex flex-col items-center cursor-pointer active:scale-90 transition-transform"
          >
            <span className="text-3xl filter drop-shadow-md">🍕</span>
          </motion.div>

          {/* Character 3: Burrito/Wrap */}
          <motion.div
            animate={{
              y: [0, -7, 0],
              rotate: [-5, 5, -5],
              scaleY: [1, 0.96, 1.04, 1]
            }}
            transition={{ duration: 1.3, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
            className="flex flex-col items-center cursor-pointer active:scale-90 transition-transform"
          >
            <span className="text-3xl filter drop-shadow-md">🌯</span>
          </motion.div>

          {/* Character 4: Burger */}
          <motion.div
            animate={{
              y: [0, -9, 0],
              rotate: [6, -6, 6],
              scaleY: [1, 0.92, 1.08, 1]
            }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: 0.45 }}
            className="flex flex-col items-center cursor-pointer active:scale-90 transition-transform"
          >
            <span className="text-3xl filter drop-shadow-md">🍔</span>
          </motion.div>

          {/* Character 5: Fries */}
          <motion.div
            animate={{
              y: [0, -8, 0],
              rotate: [-8, 8, -8],
              scaleY: [1, 0.94, 1.06, 1]
            }}
            transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut", delay: 0.6 }}
            className="flex flex-col items-center cursor-pointer active:scale-90 transition-transform"
          >
            <span className="text-3xl filter drop-shadow-md">🍟</span>
          </motion.div>
        </div>

        {/* Order Now Button */}
        <motion.div
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="relative z-10 bg-red-600 hover:bg-red-700 text-white font-black text-xs px-6 py-2 rounded-full shadow-lg flex items-center gap-1 cursor-pointer active:scale-95 transition-all"
        >
          <span>ORDER NOW</span>
          <Play className="h-3 w-3 fill-white" />
        </motion.div>

        {/* Left Theater Curtain */}
        <motion.div
          initial={{ x: 0 }}
          animate={{ x: "-80%" }}
          transition={{ delay: 0.4, duration: 1.4, ease: "easeInOut" }}
          className="absolute left-0 top-0 bottom-0 w-[55%] z-30 bg-gradient-to-r from-red-800 via-red-600 to-red-900 border-r-[3px] border-yellow-500 rounded-l-[2rem] origin-left shadow-2xl flex items-center justify-end pr-2 pointer-events-none"
        >
          <div className="w-1.5 h-full border-r border-dashed border-yellow-400/50" />
        </motion.div>

        {/* Right Theater Curtain */}
        <motion.div
          initial={{ x: 0 }}
          animate={{ x: "80%" }}
          transition={{ delay: 0.4, duration: 1.4, ease: "easeInOut" }}
          className="absolute right-0 top-0 bottom-0 w-[55%] z-30 bg-gradient-to-l from-red-800 via-red-600 to-red-900 border-l-[3px] border-yellow-500 rounded-r-[2rem] origin-right shadow-2xl flex items-center justify-start pl-2 pointer-events-none"
        >
          <div className="w-1.5 h-full border-l border-dashed border-yellow-400/50" />
        </motion.div>

      </div>
    </div>
  );
}
