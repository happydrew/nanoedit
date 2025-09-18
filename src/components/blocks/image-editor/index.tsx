"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import Icon from "@/components/icon";
import { Upload, ImageIcon, Zap, Copy, X, Loader2, ChevronDown } from "lucide-react";
import { useAppContext } from "@/contexts/app";
import { useSession } from "next-auth/react";
import { isAuthEnabled } from "@/lib/auth";
import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import Image from "next/image";

interface ImageEditorProps {
  className?: string;
}

interface GeneratedImage {
  id: string;
  url: string;
  prompt: string;
  createdAt: Date;
}

type AspectRatio = {
  value: string;
  label: string;
};

const aspectRatios: AspectRatio[] = [
  { value: "auto", label: "Auto" },
  { value: "1:1", label: "Square (1:1)" },
  { value: "3:4", label: "Portrait (3:4)" },
  { value: "9:16", label: "Portrait (9:16)" },
  { value: "4:3", label: "Landscape (4:3)" },
  { value: "16:9", label: "Landscape (16:9)" },
];

export default function ImageEditor({ className }: ImageEditorProps) {
  const { setShowSignModal } = useAppContext();
  const { data: session } = isAuthEnabled() ? useSession() : { data: null };
  const isLoggedIn = session && session.user;
  const [selectedTab, setSelectedTab] = useState("image-to-image");
  const [prompt, setPrompt] = useState("Make the image more vibrant and add dramatic lighting effects");
  const [selectedAspectRatio, setSelectedAspectRatio] = useState<string>("auto");
  const [showAspectRatioDropdown, setShowAspectRatioDropdown] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<File[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const aspectRatioRef = useRef<HTMLDivElement>(null);

  const selectedAspectLabel = useMemo(() => {
    const found = aspectRatios.find((ar) => ar.value === selectedAspectRatio);
    if (found) return found.label;
    if (selectedAspectRatio === "auto") return "Auto";
    return selectedAspectRatio || "Auto";
  }, [selectedAspectRatio]);

  // Close aspect ratio dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (aspectRatioRef.current && !aspectRatioRef.current.contains(event.target as Node)) {
        setShowAspectRatioDropdown(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleImageUpload = useCallback((files: FileList) => {
    const newFiles = Array.from(files).slice(0, 9 - uploadedImages.length);
    setUploadedImages(prev => [...prev, ...newFiles]);
  }, [uploadedImages.length]);

  const removeImage = useCallback((index: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files) {
      handleImageUpload(e.dataTransfer.files);
    }
  }, [handleImageUpload]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const isFormValid = selectedTab === "text-to-image" ? prompt.trim().length > 0 : uploadedImages.length > 0 && prompt.trim().length > 0;

  const generateImage = useCallback(async () => {
    if (!isFormValid || isGenerating) return;

    // 检查用户登录状态
    if (!isLoggedIn) {
      setShowSignModal(true);
      return;
    }

    setIsGenerating(true);
    setProgress(0);

    try {
      // Convert uploaded images to base64 array
      let imageBase64Array: string[] = [];
      if (selectedTab === "image-to-image" && uploadedImages.length > 0) {
        console.log(`Converting ${uploadedImages.length} images to base64...`);

        // Convert all uploaded images to base64
        const conversions = uploadedImages.map(async (file, index) => {
          const reader = new FileReader();
          return new Promise<string>((resolve, reject) => {
            reader.onload = () => {
              console.log(`Image ${index + 1} converted to base64`);
              resolve(reader.result as string);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
        });

        imageBase64Array = await Promise.all(conversions);
        console.log(`Successfully converted ${imageBase64Array.length} images`);
      }

      // Simulate initial progress
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 20) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + Math.random() * 5;
        });
      }, 300);

      // Call the image editing API
      const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          images: imageBase64Array, // Send array of images
          prompt: prompt,
          mode: selectedTab,
          aspectRatio: selectedAspectRatio, // Add aspect ratio
          // Add turnstile token if available
          turnstileToken: 'placeholder_token', // Replace with actual turnstile implementation
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();

        // Handle specific error codes
        if (errorData.code === 'LOGIN_REQUIRED') {
          setShowSignModal(true);
          throw new Error('Please sign in to use AI image editing');
        } else if (errorData.code === 'INSUFFICIENT_CREDITS') {
          throw new Error('Insufficient credits. You need at least 2 credits for AI image editing.');
        } else {
          throw new Error(errorData.error || 'Failed to start image editing');
        }
      }

      const result = await response.json();
      const taskId = result.taskId;
      const recordNo = result.recordNo; // 获取记录编号

      clearInterval(progressInterval);
      setProgress(25);

      // Poll for task completion
      const pollInterval = setInterval(async () => {
        try {
          // 传递recordNo给task-status API
          const statusParams = new URLSearchParams({
            taskId: taskId,
            ...(recordNo && { recordNo: recordNo })
          });
          const statusResponse = await fetch(`/api/generate-image/task-status?${statusParams.toString()}`);

          if (!statusResponse.ok) {
            throw new Error('Failed to check task status');
          }

          const statusResult = await statusResponse.json();

          // Update progress based on time elapsed (simulate progress for better UX)
          setProgress(prev => {
            if (statusResult.status === 'SUCCESS') {
              return 100;
            } else if (statusResult.status === 'GENERATING') {
              return Math.min(prev + Math.random() * 10, 90);
            }
            return prev;
          });

          if (statusResult.success && statusResult.status === 'SUCCESS') {
            clearInterval(pollInterval);

            // Add generated image to results
            const newImage: GeneratedImage = {
              id: Date.now().toString(),
              url: statusResult.editedImage,
              prompt: prompt,
              createdAt: new Date()
            };

            setGeneratedImages(prev => [newImage, ...prev]);
            setProgress(100);

            // Reset progress after a short delay
            setTimeout(() => setProgress(0), 2000);

          } else if (statusResult.status === 'FAILED') {
            clearInterval(pollInterval);
            throw new Error(statusResult.error || 'Image editing failed');
          }

        } catch (pollError) {
          console.error('Polling error:', pollError);
          clearInterval(pollInterval);
          throw pollError;
        }
      }, 2000); // Poll every 2 seconds

      // Set a maximum polling time of 5 minutes
      setTimeout(() => {
        clearInterval(pollInterval);
        if (isGenerating) {
          console.error('Task timeout after 5 minutes');
          setIsGenerating(false);
          setProgress(0);
        }
      }, 300000);

    } catch (error: any) {
      console.error('Image editing error:', error);
      setProgress(0);
      // You can show an error toast here
      alert(`Error: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  }, [isFormValid, isGenerating, prompt, selectedTab, uploadedImages, isLoggedIn, setShowSignModal]);

  return (
    <section id="tool-section" className={`py-16 lg:py-24 ${className || ''}`}>
      <div className="container">
        {/* Section Header */}
        <div className="text-center mb-12 lg:mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
            AI Photo Editor for Viral Social Media Trends
          </h2>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Transform your photos into viral content with our advanced <span className="text-primary font-medium">ai image editor</span>. Create trending styles, enhance image quality, and generate social media hits using cutting-edge <span className="text-primary font-medium">nano banana ai</span> technology. From background removal to style transformation, experience the power of <span className="text-primary font-medium">gemini ai photo generator</span> with <span className="text-primary font-medium">new gemini trend prompt</span> templates.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 max-w-7xl mx-auto">
          {/* Prompt Engine */}
          <Card className="bg-card/50 border-border backdrop-blur-sm shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg border border-primary/20">
                  <Zap className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-foreground text-xl font-bold">
                    AI Image Editor
                  </CardTitle>
                  <p className="text-muted-foreground text-sm mt-1">
                    Professional editing powered by advanced <span className="text-primary">nano banana ai</span>
                  </p>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Tab Selection */}
              <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger
                    value="image-to-image"
                    className=""
                  >
                    <ImageIcon className="w-4 h-4 mr-2" />
                    Image to Image
                  </TabsTrigger>
                  <TabsTrigger
                    value="text-to-image"
                    className=""
                  >
                    Text to Image
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              {/* Reference Image Upload - 仅在 Image to Image 模式显示 */}
              {selectedTab === "image-to-image" && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <ImageIcon className="w-5 h-5 text-primary" />
                    <span className="font-medium text-foreground">Reference Image</span>
                    <span className="text-muted-foreground text-sm">{uploadedImages.length}/9</span>
                  </div>

                  {/* Hidden file input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*"
                    className="hidden"
                    aria-label="Upload reference images"
                    title="Upload reference images"
                    onChange={(e) => e.target.files && handleImageUpload(e.target.files)}
                  />

                  {/* Upload area */}
                  <div
                    className="border-2 border-dashed border-border rounded-lg p-8 text-center bg-muted/20 hover:border-primary/50 hover:bg-muted/30 transition-all duration-300 cursor-pointer"
                    onClick={() => fileInputRef.current?.click()}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                  >
                    <div className="mx-auto w-12 h-12 bg-muted rounded-lg flex items-center justify-center mb-4">
                      <Upload className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <div className="text-foreground font-medium mb-1">
                      {uploadedImages.length === 0 ? "Add Image" : "Add More Images"}
                    </div>
                    <div className="text-muted-foreground text-sm">
                      Max 50MB • Drag & drop or click to browse
                    </div>
                  </div>

                  {/* Uploaded images preview */}
                  {uploadedImages.length > 0 && (
                    <div className="grid grid-cols-3 gap-2 mt-4">
                      {uploadedImages.map((file, index) => (
                        <div key={index} className="relative group aspect-square">
                          <div className="w-full h-full bg-muted rounded-lg overflow-hidden">
                            <Image
                              src={URL.createObjectURL(file)}
                              alt={`Upload ${index + 1}`}
                              fill
                              className="object-cover"
                              sizes="(max-width: 768px) 33vw, 100px"
                            />
                          </div>
                          <Button
                            variant="destructive"
                            size="sm"
                            className="absolute -top-2 -right-2 w-6 h-6 p-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeImage(index);
                            }}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Main Prompt */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Icon name="RiChatSmile3Line" className="w-5 h-5 text-primary" />
                  <span className="font-medium text-foreground">Main Prompt</span>
                </div>
                <Textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="min-h-[120px] bg-muted/80 ring-0 border-0 focus:border-0 focus:ring-0 focus:outline-none text-foreground placeholder:text-muted-foreground resize-none"
                  placeholder="Describe your vision... (e.g., 'vintage film style', 'trending TikTok aesthetic', 'apply new gemini trend prompt effects')"
                />

                {/* Aspect Ratio Dropdown - positioned at bottom left of prompt */}
                <div className="flex justify-start mt-3">
                  <div className="relative" ref={aspectRatioRef}>
                    <button
                      type="button"
                      onClick={() => setShowAspectRatioDropdown(!showAspectRatioDropdown)}
                      className="bg-muted/80 rounded-md px-3 py-2 text-sm text-foreground hover:bg-muted/90 transition-colors flex items-center gap-2"
                    >
                      {selectedAspectRatio !== 'auto' && (
                        <div className={`border border-foreground ${selectedAspectRatio === '1:1' ? 'w-3 h-3' :
                          selectedAspectRatio === '3:4' ? 'w-2.5 h-3' :
                            selectedAspectRatio === '9:16' ? 'w-1.5 h-3' :
                              selectedAspectRatio === '4:3' ? 'w-4 h-3' :
                                selectedAspectRatio === '16:9' ? 'w-5 h-3' : 'w-3 h-3'
                          }`} />
                      )}
                      <span>
                        {selectedAspectLabel}
                      </span>
                    </button>

                    {showAspectRatioDropdown && (
                      <div className="absolute top-full left-0 mt-1 bg-popover border border-border rounded-md shadow-lg z-10 backdrop-blur-md">
                        {aspectRatios.map((ratio) => (
                          <button
                            key={ratio.value}
                            type="button"
                            onClick={() => {
                              setSelectedAspectRatio(ratio.value);
                              setShowAspectRatioDropdown(false);
                            }}
                            className={`w-full px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground transition-colors first:rounded-t-md last:rounded-b-md flex items-center gap-2 ${selectedAspectRatio === ratio.value
                              ? 'bg-primary/10 text-primary'
                              : 'text-popover-foreground'
                              }`}
                          >
                            {ratio.value !== 'auto' && (
                              <div className={`border ${selectedAspectRatio === ratio.value ? 'border-primary' : 'border-foreground'
                                } ${ratio.value === '1:1' ? 'w-3 h-3' :
                                  ratio.value === '3:4' ? 'w-3 h-4' :
                                    ratio.value === '9:16' ? 'w-2.25 h-4' :
                                      ratio.value === '4:3' ? 'w-4 h-3' :
                                        ratio.value === '16:9' ? 'w-4 h-2.25' : 'w-3 h-3'
                                }`} />
                            )}
                            <span className="whitespace-nowrap">
                              {ratio.label}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Generate Button */}
              <Button
                className={`w-full font-medium py-3 backdrop-blur-md border transition-all ${isFormValid && !isGenerating
                  ? 'bg-primary/20 hover:bg-primary/30 text-primary border-primary/30 hover:border-primary/40 shadow-lg'
                  : 'bg-muted/20 text-muted-foreground cursor-not-allowed border-muted/30'
                  }`}
                onClick={generateImage}
                disabled={!isFormValid || isGenerating}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 mr-2" />
                    Generate Now
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Output Gallery */}
          <Card className="bg-card/50 border-border backdrop-blur-sm shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-muted/50 rounded-lg border border-border">
                  <ImageIcon className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <CardTitle className="text-foreground text-xl font-bold">
                    Your Creations
                  </CardTitle>
                  <p className="text-muted-foreground text-sm mt-1">
                    Viral-ready content generated with <span className="text-primary">gemini ai photo generator</span>
                  </p>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              {/* Loading State */}
              {isGenerating && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 mb-4">
                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                    <span className="text-sm font-medium text-foreground">
                      Creating viral content...
                    </span>
                    <span className="text-sm text-muted-foreground ml-auto">
                      {Math.round(progress)}%
                    </span>
                  </div>

                  <Progress value={progress} className="w-full" />

                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <div className="w-16 h-16 bg-primary/10 rounded-lg flex items-center justify-center mb-4 animate-pulse">
                      <ImageIcon className="w-8 h-8 text-primary animate-pulse" />
                    </div>
                    <p className="text-muted-foreground text-sm max-w-sm">
                      Our <span className="text-primary">ai foto editor</span> is crafting your perfect social media content...
                    </p>
                  </div>
                </div>
              )}

              {/* Generated Images */}
              {!isGenerating && generatedImages.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-foreground mb-4">
                    Generated Images ({generatedImages.length})
                  </h3>
                  <div className="grid gap-4">
                    {generatedImages.map((image) => (
                      <div key={image.id} className="group relative">
                        <div className="aspect-square relative overflow-hidden rounded-lg border border-border">
                          <Image
                            src={image.url}
                            alt={`Generated: ${image.prompt}`}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                            sizes="(max-width: 768px) 100vw, 50vw"
                          />

                          {/* Download overlay */}
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                            <Button size="sm" variant="secondary">
                              <Copy className="w-4 h-4 mr-2" />
                              Download
                            </Button>
                          </div>
                        </div>

                        {/* Image info */}
                        <div className="mt-2">
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {image.prompt}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {image.createdAt.toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Empty State */}
              {!isGenerating && generatedImages.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center mb-6 border border-border">
                    <ImageIcon className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">
                    Ready to Go Viral?
                  </h3>
                  <p className="text-muted-foreground max-w-sm">
                    {selectedTab === "image-to-image"
                      ? "Upload your photos (up to 9 images) and describe your dream style. Our ai photo editor powered by nano banana ai will transform them into trending content."
                      : "Describe your vision and watch our ai image editor create viral-ready content with cutting-edge technology."
                    }
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}