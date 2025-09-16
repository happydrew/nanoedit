"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Icon from "@/components/icon";
import Image from "next/image";
import { ToolShowcase as ToolShowcaseType } from "@/types/blocks/tool-showcase";
import { useTranslations } from "next-intl";
import { Play, Pause, Volume2, VolumeX } from "lucide-react";
import { useState, useRef } from "react";

interface VideoPlayerProps {
  video: {
    src: string;
    poster?: string;
    alt?: string;
    autoplay?: boolean;
    loop?: boolean;
    muted?: boolean;
    controls?: boolean;
  };
}

function VideoPlayer({ video }: VideoPlayerProps) {
  const t = useTranslations('common');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(video.muted ?? true);
  const videoRef = useRef<HTMLVideoElement>(null);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  return (
    <div className="relative group rounded-xl overflow-hidden bg-muted">
      <video
        ref={videoRef}
        className="w-full h-full object-cover"
        poster={video.poster}
        autoPlay={video.autoplay}
        loop={video.loop}
        muted={isMuted}
        playsInline
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      >
        <source src={video.src} type="video/mp4" />
        <p className="text-muted-foreground">
          {t('video_not_supported')}
        </p>
      </video>
      
      {/* 视频控制层 */}
      <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
        <div className="flex items-center gap-4">
          <Button
            variant="secondary"
            size="icon"
            className="h-12 w-12 rounded-full bg-white/90 hover:bg-white text-black"
            onClick={togglePlay}
            title={isPlaying ? t('pause_video') : t('play_video')}
          >
            {isPlaying ? (
              <Pause className="h-6 w-6" />
            ) : (
              <Play className="h-6 w-6 ml-1" />
            )}
          </Button>

          <Button
            variant="secondary"
            size="icon"
            className="h-10 w-10 rounded-full bg-white/90 hover:bg-white text-black"
            onClick={toggleMute}
            title={isMuted ? t('unmute_video') : t('mute_video')}
          >
            {isMuted ? (
              <VolumeX className="h-4 w-4" />
            ) : (
              <Volume2 className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function ToolShowcase({ toolShowcase }: { toolShowcase: ToolShowcaseType }) {
  const t = useTranslations();

  if (toolShowcase.disabled) {
    return null;
  }

  return (
    <section className="py-16 lg:py-24">
      <div className="container">
        {/* 标题部分 */}
        {(toolShowcase.title || toolShowcase.description) && (
          <div className="mx-auto mb-16 text-center max-w-3xl">
            {toolShowcase.label && (
              <Badge variant="outline" className="mb-4">
                {toolShowcase.label}
              </Badge>
            )}
            {toolShowcase.title && (
              <h2 className="mb-6 text-3xl font-bold tracking-tight lg:text-4xl xl:text-5xl">
                {toolShowcase.title}
              </h2>
            )}
            {toolShowcase.description && (
              <p className="text-lg text-muted-foreground lg:text-xl">
                {toolShowcase.description}
              </p>
            )}
          </div>
        )}

        {/* 工具展示项目 */}
        <div className="space-y-24">
          {toolShowcase.items?.map((item, index) => (
            <div
              key={index}
              className={`grid gap-12 lg:gap-16 items-center ${
                item.reverse 
                  ? "lg:grid-cols-2 lg:grid-flow-col-dense" 
                  : "lg:grid-cols-2"
              }`}
            >
              {/* 描述部分 */}
              <div className={`space-y-6 ${item.reverse ? "lg:col-start-2" : ""}`}>
                {item.badge && (
                  <Badge variant="secondary" className="w-fit">
                    {item.badge}
                  </Badge>
                )}
                
                <div className="space-y-4">
                  <h3 className="text-2xl font-bold tracking-tight lg:text-3xl">
                    {item.title}
                  </h3>
                  <p className="text-lg text-muted-foreground leading-relaxed">
                    {item.description}
                  </p>
                </div>

                {/* 功能特性列表 */}
                {item.features && item.features.length > 0 && (
                  <div className="space-y-4">
                    {item.features.map((feature, featureIndex) => (
                      <div key={featureIndex} className="flex items-start gap-3">
                        {feature.icon && (
                          <div className="flex-shrink-0 mt-1">
                            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10">
                              <Icon 
                                name={feature.icon} 
                                className="h-3 w-3 text-primary" 
                              />
                            </div>
                          </div>
                        )}
                        <div>
                          <h4 className="font-semibold text-foreground">
                            {feature.title}
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            {feature.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* 操作按钮 */}
                {item.buttons && item.buttons.length > 0 && (
                  <div className="flex flex-wrap gap-3 pt-2">
                    {item.buttons.map((button, buttonIndex) => (
                      <Button
                        key={buttonIndex}
                        variant={button.variant as any || "default"}
                        size={button.size as any || "default"}
                        asChild
                      >
                        <a
                          href={button.url}
                          target={button.target || "_self"}
                          rel={button.target === "_blank" ? "noopener noreferrer" : undefined}
                        >
                          {button.icon && (
                            <Icon name={button.icon} className="mr-2 h-4 w-4" />
                          )}
                          {button.text}
                        </a>
                      </Button>
                    ))}
                  </div>
                )}
              </div>

              {/* 视频/图片部分 */}
              <div className={`${item.reverse ? "lg:col-start-1" : ""}`}>
                <Card className="overflow-hidden border-0 shadow-2xl">
                  <CardContent className="p-0">
                    <div className="aspect-video">
                      {item.video ? (
                        <VideoPlayer video={item.video} />
                      ) : item.image ? (
                        <div className="relative w-full h-full">
                          <Image
                            src={item.image.src}
                            alt={item.image.alt || item.title}
                            fill
                            className="object-cover"
                            sizes="(max-width: 768px) 100vw, 50vw"
                          />
                        </div>
                      ) : (
                        <div className="w-full h-full bg-muted flex items-center justify-center">
                          <p className="text-muted-foreground">
                            {t('no_media_available')}
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
