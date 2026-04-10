"use client";

import { useEffect, useRef } from "react";
import Hls from "hls.js";
import { useUpdateVideoProgress } from "@/hooks/videos/use-videos";
import { Loader2, Play } from "lucide-react";

interface HlsPlayerProps {
  playbackUrl: string | null;
  streamStatus: string;
  videoId: string;
  durationSeconds: number | null;
  resumePosition?: number;
}

export function HlsPlayer({
  playbackUrl,
  streamStatus,
  videoId,
  durationSeconds,
  resumePosition,
}: HlsPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const updateProgress = useUpdateVideoProgress();

  // HLS.js 初期化
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !playbackUrl) return;

    if (Hls.isSupported()) {
      const hls = new Hls();
      hls.loadSource(playbackUrl);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (resumePosition && resumePosition > 0) {
          video.currentTime = resumePosition;
        }
      });
      hlsRef.current = hls;

      return () => {
        hls.destroy();
        hlsRef.current = null;
      };
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      // Safari ネイティブ HLS
      video.src = playbackUrl;
      if (resumePosition && resumePosition > 0) {
        video.currentTime = resumePosition;
      }
    }
  }, [playbackUrl, resumePosition]);

  // 視聴進捗を定期保存（30秒ごと）
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !playbackUrl) return;

    const interval = setInterval(() => {
      if (video.currentTime > 0 && !video.paused) {
        updateProgress.mutate({
          videoId,
          data: {
            watchedSeconds: Math.round(video.currentTime),
            lastPositionSeconds: Math.round(video.currentTime),
            totalSeconds: Math.round(video.duration || durationSeconds || 0),
          },
        });
      }
    }, 30000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playbackUrl, videoId]);

  if (streamStatus === "uploading" || streamStatus === "processing") {
    return (
      <div className="flex aspect-video items-center justify-center rounded-lg bg-black">
        <div className="text-center text-white">
          <Loader2 className="mx-auto mb-2 h-8 w-8 animate-spin" />
          <p className="text-sm">
            {streamStatus === "uploading" ? "アップロード中..." : "HLS 変換中..."}
          </p>
        </div>
      </div>
    );
  }

  if (streamStatus === "error") {
    return (
      <div className="flex aspect-video items-center justify-center rounded-lg bg-black">
        <p className="text-sm text-red-400">動画の処理中にエラーが発生しました</p>
      </div>
    );
  }

  if (!playbackUrl) {
    return (
      <div className="flex aspect-video items-center justify-center rounded-lg bg-black">
        <Play className="h-16 w-16 text-white/50" />
      </div>
    );
  }

  return (
    <div className="relative aspect-video overflow-hidden rounded-lg bg-black">
      <video ref={videoRef} className="h-full w-full" controls playsInline />
    </div>
  );
}
