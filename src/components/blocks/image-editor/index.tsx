"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import Icon from "@/components/icon";
import { Upload, ImageIcon, Zap, Copy, X, Loader2, ChevronDown, Coins, AlertCircle, RefreshCw } from "lucide-react";
import { useAppContext } from "@/contexts/app";
import { useSession } from "next-auth/react";
import { isAuthEnabled } from "@/lib/auth";
import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { FaCoins } from "react-icons/fa";

interface ImageEditorProps {
  className?: string;
}

interface GeneratedImage {
  id: string;
  url: string;
  prompt: string;
  createdAt: Date;
}

type GenerationStatus = 'idle' | 'uploading' | 'submitting' | 'polling' | 'completed' | 'failed';

interface GenerationError {
  message: string;
  retryable: boolean;
  details?: any;
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
  const t = useTranslations();
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
  const [generationStatus, setGenerationStatus] = useState<GenerationStatus>('idle');
  const [generationError, setGenerationError] = useState<GenerationError | null>(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [progressStartTime, setProgressStartTime] = useState<number | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const aspectRatioRef = useRef<HTMLDivElement>(null);

  const selectedAspectLabel = useMemo(() => {
    const aspectRatioMap: Record<string, string> = {
      "auto": t('imageEditor.aspectRatios.auto'),
      "1:1": t('imageEditor.aspectRatios.square'),
      "3:4": t('imageEditor.aspectRatios.portraitSmall'),
      "9:16": t('imageEditor.aspectRatios.portraitLarge'),
      "4:3": t('imageEditor.aspectRatios.landscapeSmall'),
      "16:9": t('imageEditor.aspectRatios.landscapeLarge')
    };
    return aspectRatioMap[selectedAspectRatio] || selectedAspectRatio || t('imageEditor.aspectRatios.auto');
  }, [selectedAspectRatio, t]);

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
    const validFiles: File[] = [];
    const maxFiles = 5;
    const maxSizePerFile = 5 * 1024 * 1024; // 5MB in bytes

    // 检查剩余可上传数量
    const remainingSlots = maxFiles - uploadedImages.length;
    if (remainingSlots <= 0) {
      alert(`最多只能上传${maxFiles}张图片`);
      return;
    }

    // 验证每个文件
    Array.from(files).slice(0, remainingSlots).forEach((file, index) => {
      // 检查文件大小
      if (file.size > maxSizePerFile) {
        alert(`图片 "${file.name}" 超过5MB大小限制，已跳过`);
        return;
      }

      // 检查文件类型
      if (!file.type.startsWith('image/')) {
        alert(`文件 "${file.name}" 不是有效的图片格式，已跳过`);
        return;
      }

      validFiles.push(file);
    });

    if (validFiles.length > 0) {
      setUploadedImages(prev => [...prev, ...validFiles]);
    }
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

  // 计算积分消耗
  const getCreditsRequired = () => {
    const baseCredits = 2;
    const aspectRatioCredits = selectedAspectRatio !== 'auto' ? 2 : 0;
    return baseCredits + aspectRatioCredits;
  };

  // 安抚用户的轮播消息
  const progressMessages = [
    t('imageEditor.progress.message1'),
    t('imageEditor.progress.message2'),
    t('imageEditor.progress.message3'),
    t('imageEditor.progress.message4'),
    t('imageEditor.progress.message5'),
    t('imageEditor.progress.message6')
  ];

  // 优化后的进度条更新逻辑 - 30秒内指数递减
  const updateProgress = useCallback((startTime: number) => {
    const now = Date.now();
    const elapsed = (now - startTime) / 1000; // 秒
    const duration = 30; // 30秒

    if (elapsed >= duration) {
      return 95; // 最高到95%，避免100%
    }

    // 指数递减公式：每经过一半时间，剩余进度减半
    // progress = 95 * (1 - e^(-3 * elapsed / duration))
    const progress = 95 * (1 - Math.exp(-3 * elapsed / duration));
    return Math.min(progress, 95);
  }, []);

  // 轮播消息更新
  useEffect(() => {
    if (!isGenerating || !progressStartTime) return;

    const messageInterval = setInterval(() => {
      const elapsed = (Date.now() - progressStartTime) / 1000;
      const messageIndex = Math.floor(elapsed / 5) % progressMessages.length; // 每5秒换一条
      setStatusMessage(progressMessages[messageIndex]);
    }, 5000);

    return () => clearInterval(messageInterval);
  }, [isGenerating, progressStartTime, progressMessages]);

  // 进度条更新
  useEffect(() => {
    if (!isGenerating || !progressStartTime) return;

    const progressInterval = setInterval(() => {
      const newProgress = updateProgress(progressStartTime);
      setProgress(newProgress);
    }, 500); // 每500ms更新一次

    return () => clearInterval(progressInterval);
  }, [isGenerating, progressStartTime, updateProgress]);

  const generateImage = useCallback(async () => {
    if (!isFormValid || isGenerating) return;

    // 检查用户登录状态
    if (!isLoggedIn) {
      setShowSignModal(true);
      return;
    }

    setIsGenerating(true);
    setProgress(0);
    setGenerationStatus('uploading');
    setGenerationError(null);
    setRetryCount(0);

    // 设置进度条开始时间和初始消息
    const startTime = Date.now();
    setProgressStartTime(startTime);
    setStatusMessage(t('imageEditor.progress.message1'));

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

      setGenerationStatus('submitting');

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
          creditsRequired: getCreditsRequired(), // 添加积分计算
          // Add turnstile token if available
          turnstileToken: 'placeholder_token', // Replace with actual turnstile implementation
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();

        // Handle specific error codes
        if (errorData.code === 'LOGIN_REQUIRED') {
          setShowSignModal(true);
          throw new Error(t('imageEditor.errors.loginRequired'));
        } else if (errorData.code === 'INSUFFICIENT_CREDITS') {
          throw new Error(t('imageEditor.errors.insufficientCredits'));
        } else {
          throw new Error(errorData.error || t('imageEditor.errors.generateFailed'));
        }
      }

      const result = await response.json();
      const taskId = result.taskId;
      const recordNo = result.recordNo; // 获取记录编号

      setGenerationStatus('polling');

      // Poll for task completion
      let pollAttempts = 0;
      const maxPollAttempts = 150; // 5分钟，每2秒一次

      const pollInterval = setInterval(async () => {
        try {
          pollAttempts++;
          // 传递recordNo给task-status API
          const statusParams = new URLSearchParams({
            taskId: taskId,
            ...(recordNo && { recordNo: recordNo })
          });
          const statusResponse = await fetch(`/api/generate-image/task-status?${statusParams.toString()}`);

          if (!statusResponse.ok) {
            if (statusResponse.status >= 500) {
              // 服务器错误，可重试
              console.warn(`Server error during polling (${statusResponse.status}), attempt ${pollAttempts}`);
              if (pollAttempts >= maxPollAttempts) {
                throw new Error(t('imageEditor.errors.serverTimeout'));
              }
              return; // 继续轮询
            } else {
              throw new Error(t('imageEditor.errors.pollError'));
            }
          }

          const statusResult = await statusResponse.json();
          console.log('Status result:', JSON.stringify(statusResult, null, 2));

          if (statusResult.success && statusResult.status === 'SUCCESS') {
            clearInterval(pollInterval);
            setGenerationStatus('completed');
            setProgress(100);
            setProgressStartTime(null);
            setStatusMessage(t('imageEditor.progress.completed'));

            console.log('Generation completed, image URL:', statusResult.editedImage);

            // 验证图片URL
            if (!statusResult.editedImage) {
              console.error('No image URL returned from API');
              throw new Error('生成成功但未返回图片URL');
            }

            // Add generated image to results
            const newImage: GeneratedImage = {
              id: Date.now().toString(),
              url: statusResult.editedImage,
              prompt: prompt,
              createdAt: new Date()
            };

            console.log('Adding new image to list:', newImage);
            setGeneratedImages(prev => [newImage, ...prev]);

            // Reset after delay
            setTimeout(() => {
              setProgress(0);
              setGenerationStatus('idle');
              setStatusMessage('');
              setProgressStartTime(null);
            }, 3000);

          } else if (statusResult.status === 'FAILED') {
            clearInterval(pollInterval);
            throw new Error(statusResult.error || t('imageEditor.errors.generateFailed'));
          } else if (pollAttempts >= maxPollAttempts) {
            clearInterval(pollInterval);
            throw new Error(t('imageEditor.errors.taskTimeout'));
          }

        } catch (pollError: any) {
          console.error('Polling error:', pollError);

          // 网络错误可以重试
          if (pollError.name === 'TypeError' && pollError.message.includes('fetch')) {
            console.warn(`Network error during polling, attempt ${pollAttempts}. Will retry...`);
            if (pollAttempts < maxPollAttempts) {
              setStatusMessage(t('imageEditor.status.networkError'));
              return; // 继续轮询
            }
          }

          clearInterval(pollInterval);
          throw pollError;
        }
      }, 2000); // Poll every 2 seconds

    } catch (error: any) {
      console.error('Image editing error:', error);
      setProgress(0);
      setProgressStartTime(null);
      setGenerationStatus('failed');
      setStatusMessage(t('imageEditor.progress.failed'));

      // 判断错误是否可重试
      const isRetryable = error.name === 'TypeError' && error.message.includes('fetch') ||
        error.message.includes('Network error') ||
        error.message.includes('Server error');

      setGenerationError({
        message: error.message || t('imageEditor.errors.unknownError'),
        retryable: isRetryable,
        details: error
      });

      setStatusMessage(t('imageEditor.status.failed'));
    } finally {
      setIsGenerating(false);
      setProgressStartTime(null);
    }
  }, [isFormValid, isGenerating, prompt, selectedTab, uploadedImages, isLoggedIn, setShowSignModal, t, retryCount]);

  const retryGeneration = useCallback(() => {
    setRetryCount(prev => prev + 1);
    setGenerationError(null);
    generateImage();
  }, [generateImage]);

  const getStatusDisplay = () => {
    switch (generationStatus) {
      case 'uploading':
        return { icon: Upload, message: t('imageEditor.status.uploading') };
      case 'submitting':
        return { icon: Zap, message: t('imageEditor.status.submitting') };
      case 'polling':
        return { icon: RefreshCw, message: t('imageEditor.status.processing') };
      case 'completed':
        return { icon: ImageIcon, message: t('imageEditor.status.success') };
      case 'failed':
        return { icon: AlertCircle, message: t('imageEditor.status.error') };
      default:
        return null;
    }
  };

  return (
    <section id="tool-section" className={`py-16 lg:py-24 ${className || ''}`}>
      <div className="container">
        {/* Section Header */}
        <div className="text-center mb-12 lg:mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
            {t('imageEditor.header.title')}
          </h2>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            {t('imageEditor.header.subtitle', {
              aiImageEditor: t('imageEditor.header.aiImageEditor'),
              nanoBananaAi: t('imageEditor.header.nanoBananaAi'),
              geminiAiPhotoGenerator: t('imageEditor.header.geminiAiPhotoGenerator'),
              newGeminiTrendPrompt: t('imageEditor.header.newGeminiTrendPrompt')
            })}
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
                    {t('imageEditor.promptEngine.title')}
                  </CardTitle>
                  <p className="text-muted-foreground text-sm mt-1">
                    {t('imageEditor.promptEngine.subtitle', {
                      nanoBananaAi: t('imageEditor.header.nanoBananaAi')
                    })}
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
                    {t('imageEditor.promptEngine.tabs.imageToImage')}
                  </TabsTrigger>
                  <TabsTrigger
                    value="text-to-image"
                    className=""
                  >
                    {t('imageEditor.promptEngine.tabs.textToImage')}
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              {/* Reference Image Upload - 仅在 Image to Image 模式显示 */}
              {selectedTab === "image-to-image" && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <ImageIcon className="w-5 h-5 text-primary" />
                    <span className="font-medium text-foreground">{t('imageEditor.promptEngine.refImage.title')}</span>
                    <span className="text-muted-foreground text-sm">
                      {t('imageEditor.promptEngine.refImage.count', {
                        count: uploadedImages.length,
                        max: 5
                      })}
                    </span>
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
                    onChange={(e) => {
                      if (e.target.files) {
                        handleImageUpload(e.target.files);
                        // 重置文件input的value，允许重复上传同一文件
                        e.target.value = '';
                      }
                    }}
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
                      {uploadedImages.length === 0 ? t('imageEditor.promptEngine.refImage.upload.ctaEmpty') : t('imageEditor.promptEngine.refImage.upload.ctaMore')}
                    </div>
                    <div className="text-muted-foreground text-sm">
                      {t('imageEditor.promptEngine.refImage.upload.hint')} (最多5张，每张不超过5MB)
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
                  <span className="font-medium text-foreground">{t('imageEditor.promptEngine.mainPrompt.title')}</span>
                </div>
                <Textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="min-h-[120px] bg-muted/80 ring-0 border-0 focus:border-0 focus:ring-0 focus:outline-none text-foreground placeholder:text-muted-foreground resize-none"
                  placeholder={t('imageEditor.promptEngine.mainPrompt.placeholder')}
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
                        {aspectRatios.map((ratio) => {
                          const aspectRatioMap: Record<string, string> = {
                            "auto": t('imageEditor.aspectRatios.auto'),
                            "1:1": t('imageEditor.aspectRatios.square'),
                            "3:4": t('imageEditor.aspectRatios.portraitSmall'),
                            "9:16": t('imageEditor.aspectRatios.portraitLarge'),
                            "4:3": t('imageEditor.aspectRatios.landscapeSmall'),
                            "16:9": t('imageEditor.aspectRatios.landscapeLarge')
                          };
                          const ratioLabel = aspectRatioMap[ratio.value] || ratio.label;

                          return (
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
                                {ratioLabel}
                              </span>
                            </button>
                          );
                        })}
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
                    {t('imageEditor.promptEngine.buttons.generating')}
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 mr-2" />
                    {t('imageEditor.promptEngine.buttons.generate')}
                    <span className="flex items-center justify-center gap-0.5">
                      {getCreditsRequired()}
                      <FaCoins className="mt-0.5" size={12} />
                    </span>
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
                    {t('imageEditor.gallery.title')}
                  </CardTitle>
                  <p className="text-muted-foreground text-sm mt-1">
                    {t('imageEditor.gallery.subtitle', {
                      geminiAiPhotoGenerator: t('imageEditor.header.geminiAiPhotoGenerator')
                    })}
                  </p>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              {/* Loading State */}
              {isGenerating && (
                <div className="flex flex-col items-center justify-center py-16 space-y-6">
                  {/* 进度条居中显示 */}
                  <div className="w-full max-w-md space-y-4">
                    <div className="text-center">
                      <span className="text-lg font-medium text-foreground">
                        {Math.round(progress)}%
                      </span>
                    </div>

                    <Progress value={progress} className="w-full h-2" />

                    {/* 轮播消息 */}
                    <div className="text-center min-h-[2.5rem] flex items-center justify-center">
                      <p className="text-muted-foreground text-sm max-w-sm leading-relaxed">
                        {statusMessage}
                      </p>
                    </div>
                  </div>

                  {/* AI图标动画 */}
                  <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center animate-pulse">
                    <ImageIcon className="w-10 h-10 text-primary animate-pulse" />
                  </div>
                </div>
              )}

              {/* Generated Images */}
              {!isGenerating && generatedImages.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-foreground mb-4">
                    {t('imageEditor.gallery.generatedImages', { count: generatedImages.length })}
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
                            onLoad={() => console.log('Image loaded successfully:', image.url)}
                            onError={(e) => {
                              console.error('Image failed to load:', image.url, e);
                            }}
                          />

                          {/* Download overlay */}
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                            <Button size="sm" variant="secondary">
                              <Copy className="w-4 h-4 mr-2" />
                              {t('imageEditor.gallery.downloadAlt')}
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
                    {t('imageEditor.empty.title')}
                  </h3>
                  <p className="text-muted-foreground max-w-sm">
                    {selectedTab === "image-to-image"
                      ? t('imageEditor.empty.hintImageToImage')
                      : t('imageEditor.empty.hintTextToImage')
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