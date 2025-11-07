import React, { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from "react-router-dom";
import YouTube from "react-youtube";
import { db } from "../Firebase";
import {
  collection,
  getDocs,
  doc,
  query,
  where,
  limit,
  getDoc,
} from "firebase/firestore";
import { useAuth } from "./Auth/AuthContext";
import "./CoursePlayer.css";
import { getUserProgress, updateActivityProgress, saveLessonPlaybackTime, setLastViewedLesson, initializeLesson, clearLastViewedLesson, addCourseAuditLog, getTimeSpentToday } from "../services/userProgressFirestoreService";
import { useIdleTimer } from '../hooks/useIdleTimer';
import { useTimeTracker } from '../hooks/useTimeTracker';

const findFirstUncompletedLesson = (modules, completedLessons) => {
  for (const module of modules) {
    for (const lessonId of module.lessonOrder) {
      if (!completedLessons.has(lessonId)) {
        return lessonId;
      }
    }
  }
  return null;
};

const CoursePlayer = () => {
  const { courseId } = useParams();
  const { user } = useAuth();
  const [course, setCourse] = useState(null);
  const [modules, setModules] = useState([]);
  const [lessons, setLessons] = useState({});
  const [currentLesson, setCurrentLesson] = useState(null);
  const [completedLessons, setCompletedLessons] = useState(new Set());
  const [userCourseId, setUserCourseId] = useState(null);
  const [userOverallProgress, setUserOverallProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const lastPlaybackTimeRef = useRef(0);
  const [error, setError] = useState("");
  const [isTimeLimitReached, setIsTimeLimitReached] = useState(false);
  const [resumeTimeMessage, setResumeTimeMessage] = useState('');
  const [courseCompleted, setCourseCompleted] = useState(false);
  const [videoStage, setVideoStage] = useState('primary_playing');
  const videoRef = useRef(null);

  // --- START: TIME TRACKING & IDLE LOGIC ---
  const { handlePlay, handlePause, saveOnExit } = useTimeTracker(user, currentLesson, isTimeLimitReached, completedLessons);
  const [isIdleModalOpen, setIsIdleModalOpen] = useState(false);

  const handleIdle = useCallback(() => {
    if (!isIdleModalOpen && !isTimeLimitReached) {
      if (videoRef.current && !videoRef.current.paused) {
        videoRef.current.pause();
      }
      setIsIdleModalOpen(true);
    }
  }, [isIdleModalOpen, isTimeLimitReached]);

  useIdleTimer(handleIdle, 5 * 60 * 1000);
  // --- END: TIME TRACKING & IDLE LOGIC ---

  useEffect(() => {
    const findUserCourse = async () => {
      if (!user || !courseId) return;
      const userCoursesRef = collection(db, "users", user.uid, "courses");
      const q = query(userCoursesRef, where("courseId", "==", courseId), limit(1));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        setUserCourseId(querySnapshot.docs[0].id);
      } else {
        setError("You do not have access to this course.");
        setLoading(false);
      }
    };
    findUserCourse();
  }, [user, courseId]);

  useEffect(() => {
    if (!user || !userCourseId) return;
    const fetchCourseContent = async () => {
      setLoading(true);
      setError("");
      try {
        const courseRef = doc(db, "courses", courseId);
        const courseSnap = await getDoc(courseRef);
        if (!courseSnap.exists()) throw new Error("Course not found.");
        const courseData = courseSnap.data();
        setCourse({ id: courseSnap.id, ...courseData });

        const modulesQuery = query(collection(db, 'modules'), where('courseId', '==', courseId));
        const modulesSnapshot = await getDocs(modulesQuery);
        const modulesData = modulesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const sortedModules = modulesData.sort((a, b) => courseData.moduleOrder.indexOf(a.id) - courseData.moduleOrder.indexOf(b.id));
        setModules(sortedModules);

        const lessonsQuery = query(collection(db, 'lessons'), where('courseId', '==', courseId));
        const lessonsSnapshot = await getDocs(lessonsQuery);
        const lessonsData = {};
        lessonsSnapshot.docs.forEach(doc => {
          lessonsData[doc.id] = { id: doc.id, ...doc.data() };
        });
        setLessons(lessonsData);
      } catch (err) {
        console.error("Error fetching course content:", err);
        setError("Failed to load course content.");
      } finally {
        setLoading(false);
      }
    };
    fetchCourseContent();
  }, [courseId, user, userCourseId]);

  useEffect(() => {
    const fetchProgress = async () => {
      if (!user || !userCourseId) return;
      try {
        const progress = await getUserProgress(user.uid);
        setUserOverallProgress(progress);
        if (progress && progress.lessons) {
          const completedLessonIds = Object.keys(progress.lessons).filter(lessonId => progress.lessons[lessonId].completed);
          setCompletedLessons(new Set(completedLessonIds));
        }
      } catch (err) {
        console.error("Error fetching user progress:", err);
        setError("Failed to load your learning progress.");
      }
    };
    fetchProgress();
  }, [user, userCourseId]);

  useEffect(() => {
    if (loading || modules.length === 0 || Object.keys(lessons).length === 0 || !userOverallProgress) return;

    const allLessonsCount = modules.reduce((acc, m) => acc + m.lessonOrder.length, 0);
    if (allLessonsCount > 0 && completedLessons.size === allLessonsCount) {
      setCourseCompleted(true);
      setCurrentLesson(null);
      return;
    }

    const lastViewedLessonId = userOverallProgress.lastViewedLesson?.[courseId];
    const nextLessonId = (lastViewedLessonId && lessons[lastViewedLessonId]) 
      ? lastViewedLessonId 
      : findFirstUncompletedLesson(modules, completedLessons) || modules[0]?.lessonOrder[0];
    
    if (nextLessonId && lessons[nextLessonId]) {
      const newLesson = { ...lessons[nextLessonId] };
      setCurrentLesson(newLesson);
      initializeLesson(user.uid, newLesson.id);
    } else {
      setCurrentLesson(null);
    }
  }, [modules, lessons, completedLessons, loading, user, userOverallProgress, courseId]);
  
  useEffect(() => {
    if (currentLesson?.videoUrl) {
      setVideoStage('primary_playing');
    } else {
      setVideoStage('no_video_for_lesson');
    }
  }, [currentLesson]);

  useEffect(() => {
    const videoElement = videoRef.current;
    const handleTimeUpdate = () => {
      if (videoElement) {
        lastPlaybackTimeRef.current = videoElement.currentTime;
      }
    };
    videoElement?.addEventListener('timeupdate', handleTimeUpdate);
    return () => videoElement?.removeEventListener('timeupdate', handleTimeUpdate);
  }, [currentLesson, videoStage]);

  useEffect(() => {
    if (!user || !currentLesson || completedLessons.has(currentLesson.id)) {
      return;
    }
    const checkDailyTimeLimit = async () => {
      const totalTimeTodaySeconds = await getTimeSpentToday(user.uid);
      const FOUR_HOURS_IN_SECONDS = 4 * 60 * 60;
      if (totalTimeTodaySeconds >= FOUR_HOURS_IN_SECONDS) {
        setIsTimeLimitReached(true);
        const now = new Date();
        const nextLearningDay = new Date(now);
        if (now.getHours() >= 12) {
          nextLearningDay.setDate(now.getDate() + 1);
        }
        nextLearningDay.setHours(12, 0, 0, 0);
        setResumeTimeMessage(`You have completed the state maximum of 4 hours per 24-hour block. You may continue your next learning journey after ${nextLearningDay.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} on ${nextLearningDay.toLocaleDateString()}.`);
        
        if (videoRef.current && !videoRef.current.paused) {
          videoRef.current.pause();
        }
      } else {
        setIsTimeLimitReached(false);
        setResumeTimeMessage('');
      }
    };
    checkDailyTimeLimit();
    const interval = setInterval(checkDailyTimeLimit, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [user, currentLesson, completedLessons]);

  useEffect(() => {
    if (user && courseId && currentLesson && !completedLessons.has(currentLesson.id)) {
      setLastViewedLesson(user.uid, courseId, currentLesson.id);
    }
  }, [user, courseId, currentLesson, completedLessons]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (user && currentLesson && !completedLessons.has(currentLesson.id) && videoRef.current) {
        saveOnExit();
        saveLessonPlaybackTime(user.uid, currentLesson.id, videoRef.current.currentTime);
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [user, currentLesson, completedLessons, saveOnExit]);

  useEffect(() => {
    return () => {
      if (user && currentLesson && !completedLessons.has(currentLesson.id)) {
        saveOnExit();
        saveLessonPlaybackTime(user.uid, currentLesson.id, lastPlaybackTimeRef.current);
      }
    };
  }, [user, currentLesson, completedLessons, saveOnExit]);

  useEffect(() => {
    if (courseCompleted && user && course) {
      const fetchTotalTimeAndLog = async () => {
        try {
          const progress = await getUserProgress(user.uid);
          let totalTimeSeconds = 0;
          if (progress && progress.lessons) {
            for (const lessonId in progress.lessons) {
              if (progress.lessons[lessonId].timeSpentSeconds) {
                totalTimeSeconds += progress.lessons[lessonId].timeSpentSeconds;
              }
            }
          }
          await addCourseAuditLog(user.uid, course.id, totalTimeSeconds);
        } catch (err) {
          console.error("Error generating audit log:", err);
        }
      };
      fetchTotalTimeAndLog();
    }
  }, [courseCompleted, user, course]);

  const handleVideoEnded = () => {
    handlePause();
    if (videoStage === 'primary_playing' && currentLesson.videoUrl2) {
      setVideoStage('primary_ended_awaiting_continue');
    } else {
      setVideoStage('lesson_videos_complete');
    }
  };

  const handleLoadedMetadata = () => {
    if (user && currentLesson && videoRef.current) {
      const lessonProgress = userOverallProgress?.lessons?.[currentLesson.id];
      const savedTime = lessonProgress?.playbackTime;
      if (savedTime && savedTime > 1 && !completedLessons.has(currentLesson.id)) {
        videoRef.current.currentTime = savedTime;
      }
    }
  };

  const areAllVideosWatched = 
    videoStage === 'lesson_videos_complete' ||
    videoStage === 'no_video_for_lesson';

  const handleCompleteLesson = async () => {
    if (!user || !currentLesson) return;
    try {
      await updateActivityProgress(user.uid, 'lessons', currentLesson.id, { completed: true });
      await clearLastViewedLesson(user.uid, courseId);
      setUserOverallProgress(prev => {
        const newProgress = { ...prev };
        if (newProgress.lastViewedLesson) delete newProgress.lastViewedLesson[courseId];
        return newProgress;
      });
      setCompletedLessons(prev => new Set(prev).add(currentLesson.id));
    } catch (err) {
      console.error("Error saving progress:", err);
      setError("Could not save your progress. Please try again.");
    }
  };

  const handleContinueToSecondVideo = () => {
    setVideoStage('secondary_playing');
  };

  if (loading) {
    return <div className="loading-container">Loading Course...</div>;
  }

  if (error) {
    return <div className="error-container">{error}</div>;
  }

  const idleModal = isIdleModalOpen && (
    <div className="idle-modal-overlay">
      <div className="idle-modal-content">
        <h2>Are you still there?</h2>
        <p>Inactivity for another 5mins will result in a logout.</p>
        <button onClick={() => {
          setIsIdleModalOpen(false);
          if (videoRef.current) {
            videoRef.current.play();
          }
        }} className="btn btn-primary">
          I'm still here
        </button>
      </div>
    </div>
  );

  const timeLimitModal = isTimeLimitReached && (
    <div className="time-limit-modal-overlay">
      <div className="time-limit-modal-content">
        <h2>Time Limit Reached</h2>
        <p>{resumeTimeMessage}</p>
        <button onClick={() => {
          setIsTimeLimitReached(false);
        }} className="btn btn-primary">
          OK
        </button>
      </div>
    </div>
  );

  return (
    <div className="course-player-container">
      <div className="sidebar">
        <h1>{course?.title}</h1>
        {modules.map(module => (
            <div key={module.id} className="module-section">
                <h3>{module.title}</h3>
                <ul>
                    {module.lessonOrder.map(lessonId => {
                        const lesson = lessons[lessonId];
                        if (!lesson) return null;
                        const isCompleted = completedLessons.has(lessonId);
                        const isActive = currentLesson?.id === lessonId;
                        return (
                            <li 
                                key={lesson.id} 
                                className={`${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
                                onClick={() => {
                                  const newLesson = lessons[lessonId];
                                  if (newLesson) {
                                    setCurrentLesson(newLesson);
                                    setVideoStage('primary');
                                  }
                                }}
                            >
                                <span className="lesson-status-icon">
                                    <span className="icon-box">☐</span>
                                    <span className="icon-check">✓</span>
                                </span>
                                <span className="lesson-title">{lesson.title}</span>
                            </li>
                        );
                    })}
                </ul>
            </div>
        ))}
      </div>

      <main className="main-content">
        {courseCompleted ? (
          <div className="no-lesson-selected">
            <h2>Congratulations!</h2>
            <p>You have completed the course: {course?.title}</p>
          </div>
        ) : currentLesson ? (
          <div>
            <h2>{currentLesson.title}</h2>
            <div className="video-player-wrapper">
              {videoStage === 'primary_playing' && currentLesson.videoUrl && (
                currentLesson.videoUrl.startsWith("http") || currentLesson.videoUrl.startsWith("/") ? (
                  <video 
                    ref={videoRef} 
                    src={currentLesson.videoUrl} 
                    className="video-player" 
                    controls 
                    onPlay={handlePlay} onPause={handlePause} onEnded={handleVideoEnded} onLoadedMetadata={handleLoadedMetadata}
                    title={currentLesson.title} 
                  />
                ) : (
                  <YouTube videoId={currentLesson.videoUrl} className="video-player" onEnd={handleVideoEnded} />
                )
              )}

              {videoStage === 'primary_ended_awaiting_continue' && currentLesson.videoUrl2 && (
                <div className="video-placeholder">
                  <p>You've completed the first part of this lesson.</p>
                  <button onClick={handleContinueToSecondVideo} className="btn btn-primary">
                    Continue to Key Takeaways
                  </button>
                </div>
              )}

              {videoStage === 'secondary_playing' && currentLesson.videoUrl2 && (
                <video
                  ref={videoRef}
                  src={currentLesson.videoUrl2}
                  className="video-player"
                  controls
                  autoPlay
                  onPlay={handlePlay} onPause={handlePause} onEnded={handleVideoEnded} onLoadedMetadata={handleLoadedMetadata}
                  title={`${currentLesson.title} - Part 2`}
                />
              )}

              {(videoStage === 'lesson_videos_complete' || videoStage === 'no_video_for_lesson') && (
                <div className="video-placeholder">
                  {currentLesson.videoUrl ? "Video(s) complete." : "No video for this lesson."}
                </div>
              )}
            </div>
            <div className="lesson-description-box">
              <p>
                {currentLesson.content || "No description available."}
              </p>
            </div>
            <div className="lesson-actions">
              {!completedLessons.has(currentLesson.id) && (
                <button 
                    onClick={handleCompleteLesson} 
                    className="btn btn-primary"
                    disabled={!areAllVideosWatched}
                    title={!areAllVideosWatched ? "You must finish all videos to continue." : ""}
                >
                  {areAllVideosWatched ? 'Mark as Complete' : 'Finish the video(s) to continue'}
                </button> 
              )}
            </div>
          </div>
        ) : (
          <div className="no-lesson-selected">
            <p>Loading lesson...</p>
          </div>
        )}
      </main>
      {idleModal}
      {timeLimitModal}
    </div>
  );
}

export default CoursePlayer;
