import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Camera, Upload, Trash2, X, Check } from 'lucide-react';
import Avatar from './Avatar';

const API_URL = process.env.REACT_APP_BACKEND_URL;
const MAX_DIM = 400;
const JPEG_QUALITY = 0.85;

/**
 * Resize an image File or video frame to <=MAX_DIM and return base64 data URL.
 */
async function resizeToBase64(source) {
  return new Promise((resolve, reject) => {
    const proceed = (img, w, h) => {
      const ratio = Math.min(MAX_DIM / w, MAX_DIM / h, 1);
      const targetW = Math.round(w * ratio);
      const targetH = Math.round(h * ratio);
      const canvas = document.createElement('canvas');
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, targetW, targetH);
      try {
        const dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
        resolve(dataUrl);
      } catch (e) {
        reject(e);
      }
    };

    if (source instanceof File) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = new Image();
        img.onload = () => proceed(img, img.naturalWidth, img.naturalHeight);
        img.onerror = reject;
        img.src = ev.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(source);
    } else if (source instanceof HTMLVideoElement) {
      proceed(source, source.videoWidth, source.videoHeight);
    } else {
      reject(new Error('Unsupported source'));
    }
  });
}

function ProfilePictureEditor({ currentSrc, name, language, onSaved }) {
  const fileRef = useRef(null);
  const [preview, setPreview] = useState(null); // pending data URL not yet saved
  const [uploading, setUploading] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [stream, setStream] = useState(null);
  const videoRef = useRef(null);

  // Start camera when modal opens
  useEffect(() => {
    if (!showCamera) return;
    let active = true;
    (async () => {
      try {
        const s = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 640 } },
          audio: false
        });
        if (!active) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        setStream(s);
        if (videoRef.current) {
          videoRef.current.srcObject = s;
        }
      } catch (e) {
        toast.error(language === 'zh' ? '无法访问摄像头' : 'Unable to access camera');
        setShowCamera(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [showCamera, language]);

  // Stop camera on close
  useEffect(() => {
    return () => {
      if (stream) stream.getTracks().forEach((t) => t.stop());
    };
  }, [stream]);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // reset to allow same file twice
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error(language === 'zh' ? '请选择图片' : 'Please pick an image');
      return;
    }
    try {
      const dataUrl = await resizeToBase64(file);
      setPreview(dataUrl);
    } catch (err) {
      toast.error('Failed to process image');
    }
  };

  const captureFromCamera = async () => {
    if (!videoRef.current) return;
    try {
      const dataUrl = await resizeToBase64(videoRef.current);
      setPreview(dataUrl);
      closeCamera();
    } catch (err) {
      toast.error('Capture failed');
    }
  };

  const closeCamera = () => {
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      setStream(null);
    }
    setShowCamera(false);
  };

  const savePicture = async (picture) => {
    setUploading(true);
    const token = localStorage.getItem('token');
    try {
      await axios.put(
        `${API_URL}/api/user/profile/picture`,
        { profile_picture: picture },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(
        picture
          ? (language === 'zh' ? '头像已更新' : 'Profile picture updated')
          : (language === 'zh' ? '头像已移除' : 'Profile picture removed')
      );
      // Update cached user object
      const u = JSON.parse(localStorage.getItem('user') || 'null');
      if (u) {
        u.profile_picture = picture;
        localStorage.setItem('user', JSON.stringify(u));
      }
      setPreview(null);
      onSaved?.(picture);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Save failed');
    } finally {
      setUploading(false);
    }
  };

  const display = preview || currentSrc;

  return (
    <div className="flex flex-col items-center gap-3" data-testid="profile-picture-editor">
      <div className="relative">
        <Avatar src={display} name={name} size={96} />
        {preview && (
          <span className="absolute -top-1 -right-1 bg-yellow-400 text-yellow-900 text-[10px] font-black px-1.5 py-0.5 rounded">
            {language === 'zh' ? '未保存' : 'Preview'}
          </span>
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        onChange={handleFile}
        className="hidden"
        data-testid="profile-picture-file-input"
      />

      <div className="flex flex-wrap gap-2 justify-center">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-1.5 text-sm font-bold px-3 py-2 rounded-xl border-2 border-zinc-200 bg-white text-zinc-700 hover:border-violet-300 hover:bg-violet-50 transition-colors"
          data-testid="upload-picture-btn"
        >
          <Upload className="w-4 h-4" />
          {language === 'zh' ? '上传' : 'Upload'}
        </button>

        <button
          type="button"
          onClick={() => setShowCamera(true)}
          disabled={uploading}
          className="flex items-center gap-1.5 text-sm font-bold px-3 py-2 rounded-xl border-2 border-zinc-200 bg-white text-zinc-700 hover:border-violet-300 hover:bg-violet-50 transition-colors"
          data-testid="open-camera-btn"
        >
          <Camera className="w-4 h-4" />
          {language === 'zh' ? '拍照' : 'Camera'}
        </button>

        {currentSrc && !preview && (
          <button
            type="button"
            onClick={() => savePicture(null)}
            disabled={uploading}
            className="flex items-center gap-1.5 text-sm font-bold px-3 py-2 rounded-xl border-2 border-red-200 bg-white text-red-600 hover:border-red-400 hover:bg-red-50 transition-colors"
            data-testid="remove-picture-btn"
          >
            <Trash2 className="w-4 h-4" />
            {language === 'zh' ? '移除' : 'Remove'}
          </button>
        )}
      </div>

      {preview && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => savePicture(preview)}
            disabled={uploading}
            className="flex items-center gap-1.5 text-sm font-bold px-4 py-2 rounded-xl bg-gradient-to-r from-violet-500 to-pink-500 text-white hover:opacity-90 disabled:opacity-50"
            data-testid="save-picture-btn"
          >
            <Check className="w-4 h-4" />
            {uploading
              ? (language === 'zh' ? '保存中...' : 'Saving...')
              : (language === 'zh' ? '保存头像' : 'Save Picture')}
          </button>
          <button
            type="button"
            onClick={() => setPreview(null)}
            disabled={uploading}
            className="flex items-center gap-1.5 text-sm font-bold px-3 py-2 rounded-xl border-2 border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400"
            data-testid="cancel-picture-btn"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <p className="text-xs text-zinc-500 text-center">
        {language === 'zh' ? '可选 · 图片会自动压缩(最大 500KB)' : 'Optional · Images auto-compressed (max 500KB)'}
      </p>

      {/* Camera modal */}
      <AnimatePresence>
        {showCamera && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
            onClick={closeCamera}
            data-testid="camera-modal"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl p-4 w-full max-w-sm"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-black text-zinc-900">
                  {language === 'zh' ? '拍照' : 'Take a Photo'}
                </h3>
                <button onClick={closeCamera} className="p-1 hover:bg-zinc-100 rounded">
                  <X className="w-5 h-5 text-zinc-500" />
                </button>
              </div>
              <div className="rounded-xl overflow-hidden bg-zinc-900 aspect-square mb-3">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={closeCamera}
                  className="flex-1 py-2.5 rounded-xl bg-zinc-100 text-zinc-700 font-bold"
                >
                  {language === 'zh' ? '取消' : 'Cancel'}
                </button>
                <button
                  onClick={captureFromCamera}
                  disabled={!stream}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-pink-500 text-white font-bold disabled:opacity-50"
                  data-testid="capture-photo-btn"
                >
                  <Camera className="w-4 h-4 inline mr-1" />
                  {language === 'zh' ? '拍照' : 'Capture'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default ProfilePictureEditor;
