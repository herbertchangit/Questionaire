import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useLanguage } from '../context/LanguageContext';
import {
  ArrowLeft, Users, Zap, Trophy, Plus, Hash, Clock, Calendar, Loader
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const levelNames = {
  en: { 1: 'Determination', 2: 'Discipline', 3: 'Perseverance', 4: 'Hard-working', 5: 'Breakthrough' },
  zh: { 1: '决心', 2: '自律', 3: '毅力', 4: '勤劳', 5: '突破' }
};

function LiveLobby() {
  const navigate = useNavigate();
  const { language, t } = useLanguage();
  const [activeTab, setActiveTab] = useState('host'); // host | join | match | tournaments
  const [tournaments, setTournaments] = useState([]);
  const [matchmakingStatus, setMatchmakingStatus] = useState(null);
  const [matchPolling, setMatchPolling] = useState(false);

  // Host form
  const [hostLevel, setHostLevel] = useState(1);
  const [timePerQ, setTimePerQ] = useState(15);
  const [totalTime, setTotalTime] = useState(300);
  const [maxPlayers, setMaxPlayers] = useState(10);
  const [creatingRoom, setCreatingRoom] = useState(false);

  // Join form
  const [joinCode, setJoinCode] = useState('');

  // Match
  const [matchLevel, setMatchLevel] = useState(1);

  useEffect(() => {
    fetchTournaments();
  }, []);

  const fetchTournaments = async () => {
    const token = localStorage.getItem('token');
    try {
      const r = await axios.get(`${API_URL}/api/live/tournaments`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTournaments(r.data);
    } catch (e) {
      // ignore
    }
  };

  const createRoom = async () => {
    const token = localStorage.getItem('token');
    setCreatingRoom(true);
    try {
      const r = await axios.post(
        `${API_URL}/api/live/rooms/create`,
        {
          level_num: hostLevel,
          time_per_question: timePerQ,
          total_time_limit: totalTime,
          max_players: maxPlayers,
          mode: 'host'
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(language === 'zh' ? '房间已创建!' : 'Room created!');
      navigate(`/live/room/${r.data.code}`);
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to create room');
    } finally {
      setCreatingRoom(false);
    }
  };

  const joinRoom = () => {
    if (!joinCode || joinCode.length < 4) {
      toast.error(language === 'zh' ? '请输入有效代码' : 'Enter a valid code');
      return;
    }
    navigate(`/live/room/${joinCode.toUpperCase()}`);
  };

  const startMatchmaking = async () => {
    const token = localStorage.getItem('token');
    setMatchPolling(true);
    let attempts = 0;
    const poll = async () => {
      try {
        const r = await axios.post(
          `${API_URL}/api/live/matchmaking?level_num=${matchLevel}`,
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (r.data.status === 'matched') {
          toast.success(language === 'zh' ? '已配对!' : 'Match found!');
          setMatchPolling(false);
          navigate(`/live/room/${r.data.code}`);
          return;
        }
        setMatchmakingStatus(r.data);
        attempts++;
        if (attempts < 30 && matchPolling) {
          setTimeout(poll, 3000);
        } else {
          setMatchPolling(false);
          await axios.post(
            `${API_URL}/api/live/matchmaking/cancel?level_num=${matchLevel}`,
            {},
            { headers: { Authorization: `Bearer ${token}` } }
          );
          toast.error(language === 'zh' ? '匹配超时' : 'Matchmaking timed out');
        }
      } catch (e) {
        setMatchPolling(false);
        toast.error('Matchmaking error');
      }
    };
    poll();
  };

  const cancelMatchmaking = async () => {
    const token = localStorage.getItem('token');
    setMatchPolling(false);
    try {
      await axios.post(
        `${API_URL}/api/live/matchmaking/cancel?level_num=${matchLevel}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (e) {}
  };

  const startTournament = async (tid) => {
    const token = localStorage.getItem('token');
    try {
      const r = await axios.post(
        `${API_URL}/api/live/tournaments/${tid}/start`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      navigate(`/live/room/${r.data.code}`);
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Could not join tournament');
    }
  };

  const tabs = [
    { id: 'host', icon: Plus, label_en: 'Host Room', label_zh: '创建房间' },
    { id: 'join', icon: Hash, label_en: 'Join by Code', label_zh: '输入代码' },
    { id: 'match', icon: Zap, label_en: 'Quick Match', label_zh: '快速匹配' },
    { id: 'tournaments', icon: Trophy, label_en: 'Tournaments', label_zh: '锦标赛' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-violet-50" data-testid="live-lobby">
      <header className="bg-gradient-to-r from-pink-500 to-red-500 py-8 px-4">
        <div className="max-w-3xl mx-auto">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 text-white/80 hover:text-white mb-4 font-medium"
            data-testid="live-back-btn"
          >
            <ArrowLeft className="w-5 h-5" />
            {t('back')}
          </button>
          <div className="flex items-center gap-4">
            <div className="bg-white/20 p-3 rounded-2xl">
              <Users className="w-10 h-10 text-white" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-black text-white">
                {language === 'zh' ? '实时竞赛' : 'LIVE Competition'}
              </h1>
              <p className="text-white/80 font-medium">
                {language === 'zh' ? '与同学实时对战' : 'Battle classmates in real-time'}
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        {/* Tabs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-6">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                data-testid={`tab-${tab.id}`}
                className={`flex flex-col items-center gap-1 py-3 px-2 rounded-xl border-2 font-bold text-sm transition-all ${
                  active
                    ? 'border-pink-500 bg-pink-50 text-pink-600'
                    : 'border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{language === 'zh' ? tab.label_zh : tab.label_en}</span>
              </button>
            );
          })}
        </div>

        {/* Host */}
        {activeTab === 'host' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl p-6 border-2 border-zinc-200 space-y-4"
          >
            <h2 className="text-xl font-black text-zinc-900">
              {language === 'zh' ? '创建房间设置' : 'Configure Your Room'}
            </h2>

            <div>
              <label className="text-sm font-bold text-zinc-700 mb-2 block">
                {language === 'zh' ? '关卡' : 'Level'}
              </label>
              <select
                value={hostLevel}
                onChange={(e) => setHostLevel(parseInt(e.target.value))}
                className="w-full px-4 py-2 border-2 border-zinc-200 rounded-xl focus:border-pink-500 outline-none"
                data-testid="host-level-select"
              >
                {[1, 2, 3, 4, 5].map(n => (
                  <option key={n} value={n}>
                    {t('level')} {n}: {levelNames[language][n]}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-bold text-zinc-700 mb-2 block">
                  {language === 'zh' ? '每题秒数' : 'Sec / Question'}
                </label>
                <input
                  type="number"
                  min="5" max="60"
                  value={timePerQ}
                  onChange={(e) => setTimePerQ(parseInt(e.target.value) || 15)}
                  className="w-full px-4 py-2 border-2 border-zinc-200 rounded-xl focus:border-pink-500 outline-none"
                  data-testid="host-time-per-q"
                />
              </div>
              <div>
                <label className="text-sm font-bold text-zinc-700 mb-2 block">
                  {language === 'zh' ? '总时间(秒)' : 'Total Time (s)'}
                </label>
                <input
                  type="number"
                  min="30" max="1800"
                  value={totalTime}
                  onChange={(e) => setTotalTime(parseInt(e.target.value) || 300)}
                  className="w-full px-4 py-2 border-2 border-zinc-200 rounded-xl focus:border-pink-500 outline-none"
                  data-testid="host-total-time"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-bold text-zinc-700 mb-2 block">
                {language === 'zh' ? '最大玩家数' : 'Max Players'}
              </label>
              <input
                type="number"
                min="2" max="20"
                value={maxPlayers}
                onChange={(e) => setMaxPlayers(parseInt(e.target.value) || 10)}
                className="w-full px-4 py-2 border-2 border-zinc-200 rounded-xl focus:border-pink-500 outline-none"
                data-testid="host-max-players"
              />
            </div>

            <button
              onClick={createRoom}
              disabled={creatingRoom}
              className="w-full bg-gradient-to-r from-pink-500 to-red-500 text-white font-black py-3 rounded-xl hover:opacity-90 disabled:opacity-50"
              data-testid="create-room-btn"
            >
              {creatingRoom
                ? (language === 'zh' ? '创建中...' : 'Creating...')
                : (language === 'zh' ? '创建房间' : 'Create Room')}
            </button>
          </motion.div>
        )}

        {/* Join */}
        {activeTab === 'join' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl p-6 border-2 border-zinc-200 space-y-4"
          >
            <h2 className="text-xl font-black text-zinc-900">
              {language === 'zh' ? '输入房间代码' : 'Enter Room Code'}
            </h2>
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="ABCD12"
              maxLength={6}
              className="w-full px-4 py-4 text-center text-3xl font-black tracking-widest border-2 border-zinc-200 rounded-xl focus:border-pink-500 outline-none"
              data-testid="join-code-input"
            />
            <button
              onClick={joinRoom}
              className="w-full bg-gradient-to-r from-violet-500 to-purple-500 text-white font-black py-3 rounded-xl hover:opacity-90"
              data-testid="join-room-btn"
            >
              {language === 'zh' ? '加入' : 'Join Room'}
            </button>
          </motion.div>
        )}

        {/* Matchmaking */}
        {activeTab === 'match' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl p-6 border-2 border-zinc-200 space-y-4"
          >
            <h2 className="text-xl font-black text-zinc-900">
              {language === 'zh' ? '快速匹配' : 'Quick Matchmaking'}
            </h2>
            <p className="text-sm text-zinc-600">
              {language === 'zh' ? '选择关卡,我们会自动为你匹配 2-4 位玩家' : 'Pick a level, we will auto-pair you with 2-4 players'}
            </p>
            <select
              value={matchLevel}
              onChange={(e) => setMatchLevel(parseInt(e.target.value))}
              disabled={matchPolling}
              className="w-full px-4 py-2 border-2 border-zinc-200 rounded-xl focus:border-pink-500 outline-none"
              data-testid="match-level-select"
            >
              {[1, 2, 3, 4, 5].map(n => (
                <option key={n} value={n}>
                  {t('level')} {n}: {levelNames[language][n]}
                </option>
              ))}
            </select>

            {!matchPolling ? (
              <button
                onClick={startMatchmaking}
                className="w-full bg-gradient-to-r from-pink-500 to-red-500 text-white font-black py-3 rounded-xl hover:opacity-90"
                data-testid="start-match-btn"
              >
                <Zap className="w-5 h-5 inline mr-2" />
                {language === 'zh' ? '开始匹配' : 'Find Match'}
              </button>
            ) : (
              <div className="space-y-3">
                <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-4 text-center">
                  <Loader className="w-8 h-8 text-yellow-600 animate-spin mx-auto mb-2" />
                  <p className="font-bold text-yellow-800">
                    {language === 'zh' ? '正在寻找对手...' : 'Searching for players...'}
                  </p>
                  {matchmakingStatus?.queue_size && (
                    <p className="text-sm text-yellow-700">
                      {language === 'zh' ? '队列中' : 'In queue'}: {matchmakingStatus.queue_size}
                    </p>
                  )}
                </div>
                <button
                  onClick={cancelMatchmaking}
                  className="w-full bg-zinc-100 text-zinc-700 font-bold py-2 rounded-xl"
                  data-testid="cancel-match-btn"
                >
                  {t('cancel')}
                </button>
              </div>
            )}
          </motion.div>
        )}

        {/* Tournaments */}
        {activeTab === 'tournaments' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
            data-testid="tournaments-list"
          >
            {tournaments.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 border-2 border-zinc-200 text-center">
                <Trophy className="w-12 h-12 text-zinc-300 mx-auto mb-2" />
                <p className="text-zinc-500 font-medium">
                  {language === 'zh' ? '暂无锦标赛' : 'No tournaments scheduled'}
                </p>
              </div>
            ) : (
              tournaments.map(tour => {
                const sched = new Date(tour.scheduled_at);
                const now = new Date();
                const canJoin = sched.getTime() - now.getTime() < 2 * 60 * 1000; // within 2min of start
                return (
                  <div
                    key={tour.id}
                    className="bg-white rounded-2xl p-4 border-2 border-zinc-200"
                    data-testid={`tournament-${tour.id}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <h3 className="font-black text-zinc-900">
                          {language === 'zh' ? tour.title_zh : tour.title_en}
                        </h3>
                        <div className="flex items-center gap-3 mt-1 text-sm text-zinc-600">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {sched.toLocaleString(language === 'zh' ? 'zh-CN' : 'en-US')}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" /> {Math.round(tour.total_time_limit / 60)}m
                          </span>
                        </div>
                        <span className="inline-block mt-2 px-2 py-0.5 bg-violet-100 text-violet-700 rounded-md text-xs font-bold">
                          {t('level')} {tour.level_num}
                        </span>
                      </div>
                      <button
                        onClick={() => startTournament(tour.id)}
                        disabled={!canJoin}
                        className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-bold px-4 py-2 rounded-xl text-sm disabled:opacity-50"
                        data-testid={`tournament-join-${tour.id}`}
                      >
                        {canJoin
                          ? (language === 'zh' ? '加入' : 'Join')
                          : (language === 'zh' ? '即将开始' : 'Upcoming')}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </motion.div>
        )}
      </main>
    </div>
  );
}

export default LiveLobby;
