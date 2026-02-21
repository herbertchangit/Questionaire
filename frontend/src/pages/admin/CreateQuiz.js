import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { ArrowLeft, Plus, Loader } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

function CreateQuiz() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [levelRequired, setLevelRequired] = useState(1);
  const [durationMinutes, setDurationMinutes] = useState(5);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/categories`);
      setCategories(response.data);
      if (response.data.length > 0) {
        setCategory(response.data[0].name);
      }
    } catch (error) {
      console.error('Failed to load categories');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const token = localStorage.getItem('token');
    try {
      const response = await axios.post(
        `${API_URL}/api/admin/quizzes`,
        {
          title,
          description,
          category: category || 'General',
          level_required: levelRequired,
          duration_minutes: durationMinutes
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success('Quiz created successfully!');
      navigate(`/admin/quiz/${response.data.id}/questions`);
    } catch (error) {
      toast.error('Failed to create quiz');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-8" data-testid="create-quiz-page">
      <div className="max-w-3xl mx-auto">
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

          <div className="flex items-center gap-4 mb-8">
            <div className="bg-violet-500 neo-border neo-shadow p-4 rounded-2xl">
              <Plus className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-black text-zinc-950" data-testid="create-quiz-title">
                Create New Quiz
              </h1>
              <p className="text-zinc-600 font-bold">Fill in the details below</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6" data-testid="create-quiz-form">
            <div>
              <label className="block text-sm font-bold uppercase tracking-widest text-zinc-950 mb-2">
                Quiz Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="w-full h-12 px-4 rounded-xl neo-border bg-white text-lg font-medium placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2"
                placeholder="e.g., JavaScript Basics"
                data-testid="quiz-title-input"
              />
            </div>

            <div>
              <label className="block text-sm font-bold uppercase tracking-widest text-zinc-950 mb-2">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                rows={3}
                className="w-full px-4 py-3 rounded-xl neo-border bg-white text-lg font-medium placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2"
                placeholder="Brief description of the quiz..."
                data-testid="quiz-description-input"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-bold uppercase tracking-widest text-zinc-950 mb-2">
                  Category
                </label>
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  required
                  className="w-full h-12 px-4 rounded-xl neo-border bg-white text-lg font-medium placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2"
                  placeholder="e.g., Programming"
                  data-testid="quiz-category-input"
                />
              </div>

              <div>
                <label className="block text-sm font-bold uppercase tracking-widest text-zinc-950 mb-2">
                  Level Required
                </label>
                <input
                  type="number"
                  value={levelRequired}
                  onChange={(e) => setLevelRequired(parseInt(e.target.value))}
                  required
                  min={1}
                  className="w-full h-12 px-4 rounded-xl neo-border bg-white text-lg font-medium placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2"
                  data-testid="quiz-level-input"
                />
              </div>

              <div>
                <label className="block text-sm font-bold uppercase tracking-widest text-zinc-950 mb-2">
                  Duration (min)
                </label>
                <input
                  type="number"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(parseInt(e.target.value))}
                  required
                  min={1}
                  className="w-full h-12 px-4 rounded-xl neo-border bg-white text-lg font-medium placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2"
                  data-testid="quiz-duration-input"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-violet-500 text-white font-black text-lg px-8 py-4 rounded-xl neo-border neo-shadow hover:translate-y-1 hover:shadow-none uppercase tracking-wide disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              data-testid="submit-quiz-button"
            >
              {loading ? (
                <>
                  <Loader className="w-6 h-6 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="w-6 h-6" />
                  Create Quiz
                </>
              )}
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}

export default CreateQuiz;