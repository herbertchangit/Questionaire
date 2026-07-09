import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { ArrowLeft, Clock, Volume2, Play } from 'lucide-react';

import { API_URL } from '../lib/api';

function QuizPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchQuiz();
  }, [id]);

  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && quiz) {
      handleSubmit();
    }
  }, [timeLeft]);

  const fetchQuiz = async () => {
    const token = localStorage.getItem('token');
    try {
      const response = await axios.get(`${API_URL}/api/quizzes/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setQuiz(response.data);
      setTimeLeft(response.data.duration_minutes * 60);
    } catch (error) {
      toast.error('Failed to load quiz');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = (questionId, answerIndex) => {
    setAnswers({ ...answers, [questionId]: answerIndex });
  };

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);

    const token = localStorage.getItem('token');
    const timeTaken = (quiz.duration_minutes * 60) - timeLeft;

    try {
      const response = await axios.post(
        `${API_URL}/api/quizzes/${id}/submit`,
        { quiz_id: id, answers, time_taken: timeTaken },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      localStorage.setItem('quiz_result', JSON.stringify(response.data));
      navigate(`/results/${response.data.result.id}`);
    } catch (error) {
      toast.error('Failed to submit quiz');
      setSubmitting(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimeColor = () => {
    const percentage = (timeLeft / (quiz.duration_minutes * 60)) * 100;
    if (percentage > 50) return 'bg-green-500';
    if (percentage > 25) return 'bg-yellow-400';
    return 'bg-red-500';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-violet-500"></div>
      </div>
    );
  }

  const question = quiz?.questions[currentQuestion];
  const progress = ((currentQuestion + 1) / quiz?.questions.length) * 100;

  return (
    <div className="min-h-screen p-4 md:p-8" data-testid="quiz-page">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white neo-border neo-shadow-deep rounded-2xl p-6 mb-6"
        >
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="bg-white neo-border neo-shadow px-4 py-2 rounded-xl font-bold hover:translate-y-1 hover:shadow-none flex items-center gap-2"
              data-testid="back-to-dashboard-button"
            >
              <ArrowLeft className="w-5 h-5" />
              Back
            </button>
            
            <div className={`${getTimeColor()} neo-border neo-shadow px-6 py-2 rounded-xl text-white font-black text-2xl flex items-center gap-2`} data-testid="quiz-timer">
              <Clock className="w-6 h-6" />
              {formatTime(timeLeft)}
            </div>
          </div>

          <h2 className="text-2xl font-black text-zinc-950 mb-2">{quiz?.title}</h2>
          <div className="h-3 w-full bg-zinc-100 neo-border rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-violet-500 to-pink-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <p className="text-sm font-bold text-zinc-600 mt-2">
            Question {currentQuestion + 1} of {quiz?.questions.length}
          </p>
        </motion.div>

        <motion.div
          key={currentQuestion}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white neo-border neo-shadow-deep rounded-2xl p-8 mb-6"
          data-testid="question-card"
        >
          <div className="mb-8">
            <span className="inline-block bg-violet-100 text-violet-700 text-sm font-bold px-4 py-2 rounded-full neo-border mb-4">
              {question?.type.toUpperCase()}
            </span>
            <h3 className="text-3xl md:text-4xl font-black text-zinc-950 mb-6">
              {question?.text}
            </h3>

            {question?.type === 'audio' && question?.media_url && (
              <div className="mb-6 p-6 bg-violet-50 neo-border rounded-2xl">
                <audio controls className="w-full" data-testid="audio-player">
                  <source src={question.media_url} type="audio/mp3" />
                </audio>
              </div>
            )}

            {question?.type === 'video' && question?.media_url && (
              <div className="mb-6 neo-border rounded-2xl overflow-hidden">
                <video controls className="w-full" data-testid="video-player">
                  <source src={question.media_url} type="video/mp4" />
                </video>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {question?.options.map((option, index) => (
              <button
                key={index}
                onClick={() => handleAnswer(question.id, index)}
                className={`p-6 rounded-xl neo-border neo-shadow font-bold text-lg text-left hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(24,24,27,1)] ${
                  answers[question.id] === index
                    ? 'bg-violet-500 text-white'
                    : 'bg-white text-zinc-950 hover:bg-violet-50'
                }`}
                data-testid={`option-${index}`}
              >
                <span className="inline-block w-8 h-8 rounded-full neo-border bg-white text-zinc-950 flex items-center justify-center mr-3">
                  {String.fromCharCode(65 + index)}
                </span>
                {option}
              </button>
            ))}
          </div>
        </motion.div>

        <div className="flex gap-4">
          {currentQuestion > 0 && (
            <button
              onClick={() => setCurrentQuestion(currentQuestion - 1)}
              className="flex-1 bg-white text-zinc-950 font-bold py-4 rounded-xl neo-border neo-shadow hover:translate-y-1 hover:shadow-none uppercase"
              data-testid="previous-button"
            >
              Previous
            </button>
          )}
          
          {currentQuestion < quiz?.questions.length - 1 ? (
            <button
              onClick={() => setCurrentQuestion(currentQuestion + 1)}
              className="flex-1 bg-violet-500 text-white font-black py-4 rounded-xl neo-border neo-shadow hover:translate-y-1 hover:shadow-none uppercase"
              data-testid="next-button"
            >
              Next
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1 bg-pink-500 text-white font-black py-4 rounded-xl neo-border neo-shadow hover:translate-y-1 hover:shadow-none uppercase disabled:opacity-50"
              data-testid="submit-quiz-button"
            >
              {submitting ? 'Submitting...' : 'Submit Quiz'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default QuizPage;