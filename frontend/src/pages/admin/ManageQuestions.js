import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { ArrowLeft, Plus, Trash2, Volume2, Video, Type, Loader, Edit } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

function ManageQuestions() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  
  const [questionText, setQuestionText] = useState('');
  const [questionType, setQuestionType] = useState('text');
  const [mediaUrl, setMediaUrl] = useState('');
  const [options, setOptions] = useState(['', '', '', '']);
  const [correctAnswer, setCorrectAnswer] = useState(0);
  const [points, setPoints] = useState(10);
  const [submitting, setSubmitting] = useState(false);
  const [generatingTTS, setGeneratingTTS] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState('alloy');

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    const token = localStorage.getItem('token');
    try {
      const [quizRes, questionsRes] = await Promise.all([
        axios.get(`${API_URL}/api/quizzes/${id}`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/api/admin/questions/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      setQuiz(quizRes.data);
      setQuestions(questionsRes.data);
    } catch (error) {
      toast.error('Failed to load quiz data');
      navigate('/admin');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateTTS = async () => {
    if (!questionText.trim()) {
      toast.error('Please enter question text first');
      return;
    }

    setGeneratingTTS(true);
    const token = localStorage.getItem('token');
    try {
      const response = await axios.post(
        `${API_URL}/api/admin/questions/tts`,
        { text: questionText, voice: selectedVoice },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMediaUrl(response.data.audio_data);
      setQuestionType('audio');
      toast.success('Audio generated successfully!');
    } catch (error) {
      toast.error('Failed to generate audio');
    } finally {
      setGeneratingTTS(false);
    }
  };

  const handleSubmitQuestion = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    const token = localStorage.getItem('token');
    try {
      await axios.post(
        `${API_URL}/api/admin/questions`,
        {
          quiz_id: id,
          text: questionText,
          type: questionType,
          media_url: mediaUrl || null,
          options: options.filter(opt => opt.trim() !== ''),
          correct_answer: correctAnswer,
          points
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success('Question added successfully!');
      setQuestionText('');
      setMediaUrl('');
      setOptions(['', '', '', '']);
      setCorrectAnswer(0);
      setPoints(10);
      setQuestionType('text');
      setShowForm(false);
      fetchData();
    } catch (error) {
      toast.error('Failed to add question');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteQuestion = async (questionId) => {
    if (!window.confirm('Are you sure you want to delete this question?')) return;

    const token = localStorage.getItem('token');
    try {
      await axios.delete(`${API_URL}/api/admin/questions/${questionId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Question deleted successfully');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete question');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-violet-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8" data-testid="manage-questions-page">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white neo-border neo-shadow-deep rounded-2xl p-6 md:p-8 mb-8"
        >
          <button
            onClick={() => navigate('/admin')}
            className="bg-white neo-border neo-shadow px-4 py-2 rounded-xl font-bold hover:translate-y-1 hover:shadow-none flex items-center gap-2 mb-6"
            data-testid="back-to-admin-button"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Admin
          </button>

          <div className="mb-6">
            <h1 className="text-3xl md:text-4xl font-black text-zinc-950 mb-2" data-testid="quiz-title">
              {quiz?.title}
            </h1>
            <p className="text-zinc-600 font-bold">{questions.length} questions added</p>
          </div>

          <button
            onClick={() => setShowForm(!showForm)}
            className="w-full md:w-auto bg-violet-500 text-white font-black px-8 py-4 rounded-xl neo-border neo-shadow hover:translate-y-1 hover:shadow-none flex items-center justify-center gap-2 uppercase"
            data-testid="add-question-button"
          >
            <Plus className="w-6 h-6" />
            {showForm ? 'Cancel' : 'Add Question'}
          </button>
        </motion.div>

        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white neo-border neo-shadow-deep rounded-2xl p-6 md:p-8 mb-8"
            data-testid="question-form"
          >
            <h2 className="text-2xl font-black text-zinc-950 mb-6">New Question</h2>
            
            <form onSubmit={handleSubmitQuestion} className="space-y-6">
              <div>
                <label className="block text-sm font-bold uppercase tracking-widest text-zinc-950 mb-2">
                  Question Text
                </label>
                <textarea
                  value={questionText}
                  onChange={(e) => setQuestionText(e.target.value)}
                  required
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl neo-border bg-white text-lg font-medium placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2"
                  placeholder="Enter your question..."
                  data-testid="question-text-input"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-bold uppercase tracking-widest text-zinc-950 mb-2">
                    Question Type
                  </label>
                  <select
                    value={questionType}
                    onChange={(e) => setQuestionType(e.target.value)}
                    className="w-full h-12 px-4 rounded-xl neo-border bg-white text-lg font-medium focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2"
                    data-testid="question-type-select"
                  >
                    <option value="text">Text Only</option>
                    <option value="audio">Audio</option>
                    <option value="video">Video</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold uppercase tracking-widest text-zinc-950 mb-2">
                    Points
                  </label>
                  <input
                    type="number"
                    value={points}
                    onChange={(e) => setPoints(parseInt(e.target.value))}
                    required
                    min={1}
                    className="w-full h-12 px-4 rounded-xl neo-border bg-white text-lg font-medium focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2"
                    data-testid="question-points-input"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold uppercase tracking-widest text-zinc-950 mb-2">
                    Voice (TTS)
                  </label>
                  <select
                    value={selectedVoice}
                    onChange={(e) => setSelectedVoice(e.target.value)}
                    className="w-full h-12 px-4 rounded-xl neo-border bg-white text-lg font-medium focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2"
                    data-testid="voice-select"
                  >
                    <option value="alloy">Alloy</option>
                    <option value="echo">Echo</option>
                    <option value="fable">Fable</option>
                    <option value="onyx">Onyx</option>
                    <option value="nova">Nova</option>
                    <option value="shimmer">Shimmer</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={handleGenerateTTS}
                  disabled={generatingTTS}
                  className="flex-1 bg-pink-500 text-white font-bold px-6 py-3 rounded-xl neo-border neo-shadow hover:translate-y-1 hover:shadow-none flex items-center justify-center gap-2 disabled:opacity-50"
                  data-testid="generate-tts-button"
                >
                  {generatingTTS ? (
                    <>
                      <Loader className="w-5 h-5 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Volume2 className="w-5 h-5" />
                      Generate Audio from Text
                    </>
                  )}
                </button>
              </div>

              {(questionType === 'audio' || questionType === 'video') && (
                <div>
                  <label className="block text-sm font-bold uppercase tracking-widest text-zinc-950 mb-2">
                    Media URL {questionType === 'audio' && '(or use TTS above)'}
                  </label>
                  <input
                    type="text"
                    value={mediaUrl}
                    onChange={(e) => setMediaUrl(e.target.value)}
                    className="w-full h-12 px-4 rounded-xl neo-border bg-white text-lg font-medium placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2"
                    placeholder={`Enter ${questionType} URL or data URI...`}
                    data-testid="media-url-input"
                  />
                  {mediaUrl && questionType === 'audio' && (
                    <div className="mt-3">
                      <audio controls className="w-full" data-testid="audio-preview">
                        <source src={mediaUrl} type="audio/mp3" />
                      </audio>
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm font-bold uppercase tracking-widest text-zinc-950 mb-2">
                  Answer Options
                </label>
                <div className="space-y-3">
                  {options.map((option, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="correct"
                        checked={correctAnswer === index}
                        onChange={() => setCorrectAnswer(index)}
                        className="w-6 h-6"
                        data-testid={`correct-answer-radio-${index}`}
                      />
                      <input
                        type="text"
                        value={option}
                        onChange={(e) => {
                          const newOptions = [...options];
                          newOptions[index] = e.target.value;
                          setOptions(newOptions);
                        }}
                        required
                        className="flex-1 h-12 px-4 rounded-xl neo-border bg-white text-lg font-medium placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2"
                        placeholder={`Option ${index + 1}`}
                        data-testid={`option-input-${index}`}
                      />
                    </div>
                  ))}
                </div>
                <p className="text-sm text-zinc-600 font-medium mt-2">
                  ⭐ Select the radio button for the correct answer
                </p>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-violet-500 text-white font-black text-lg px-8 py-4 rounded-xl neo-border neo-shadow hover:translate-y-1 hover:shadow-none uppercase tracking-wide disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                data-testid="submit-question-button"
              >
                {submitting ? (
                  <>
                    <Loader className="w-6 h-6 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <Plus className="w-6 h-6" />
                    Add Question
                  </>
                )}
              </button>
            </form>
          </motion.div>
        )}

        <div>
          <h2 className="text-3xl font-black text-zinc-950 mb-6">Questions List</h2>
          
          {questions.length === 0 ? (
            <div className="bg-white neo-border neo-shadow rounded-2xl p-12 text-center">
              <p className="text-xl font-bold text-zinc-600">No questions added yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {questions.map((question, index) => (
                <motion.div
                  key={question.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 * index }}
                  className="bg-white neo-border neo-shadow rounded-2xl p-6"
                  data-testid={`question-card-${question.id}`}
                >
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <span className="inline-block bg-zinc-950 text-white text-sm font-bold px-3 py-1 rounded-full">
                          Q{index + 1}
                        </span>
                        <span className="inline-block bg-violet-100 text-violet-700 text-xs font-bold px-3 py-1 rounded-full neo-border flex items-center gap-1">
                          {question.type === 'text' && <Type className="w-3 h-3" />}
                          {question.type === 'audio' && <Volume2 className="w-3 h-3" />}
                          {question.type === 'video' && <Video className="w-3 h-3" />}
                          {question.type.toUpperCase()}
                        </span>
                        <span className="text-sm font-bold text-zinc-600">
                          {question.points} pts
                        </span>
                      </div>
                      <p className="text-xl font-bold text-zinc-950 mb-3">{question.text}</p>
                      {question.media_url && (
                        <div className="mb-3 text-sm font-medium text-zinc-600">
                          🔗 Media attached
                        </div>
                      )}
                      <div className="space-y-2">
                        {question.options.map((opt, idx) => (
                          <div
                            key={idx}
                            className={`p-3 rounded-xl neo-border font-medium ${
                              idx === question.correct_answer
                                ? 'bg-green-100 text-green-700'
                                : 'bg-zinc-50 text-zinc-700'
                            }`}
                          >
                            {String.fromCharCode(65 + idx)}. {opt}
                            {idx === question.correct_answer && ' ✅'}
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <button
                      onClick={() => handleDeleteQuestion(question.id)}
                      className="bg-red-500 text-white font-bold px-4 py-2 rounded-xl neo-border neo-shadow hover:translate-y-1 hover:shadow-none flex items-center gap-2"
                      data-testid={`delete-question-button-${question.id}`}
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ManageQuestions;