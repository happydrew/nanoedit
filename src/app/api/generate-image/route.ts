import { hasEnoughCredits, deductCredits } from '@/lib/credits_service';
import { getUserUuid } from '@/services/user';
import {
    createTaskRecord,
    markTaskAsProcessing,
    markTaskAsSuccess,
    markTaskAsFailed,
    TaskType,
    ExternalProvider
} from '@/services/taskService';
import { NextRequest, NextResponse } from 'next/server';

// 可选：设置为edge运行时
// export const runtime = "edge";

export async function POST(request: NextRequest) {
    try {

        // return NextResponse.json({
        //     success: true,
        //     taskId: 'bf09df73fdcd5af0803a191713b4ccf7',
        //     status: 'GENERATING',
        //     message: 'Generation task created successfully'
        // }, { status: 200 });

        // 获取客户端IP
        const forwardedFor = request.headers.get("x-forwarded-for");
        const clientIp = forwardedFor ? forwardedFor.split(',')[0] : 'unknown';
        console.log(`request ip: ${clientIp}`);

        // 解析请求体 - 支持多图片编辑功能
        const requestData = await request.json();
        const { images, prompt, mode, aspectRatio, turnstileToken } = requestData;

        if (!turnstileToken || turnstileToken.length < 10) {
            console.error('Missing turnstileToken, or invalid length');
            // For development, you can comment out the return statement below
            // return NextResponse.json(
            //     { error: 'Missing turnstileToken or invalid length' },
            //     { status: 400 }
            // );
        }

        if (!images || !Array.isArray(images) || images.length === 0) {
            console.error('Missing images or invalid format');
            return NextResponse.json(
                { error: 'Missing images or invalid format. Please provide an array of images.' },
                { status: 400 }
            );
        }

        if (!prompt || prompt.trim().length === 0) {
            console.error('Missing or empty prompt');
            return NextResponse.json(
                { error: 'Missing or empty prompt' },
                { status: 400 }
            );
        }

        // 检查用户登录状态和积分
        // 使用项目现有的用户认证系统（支持NextAuth session和API key）
        const userId = await getUserUuid();

        if (!userId) {
            // 用户未登录，临时跳过turnstile验证用于开发测试
            console.log('User not logged in, skipping turnstile verification for development');

            // 返回需要登录的错误
            return NextResponse.json(
                { error: 'Login required. Please sign in to use AI image editing.', code: 'LOGIN_REQUIRED' },
                { status: 401 }
            );
        }

        console.log(`User ${userId} is logged in`);

        // 检查用户积分是否足够（AI图片编辑需要2积分）
        const hasCredits = await hasEnoughCredits(userId, 2);
        if (!hasCredits) {
            return NextResponse.json(
                { error: 'Insufficient credits. You need at least 2 credits for AI image editing.', code: 'INSUFFICIENT_CREDITS' },
                { status: 402 }
            );
        }

        // 使用 Kie.ai 的 4o Image API 创建生成任务
        const apiKey = process.env.KIE_API_KEY;
        if (!apiKey) {
            console.error('Missing KIE_API_KEY in environment variables');
            return NextResponse.json(
                { error: 'Server configuration error' },
                { status: 500 }
            );
        }

        // 上传所有图片到ImgBB并获取URL数组
        console.log(`Uploading ${images.length} images to ImgBB...`);
        const imageUrls = await Promise.all(
            images.map(async (image: string, index: number) => {
                const imageUrl = await uploadToImgBB(image);
                console.log(`Image ${index + 1}/${images.length} uploaded to ImgBB: ${imageUrl}`);
                return imageUrl;
            })
        );
        console.log(`All ${imageUrls.length} images uploaded successfully`);

        // 构建Nano Banana Edit API请求体
        const apiRequestBody: any = {
            model: 'google/nano-banana-edit',
            input: {
                prompt, // 使用用户提供的prompt
                image_urls: imageUrls // 使用ImgBB返回的URL数组
            },
            output_format: "png",
            image_size: aspectRatio
        };

        // 添加aspect ratio如果提供了且不是auto
        if (aspectRatio && aspectRatio !== 'auto') {
            apiRequestBody.input.aspect_ratio = aspectRatio;
            console.log(`Using aspect ratio: ${aspectRatio}`);
        }

        // 发送请求到 Kie.ai Nano Banana Edit API
        const apiResponse = await fetch('https://api.kie.ai/api/v1/jobs/createTask', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
                'Accept': 'application/json'
            },
            body: JSON.stringify(apiRequestBody)
        });

        console.log(`Kie.ai Nano Banana Edit API response status: ${apiResponse.status}`);

        if (!apiResponse.ok) {
            const errorData = await apiResponse.json();
            console.error('Kie.ai Nano Banana Edit API error:', JSON.stringify(errorData));
            return NextResponse.json(
                { error: 'Failed to create generation task', details: errorData },
                { status: apiResponse.status }
            );
        }

        // 获取任务ID和其他响应信息
        const taskResp = await apiResponse.json();
        if (taskResp.code != 200) {
            console.error('Kie.ai API response missing task id:', JSON.stringify(taskResp));
            return NextResponse.json(
                { error: 'Failed to create image editing task', details: taskResp },
                { status: 500 }
            );
        }
        const externalTaskId = taskResp.data.taskId;
        console.log(`Image editing task created with ID: ${externalTaskId}`);

        // 在kie.ai成功创建任务后，创建任务记录
        const taskId = await createTaskRecord(
            userId,
            TaskType.AIImageEdit,
            2,
            {
                externalProvider: ExternalProvider.KieAI,
                externalTaskId: externalTaskId, // 使用kie.ai返回的taskId
            }
        );

        // 扣除用户积分（2积分）
        const deducted = await deductCredits(userId, 2, 'AI image editing with Nano Banana');
        if (!deducted) {
            console.error(`Failed to deduct 2 credits for user ${userId}`);
            await markTaskAsFailed(taskId, 'Failed to deduct credits');
            return NextResponse.json(
                { error: 'Failed to process payment. Please try again.' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            taskId: externalTaskId,
            recordNo: taskId, // 返回任务ID供前端使用
            status: 'GENERATING',
            message: 'Image editing task created successfully'
        }, { status: 200 });

    } catch (error: any) {
        console.error('API error:', error);
        return NextResponse.json({
            success: false,
            error: error.message || 'Failed to create image editing task'
        }, { status: 500 });
    }
}

// 上传图片到ImgBB并返回URL
async function uploadToImgBB(image: string): Promise<string> {
    const imgbbApiKey = process.env.IMGBB_API_KEY;
    if (!imgbbApiKey) {
        throw new Error('Missing IMGBB_API_KEY in environment variables');
    }

    // 如果图片是base64字符串，确保正确格式化
    let imageBase64 = image;
    if (image.includes(',')) {
        // 如果base64包含data URL前缀，则提取纯base64部分
        imageBase64 = image.split(',')[1];
    }

    try {
        // 使用标准的 application/x-www-form-urlencoded 方式上传
        // 这是ImgBB API推荐的方式，适用于服务器端环境
        const params = new URLSearchParams();
        params.append('key', imgbbApiKey);
        params.append('image', imageBase64);
        params.append('expiration', '300'); // 5分钟后过期

        const response = await fetch('https://api.imgbb.com/1/upload', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: params
        });

        console.log(`ImgBB API response status: ${response.status}`);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('ImgBB API error response:', errorText);
            throw new Error(`ImgBB API error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('ImgBB API response:', JSON.stringify(data));

        if (!data.success) {
            console.error('ImgBB API returned success: false:', JSON.stringify(data));
            throw new Error(data.error?.message || 'ImgBB API returned success: false');
        }

        if (!data.data?.url) {
            console.error('ImgBB API response missing URL:', JSON.stringify(data));
            throw new Error('ImgBB API response missing image URL');
        }

        console.log(`Image uploaded to ImgBB successfully: ${data.data.url}`);
        return data.data.url;

    } catch (error) {
        console.error('Failed to upload image to ImgBB:', error);

        // 如果是网络错误，提供更详细的错误信息
        if (error instanceof TypeError && error.message.includes('fetch')) {
            throw new Error('Network error: Unable to connect to ImgBB API');
        }

        // 重新抛出原始错误
        throw error;
    }
}

