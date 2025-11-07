import React, { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from "react-router-dom";
import YouTube from "react-youtube"; // Ensure YouTube is imported if used
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
import { getUserProgress, updateActivityProgress, addLessonTime, saveLessonPlaybackTime, setLastViewedLesson, initializeLesson, clearLastViewedLesson, addCourseAuditLog, getTimeSpentToday } from "../services/userProgressFirestoreService";
import { useIdleTimer } from '../hooks/useIdleTimer'; // Import the new custom hook
import { useTimeTracker } from '../hooks/useTimeTracker'; // Import our new time tracker hook

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
  const [userCourseId, setUserCourseId] = useState(null); // User's enrollment ID for the course
  const [userOverallProgress, setUserOverallProgress] = useState(null); // Overall user progress object
  const [loading, setLoading] = useState(true);
  const lastPlaybackTimeRef = useRef(0); // New ref to store the last known playback time
  const [error, setError] = useState("");
  const [isTimeLimitReached, setIsTimeLimitReached] = useState(false); // New state for 4-hour limit
  const [resumeTimeMessage, setResumeTimeMessage] = useState(''); // New state for resume message
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
  }, [modules, lessons, completedLessons, loading, user, userOverallProgress, courseId]); // Added courseId to dependencies
  
  // Effect to reset video state when the lesson changes
  useEffect(() => {
    // Determine initial video stage based on the new lesson's video URLs
    if (currentLesson?.videoUrl) {
      setVideoStage('primary_playing');
    } else {
      setVideoStage('no_video_for_lesson');
    }
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

  // New useEffect to check 4-hour limit
  useEffect(() => {
    if (!user || !currentLesson || completedLessons.has(currentLesson.id)) {
      return;
    }

    const checkDailyTimeLimit = async () => {
      const totalTimeTodaySeconds = await getTimeSpentToday(user.uid);
      const FOUR_HOURS_IN_SECONDS = 4 * 60 * 60;

      if (totalTimeTodaySeconds >= FOUR_HOURS_IN_SECONDS) {
        setIsTimeLimitReached(true);
        // Calculate next resume time: 12 PM local time of the next calendar day
        const now = new Date();
        const nextLearningDay = new Date(now);
        if (now.getHours() >= 12) { // If it's 12 PM or later, resume tomorrow at 12 PM
          nextLearningDay.setDate(now.getDate() + 1);
        }
        nextLearningDay.setHours(12, 0, 0, 0); // Set to 12:00:00 PM
        setResumeTimeMessage(`You have completed the state maximum of 4 hours per 24-hour block. You may continue your next learning journey after ${nextLearningDay.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} on ${nextLearningDay.toLocaleDateString()}.`);
        
        // Pause video and stop time tracking if limit is reached
        if (videoRef.current && !videoRef.current.paused) {
          videoRef.current.pause();
        }
      } else {
        setIsTimeLimitReached(false);
        setResumeTimeMessage('');
      }
    };
    checkDailyTimeLimit(); // Check immediately
    const interval = setInterval(checkDailyTimeLimit, 5 * 60 * 1000); // Re-check every 5 minutes
    return () => clearInterval(interval);
  }, [user, currentLesson, completedLessons]); // Dependencies: user, currentLesson, completedLessons

  const lastActivityTimestampRef = useRef(Date.now()); // Re-introduce for idle detection

  // --- START: TIME TRACKING LOGIC ---
  const { handlePlay, handlePause, saveOnExit } = useTimeTracker(user, currentLesson, isTimeLimitReached, completedLessons);
  // --- END: TIME TRACKING LOGIC ---

  const [isIdleModalOpen, setIsIdleModalOpen] = useState(false); // State for idle modal visibility

  // --- START: NEW, CLEAN IDLE DETECTION ---
  const handleIdle = useCallback(() => {
    // Only trigger if the modal isn't already open and the time limit hasn't been reached
    if (!isIdleModalOpen && !isTimeLimitReached) {
      // If the video is playing, pause it. This will trigger handlePause, which saves any active time.
      if (videoRef.current && !videoRef.current.paused) {
        videoRef.current.pause();
      }
      setIsIdleModalOpen(true);
    }
  }, [isIdleModalOpen, isTimeLimitReached]);

  // Use the custom idle timer hook. 1 minute for testing.
  useIdleTimer(handleIdle, 1 * 60 * 1000);
  // --- END: NEW, CLEAN IDLE DETECTION ---

  // Effect to save the last viewed lesson
  useEffect(() => {
    // Only update the last viewed lesson if the lesson is NOT already completed.
    if (user && courseId && currentLesson && !completedLessons.has(currentLesson.id)) {
      setLastViewedLesson(user.uid, courseId, currentLesson.id);
      // No time tracking here, just last viewed lesson
    }
  }, [user, courseId, currentLesson, completedLessons]);

  // Effect to handle saving progress when the user closes the tab/browser
  useEffect(() => {
    const handleBeforeUnload = (event) => {
      // This logic runs just before the page is unloaded. It must be synchronous.
      if (user && currentLesson && !completedLessons.has(currentLesson.id) && videoRef.current) {
        saveOnExit(); // Save any pending active time
        saveLessonPlaybackTime(user.uid, currentLesson.id, videoRef.current.currentTime);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [user, currentLesson, completedLessons, saveOnExit]);

  // Effect to save final progress on cleanup (when navigating away within the app)
  useEffect(() => {
    // Cleanup function: This runs when the lesson changes or the component unmounts.
    return () => {
      // Ensure any remaining accumulated time is saved
      if (user && currentLesson) {
        saveOnExit();
        saveLessonPlaybackTime(user.uid, currentLesson.id, lastPlaybackTimeRef.current);
      }
    };
  }, [user, currentLesson, saveOnExit]);

  // Effect to handle course completion and generate audit log
  useEffect(() => {
    if (courseCompleted && user && course) {
      // Fetch total time spent for the course
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
          console.log(`Audit log generated for course ${course.id} for user ${user.uid}. Total time: ${totalTimeSeconds}s`);
        } catch (err) {
          console.error("Error generating audit log:", err);
        }
      };
      fetchTotalTimeAndLog();
    }
  }, [courseCompleted, user, course]);

  // This function is called when the video ends
  const handleVideoEnded = () => {
    handlePause(); // Accumulate final time when video ends
    if (videoStage === 'primary_playing' && currentLesson.videoUrl2) {
      setVideoStage('primary_ended_awaiting_continue');
    } else {
      // This covers: 1. Primary video ended, no secondary video. 2. Secondary video ended.
      setVideoStage('lesson_videos_complete');
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

  // Idle Modal UI
  const idleModal = isIdleModalOpen && (
    <div className="idle-modal-overlay">
      <div className="idle-modal-content">
        <h2>Are you still there?</h2>
        <p>Inactivity for another 5mins will result in a logout.</p>
        <button onClick={() => {
          setIsIdleModalOpen(false);
          // The click itself is an activity, which the useIdleTimer hook will automatically detect and reset its timer.
          if (videoRef.current) {
            videoRef.current.play(); // Automatically resume video
          }
        }} className="btn btn-primary">
          I'm still here
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
      {idleModal}
    </div>
  );
}

export default CoursePlayer;
