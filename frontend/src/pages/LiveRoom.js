import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useLanguage } from '../context/LanguageContext';
import {
  ArrowLeft, Users, Crown, Play, Clock, Trophy, CheckCircle, X, Copy, Hash, Award, Zap
} from 'lucide-react';
import confetti from 'canvas-confetti';

const API_URL = process.env.REACT_APP_BACKEND_URL;

function getWsUrl(code, token) {
  const base = API_URL.replace(/^http/, 'ws');
  return `${base}/api/live/ws/${code}?token=${encodeURIComponent(token)}`;
}

function LiveRoom() {
  const { code } = useParams();
  const navigate = useNavigate();
  const { language, t } = useLanguage();
  const [phase, setPhase] = useState('connecting'); // connecting | lobby | question | result | ended | error
  const [lobby, setLobby] = useState(null);
  const [meId, setMeId] = useState(null);
  const [isHost, setIsHost] = useState(false);
  const [question, setQuestion] = useState(null);
  const [qIndex, setQIndex] = useState(0);
  const [qTotal, setQTotal] = useState(0);
  const [timePerQ, setTimePerQ] = useState(15);
  const [timeLeft, setTimeLeft] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [answered, setAnswered] = useState(false);
  const [questionResult, setQuestionResult] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [finalLeaderboard, setFinalLeaderboard] = useState([]);
  const [errorMsg, setErrorMsg] = useState('');
  const wsRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }
    const ws = new WebSocket(getWsUrl(code, token));
    wsRef.current = ws;

    ws.onopen = () => {
      // server will push 'joined' then 'lobby_update'
    };

    ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data);
        handleMessage(msg);
      } catch (e) {}
    };

    ws.onerror = (e) => {
      console.error('WS error', e);
    };

    ws.onclose = (evt) => {
      if (evt.code === 4404) {
        setErrorMsg(language === 'zh' ? '房间不存在' : 'Room not found');
        setPhase('error');
      } else if (evt.code === 4403) {
        setErrorMsg(language === 'zh' ? '房间已满' : 'Room is full');
        setPhase('error');
      } else if (evt.code === 4410) {
        setErrorMsg(language === 'zh' ? '房间已结束' : 'Room ended');
        setPhase('error');
      } else if (evt.code === 4401) {
        setErrorMsg('Auth failed');
        setPhase('error');
      }
    };

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      try { ws.close(); } catch (e) {}
    };
    // eslint-disable-next-line
  }, [code]);

  const handleMessage = (msg) => {
    switch (msg.type) {
      case 'joined':
        setMeId(msg.user_id);
        setIsHost(msg.is_host);
        setPhase((p) => (p === 'connecting' ? 'lobby' : p));
        break;
      case 'lobby_update':
        setLobby(msg);
        setTimePerQ(msg.time_per_question);
        break;
      case 'game_started':
        setQTotal(msg.total_questions);
        toast.success(language === 'zh' ? '游戏开始!' : 'Game started!');
        break;
      case 'question':
        setQuestion(msg.question);
        setQIndex(msg.index);
        setQTotal(msg.total);
        setTimePerQ(msg.time_per_question);
        setTimeLeft(msg.time_per_question);
        setSelectedAnswer(null);
        setAnswered(false);
        setQuestionResult(null);
        setPhase('question');
        startTimer(msg.time_per_question);
        break;
      case 'answer_ack':
        setAnswered(true);
        break;
      case 'question_result':
        setQuestionResult(msg);
        setLeaderboard(msg.leaderboard || []);
        setPhase('result');
        if (timerRef.current) clearInterval(timerRef.current);
        break;
      case 'game_ended':
        setFinalLeaderboard(msg.leaderboard || []);
        setPhase('ended');
        // Confetti for top-3
        const myRank = (msg.leaderboard || []).findIndex(p => p.user_id === meId) + 1;
        if (myRank >= 1 && myRank <= 3) {
          setTimeout(() => {
            confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
          }, 400);
        }
        break;
      default:
        break;
    }
  };

  const startTimer = (sec) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimeLeft(sec);
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const sendStart = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'start' }));
    }
  };

  const sendAnswer = (idx) => {
    if (answered || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    setSelectedAnswer(idx);
    wsRef.current.send(JSON.stringify({ type: 'answer', q_index: qIndex, answer: idx }));
  };

  const copyCode = () => {
    navigator.clipboard.writeText(code);
    toast.success(language === 'zh' ? '已复制' : 'Copied!');
  };

  const exitRoom = () => {
    try { wsRef.current?.close(); } catch (e) {}
    navigate('/live');
  };

  if (phase === 'connecting') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 to-violet-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-pink-500 mx-auto mb-4"></div>
          <p className="text-zinc-600 font-medium">{t('loading')}</p>
        </div>
      </div>
    );
  }

  if (phase === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 to-violet-50 p-4">
        <div className="bg-white rounded-2xl p-8 border-2 border-zinc-200 text-center max-w-sm" data-testid="live-error">
          <X className="w-16 h-16 text-red-400 mx-auto mb-3" />
          <p className="font-bold text-zinc-900 mb-4">{errorMsg}</p>
          <button
            onClick={() => navigate('/live')}
            className="bg-pink-500 text-white font-bold px-6 py-2 rounded-xl"
            data-testid="back-to-live-btn"
          >
            {t('back')}
          </button>
        </div>
      </div>
    );
  }

  // ============= LOBBY =============
  if (phase === 'lobby') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-violet-50" data-testid="live-room-lobby">
        <header className="bg-gradient-to-r from-pink-500 to-red-500 py-6 px-4">
          <div className="max-w-3xl mx-auto">
            <button
              onClick={exitRoom}
              className="flex items-center gap-2 text-white/80 hover:text-white mb-4 font-medium"
              data-testid="exit-room-btn"
            >
              <ArrowLeft className="w-5 h-5" />
              {language === 'zh' ? '离开' : 'Leave'}
            </button>
            <div className="flex items-center gap-4">
              <div className="bg-white/20 p-3 rounded-2xl">
                <Users className="w-10 h-10 text-white" />
              </div>
              <div>
                <p className="text-white/80 text-sm font-medium">
                  {language === 'zh' ? '房间代码' : 'Room Code'}
                </p>
                <button
                  onClick={copyCode}
                  className="flex items-center gap-2 text-3xl font-black text-white tracking-widest hover:opacity-80"
                  data-testid="room-code-display"
                >
                  {code} <Copy className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-3xl mx-auto px-4 py-6">
          {/* Settings */}
          <div className="bg-white rounded-2xl p-4 border-2 border-zinc-200 mb-4 grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-xs font-bold text-zinc-500 uppercase">{t('level')}</p>
              <p className="text-lg font-black">{lobby?.level_num}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-zinc-500 uppercase">
                {language === 'zh' ? '每题' : 'Per Q'}
              </p>
              <p className="text-lg font-black">{lobby?.time_per_question}s</p>
            </div>
            <div>
              <p className="text-xs font-bold text-zinc-500 uppercase">
                {language === 'zh' ? '总时间' : 'Total'}
              </p>
              <p className="text-lg font-black">{Math.round((lobby?.total_time_limit || 0) / 60)}m</p>
            </div>
          </div>

          {/* Players */}
          <div className="bg-white rounded-2xl p-4 border-2 border-zinc-200 mb-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-black text-zinc-900">
                {language === 'zh' ? '玩家' : 'Players'} ({lobby?.players?.length || 0}/{lobby?.max_players || 10})
              </h3>
            </div>
            <div className="space-y-2" data-testid="players-list">
              {lobby?.players?.map(p => (
                <div
                  key={p.user_id}
                  className={`flex items-center gap-3 p-2 rounded-xl ${p.is_host ? 'bg-yellow-50' : 'bg-zinc-50'}`}
                  data-testid={`player-${p.user_id}`}
                >
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-400 to-pink-400 text-white font-black flex items-center justify-center">
                    {p.full_name?.[0] || p.username[0]}
                  </div>
                  <span className="font-bold flex-1">{p.full_name || p.username}</span>
                  {p.is_host && <Crown className="w-5 h-5 text-yellow-500" />}
                  {p.user_id === meId && (
                    <span className="text-xs font-bold text-violet-600">
                      ({language === 'zh' ? '你' : 'You'})
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Start button */}
          {isHost ? (
            <button
              onClick={sendStart}
              disabled={(lobby?.players?.length || 0) < 1}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white font-black py-4 rounded-xl hover:opacity-90 flex items-center justify-center gap-2 disabled:opacity-50"
              data-testid="start-game-btn"
            >
              <Play className="w-6 h-6" />
              {language === 'zh' ? '开始游戏' : 'Start Game'}
            </button>
          ) : (
            <div className="bg-zinc-50 rounded-xl p-4 text-center text-zinc-600 font-medium">
              {language === 'zh' ? '等待主持人开始...' : 'Waiting for host to start...'}
            </div>
          )}

          <div className="mt-4 bg-violet-50 rounded-xl p-3 flex items-center gap-2 text-sm text-violet-700">
            <Hash className="w-4 h-4" />
            {language === 'zh' ? '分享此代码邀请朋友' : 'Share this code to invite friends'}
          </div>
        </main>
      </div>
    );
  }

  // ============= QUESTION =============
  if (phase === 'question' || phase === 'result') {
    const optionsList = language === 'zh' ? question?.options_zh : question?.options_en;
    const correctIdx = questionResult?.correct_answer;
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-violet-50" data-testid="live-question">
        <header className="bg-white/80 backdrop-blur-md border-b-2 border-zinc-200 py-3 px-4 sticky top-0 z-50">
          <div className="max-w-3xl mx-auto flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-zinc-500 uppercase">{t('question')}</span>
              <span className="text-xl font-black ml-2">{qIndex + 1} / {qTotal}</span>
            </div>
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl font-black ${
              timeLeft <= 5 ? 'bg-red-100 text-red-600' : 'bg-violet-100 text-violet-600'
            }`} data-testid="live-timer">
              <Clock className="w-4 h-4" /> {timeLeft}s
            </div>
          </div>
          <div className="h-1 bg-zinc-200 mt-2 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-pink-500 to-red-500 transition-all"
              style={{ width: `${(timeLeft / timePerQ) * 100}%` }}
            />
          </div>
        </header>

        <main className="max-w-3xl mx-auto px-4 py-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={qIndex}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl p-6 border-2 border-zinc-200 mb-4"
            >
              <h2 className="text-xl md:text-2xl font-bold text-zinc-900 mb-6" data-testid="live-question-text">
                {language === 'zh' ? question?.text_zh : question?.text_en}
              </h2>
              <div className="space-y-3">
                {optionsList?.map((opt, idx) => {
                  const isSelected = selectedAnswer === idx;
                  const showResult = phase === 'result';
                  const isCorrect = showResult && idx === correctIdx;
                  const isWrong = showResult && isSelected && idx !== correctIdx;
                  return (
                    <button
                      key={idx}
                      onClick={() => sendAnswer(idx)}
                      disabled={answered || phase === 'result'}
                      data-testid={`live-option-${idx}`}
                      className={`w-full p-4 rounded-xl border-2 text-left font-medium transition-all ${
                        isCorrect
                          ? 'border-green-500 bg-green-50 text-green-700'
                          : isWrong
                          ? 'border-red-500 bg-red-50 text-red-700'
                          : isSelected
                          ? 'border-pink-500 bg-pink-50 text-pink-700'
                          : 'border-zinc-200 hover:border-pink-300'
                      } ${answered && !showResult ? 'opacity-70' : ''} disabled:cursor-not-allowed`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                          isCorrect
                            ? 'bg-green-500 text-white'
                            : isWrong
                            ? 'bg-red-500 text-white'
                            : isSelected
                            ? 'bg-pink-500 text-white'
                            : 'bg-zinc-100 text-zinc-600'
                        }`}>
                          {String.fromCharCode(65 + idx)}
                        </div>
                        <span className="flex-1">{opt}</span>
                        {isCorrect && <CheckCircle className="w-5 h-5 text-green-500" />}
                        {isWrong && <X className="w-5 h-5 text-red-500" />}
                      </div>
                    </button>
                  );
                })}
              </div>
              {answered && phase === 'question' && (
                <p className="mt-4 text-center text-sm text-zinc-500 font-medium">
                  <Zap className="w-4 h-4 inline mr-1 text-yellow-500" />
                  {language === 'zh' ? '答案已提交,等待其他玩家...' : 'Answer locked. Waiting for others...'}
                </p>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Live leaderboard */}
          <div className="bg-white rounded-2xl p-4 border-2 border-zinc-200">
            <h3 className="font-black text-zinc-900 mb-2 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-500" />
              {t('leaderboard')}
            </h3>
            <div className="space-y-1" data-testid="live-leaderboard">
              {leaderboard.slice(0, 10).map((p, i) => (
                <div
                  key={p.user_id}
                  className={`flex items-center gap-3 p-2 rounded-lg ${
                    p.user_id === meId ? 'bg-violet-50' : ''
                  }`}
                >
                  <span className="font-black text-zinc-400 w-6">{i + 1}</span>
                  <span className="font-bold flex-1 truncate">{p.full_name || p.username}</span>
                  <span className="font-black text-violet-600">{p.score}</span>
                </div>
              ))}
              {leaderboard.length === 0 && (
                <p className="text-sm text-zinc-400 text-center py-2">
                  {language === 'zh' ? '暂无分数' : 'No scores yet'}
                </p>
              )}
            </div>
          </div>
        </main>
      </div>
    );
  }

  // ============= ENDED =============
  if (phase === 'ended') {
    const myRank = finalLeaderboard.findIndex(p => p.user_id === meId) + 1;
    const me = finalLeaderboard.find(p => p.user_id === meId);
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-pink-50 to-violet-50" data-testid="live-ended">
        <main className="max-w-2xl mx-auto px-4 py-8">
          <div className="bg-white rounded-3xl p-8 border-2 border-zinc-200 text-center mb-6">
            <Award className="w-20 h-20 text-yellow-500 mx-auto mb-3" />
            <h1 className="text-3xl font-black text-zinc-900 mb-2">
              {language === 'zh' ? '比赛结束!' : 'Match Complete!'}
            </h1>
            {me && (
              <>
                <p className="text-zinc-600 mb-4">
                  {language === 'zh' ? '你的排名' : 'Your Rank'}
                </p>
                <p className="text-6xl font-black text-violet-600 mb-2" data-testid="my-rank">
                  #{myRank}
                </p>
                <p className="text-xl font-bold text-zinc-700">
                  {me.score} {t('points')} · {me.correct_count} {language === 'zh' ? '正确' : 'correct'}
                </p>
              </>
            )}
          </div>

          <div className="bg-white rounded-2xl p-4 border-2 border-zinc-200 mb-4">
            <h3 className="font-black text-zinc-900 mb-3 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-500" />
              {language === 'zh' ? '最终排行榜' : 'Final Leaderboard'}
            </h3>
            <div className="space-y-2" data-testid="final-leaderboard">
              {finalLeaderboard.map((p, i) => {
                const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : null;
                return (
                  <div
                    key={p.user_id}
                    className={`flex items-center gap-3 p-3 rounded-xl ${
                      p.user_id === meId ? 'bg-violet-50 border-2 border-violet-200' : 'bg-zinc-50'
                    }`}
                  >
                    <span className="text-xl w-8">{medal || `#${i + 1}`}</span>
                    <span className="font-bold flex-1 truncate">{p.full_name || p.username}</span>
                    <div className="text-right">
                      <p className="font-black text-violet-600">{p.score} pts</p>
                      <p className="text-xs text-zinc-500">{p.correct_count} {language === 'zh' ? '正确' : 'correct'}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => navigate('/live')}
              className="bg-zinc-100 text-zinc-700 font-bold py-3 rounded-xl hover:bg-zinc-200"
              data-testid="back-live-lobby-btn"
            >
              {language === 'zh' ? '再来一局' : 'Play Again'}
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className="bg-gradient-to-r from-violet-500 to-pink-500 text-white font-bold py-3 rounded-xl"
              data-testid="back-dashboard-btn"
            >
              {language === 'zh' ? '返回首页' : 'Dashboard'}
            </button>
          </div>
        </main>
      </div>
    );
  }

  return null;
}

export default LiveRoom;
