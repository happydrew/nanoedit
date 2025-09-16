"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";
import { useState, useRef, useCallback } from "react";
import { useTheme } from "next-themes";

interface ExampleStyle {
  id: string;
  title: string;
  description: string;
  originalImage: string;
  editedImage: string;
  trending?: boolean;
  category: string;
  aspectRatio: "vertical" | "horizontal"; // vertical: 4:5, horizontal: 4:3
  defaultSliderPosition?: number;
}

interface StyleGalleryProps {
  className?: string;
}

// Comparison Slider Component
interface ComparisonSliderProps {
  originalImage: string;
  editedImage: string;
  title: string;
  aspectRatio: "vertical" | "horizontal";
  defaultSliderPosition?: number;
}

function ComparisonSlider({ originalImage, editedImage, title, aspectRatio, defaultSliderPosition = 50 }: ComparisonSliderProps) {
  const [sliderPosition, setSliderPosition] = useState(defaultSliderPosition);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const handleMouseDown = useCallback(() => {
    isDragging.current = true;
    document.body.style.cursor = 'col-resize';
    document.addEventListener('mouseup', handleGlobalMouseUp);
    document.addEventListener('mousemove', handleGlobalMouseMove);
  }, []);

  const handleGlobalMouseUp = useCallback(() => {
    isDragging.current = false;
    document.body.style.cursor = '';
    document.removeEventListener('mouseup', handleGlobalMouseUp);
    document.removeEventListener('mousemove', handleGlobalMouseMove);
  }, []);

  const handleGlobalMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging.current || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const newPosition = ((e.clientX - rect.left) / rect.width) * 100;
    setSliderPosition(Math.max(0, Math.min(100, newPosition)));
  }, []);

  const handleTouchStart = useCallback(() => {
    isDragging.current = true;
  }, []);

  const handleTouchEnd = useCallback(() => {
    isDragging.current = false;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging.current || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const touch = e.touches[0];
    const newPosition = ((touch.clientX - rect.left) / rect.width) * 100;
    setSliderPosition(Math.max(0, Math.min(100, newPosition)));
  }, []);

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const newPosition = ((e.clientX - rect.left) / rect.width) * 100;
    setSliderPosition(Math.max(0, Math.min(100, newPosition)));
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden select-none ${aspectRatio === "horizontal" ? "aspect-[4/3]" : "aspect-[4/5]"
        }`}
      onClick={handleClick}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Original Image (background) - 左边 */}
      <div className="absolute inset-0">
        <Image
          src={originalImage}
          alt={`${title} - Original`}
          fill
          className="object-cover"
          sizes={aspectRatio === "horizontal" ? "(max-width: 768px) 100vw, 50vw" : "(max-width: 768px) 100vw, 25vw"}
        />
        <div className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black/70 text-white px-2 py-1 rounded text-xs font-medium">
          Before
        </div>
      </div>

      {/* Edited Image (overlay with clip-path) - 右边 */}
      <div
        className="absolute inset-0"
        style={{ clipPath: `inset(0 0 0 ${sliderPosition}%)` }}
      >
        <Image
          src={editedImage}
          alt={`${title} - AI Edited`}
          fill
          className="object-cover"
          sizes={aspectRatio === "horizontal" ? "(max-width: 768px) 100vw, 50vw" : "(max-width: 768px) 100vw, 25vw"}
        />
        <div className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black/70 text-white px-2 py-1 rounded text-xs font-medium">
          After
        </div>
      </div>

      {/* Slider Line and Handle */}
      <div
        className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg z-30"
        style={{ left: `${sliderPosition}%`, transform: 'translateX(-50%)' }}
      >
        {/* Drag Handle */}
        <div
          className='absolute top-1/2 transform -translate-y-1/2 -translate-x-1/2 w-10 h-10 rounded-full shadow-lg flex items-center justify-center pointer-events-auto hover:scale-110 transition-transform bg-white dark:hover:bg-gray-100 hover:bg-gray-50'
          style={{ cursor: 'col-resize' }}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
        >
          <div className="flex space-x-0.5">
            <div className="w-0.5 h-4 bg-gray-600"></div>
            <div className="w-0.5 h-4 bg-gray-600"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

const exampleStyles: ExampleStyle[] = [
  {
    id: "retro-classic-black-sare",
    title: "Classic Black-sare Retro Style",
    description: "Transform your photos into Classic Black-sare Retro Style images with warm vintage tones",
    originalImage: "/imgs/examples/retro-vintage/retro-classic-black-saree-before.png",
    editedImage: "/imgs/examples/retro-vintage/retro-classic-black-saree-after.png",
    trending: true,
    category: "Vintage",
    aspectRatio: "horizontal",
    defaultSliderPosition: 30
  },
  {
    id: "retro-white-polka-dot-saree",
    title: "White Polka-dot Saree Retro Style",
    description: "Transform your photos into White Polka-dot Saree Retro Style images with warm vintage tones",
    originalImage: "/imgs/examples/retro-vintage/retro-classic-black-saree-before.png",
    editedImage: "/imgs/examples/retro-vintage/retro-white-polka-dot-saree-after.png",
    trending: true,
    category: "Vintage",
    aspectRatio: "horizontal",
    defaultSliderPosition: 30
  },
  {
    id: "retro-red-saree-drama",
    title: "Red Saree Drama Retro Style",
    description: "Transform your photos into Red Saree Drama Retro Style images with warm vintage tones",
    originalImage: "/imgs/examples/retro-vintage/retro-classic-black-saree-before.png",
    editedImage: "/imgs/examples/retro-vintage/retro-red-saree-drama-after.png",
    trending: true,
    category: "Vintage",
    aspectRatio: "horizontal",
    defaultSliderPosition: 30
  },
  // {
  //   id: "saree-look",
  //   title: "Traditional Saree Look",
  //   description: "Convert any portrait into elegant traditional Indian attire with authentic styling",
  //   originalImage: "/imgs/examples/original/saree-look-before.jpg",
  //   editedImage: "/imgs/examples/saree-look.jpg",
  //   trending: true,
  //   category: "Fashion",
  //   aspectRatio: "vertical"
  // }
];

export default function StyleGallery({ className }: StyleGalleryProps) {
  // const { theme } = useTheme();

  return (
    <section id="examples" className={`py-16 lg:py-24 bg-transparent ${className || ''}`}>
      <div className="container">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <Badge
            variant="outline"
            className='mb-4 border-opacity-50 bg-gradient-to-r dark:from-purple-900/20 dark:to-pink-900/20 dark:border-purple-600 dark:text-purple-300 from-purple-100 to-pink-100 border-purple-200 text-purple-700'
          >
            🔥 Trending Templates
          </Badge>
          <h2 className='text-4xl font-bold tracking-tight mb-6 bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent dark:from-white dark:to-gray-300 dark:bg-clip-text'>
            Most Popular AI Photo Editor Templates
          </h2>
          <p className='text-xl text-gray-600 dark:text-gray-300'>
            Discover trending social media styles powered by Nano Banana AI. Create viral-worthy content with our Gemini AI photo generator templates.
          </p>
        </div>


        {/* Masonry Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4 auto-rows-min">
          {exampleStyles.map((style, index) => (
            <div
              key={style.id}
              className={`${style.aspectRatio === "horizontal"
                ? "col-span-2 md:col-span-4 lg:col-span-4 xl:col-span-4" // Horizontal spans 2x vertical width
                : "col-span-1 md:col-span-2 lg:col-span-2 xl:col-span-2"  // Vertical normal width
                }`}
            >
              <Card className='group border-none py-0 gap-2 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-900'>
                <div className="relative">
                  {/* Comparison Slider */}
                  <ComparisonSlider
                    originalImage={style.originalImage}
                    editedImage={style.editedImage}
                    title={style.title}
                    aspectRatio={style.aspectRatio}
                    defaultSliderPosition={style.defaultSliderPosition}
                  />

                  {style.trending && (
                    <Badge className="absolute top-3 right-3 bg-gradient-to-r from-red-500 to-pink-500 text-white z-20">
                      🔥 Trending
                    </Badge>
                  )}

                </div>

                {/* Content */}
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className='font-semibold leading-tight text-gray-900 dark:text-white'>
                      {style.title}
                    </h3>
                    <Badge
                      variant="secondary"
                      className='text-xs ml-2 shrink-0 bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'>
                      {style.category}
                    </Badge>
                  </div>
                  <p className='text-sm leading-relaxed dark:text-gray-300 text-gray-600'>
                    {style.description}
                  </p>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>

        {/* Load More Button */}
        <div className="text-center mt-12">
          <Button
            size="lg"
            variant="outline"
            className='dark:hover:bg-purple-900/20 dark:hover:border-purple-600 dark:border-gray-600 dark:text-gray-300 dark:hover:text-purple-300 hover:bg-purple-50 hover:border-purple-200 hover:text-purple-700'
          >
            Load More Templates
          </Button>
        </div>
      </div>
    </section>
  );
}