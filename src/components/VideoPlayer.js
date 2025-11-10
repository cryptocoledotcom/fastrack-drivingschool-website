import React, { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import YouTube from 'react-youtube';

const VideoPlayer = forwardRef(({
  lesson,
  onPlay,
  onPause,
  onAllVideosWatched,
  user, // We now need the user object to save progress
  userOverallProgress,
  completedLessons
}, ref) => {
  const videoRef = useRef(null);
  const youtubePlayerRef = useRef(null);

  // Expose player control methods to the parent component (CoursePlayer)
  useImperativeHandle(ref, () => ({
    pause: () => {
      videoRef.current?.pause();
      youtubePlayerRef.current?.pauseVideo();
    },
    play: () => {
      videoRef.current?.play();
      youtubePlayerRef.current?.playVideo();
    },
    getCurrentTime: () => {
      if (youtubePlayerRef.current && typeof youtubePlayerRef.current.getCurrentTime === 'function') {
        return youtubePlayerRef.current.getCurrentTime();
      } else if (videoRef.current) {
        return videoRef.current.currentTime;
      }
      return 0;
    }
  }));

  // Effect to reset video state when the lesson changes
  useEffect(() => {
    // If there's a video for this lesson, signal that it hasn't been watched yet.
    // Otherwise, signal that it's "watched" so the user can complete the lesson.
    if (lesson?.videoUrl) {
      onAllVideosWatched(false);
    } else {
      onAllVideosWatched(true);
    }
  }, [lesson, onAllVideosWatched]);

  const handleVideoEnded = () => {
    onPause(); // Ensure time tracking stops
    // Now that there's only one video per lesson, ending the video means they are all watched.
    onAllVideosWatched(true);
  };

  const handleLoadedMetadata = () => {
    if (lesson && videoRef.current) {
      const lessonProgress = userOverallProgress?.lessons?.[lesson.id];
      const savedTime = lessonProgress?.playbackTime;
      if (savedTime && savedTime > 1 && !completedLessons.has(lesson.id)) {
        videoRef.current.currentTime = savedTime;
      }
    }
  };

  const handleYoutubeReady = (event) => {
    youtubePlayerRef.current = event.target;
    const lessonProgress = userOverallProgress?.lessons?.[lesson.id];
    const savedTime = lessonProgress?.playbackTime;
    if (savedTime && savedTime > 1 && !completedLessons.has(lesson.id)) {
      youtubePlayerRef.current.seekTo(savedTime, true);
    }
  };

  const handleYoutubeStateChange = (event) => {
    switch (event.data) {
      case 1: onPlay(); break; // Playing
      case 2: onPause(); break; // Paused
      default: break;
    }
  };

  return (
    <div className="video-player-wrapper">
      {lesson.videoUrl ? (
        lesson.videoUrl.startsWith("http") || lesson.videoUrl.startsWith("/") ? (
          <video
            ref={videoRef}
            src={lesson.videoUrl}
            className="video-player"
            controls
            onPlay={onPlay}
            onPause={onPause}
            onEnded={handleVideoEnded}
            onLoadedMetadata={handleLoadedMetadata}
            title={lesson.title}
          />
        ) : (
          <YouTube
            videoId={lesson.videoUrl}
            className="video-player"
            onReady={handleYoutubeReady}
            onEnd={handleVideoEnded}
            onStateChange={handleYoutubeStateChange}
          />
        )
      ) : (
        <div className="video-placeholder">
          No video for this lesson.
        </div>
      )}
    </div>
  );
});

export default VideoPlayer;