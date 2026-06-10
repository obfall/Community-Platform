// TEMP: VIDEO_OUTPUT_FORMAT=mp4 (Cloudflare Stream 移行までの暫定)
// playbackUrl が .mp4 の場合は hls.js を初期化せず素の <video> で直再生する。
// 詳細: docs/動画HLS変換のOOM障害と対策.md
"use client";

import { useEffect, useRef } from "react";
import Hls from "hls.js";
import { useTranslations } from "next-intl";
import { useUpdateVideoProgress, useRecordVideoView } from "@/hooks/videos/use-videos";
import { Loader2, Play } from "lucide-react";

interface HlsPlayerProps {
  playbackUrl: string | null;
  streamStatus: string;
  videoId: string;
  durationSeconds: number | null;
}

export function HlsPlayer({ playbackUrl, streamStatus, videoId, durationSeconds }: HlsPlayerProps) {
  const t = useTranslations("videos.player");
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const viewRecordedRef = useRef(false);
  const updateProgress = useUpdateVideoProgress();
  const recordView = useRecordVideoView();

  // HLS.js 初期化
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !playbackUrl) return;

    // TEMP: VIDEO_OUTPUT_FORMAT=mp4 (Cloudflare Stream 移行までの暫定)
    if (playbackUrl.endsWith(".mp4")) {
      video.src = playbackUrl;
      return;
    }

    if (Hls.isSupported()) {
      const hls = new Hls();
      hls.loadSource(playbackUrl);
      hls.attachMedia(video);
      hlsRef.current = hls;

      return () => {
        hls.destroy();
        hlsRef.current = null;
      };
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      // Safari ネイティブ HLS
      video.src = playbackUrl;
    }
  }, [playbackUrl]);

  // 視聴進捗は再生終了時にのみ保存する（途中保存はしない方針）。
  // lastPositionSeconds は 0 を送り、次回視聴時のレジュームは先頭からになる。
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !playbackUrl) return;

    const handleEnded = () => {
      const total = Math.round(video.duration || durationSeconds || 0);
      if (total <= 0) return;
      updateProgress.mutate({
        videoId,
        data: { watchedSeconds: total, lastPositionSeconds: 0, totalSeconds: total },
      });
    };
    video.addEventListener("ended", handleEnded);
    return () => video.removeEventListener("ended", handleEnded);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playbackUrl, videoId]);

  // 再生開始時に再生回数を +1（同一マウント内で 1 回だけ）
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !playbackUrl) return;

    const handlePlay = () => {
      if (viewRecordedRef.current) return;
      viewRecordedRef.current = true;
      recordView.mutate(videoId);
    };
    video.addEventListener("play", handlePlay);
    return () => video.removeEventListener("play", handlePlay);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playbackUrl, videoId]);

  if (streamStatus === "uploading" || streamStatus === "processing") {
    return (
      <div className="flex aspect-video items-center justify-center rounded-lg bg-black">
        <div className="text-center text-white">
          <Loader2 className="mx-auto mb-2 h-8 w-8 animate-spin" />
          <p className="text-sm">
            {streamStatus === "uploading" ? t("uploading") : t("processing")}
          </p>
        </div>
      </div>
    );
  }

  if (streamStatus === "error") {
    return (
      <div className="flex aspect-video items-center justify-center rounded-lg bg-black">
        <p className="text-sm text-red-400">{t("errorMessage")}</p>
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
