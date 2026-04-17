import { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, Gamepad2, Disc3 } from 'lucide-react';
import { motion } from 'motion/react';

// --- Constants ---
const GRID_SIZE = 20;

const TRACKS = [
  { id: 1, title: "Neon City Drift", artist: "AI Synth Demo 1", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" },
  { id: 2, title: "Digital Horizon", artist: "AI Synth Demo 2", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3" },
  { id: 3, title: "Quantum Core", artist: "AI Synth Demo 3", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3" },
];

const DIR = {
  UP: { x: 0, y: -1 },
  DOWN: { x: 0, y: 1 },
  LEFT: { x: -1, y: 0 },
  RIGHT: { x: 1, y: 0 },
};

type Point = { x: number; y: number };

export default function App() {
  // --- Music Player State ---
  const [currentTrack, setCurrentTrack] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.4);
  const audioRef = useRef<HTMLAudioElement>(null);

  // --- Game State ---
  const [gameStatus, setGameStatus] = useState<'IDLE' | 'PLAYING' | 'PAUSED' | 'GAMEOVER'>('IDLE');
  const [gameState, setGameState] = useState<{ snake: Point[], food: Point, score: number }>({
    snake: [{ x: 10, y: 10 }],
    food: { x: 15, y: 5 },
    score: 0,
  });
  const [highScore, setHighScore] = useState(0);

  const nextDirectionRef = useRef(DIR.UP);
  const lastDirectionRef = useRef(DIR.UP); 

  // --- Music Side Effects ---
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  useEffect(() => {
    if (isPlaying && audioRef.current) {
      audioRef.current.play().catch(e => console.log('Auto-play blocked or error:', e));
    }
  }, [currentTrack, isPlaying]);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play().then(() => setIsPlaying(true)).catch(console.error);
      }
    }
  };

  const nextTrack = useCallback(() => {
    setCurrentTrack(prev => (prev + 1) % TRACKS.length);
    // On track change, it will auto-play due to the useEffect above if it was playing
  }, []);

  const prevTrack = () => {
    setCurrentTrack(prev => (prev - 1 + TRACKS.length) % TRACKS.length);
  };

  // --- Game Side Effects ---
  useEffect(() => {
    if (gameState.score > highScore) {
      setHighScore(gameState.score);
    }
  }, [gameState.score, highScore]);

  // Main Game Loop
  useEffect(() => {
    if (gameStatus !== 'PLAYING') return;

    const intervalId = setInterval(() => {
      setGameState(prev => {
        const head = prev.snake[0];
        const nextDir = nextDirectionRef.current;
        lastDirectionRef.current = nextDir; // lock it in

        const nextHead = { x: head.x + nextDir.x, y: head.y + nextDir.y };

        // 1. Collision with walls
        if (nextHead.x < 0 || nextHead.x >= GRID_SIZE || nextHead.y < 0 || nextHead.y >= GRID_SIZE) {
          setGameStatus('GAMEOVER');
          return prev;
        }

        // 2. Collision with self (ignore the tail tip since it will move)
        if (prev.snake.slice(0, -1).some(seg => seg.x === nextHead.x && seg.y === nextHead.y)) {
          setGameStatus('GAMEOVER');
          return prev;
        }

        const newSnake = [nextHead, ...prev.snake];

        // 3. Eaten Food
        if (nextHead.x === prev.food.x && nextHead.y === prev.food.y) {
          let newFood: Point;
          while (true) {
            newFood = {
              x: Math.floor(Math.random() * GRID_SIZE),
              y: Math.floor(Math.random() * GRID_SIZE)
            };
            if (!newSnake.some(seg => seg.x === newFood.x && seg.y === newFood.y)) {
              break;
            }
          }
          return { ...prev, snake: newSnake, food: newFood, score: prev.score + 10 };
        } else {
          // Normal movement
          newSnake.pop();
          return { ...prev, snake: newSnake };
        }
      });
    }, 120);

    return () => clearInterval(intervalId);
  }, [gameStatus]);

  // Input Handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const keys = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "w", "a", "s", "d", " "];
      if (keys.includes(e.key)) {
        e.preventDefault();
      }

      // Spacebar controls
      if (e.key === ' ') {
        if (gameStatus === 'IDLE' || gameStatus === 'GAMEOVER') {
          startGame();
          return;
        }
        if (gameStatus === 'PLAYING') {
          setGameStatus('PAUSED');
          return;
        }
        if (gameStatus === 'PAUSED') {
          setGameStatus('PLAYING');
          return;
        }
      }

      if (gameStatus !== 'PLAYING') return;

      const currentLockedDir = lastDirectionRef.current;
      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          if (currentLockedDir.y !== 1) nextDirectionRef.current = DIR.UP;
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          if (currentLockedDir.y !== -1) nextDirectionRef.current = DIR.DOWN;
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          if (currentLockedDir.x !== 1) nextDirectionRef.current = DIR.LEFT;
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          if (currentLockedDir.x !== -1) nextDirectionRef.current = DIR.RIGHT;
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown, { passive: false });
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameStatus]);

  const startGame = () => {
    setGameState({
      snake: [{ x: 10, y: 10 }],
      food: { x: 15, y: 5 },
      score: 0
    });
    nextDirectionRef.current = DIR.UP;
    lastDirectionRef.current = DIR.UP;
    setGameStatus('PLAYING');

    // Optionally auto-start music if not playing
    if (!isPlaying && audioRef.current) {
      audioRef.current.play().then(() => setIsPlaying(true)).catch(console.error);
    }
  };

  return (
    <div className="min-h-screen bg-[#070b14] text-white overflow-hidden relative flex flex-col items-center justify-center font-mono selection:bg-cyan-500/30">
      {/* Background glowing grid pattern */}
      <div 
        className="absolute inset-0 opacity-20 pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(to right, rgba(0, 255, 255, 0.2) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 255, 255, 0.2) 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }}
      />

      <audio 
        ref={audioRef} 
        src={TRACKS[currentTrack].url} 
        onEnded={nextTrack}
        preload="auto"
      />

      {/* Main Container */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="relative z-10 w-full max-w-6xl px-4 py-8 flex flex-col lg:flex-row gap-8 items-center lg:items-start justify-center"
      >
        
        {/* Left Column / Scoreboard */}
        <div className="flex flex-col gap-6 w-full max-w-sm lg:w-64 order-2 lg:order-1">
          <div className="border border-cyan-500/50 bg-[#0a1122]/90 backdrop-blur-md p-6 rounded-2xl shadow-[0_0_25px_rgba(0,255,255,0.15)] glow-cyan transition-all duration-300 hover:shadow-[0_0_35px_rgba(0,255,255,0.25)]">
            <h2 className="text-cyan-400 font-bold tracking-widest text-lg uppercase flex items-center gap-2 mb-6">
              <Gamepad2 className="w-5 h-5 text-cyan-400" /> Stats
            </h2>
            <div className="flex flex-col gap-4">
              <div>
                <div className="text-sm text-gray-400 mb-1">SCORE</div>
                <div className="text-4xl font-black text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]">
                  {gameState.score}
                </div>
              </div>
              <div className="h-px bg-cyan-900/50 w-full my-2" />
              <div>
                <div className="text-sm text-gray-400 mb-1">HIGH SCORE</div>
                <div className="text-2xl font-bold text-cyan-300">
                  {highScore}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Center Game Grid */}
        <div className="order-1 lg:order-2 flex flex-col items-center">
          <div className="border border-purple-500/80 shadow-[0_0_40px_rgba(168,85,247,0.3),inset_0_0_20px_rgba(168,85,247,0.15)] bg-[#040713] rounded-xl p-3 backdrop-blur-xl relative">
            <div 
              className="relative w-[300px] h-[300px] sm:w-[500px] sm:h-[500px] bg-black border border-white/5 overflow-hidden rounded-md"
            >
              {/* Overlay Screen (Menus / Start) */}
              {gameStatus !== 'PLAYING' && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center z-20 px-8 text-center border ring-1 ring-inset ring-white/10">
                  {gameStatus === 'GAMEOVER' && (
                    <div className="text-red-500 text-3xl sm:text-4xl font-black tracking-wider mb-6 drop-shadow-[0_0_15px_rgba(239,68,68,0.8)] animate-pulse">
                      SYSTEM FAILURE
                    </div>
                  )}
                  {gameStatus === 'PAUSED' && (
                    <div className="text-cyan-400 text-3xl font-black tracking-widest mb-6 drop-shadow-[0_0_15px_rgba(34,211,238,0.8)]">
                      PAUSED
                    </div>
                  )}
                  
                  {(gameStatus === 'IDLE' || gameStatus === 'GAMEOVER') && (
                    <button 
                      onClick={startGame} 
                      className="px-6 py-3 sm:px-8 sm:py-4 bg-cyan-500/10 border border-cyan-400 text-cyan-400 font-bold tracking-widest uppercase hover:bg-cyan-500/20 shadow-[0_0_15px_rgba(34,211,238,0.2)] hover:shadow-[0_0_25px_rgba(34,211,238,0.5)] transition-all duration-300 rounded focus:outline-none focus:ring-2 focus:ring-cyan-300 active:scale-95"
                    >
                      {gameStatus === 'IDLE' ? 'Initialize Game' : 'Reboot System'}
                    </button>
                  )}

                  {gameStatus === 'IDLE' && (
                    <div className="mt-8 text-gray-500 text-xs sm:text-sm uppercase tracking-widest flex flex-col gap-2">
                       <span>Controls: W A S D or Arrows</span>
                       <span>Pause / Start: Spacebar</span>
                    </div>
                  )}
                </div>
              )}

              {/* Game Elements */}
              {/* Food */}
              <div 
                className="absolute bg-pink-500 shadow-[0_0_15px_#ec4899] rounded-full z-0 transition-transform duration-75"
                style={{
                  left: `${(gameState.food.x / GRID_SIZE) * 100}%`,
                  top: `${(gameState.food.y / GRID_SIZE) * 100}%`,
                  width: `${100 / GRID_SIZE}%`,
                  height: `${100 / GRID_SIZE}%`,
                  transform: 'scale(0.7)'
                }}
              />

              {/* Snake */}
              {gameState.snake.map((seg, i) => (
                <div
                  key={`${seg.x}-${seg.y}-${i}`}
                  className={`absolute rounded-[4px] ${i === 0 ? 'bg-green-400 shadow-[0_0_15px_#4ade80] z-10' : 'bg-green-600/90 shadow-[0_0_8px_#16a34a] z-0'}`}
                  style={{
                    left: `${(seg.x / GRID_SIZE) * 100}%`,
                    top: `${(seg.y / GRID_SIZE) * 100}%`,
                    width: `${100 / GRID_SIZE}%`,
                    height: `${100 / GRID_SIZE}%`,
                    transform: 'scale(0.9)'
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Right Column / Music Player */}
        <div className="flex flex-col w-full max-w-sm lg:w-80 order-3 lg:order-3">
          <div className="border border-pink-500/50 bg-[#160a22]/90 backdrop-blur-md p-6 rounded-2xl shadow-[0_0_25px_rgba(255,0,255,0.15)] transition-all duration-300 hover:shadow-[0_0_35px_rgba(255,0,255,0.25)] flex flex-col gap-6">
            <h2 className="text-pink-400 font-bold tracking-widest text-lg uppercase drop-shadow-[0_0_8px_rgba(255,0,255,0.8)] flex items-center gap-2">
              <Disc3 className={`w-5 h-5 ${isPlaying ? 'animate-[spin_3s_linear_infinite]' : ''}`} /> 
              Syntax FM
            </h2>

            {/* Track Info */}
            <div className="bg-black/40 border border-white/5 rounded-lg p-4 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-pink-500" />
              <div className="pl-2">
                <div className="text-xs text-pink-300/70 tracking-widest uppercase mb-1">
                  {TRACKS[currentTrack].artist}
                </div>
                <div className="text-base font-bold text-white truncate drop-shadow-[0_0_5px_rgba(255,255,255,0.8)]">
                  {TRACKS[currentTrack].title}
                </div>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-6 mt-2">
              <button 
                onClick={prevTrack} 
                className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-full"
              >
                <SkipBack className="w-6 h-6" />
              </button>
              
              <button 
                onClick={togglePlay} 
                className="w-14 h-14 flex items-center justify-center bg-pink-500 text-white rounded-full shadow-[0_0_20px_rgba(236,72,153,0.5)] hover:shadow-[0_0_30px_rgba(236,72,153,0.8)] hover:scale-105 transition-all focus:outline-none"
              >
                {isPlaying ? <Pause className="w-6 h-6 ml-0" /> : <Play className="w-6 h-6 ml-1" />}
              </button>
              
              <button 
                onClick={nextTrack} 
                className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-full"
              >
                <SkipForward className="w-6 h-6" />
              </button>
            </div>

            {/* Volume */}
            <div className="flex items-center gap-3 w-full bg-black/30 p-3 rounded-lg border border-white/5">
              <button onClick={() => setVolume(0)} className="text-gray-400 hover:text-pink-400 transition-colors">
                <VolumeX className="w-4 h-4" />
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="flex-1 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-pink-500 hover:accent-pink-400"
                style={{
                  background: `linear-gradient(to right, #ec4899 ${volume * 100}%, #374151 ${volume * 100}%)`
                }}
              />
              <Volume2 className="w-4 h-4 text-pink-400" />
            </div>
            
            <div className="text-[10px] text-gray-500 uppercase tracking-widest text-center mt-2 flex items-center justify-center gap-2">
               <span>Playing AI generated tracks</span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
