import React, { useEffect, useState, useRef } from "react";
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
import { useAuth } from "./Auth/AuthContext"; // Corrected path to AuthContext
import "./CoursePlayer.css";
import { getUserProgress, updateActivityProgress, addLessonTime, saveLessonPlaybackTime, setLastViewedLesson, initializeLesson, clearLastViewedLesson } from "../services/userProgressFirestoreService";

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
  const [userOverallProgress, setUserOverallProgress] = useState(null); // New state for overall user progress
  const [loading, setLoading] = useState(true);
  const activeTimeRef = useRef({ startTime: 0, accumulatedSeconds: 0 });
  const lastPlaybackTimeRef = useRef(0); // New ref to store the last known playback time
  const [error, setError] = useState("");
  const [courseCompleted, setCourseCompleted] = useState(false);
  const [videoStage, setVideoStage] = useState('primary_playing'); // 'primary_playing', 'primary_ended_awaiting_continue', 'secondary_playing', 'lesson_videos_complete', 'no_video_for_lesson'
  const videoRef = useRef(null);

  // Effect to find the user's specific course enrollment
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

  // Effect to fetch all course content (modules and lessons)
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

  // Effect to fetch user's lesson progress from the new userProgress collection
  useEffect(() => {
    const fetchProgress = async () => {
      if (!user || !userCourseId) return;

      try {
        const progress = await getUserProgress(user.uid);
        setUserOverallProgress(progress); // Store the full progress object
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
  }, [user, userCourseId]); // Reruns if the user or course context changes

  // Main logic effect to determine the current lesson
  useEffect(() => {
    if (loading || modules.length === 0 || Object.keys(lessons).length === 0 || !userOverallProgress) return; // Wait for userOverallProgress

    const allLessonsCount = modules.reduce((acc, m) => acc + m.lessonOrder.length, 0);
    if (allLessonsCount > 0 && completedLessons.size === allLessonsCount) {
      setCourseCompleted(true);
      setCurrentLesson(null);
      return;
    }

    // --- Resume Logic ---
    // 1. Check if there's a last-viewed lesson for this specific course.
    const lastViewedLessonId = userOverallProgress.lastViewedLesson?.[courseId];

    // 2. If so, use it. Otherwise, find the first uncompleted lesson.
    const nextLessonId = (lastViewedLessonId && lessons[lastViewedLessonId]) 
      ? lastViewedLessonId 
      : findFirstUncompletedLesson(modules, completedLessons) || modules[0]?.lessonOrder[0];
    // --- End Resume Logic ---
    
    if (nextLessonId && lessons[nextLessonId]) {
      const newLesson = { ...lessons[nextLessonId] };
      setCurrentLesson(newLesson);
      initializeLesson(user.uid, newLesson.id); // Set timeStart if it's the first time

    } else {
      setCurrentLesson(null);
    }
  }, [modules, lessons, completedLessons, loading, user, userOverallProgress]); // Added user and userOverallProgress to dependencies

  // Effect to reset video state when the lesson changes
  useEffect(() => {
    // Determine initial video stage based on the new lesson's video URLs
    if (currentLesson?.videoUrl) {
      setVideoStage('primary_playing');
    } else {
      setVideoStage('no_video_for_lesson');
    }
    // Reset time tracking on lesson change
    activeTimeRef.current = { startTime: 0, accumulatedSeconds: 0 };
  }, [currentLesson]);

  // Effect to listen for video time updates
  useEffect(() => {
    const videoElement = videoRef.current;
    const handleTimeUpdate = () => {
      if (videoElement) {
        lastPlaybackTimeRef.current = videoElement.currentTime;
      }
    };

    videoElement?.addEventListener('timeupdate', handleTimeUpdate);

    return () => videoElement?.removeEventListener('timeupdate', handleTimeUpdate);
  }, [currentLesson, videoStage]); // Re-attach listener if the lesson or video stage changes

  // Effect to save the last viewed lesson
  useEffect(() => {
    if (user && courseId && currentLesson) {
      setLastViewedLesson(user.uid, courseId, currentLesson.id);
    }
  }, [user, courseId, currentLesson]);

  // Effect to handle saving progress when the user closes the tab/browser
  useEffect(() => {
    const handleBeforeUnload = (event) => {
      // This logic runs just before the page is unloaded
      if (user && currentLesson && !completedLessons.has(currentLesson.id) && videoRef.current) {
        // We can't use async operations here, but we can try to send a synchronous beacon
        // This is a "best-effort" save for tab closes.
        const playbackTime = videoRef.current.currentTime;
        const totalSeconds = Math.floor(activeTimeRef.current.accumulatedSeconds + ((activeTimeRef.current.startTime > 0) ? (Date.now() - activeTimeRef.current.startTime) / 1000 : 0));

        // For a more reliable save on page exit, we could use navigator.sendBeacon if we had an HTTP endpoint.
        // For now, we'll rely on the onPause and internal navigation cleanup, and this is a fallback.
        // The most reliable save will happen in the onPause/onNavigate away logic below.
        saveLessonPlaybackTime(user.uid, currentLesson.id, playbackTime);
        if (totalSeconds > 0) {
          addLessonTime(user.uid, currentLesson.id, totalSeconds);
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [user, currentLesson, completedLessons]);

  // Effect to save final progress on cleanup (when navigating away within the app)
  useEffect(() => {
    // Do not track time if there is no user/lesson, or if the lesson is already completed.
    if (!user || !currentLesson || completedLessons.has(currentLesson.id)) {
      return;
    }

    // Cleanup function: This runs when the lesson changes or the component unmounts.
    return () => {
      // When the user navigates away, calculate any remaining active time and save it.
      if (activeTimeRef.current.startTime > 0) {
        const elapsedSeconds = (Date.now() - activeTimeRef.current.startTime) / 1000;
        activeTimeRef.current.accumulatedSeconds += elapsedSeconds;
      }

      const totalSeconds = Math.floor(activeTimeRef.current.accumulatedSeconds);
      addLessonTime(user.uid, currentLesson.id, totalSeconds);
      saveLessonPlaybackTime(user.uid, currentLesson.id, lastPlaybackTimeRef.current);
    };
  }, [user, currentLesson, completedLessons]);

  // This function is called when the video ends
  const handleVideoEnded = () => {
    handlePause(); // Accumulate final time when video ends
    if (videoStage === 'primary_playing' && currentLesson.videoUrl2) {
      setVideoStage('primary_ended_awaiting_continue');
    } else {
      // This covers:
      // 1. Primary video ended, no secondary video.
      // 2. Secondary video ended.
      setVideoStage('lesson_videos_complete');
    }
  };

  const handlePlay = () => {
    if (activeTimeRef.current.startTime === 0) {
      activeTimeRef.current.startTime = Date.now();
    }
  };

  const handlePause = () => {
    if (activeTimeRef.current.startTime > 0) {
      const elapsedSeconds = (Date.now() - activeTimeRef.current.startTime) / 1000;
      activeTimeRef.current.accumulatedSeconds += elapsedSeconds;
      activeTimeRef.current.startTime = 0; // Reset start time

      // Only save time if the lesson is NOT completed
      if (user && currentLesson && !completedLessons.has(currentLesson.id)) {
        const totalSeconds = Math.floor(activeTimeRef.current.accumulatedSeconds);
        if (totalSeconds > 0) {
          addLessonTime(user.uid, currentLesson.id, totalSeconds);
          activeTimeRef.current.accumulatedSeconds -= totalSeconds; // Keep the remainder
        }
        saveLessonPlaybackTime(user.uid, currentLesson.id, videoRef.current?.currentTime || 0);
      }
    }
  };


  const handleLoadedMetadata = () => {
    if (user && currentLesson && videoRef.current) {
      const lessonProgress = userOverallProgress?.lessons?.[currentLesson.id];
      const savedTime = lessonProgress?.playbackTime;

      // Only seek if the lesson is not completed and there's a meaningful saved time.
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
      // Use the new centralized service to update progress
      await updateActivityProgress(user.uid, 'lessons', currentLesson.id, { completed: true });

      // Clear the "last viewed" lesson so the player advances to the next uncompleted one.
      await clearLastViewedLesson(user.uid, courseId);

      // Also clear the last viewed lesson from local state to ensure the UI updates correctly.
      setUserOverallProgress(prev => {
        const newProgress = { ...prev };
        if (newProgress.lastViewedLesson) delete newProgress.lastViewedLesson[courseId];
        return newProgress;
      });
      
      // Manually update local state to trigger UI changes and advance to the next lesson
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
                                  // This is the key fix: reset all state when a lesson is clicked.
                                  const newLesson = lessons[lessonId];
                                  if (newLesson) {
                                    setCurrentLesson(newLesson);
                                    setVideoStage('primary'); // Explicitly reset the video stage here.
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
              {/* Primary Video Player (YouTube or self-hosted) */}
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

              {/* "Continue to Next Video" button */}
              {videoStage === 'primary_ended_awaiting_continue' && currentLesson.videoUrl2 && (
                <div className="video-placeholder">
                  <p>You've completed the first part of this lesson.</p>
                  <button onClick={handleContinueToSecondVideo} className="btn btn-primary">
                    Continue to Key Takeaways
                  </button>
                </div>
              )}

              {/* Secondary Video Player (self-hosted) */}
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

              {/* Placeholder for after all videos are watched, or if there are no videos at all */}
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
    </div>
  );
}

export default CoursePlayer;
